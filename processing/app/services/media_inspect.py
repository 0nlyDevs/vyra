"""Lecture des informations cachées d'une image : EXIF, XMP, texte PNG, Content Credentials.

Aucune bibliothèque d'image : on lit seulement les blocs de métadonnées du fichier (JPEG, PNG,
WebP). Ce module ne dit jamais « vrai » ou « faux » : il relève ce que le fichier déclare.
Ces informations s'effacent souvent (réseaux sociaux, messageries) et se modifient facilement.
"""

import contextlib
import re
import struct
import zlib
from dataclasses import dataclass, field

# Mot-clé cherché dans les métadonnées (en minuscules) → nom affiché. Ordre : du plus précis.
AI_GENERATORS: tuple[tuple[str, str], ...] = (
    ("automatic1111", "Stable Diffusion (AUTOMATIC1111)"),
    ("comfyui", "ComfyUI"),
    ("stable diffusion", "Stable Diffusion"),
    ("stablediffusion", "Stable Diffusion"),
    ("midjourney", "Midjourney"),
    ("dall-e", "DALL·E"),
    ("dall·e", "DALL·E"),
    ("chatgpt", "ChatGPT"),
    ("openai", "OpenAI"),
    ("adobe firefly", "Adobe Firefly"),
    ("firefly", "Adobe Firefly"),
    ("imagen", "Google Imagen"),
    ("nano banana", "Google Gemini"),
    ("gemini", "Google Gemini"),
    ("black forest labs", "FLUX"),
    ("ideogram", "Ideogram"),
    ("leonardo.ai", "Leonardo.Ai"),
    ("novelai", "NovelAI"),
)
# Type de source IPTC : la norme pour déclarer une image produite par une IA.
AI_SOURCE_TYPES = ("trainedalgorithmicmedia", "compositewithtrainedalgorithmicmedia")
EXIF_TEXT_TAGS = {
    0x010F: "make",
    0x0110: "model",
    0x0131: "software",
    0x0132: "datetime",
    0x9003: "taken",
}
EXIF_SUB_IFD, GPS_IFD = 0x8769, 0x8825
EXIF_DATE = re.compile(r"^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})")
CREATOR_TOOL = re.compile(r"CreatorTool(?:>|=\")([^<\"]+)")


@dataclass
class MediaReport:
    format: str
    ai_signature: bool = False
    generator: str | None = None
    c2pa: bool = False
    ai_source_type: bool = False
    stripped: bool = False
    taken_at: str | None = None
    camera: str | None = None
    software: str | None = None
    gps: bool = False
    findings: list[str] = field(default_factory=list)


@dataclass
class _Blocks:
    exif: dict[str, str] = field(default_factory=dict)
    texts: list[str] = field(default_factory=list)
    keys: dict[str, str] = field(default_factory=dict)
    c2pa: bool = False


def _parse_tiff(data: bytes, into: dict[str, str]) -> None:
    """Champs texte utiles d'un bloc EXIF (format TIFF). Ignore tout ce qui est mal formé."""
    if len(data) < 8 or data[:2] not in (b"II", b"MM"):
        return
    order = "<" if data[:2] == b"II" else ">"
    if struct.unpack(order + "H", data[2:4])[0] != 42:
        return

    def read_ifd(offset: int, depth: int) -> None:
        if depth > 2 or offset < 8 or offset + 2 > len(data):
            return
        count = struct.unpack(order + "H", data[offset : offset + 2])[0]
        for index in range(min(count, 256)):
            entry = offset + 2 + index * 12
            if entry + 12 > len(data):
                return
            tag, kind, length = struct.unpack(order + "HHI", data[entry : entry + 8])
            value = data[entry + 8 : entry + 12]
            if tag == EXIF_SUB_IFD and kind in (4, 13):
                read_ifd(struct.unpack(order + "I", value)[0], depth + 1)
            elif tag == GPS_IFD:
                into["gps"] = "yes"
            elif tag in EXIF_TEXT_TAGS and kind == 2:
                if length > 4:
                    start = struct.unpack(order + "I", value)[0]
                    value = data[start : start + length]
                text = value[:length].split(b"\0", 1)[0].decode("utf-8", "replace").strip()
                if text:
                    into[EXIF_TEXT_TAGS[tag]] = text

    read_ifd(struct.unpack(order + "I", data[4:8])[0], 0)


def _read_jpeg(data: bytes, blocks: _Blocks) -> None:
    position = 2
    while position + 4 <= len(data) and data[position] == 0xFF:
        marker = data[position + 1]
        if marker == 0xFF:
            position += 1
            continue
        if marker in (0xDA, 0xD9):  # début de l'image elle-même : plus de métadonnées
            return
        length = struct.unpack(">H", data[position + 2 : position + 4])[0]
        payload = data[position + 4 : position + 2 + length]
        if marker == 0xE1 and payload.startswith(b"Exif\0\0"):
            _parse_tiff(payload[6:], blocks.exif)
        elif marker == 0xE1 and payload.startswith(b"http://ns.adobe.com/xap/1.0/\0"):
            blocks.texts.append(payload[29:].decode("utf-8", "replace"))
        elif marker == 0xEB:  # APP11 : boîtes JUMBF, où vivent les Content Credentials
            blocks.c2pa = blocks.c2pa or b"c2pa" in payload
            blocks.texts.append(payload.decode("latin-1"))
        elif marker == 0xFE:  # commentaire
            blocks.texts.append(payload.decode("utf-8", "replace"))
        position += 2 + length


