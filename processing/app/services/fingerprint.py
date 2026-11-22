"""Empreinte d'une image (« dHash », 64 bits), calculée ici pour l'application mobile.

Même méthode que celle du navigateur (`web/src/features/scan/fingerprint.ts`) : réduction en deux
étapes (18 x 16 puis 9 x 8, chaque point devient la moyenne de sa zone), puis un bit par paire de
points voisins (plus clair à gauche ?). Elle résiste à une recompression ou un léger recadrage.
Les empreintes comparées entre elles sont toujours calculées au même endroit (ici, ou dans le
navigateur) : on ne mélange pas les deux.
"""

import io

from PIL import Image, ImageOps, UnidentifiedImageError

from app.services.safe_copy import UnreadableImageError


def image_fingerprint(data: bytes) -> str:
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError) as exc:
        raise UnreadableImageError("image illisible") from exc
    image = ImageOps.exif_transpose(image).convert("RGB")
    # Filtre de Hamming : le plus proche du lissage « high » du navigateur. Mesuré sur la démo :
    # photo d'origine et version virale à 4 bits, images sans rapport à 29 (seuil : 12).
    hamming = Image.Resampling.HAMMING
    small = image.resize((18, 16), hamming).resize((9, 8), hamming)
    pixels = small.load()
    bits = []
    for y in range(8):
        for x in range(8):
            left = _luminance(pixels[x, y])
            right = _luminance(pixels[x + 1, y])
            bits.append("1" if left > right else "0")
    return "".join(bits)


def _luminance(rgb: tuple[int, int, int]) -> float:
    red, green, blue = rgb
    return red * 0.299 + green * 0.587 + blue * 0.114
