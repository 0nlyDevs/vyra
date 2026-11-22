"""Copie protégée : visages floutés, informations cachées retirées, original jamais renvoyé."""

import base64
import io
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.services.safe_copy import find_faces, make_safe_copy
from tests.conftest import make_settings

# Portrait d'astronaute de la NASA (domaine public), repris des données d'exemple de scikit-image.
FACE = (Path(__file__).parent / "data" / "face.jpg").read_bytes()


def _jpeg_with_gps() -> bytes:
    image = Image.new("RGB", (64, 48), (120, 160, 200))
    exif = Image.Exif()
    exif[0x010F] = "Fabricant"  # Make
    exif[0x0110] = "Modele"  # Model
    exif[0x0112] = 6  # Orientation : tourner de 90°
    exif.get_ifd(0x8825)[2] = (18.0, 52.0, 0.0)  # GPSLatitude
    out = io.BytesIO()
    image.save(out, format="JPEG", exif=exif)
    return out.getvalue()


def test_face_is_blurred() -> None:
    before = np.asarray(Image.open(io.BytesIO(FACE)).convert("L"), dtype=float)
    faces = find_faces(before.astype(np.uint8))
    assert len(faces) == 1
    copy = make_safe_copy(FACE)
    assert copy.faces_blurred == 1
    after = np.asarray(Image.open(io.BytesIO(copy.data)).convert("L"), dtype=float)
    x, y, w, h = faces[0]
    region = (slice(y, y + h), slice(x, x + w))
    # Le détail du visage (écart entre pixels voisins) disparaît presque entièrement.
    detail_before = np.abs(np.diff(before[region], axis=1)).mean()
    detail_after = np.abs(np.diff(after[region], axis=1)).mean()
    assert detail_after < detail_before / 4


def test_metadata_removed_and_orientation_applied() -> None:
    copy = make_safe_copy(_jpeg_with_gps())
    assert copy.metadata_removed
    result = Image.open(io.BytesIO(copy.data))
    assert not result.getexif()
    assert "exif" not in result.info
    assert b"Fabricant" not in copy.data and b"Modele" not in copy.data
    # Orientation 6 : la photo 64 x 48 est redressée en 48 x 64.
    assert (copy.width, copy.height) == (48, 64)


def test_no_face_no_metadata() -> None:
    out = io.BytesIO()
    Image.new("RGB", (300, 200), (30, 90, 60)).save(out, format="PNG")
    copy = make_safe_copy(out.getvalue())
    assert copy.faces_blurred == 0
    assert not copy.metadata_removed
    assert Image.open(io.BytesIO(copy.data)).format == "JPEG"


def test_large_image_is_reduced_and_animation_keeps_first_frame() -> None:
    out = io.BytesIO()
    frames = [Image.new("RGB", (3000, 1500), color) for color in ((255, 0, 0), (0, 0, 255))]
    frames[0].save(out, format="GIF", save_all=True, append_images=frames[1:])
    copy = make_safe_copy(out.getvalue())
    assert (copy.width, copy.height) == (2048, 1024)
    assert copy.first_frame_only


def test_route(offline_client: TestClient) -> None:
    body = {"mimeType": "image/jpeg", "data": base64.b64encode(_jpeg_with_gps()).decode()}
    response = offline_client.post("/v1/media/safe-copy", json=body)
    assert response.status_code == 200
    payload = response.json()
    assert payload["mimeType"] == "image/jpeg"
    assert payload["metadataRemoved"] is True
    assert payload["facesBlurred"] == 0
    assert base64.b64decode(payload["data"]).startswith(b"\xff\xd8")


def test_route_rejects_non_image(offline_client: TestClient) -> None:
    body = {"mimeType": "image/png", "data": base64.b64encode(b"pas une image").decode()}
    response = offline_client.post("/v1/media/safe-copy", json=body)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "FILE_NOT_SUPPORTED"


def test_route_requires_token() -> None:
    client = TestClient(create_app(make_settings(demo_offline=True, processing_token="s3cret")))
    body = {"mimeType": "image/png", "data": base64.b64encode(FACE).decode()}
    assert client.post("/v1/media/safe-copy", json=body).status_code == 401
