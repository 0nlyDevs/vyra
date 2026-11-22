"""Examen d'une vidéo : ce qu'elle déclare, images clés protégées, bande son. Sans IA."""

import base64
import io
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.services import video

pytestmark = pytest.mark.skipif(not video.available(), reason="ffmpeg absent")


def _clip(tmp_path: Path, *, audio: bool = True, metadata: dict[str, str] | None = None) -> bytes:
    """Une vidéo de 4 s faite par ffmpeg : mire de test, et un bip si `audio`."""
    target = tmp_path / "clip.mp4"
    args = ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=10:duration=4"]
    if audio:
        args += ["-f", "lavfi", "-i", "sine=frequency=440:duration=4"]
    for key, value in (metadata or {}).items():
        args += ["-metadata", f"{key}={value}"]
    args += ["-pix_fmt", "yuv420p", "-shortest", "-y", str(target)]
    subprocess.run(args, check=True, capture_output=True)
    return target.read_bytes()


def test_keyframes_and_audio(tmp_path: Path) -> None:
    result = video.inspect_video(_clip(tmp_path))
    assert result.duration == pytest.approx(4, abs=0.2)
    assert (result.width, result.height) == (320, 240)
    assert len(result.frames) == video.KEYFRAMES
    assert [frame.second for frame in result.frames] == sorted(f.second for f in result.frames)
    first = Image.open(io.BytesIO(result.frames[0].data))
    assert first.format == "JPEG" and not first.getexif()
    assert result.audio is not None and result.audio.startswith(b"RIFF")
    assert result.audio_seconds == pytest.approx(4, abs=0.2)


def test_no_audio_track(tmp_path: Path) -> None:
    result = video.inspect_video(_clip(tmp_path, audio=False))
    assert result.audio is None
    assert result.audio_seconds == 0


def test_declared_ai_source_and_generator(tmp_path: Path) -> None:
    clip = _clip(
        tmp_path,
        metadata={
            "comment": "DigitalSourceType: http://cv.iptc.org/newscodes/digitalsourcetype/"
            "trainedAlgorithmicMedia",
            "title": "Made with Sora",
        },
    )
    report = video.inspect_video(clip).report
    assert report.ai_signature and report.ai_source_type
    assert report.generator == "OpenAI Sora"
    assert "vidéo générée par IA" in report.findings[0]


def test_plain_clip_reports_reencoding_without_signature(tmp_path: Path) -> None:
    report = video.inspect_video(_clip(tmp_path)).report
    assert not report.ai_signature
    assert report.software and report.software.startswith("Lavf")
    assert any("réencodée" in finding for finding in report.findings)


def test_unreadable_file() -> None:
    with pytest.raises(video.UnreadableVideoError):
        video.inspect_video(b"pas une video")


def test_route(offline_client: TestClient, tmp_path: Path) -> None:
    body = {"mimeType": "video/mp4", "data": base64.b64encode(_clip(tmp_path)).decode()}
    response = offline_client.post("/v1/media/video", json=body)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["frames"]) == video.KEYFRAMES
    assert payload["frames"][0]["mimeType"] == "image/jpeg"
    assert payload["audio"]["mimeType"] == "audio/wav"
    assert payload["report"]["aiSignature"] is False


def test_route_rejects_garbage(offline_client: TestClient) -> None:
    body = {"mimeType": "video/mp4", "data": base64.b64encode(b"nope").decode()}
    response = offline_client.post("/v1/media/video", json=body)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "FILE_NOT_SUPPORTED"


def test_route_without_ffmpeg(offline_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(video, "available", lambda: False)
    body = {"mimeType": "video/mp4", "data": base64.b64encode(b"x").decode()}
    response = offline_client.post("/v1/media/video", json=body)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "VIDEO_UNAVAILABLE"


def test_read_video_prompt_takes_four_keyframes(offline_client: TestClient) -> None:
    out = io.BytesIO()
    Image.new("RGB", (8, 8)).save(out, format="JPEG")
    frame = {"mimeType": "image/jpeg", "data": base64.b64encode(out.getvalue()).decode()}
    body = {
        "payload": {"seconds": [1, 2, 3, 4]},
        "files": [frame] * 4,
        "fallbackVariant": "water-video",
    }
    response = offline_client.post("/v1/prompts/read-video", json=body)
    assert response.status_code == 200
    assert response.json()["source"] == "fallback"
    assert response.json()["result"]["observations"]
