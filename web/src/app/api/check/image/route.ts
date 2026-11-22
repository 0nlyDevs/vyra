import { IMAGE_TYPES } from '@/features/scan/schema';
import { inspectMedia } from '@/server/processing';
import { clientIp, withinLimit } from '@/server/rate-limit';

// Examen d'une image pour l'extension du navigateur, sans compte : ce que le fichier déclare sur
// lui-même (outil de génération, Content Credentials, appareil, date, position). Rien n'est gardé,
// l'IA n'est pas appelée et il n'y a jamais de verdict : « aucun marqueur » ne veut pas dire
// « authentique ». Plafond de 4 Mo : c'est la limite d'une requête sur l'hébergeur.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await withinLimit(`check-image:ip:${await clientIp()}`, 30, 60 * 60))) {
    return Response.json(
      { error: 'Trop d’examens d’images. Réessayez plus tard.' },
      { status: 429 },
    );
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'Choisissez une image.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'Cette image dépasse 4 Mo.' }, { status: 413 });
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return Response.json({ error: 'Formats acceptés : JPEG, PNG ou WebP.' }, { status: 415 });
  }
  const report = await inspectMedia({
    mimeType: file.type,
    data: Buffer.from(await file.arrayBuffer()).toString('base64'),
  });
  if (!report.ok) {
    return Response.json(
      { error: 'L’examen n’a pas pu se faire. Réessayez dans un instant.' },
      { status: 502 },
    );
  }
  const { aiSignature, aiSourceType, generator, stripped } = report.data;
  // Trois états seulement, jamais « vrai » ou « faux » : marqueur trouvé, fichier nettoyé (rien à
  // en conclure), ou rien trouvé.
  const level =
    aiSignature || aiSourceType || generator ? 'detected' : stripped ? 'inconclusive' : 'none';
  return Response.json({
    level,
    format: report.data.format,
    generator: report.data.generator,
    c2pa: report.data.c2pa,
    stripped,
    takenAt: report.data.takenAt,
    camera: report.data.camera,
    software: report.data.software,
    gps: report.data.gps,
    findings: report.data.findings,
  });
}
