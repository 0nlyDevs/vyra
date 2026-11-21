"""Lecture des informations cachées : on relève ce que le fichier déclare, sans le juger."""

import base64
import struct
import zlib

from fastapi.testclient import TestClient

from app.services.media_inspect import inspect_image


def _png(*chunks: tuple[bytes, bytes]) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(kind + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", crc)

    header = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    body = b"".join(chunk(kind, data) for kind, data in chunks)
    return b"\x89PNG\r\n\x1a\n" + header + body + chunk(b"IEND", b"")


def _tiff(fields: dict[int, str]) -> bytes:
    """Bloc EXIF minimal (petit-boutiste) avec des champs texte dans IFD0."""
    entries, extra = b"", b""
    data_offset = 8 + 2 + 12 * len(fields) + 4
    for tag, text in sorted(fields.items()):
        raw = text.encode() + b"\0"
        entries += struct.pack("<HHII", tag, 2, len(raw), data_offset + len(extra))
        extra += raw
    return (
        b"II*\0"
        + struct.pack("<I", 8)
        + struct.pack("<H", len(fields))
        + entries
        + b"\0" * 4
        + extra
    )


def _jpeg(exif: bytes | None = None) -> bytes:
    app1 = b""
    if exif is not None:
        payload = b"Exif\0\0" + exif
        app1 = b"\xff\xe1" + struct.pack(">H", len(payload) + 2) + payload
    return b"\xff\xd8" + app1 + b"\xff\xda\x00\x02" + b"\x00" * 16 + b"\xff\xd9"


def test_reads_camera_and_date_from_jpeg_exif() -> None:
    exif = _tiff({0x010F: "Canon", 0x0110: "Canon EOS 2000D", 0x0132: "2019:03:12 08:47:00"})
    report = inspect_image(_jpeg(exif))
    assert report.format == "jpeg"
    assert report.camera == "Canon EOS 2000D"
    assert report.taken_at == "2019-03-12T08:47:00"
    assert not report.ai_signature
    assert not report.stripped


def test_jpeg_without_metadata_is_reported_as_stripped() -> None:
    report = inspect_image(_jpeg())
    assert report.stripped
    assert "ne prouve rien" in report.findings[-1]


def test_png_generation_parameters_reveal_the_generator() -> None:
    params = b"parameters\0a flooded street\nSteps: 30, Sampler: Euler a, Seed: 1"
    report = inspect_image(_png((b"tEXt", params)))
    assert report.ai_signature
    assert report.generator == "Stable Diffusion (AUTOMATIC1111)"


def test_png_xmp_ai_source_type_is_a_signature() -> None:
    xmp = (
        b'<x:xmpmeta><rdf:Description Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/'
        b'newscodes/digitalsourcetype/trainedAlgorithmicMedia"/></x:xmpmeta>'
    )
    itxt = b"XML:com.adobe.xmp\0\0\0\0\0" + xmp
    report = inspect_image(_png((b"iTXt", itxt)))
    assert report.ai_source_type
    assert report.ai_signature
    assert report.generator is None


def test_damaged_file_never_raises() -> None:
    assert inspect_image(b"\xff\xd8\xff\xe1\xff").format == "jpeg"
    assert inspect_image(b"not an image").format == "other"


def test_inspect_route_returns_camel_case(offline_client: TestClient) -> None:
    data = base64.b64encode(_png((b"tEXt", b"Software\0Midjourney v7"))).decode()
    response = offline_client.post(
        "/v1/media/inspect", json={"mimeType": "image/png", "data": data}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["aiSignature"] is True
    assert body["generator"] == "Midjourney"
    assert set(body) >= {"aiSignature", "aiSourceType", "c2pa", "takenAt", "findings"}


def test_inspect_route_rejects_invalid_base64(offline_client: TestClient) -> None:
    response = offline_client.post(
        "/v1/media/inspect", json={"mimeType": "image/png", "data": "%%%"}
    )
    assert response.status_code == 422
