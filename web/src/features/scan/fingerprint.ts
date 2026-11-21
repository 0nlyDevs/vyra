// Empreinte d'une image (« dHash », 64 bits), calculée dans le navigateur. Elle résiste à une
// recompression, un redimensionnement ou un léger recadrage : une photo reçue par messagerie
// garde presque la même empreinte que l'originale. On compare par le nombre de bits différents.

async function draw(source: Blob, width: number, height: number) {
  const bitmap = await createImageBitmap(source);
  // Deux étapes (18 × 16 puis 9 × 8) : chaque point devient une moyenne de la zone, ce qui
  // efface les détails d'une recompression. Mesuré : photo d'origine et version virale à 5 bits.
  const step = new OffscreenCanvas(18, 16);
  const stepContext = step.getContext('2d');
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!stepContext || !context) throw new Error('canvas unavailable');
  stepContext.imageSmoothingQuality = 'high';
  stepContext.drawImage(bitmap, 0, 0, 18, 16);
  bitmap.close();
  context.imageSmoothingQuality = 'high';
  context.drawImage(step, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}

function luminance(data: Uint8ClampedArray, index: number) {
  return (
    (data[index] ?? 0) * 0.299 + (data[index + 1] ?? 0) * 0.587 + (data[index + 2] ?? 0) * 0.114
  );
}

export async function imageFingerprint(source: Blob): Promise<string> {
  const data = await draw(source, 9, 8);
  let bits = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = (y * 9 + x) * 4;
      bits += luminance(data, left) > luminance(data, left + 4) ? '1' : '0';
    }
  }
  return bits;
}

export function fingerprintDistance(a: string, b: string) {
  let distance = 0;
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) distance++;
  return distance;
}
