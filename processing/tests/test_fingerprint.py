"""Empreinte d'image côté serveur : la même photo recompressée reste proche, une autre non."""

import base64
import io
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app.services.fingerprint import image_fingerprint

FACE = (Path(__file__).parent / "data" / "face.jpg").read_bytes()


def _distance(a: str, b: str) -> int:
    return sum(left != right for left, right in zip(a, b, strict=True))


def _recompress(data: bytes, size: int, quality: int) -> bytes:
    image = Image.open(io.BytesIO(data)).convert("RGB")
    image.thumbnail((size, size))
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=quality)
    return out.getvalue()


def test_same_photo_resent_stays_close() -> None:
    original = image_fingerprint(FACE)
    assert len(original) == 64
    assert _distance(original, image_fingerprint(_recompress(FACE, 200, 40))) <= 6


def test_unrelated_image_is_far() -> None:
    out = io.BytesIO()
    gradient = Image.linear_gradient("L").rotate(90).convert("RGB").resize((320, 320))
    gradient.save(out, format="PNG")
    assert _distance(image_fingerprint(FACE), image_fingerprint(out.getvalue())) >= 16


def test_route(offline_client: TestClient) -> None:
    body = {"mimeType": "image/jpeg", "data": base64.b64encode(FACE).decode()}
    response = offline_client.post("/v1/media/fingerprint", json=body)
    assert response.status_code == 200
    assert response.json()["fingerprint"] == image_fingerprint(FACE)
    bad = {"mimeType": "image/png", "data": base64.b64encode(b"nope").decode()}
    assert offline_client.post("/v1/media/fingerprint", json=bad).status_code == 422
