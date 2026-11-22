import { removeFromDirectory } from '@/features/impersonation/actions';
import { apiResult } from '@/server/api';

// Retirer de l'annuaire une institution (`kind` = institution) ou un communiqué (`notice`).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  return apiResult(await removeFromDirectory({ kind, id }));
}
