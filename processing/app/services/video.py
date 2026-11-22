"""Examen d'une vidéo avec ffmpeg : ce qu'elle déclare, quelques images clés, et sa bande son.

Sans IA. Comme pour une image, on relève ce que le fichier dit de lui-même (outil de génération,
type de source IPTC, Content Credentials, appareil, date, position), sans jamais juger.
Les images clés passent par la copie protégée (visages floutés, rien de caché) avant de sortir
d'ici ; la bande son est rendue en WAV mono 16 kHz, prête pour la transcription.

ffmpeg et ffprobe sont des programmes du système (image Docker de processing). S'ils manquent,
`available()` le dit et la route répond « indisponible » sans rien casser.
"""

import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from app.services.media_inspect import AI_GENERATORS, AI_SOURCE_TYPES, MediaReport
from app.services.safe_copy import make_safe_copy

# Outils de génération de vidéos, en plus de ceux des images (même ordre : du plus précis).
VIDEO_GENERATORS: tuple[tuple[str, str], ...] = (
    ("sora", "OpenAI Sora"),
    ("veo", "Google Veo"),
    ("runway", "Runway"),
    ("pika", "Pika"),
    ("kling", "Kling"),
    ("luma", "Luma Dream Machine"),
    ("dream machine", "Luma Dream Machine"),
    ("hailuo", "Hailuo (MiniMax)"),
    ("synthesia", "Synthesia"),
    ("heygen", "HeyGen"),
    ("stable video", "Stable Video Diffusion"),
    ("invideo", "InVideo AI"),
)
KEYFRAMES = 4
MAX_AUDIO_SECONDS = 90
TIMEOUT_SECONDS = 60


class UnreadableVideoError(ValueError):
    """Le fichier n'est pas une vidéo lisible."""


@dataclass
class Keyframe:
    second: float
    data: bytes
    faces_blurred: int


@dataclass
class VideoReport:
    report: MediaReport
    duration: float
    width: int | None
    height: int | None
    frames: list[Keyframe] = field(default_factory=list)
    audio: bytes | None = None
    audio_seconds: float = 0.0


def available() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def _run(args: list[str]) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(args, capture_output=True, timeout=TIMEOUT_SECONDS, check=False)


def _probe(path: Path) -> dict:
    result = _run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ]
    )
    if result.returncode != 0:
        raise UnreadableVideoError("vidéo illisible")
    probe = json.loads(result.stdout or b"{}")
    if not any(stream.get("codec_type") == "video" for stream in probe.get("streams", [])):
        raise UnreadableVideoError("aucune image dans ce fichier")
    return probe


def _tags(probe: dict) -> dict[str, str]:
    """Toutes les étiquettes du conteneur et des pistes, clés en minuscules."""
    tags: dict[str, str] = {}
    for source in [probe.get("format", {}), *probe.get("streams", [])]:
        for key, value in (source.get("tags") or {}).items():
            tags.setdefault(key.lower(), str(value))
    return tags


# Étiquettes ajoutées par les outils eux-mêmes, sans rien dire de l'origine.
_PLAIN_HANDLERS = ("videohandler", "soundhandler", "core media", "apple video media handler")


def _report(probe: dict, raw: bytes) -> MediaReport:
    tags = _tags(probe)
    haystack = " ".join(f"{key}={value}" for key, value in tags.items()).lower()
    report = MediaReport(
        format=(probe.get("format", {}).get("format_name") or "video").split(",")[0]
    )
    report.ai_source_type = any(source in haystack for source in AI_SOURCE_TYPES)
    report.generator = next(
        (name for word, name in (*VIDEO_GENERATORS, *AI_GENERATORS) if word in haystack), None
    )
    # Un manifeste C2PA vit dans une boîte JUMBF (« jumb ») étiquetée « c2pa » : les deux ensemble,
    # pour ne pas prendre quatre octets dus au hasard pour une signature.
    report.c2pa = b"jumb" in raw and b"c2pa" in raw
    make = tags.get("com.apple.quicktime.make") or tags.get("make")
    model = tags.get("com.apple.quicktime.model") or tags.get("model")
    report.camera = " ".join(part for part in (make, model) if part) or None
    created = tags.get("com.apple.quicktime.creationdate") or tags.get("creation_time")
    report.taken_at = created[:19] if created else None
    software = tags.get("com.apple.quicktime.software") or tags.get("encoder")
    report.software = software or None
    report.gps = any("location" in key for key in tags)
    report.ai_signature = report.ai_source_type or report.generator is not None or report.c2pa
    meaningful = [
        key
        for key, value in tags.items()
        if key not in {"major_brand", "minor_version", "compatible_brands", "language", "vendor_id"}
        and not (key == "handler_name" and value.lower().startswith(_PLAIN_HANDLERS))
    ]
    report.stripped = not meaningful
    report.findings = _findings(report)
    return report


