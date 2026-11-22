"""Copie protégée d'une image, avant tout envoi hors de l'application.

Une photo reçue montre souvent des personnes qui n'ont rien demandé, et garde dans ses
informations cachées l'appareil, la date et parfois le lieu exact (GPS). Avant de la confier à
une IA ou à un moteur de recherche inversée, on en fait une copie :

- redressée selon son orientation déclarée, puis réduite à 2 048 px au plus ;
- visages floutés (détecteurs de face et de profil d'OpenCV, sur l'image et sur son reflet) ;
- réencodée en JPEG sans aucune information cachée (EXIF, GPS, XMP, IPTC, profil, miniature) ;
- une seule image : la première d'un GIF ou d'un WebP animé.

Le détecteur rate des visages petits, flous, de trois quarts ou masqués : la copie réduit le
risque, elle ne l'annule pas. On le dit à l'écran.
"""

import io
import logging
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

logger = logging.getLogger(__name__)

MAX_SIDE = 2048
# Au-delà, on refuse plutôt que de décoder (bombe de décompression).
MAX_PIXELS = 60_000_000
JPEG_QUALITY = 88
# Le flou déborde du cadre détecté : cheveux, oreilles, menton.
FACE_MARGIN = 0.25
# Ce qui reste d'un visage flouté : quelques pixels sur sa largeur.
FACE_CELLS = 6
# Taille minimale d'un visage cherché, en part du plus petit côté de l'image.
MIN_FACE_RATIO = 0.03

_FRONTAL = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
_FRONTAL_ALT = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")
_PROFILE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")

Image.MAX_IMAGE_PIXELS = MAX_PIXELS


class UnreadableImageError(ValueError):
    """Le fichier n'est pas une image lisible, ou il est trop grand."""


@dataclass(frozen=True)
class SafeCopy:
    data: bytes
    width: int
    height: int
    faces_blurred: int
    # Vrai quand l'original portait des informations cachées, maintenant retirées.
    metadata_removed: bool
    # Vrai quand l'original avait plusieurs images (GIF, WebP animé) : seule la première est gardée.
    first_frame_only: bool


Box = tuple[int, int, int, int]


def _had_metadata(image: Image.Image) -> bool:
    if image.getexif():
        return True
    keys = {"exif", "xmp", "XML:com.adobe.xmp", "icc_profile", "photoshop", "iptc", "comment"}
    return any(key in image.info for key in keys) or bool(getattr(image, "text", None))


def _overlap(a: Box, b: Box) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    width = min(ax + aw, bx + bw) - max(ax, bx)
    height = min(ay + ah, by + bh) - max(ay, by)
    if width <= 0 or height <= 0:
        return 0.0
    return (width * height) / min(aw * ah, bw * bh)


def _merge(boxes: list[Box]) -> list[Box]:
    """Un visage vu par deux détecteurs ne compte qu'une fois (on garde le plus grand cadre)."""
    kept: list[Box] = []
    for box in sorted(boxes, key=lambda item: item[2] * item[3], reverse=True):
        if all(_overlap(box, other) < 0.4 for other in kept):
            kept.append(box)
    return kept


def find_faces(gray: np.ndarray) -> list[Box]:
    height, width = gray.shape
    smallest = max(20, int(min(width, height) * MIN_FACE_RATIO))
    equalized = cv2.equalizeHist(gray)
    options = {"scaleFactor": 1.1, "minSize": (smallest, smallest)}
    boxes: list[Box] = []
    for detector, neighbors in ((_FRONTAL, 5), (_FRONTAL_ALT, 4), (_PROFILE, 5)):
        boxes += [
            tuple(int(v) for v in b)
            for b in detector.detectMultiScale(equalized, minNeighbors=neighbors, **options)
        ]
    # Le détecteur de profil ne voit qu'un côté : on cherche aussi sur l'image retournée.
    mirrored = cv2.flip(equalized, 1)
    for x, y, w, h in _PROFILE.detectMultiScale(mirrored, minNeighbors=5, **options):
        boxes.append((int(width - x - w), int(y), int(w), int(h)))
    return _merge(boxes)


def _blur(pixels: np.ndarray, boxes: list[Box]) -> None:
    """Le visage est réduit à quelques pixels puis agrandi en douceur : il n'en reste que des taches
    de couleur, sans détail à reconstituer ni bord de case qui trahirait la forme."""
    height, width = pixels.shape[:2]
    for x, y, w, h in boxes:
        dx, dy = int(w * FACE_MARGIN), int(h * FACE_MARGIN)
        left, top = max(0, x - dx), max(0, y - dy)
        right, bottom = min(width, x + w + dx), min(height, y + h + dy)
        region = pixels[top:bottom, left:right]
        if region.size == 0:
            continue
        region_height, region_width = region.shape[:2]
        scale = FACE_CELLS / min(region_height, region_width)
        small = cv2.resize(
            region,
            (max(1, round(region_width * scale)), max(1, round(region_height * scale))),
            interpolation=cv2.INTER_AREA,
        )
        smooth = cv2.resize(small, (region_width, region_height), interpolation=cv2.INTER_LINEAR)
        kernel = max(3, (min(region_height, region_width) // 6) | 1)
        pixels[top:bottom, left:right] = cv2.GaussianBlur(smooth, (kernel, kernel), 0)


def make_safe_copy(data: bytes) -> SafeCopy:
    try:
        source = Image.open(io.BytesIO(data))
        source.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError) as exc:
        raise UnreadableImageError("image illisible") from exc

    metadata_removed = _had_metadata(source)
    first_frame_only = getattr(source, "n_frames", 1) > 1
    # Orientation déclarée appliquée aux pixels : la copie n'a plus besoin de l'EXIF.
    image = ImageOps.exif_transpose(source).convert("RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)

    pixels = np.array(image)
    faces = find_faces(cv2.cvtColor(pixels, cv2.COLOR_RGB2GRAY))
    _blur(pixels, faces)

    # Une image neuve, faite des seuls pixels : rien de l'original ne la suit.
    clean = Image.fromarray(pixels, mode="RGB")
    output = io.BytesIO()
    clean.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return SafeCopy(
        data=output.getvalue(),
        width=clean.width,
        height=clean.height,
        faces_blurred=len(faces),
        metadata_removed=metadata_removed,
        first_frame_only=first_frame_only,
    )