def _png_text(kind: bytes, chunk: bytes) -> tuple[str, str] | None:
    key, _, rest = chunk.partition(b"\0")
    try:
        if kind == b"tEXt":
            return key.decode("latin-1"), rest.decode("latin-1")
        if kind == b"zTXt":
            return key.decode("latin-1"), zlib.decompress(rest[1:]).decode("latin-1")
        compressed, body = rest[:1] == b"\1", rest[2:]
        _language, _, body = body.partition(b"\0")
        _translated, _, text = body.partition(b"\0")
        raw = zlib.decompress(text) if compressed else text
        return key.decode("latin-1"), raw.decode("utf-8", "replace")
    except (zlib.error, IndexError):
        return None


def _read_png(data: bytes, blocks: _Blocks) -> None:
    position = 8
    while position + 8 <= len(data):
        length = struct.unpack(">I", data[position : position + 4])[0]
        kind = data[position + 4 : position + 8]
        chunk = data[position + 8 : position + 8 + length]
        if kind in (b"tEXt", b"zTXt", b"iTXt"):
            entry = _png_text(kind, chunk)
            if entry:
                blocks.keys[entry[0]] = entry[1]
        elif kind == b"eXIf":
            _parse_tiff(chunk, blocks.exif)
        elif kind == b"caBX":
            blocks.c2pa = True
            blocks.texts.append(chunk.decode("latin-1"))
        elif kind == b"IEND":
            return
        position += 12 + length


def _read_webp(data: bytes, blocks: _Blocks) -> None:
    position = 12
    while position + 8 <= len(data):
        kind = data[position : position + 4]
        size = struct.unpack("<I", data[position + 4 : position + 8])[0]
        chunk = data[position + 8 : position + 8 + size]
        if kind == b"EXIF":
            _parse_tiff(chunk[6:] if chunk.startswith(b"Exif\0\0") else chunk, blocks.exif)
        elif kind == b"XMP ":
            blocks.texts.append(chunk.decode("utf-8", "replace"))
        elif kind == b"C2PA":
            blocks.c2pa = True
            blocks.texts.append(chunk.decode("latin-1"))
        position += 8 + size + (size & 1)


def _detect_format(data: bytes) -> str:
    if data.startswith(b"\xff\xd8"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return "other"


def _iso_date(value: str | None) -> str | None:
    match = EXIF_DATE.match(value or "")
    if not match:
        return None
    year, month, day, hour, minute, second = match.groups()
    return f"{year}-{month}-{day}T{hour}:{minute}:{second}"


def inspect_image(data: bytes) -> MediaReport:
    """Ce que le fichier déclare sur lui-même. Ne lève jamais d'exception sur un fichier abîmé."""
    report = MediaReport(format=_detect_format(data))
    if report.format == "other":
        report.findings.append(
            "Format non lu : seules les images JPEG, PNG et WebP sont examinées."
        )
        return report

    blocks = _Blocks()
    # Fichier tronqué : on garde ce qui a été lu avant la coupure.
    with contextlib.suppress(struct.error, IndexError):
        {"jpeg": _read_jpeg, "png": _read_png, "webp": _read_webp}[report.format](data, blocks)

    exif, keys = blocks.exif, blocks.keys
    xmp = " ".join([*blocks.texts, keys.get("XML:com.adobe.xmp", "")])
    tool = CREATOR_TOOL.search(xmp)
    report.software = exif.get("software") or keys.get("Software") or (tool and tool.group(1))
    make, model = exif.get("make", ""), exif.get("model", "")
    camera = model if model.lower().startswith(make.lower()) else f"{make} {model}"
    report.camera = camera.strip() or None
    report.taken_at = _iso_date(exif.get("taken") or exif.get("datetime"))
    report.gps = "gps" in exif
    report.c2pa = blocks.c2pa

    haystack = " ".join([*exif.values(), *keys.keys(), *keys.values(), xmp]).lower()
    report.ai_source_type = any(marker in haystack for marker in AI_SOURCE_TYPES)
    if "parameters" in keys and "steps:" in keys["parameters"].lower():
        report.generator = "Stable Diffusion (AUTOMATIC1111)"
    elif "workflow" in keys and "prompt" in keys:
        report.generator = "ComfyUI"
    else:
        report.generator = next((name for word, name in AI_GENERATORS if word in haystack), None)
    report.ai_signature = report.generator is not None or report.ai_source_type
    report.stripped = not (exif or keys or blocks.texts or blocks.c2pa)
    report.findings = _findings(report)
    return report


def _findings(report: MediaReport) -> list[str]:
    found: list[str] = []
    if report.ai_source_type:
        found.append("Le fichier se déclare lui-même comme une image générée par IA.")
    if report.generator:
        found.append(f"Le fichier mentionne un outil de génération d'images : {report.generator}.")
    if report.c2pa:
        found.append("Le fichier porte des Content Credentials : une signature d'origine (C2PA).")
    if report.camera:
        found.append(f"Appareil enregistré : {report.camera}.")
    if report.taken_at:
        found.append(f"Date enregistrée dans le fichier : {report.taken_at.replace('T', ' à ')}.")
    if report.software and not report.generator:
        found.append(f"Logiciel enregistré : {report.software}.")
    if report.gps:
        found.append("Une position GPS est enregistrée.")
    if report.stripped:
        found.append(
            "Aucune information cachée : c'est courant après un passage par un réseau social ou "
            "une messagerie, et cela ne prouve rien."
        )
    return found