def _findings(report: MediaReport) -> list[str]:
    found: list[str] = []
    if report.ai_source_type:
        found.append("Le fichier se déclare lui-même comme une vidéo générée par IA.")
    if report.generator:
        found.append(f"Le fichier mentionne un outil de génération : {report.generator}.")
    if report.c2pa:
        found.append("Le fichier porte des Content Credentials : une signature d'origine (C2PA).")
    if report.camera:
        found.append(f"Appareil enregistré : {report.camera}.")
    if report.taken_at:
        found.append(f"Date enregistrée dans le fichier : {report.taken_at.replace('T', ' à ')}.")
    if report.software and not report.generator:
        found.append(
            f"Logiciel enregistré : {report.software}. « Lavf » veut dire réencodée par ffmpeg, "
            "comme le font beaucoup de sites et de messageries."
            if report.software.lower().startswith("lavf")
            else f"Logiciel enregistré : {report.software}."
        )
    if report.gps:
        found.append("Une position GPS est enregistrée.")
    if report.stripped:
        found.append(
            "Aucune information cachée : c'est courant après un passage par un réseau social ou "
            "une messagerie, et cela ne prouve rien."
        )
    return found


def _frames(path: Path, folder: Path, duration: float) -> list[Keyframe]:
    """Quatre images réparties sur la durée (10 %, 35 %, 60 %, 85 %), chacune protégée."""
    frames: list[Keyframe] = []
    for index in range(KEYFRAMES):
        second = round(duration * (0.10 + 0.25 * index), 2) if duration > 0 else 0.0
        target = folder / f"frame-{index}.jpg"
        _run(["ffmpeg", "-v", "error", "-ss", str(second), "-i", str(path), "-frames:v", "1",
              "-q:v", "3", "-y", str(target)])  # fmt: skip
        if not target.exists():
            continue
        copy = make_safe_copy(target.read_bytes())
        frames.append(Keyframe(second=second, data=copy.data, faces_blurred=copy.faces_blurred))
    return frames


def _audio(path: Path, folder: Path) -> bytes | None:
    target = folder / "audio.wav"
    _run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-t", str(MAX_AUDIO_SECONDS),
          "-ac", "1", "-ar", "16000", "-f", "wav", "-y", str(target)])  # fmt: skip
    # Un WAV vide fait 44 octets d'en-tête : on attend au moins une demi-seconde de son.
    if not target.exists() or target.stat().st_size < 44 + 16_000:
        return None
    return target.read_bytes()


def inspect_video(data: bytes) -> VideoReport:
    with tempfile.TemporaryDirectory(prefix="vyra-video-") as tmp:
        folder = Path(tmp)
        path = folder / "input"
        path.write_bytes(data)
        try:
            probe = _probe(path)
        except (subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
            raise UnreadableVideoError("vidéo illisible") from exc
        video = next(s for s in probe["streams"] if s.get("codec_type") == "video")
        duration = float(probe.get("format", {}).get("duration") or video.get("duration") or 0)
        has_audio = any(s.get("codec_type") == "audio" for s in probe["streams"])
        audio = _audio(path, folder) if has_audio else None
        return VideoReport(
            report=_report(probe, data),
            duration=round(duration, 2),
            width=video.get("width"),
            height=video.get("height"),
            frames=_frames(path, folder, duration),
            audio=audio,
            audio_seconds=min(duration, MAX_AUDIO_SECONDS) if audio else 0.0,
        )
