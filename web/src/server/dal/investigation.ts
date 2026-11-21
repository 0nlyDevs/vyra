import 'server-only';
import { asc, cosineDistance, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { ChangeType, LinkConfidence, WebSearchStatus } from '@/lib/domain';
import { db } from '@/server/db';
import {
  cases,
  caseVersions,
  versionExplorations,
  versionLinks,
  webSearches,
} from '@/server/db/schema';

// Écritures et recherches du module Enquête sur le dossier commun (tables de l'affaire).

// Les sources déjà explorées d'une affaire, et le nombre de reprises ajoutées par chacune.
export function listExploredVersions(caseId: string) {
  return db
    .select({
      versionId: versionExplorations.versionId,
      addedCount: versionExplorations.addedCount,
    })
    .from(versionExplorations)
    .where(eq(versionExplorations.caseId, caseId));
}

// Ajoute les reprises trouvées en explorant une version : les nouvelles versions, leurs liens, puis
// renumérote toutes les versions de l'affaire par date (1 = la plus ancienne). Renvoie false si
// cette version a déjà été explorée.
export async function addExploredVersions(input: {
  caseId: string;
  exploredId: string;
  versions: {
    key: string;
    content: string;
    sourceName: string;
    sourceUrl: string;
    publishedAt: Date | null;
  }[];
  // Clés : celles des nouvelles versions, ou l'identifiant d'une version existante.
  links: {
    from: string;
    to: string;
    changeType: ChangeType;
    note: string;
    confidence: LinkConfidence;
  }[];
}) {
  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(versionExplorations)
      .values({
        versionId: input.exploredId,
        caseId: input.caseId,
        addedCount: input.versions.length,
      })
      .onConflictDoNothing()
      .returning({ versionId: versionExplorations.versionId });
    if (!claimed) return false;

    // Une page déjà dans l'arbre (trouvée par une autre exploration en même temps) n'est pas
    // ajoutée deux fois : ses liens pointent vers la version existante.
    const existing = await tx
      .select({ id: caseVersions.id, sourceUrl: caseVersions.sourceUrl })
      .from(caseVersions)
      .where(eq(caseVersions.caseId, input.caseId));
    const idByUrl = new Map(existing.map((row) => [row.sourceUrl, row.id]));
    const idOf = new Map<string, string>();
    for (const version of input.versions) {
      const { key, ...values } = version;
      const known = idByUrl.get(values.sourceUrl);
      if (known) {
        idOf.set(key, known);
        continue;
      }
      const [inserted] = await tx
        .insert(caseVersions)
        .values({ caseId: input.caseId, position: 0, ...values })
        .returning({ id: caseVersions.id });
      if (inserted) {
        idOf.set(key, inserted.id);
        idByUrl.set(values.sourceUrl, inserted.id);
      }
    }
    const links = input.links.flatMap((link) => {
      const fromVersionId = idOf.get(link.from) ?? link.from;
      const toVersionId = idOf.get(link.to) ?? link.to;
      if (fromVersionId === toVersionId) return [];
      return [{ ...link, caseId: input.caseId, fromVersionId, toVersionId }];
    });
    if (links.length > 0) {
      await tx.insert(versionLinks).values(links.map(({ from: _from, to: _to, ...link }) => link));
    }

    // Les numéros suivent les dates : une reprise trouvée plus tard s'insère à sa place.
    await tx.execute(sql`
      update ${caseVersions} set position = ranked.rank
      from (
        select id, row_number() over (order by published_at asc nulls last, position asc) as rank
        from ${caseVersions} where case_id = ${input.caseId}
      ) as ranked
      where ${caseVersions.id} = ranked.id
    `);
    return true;
  });
}

// Affaires sans vecteur : celles des données de démo, ou créées quand l'IA était indisponible.
export function listCasesWithoutEmbedding() {
  return db
    .select({ id: cases.id, title: cases.title, claim: cases.claim })
    .from(cases)
    .where(isNull(cases.embedding));
}

export async function setCaseEmbeddings(items: { id: string; embedding: number[] }[]) {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.update(cases).set({ embedding: item.embedding }).where(eq(cases.id, item.id));
    }
  });
}

// Les affaires les plus proches par le sens, de la plus proche à la moins proche, avec leur
// distance (0 = identique, 1 = sans rapport).
export async function findClosestCasesByMeaning(embedding: number[], limit: number) {
  const distance = cosineDistance(cases.embedding, embedding);
  const rows = await db
    .select({ id: cases.id, claim: cases.claim, distance })
    .from(cases)
    .where(isNotNull(cases.embedding))
    .orderBy(distance)
    .limit(limit);
  return rows.map((row) => ({ ...row, distance: Number(row.distance) }));
}

// Tous les textes connus d'une affaire (l'information et ses versions), pour la recherche par mots.
export async function listCaseTexts() {
  const [caseRows, versionRows] = await Promise.all([
    db.select({ id: cases.id, title: cases.title, claim: cases.claim }).from(cases),
    db
      .select({ caseId: caseVersions.caseId, content: caseVersions.content })
      .from(caseVersions)
      .orderBy(asc(caseVersions.position)),
  ]);
  return caseRows.map((item) => ({
    id: item.id,
    texts: [
      item.claim,
      ...versionRows.filter((version) => version.caseId === item.id).map((v) => v.content),
    ],
  }));
}

export async function getWebSearch(caseId: string) {
  const [found] = await db
    .select()
    .from(webSearches)
    .where(eq(webSearches.caseId, caseId))
    .limit(1);
  return found ?? null;
}

// Une version de la chaîne : déjà en base (`id`), ou un article à ajouter.
export type OrderedVersion =
  | { id: string }
  | {
      content: string;
      sourceName: string;
      sourceUrl: string;
      publishedAt: Date | null;
    };

export type LinkBetween = {
  // Indices dans `ordered` : `to` reprend `from`.
  from: number;
  to: number;
  changeType: ChangeType;
  note: string;
  confidence: LinkConfidence;
};

// Enregistre le résultat de la recherche web : les articles deviennent des versions, toutes les
// versions sont renumérotées dans l'ordre donné (1 = la plus ancienne) et reliées. Renvoie false
// si une recherche a déjà été enregistrée pour cette affaire (deux onglets ouverts…).
export async function saveWebSearch(input: {
  caseId: string;
  status: WebSearchStatus;
  foundCount: number;
  contradictingCount: number;
  ordered: OrderedVersion[];
  links: LinkBetween[];
}) {
  return db.transaction(async (tx) => {
    const added = input.ordered.filter((item) => !('id' in item)).length;
    const [claimed] = await tx
      .insert(webSearches)
      .values({
        caseId: input.caseId,
        status: input.status,
        foundCount: input.foundCount,
        keptCount: added,
        contradictingCount: input.contradictingCount,
      })
      .onConflictDoNothing()
      .returning({ caseId: webSearches.caseId });
    if (!claimed) return false;

    const ids: string[] = [];
    for (const [index, item] of input.ordered.entries()) {
      if ('id' in item) {
        await tx
          .update(caseVersions)
          .set({ position: index + 1 })
          .where(eq(caseVersions.id, item.id));
        ids.push(item.id);
      } else {
        const [inserted] = await tx
          .insert(caseVersions)
          .values({ caseId: input.caseId, position: index + 1, ...item })
          .returning({ id: caseVersions.id });
        if (!inserted) throw new Error('Insertion d’une version sans retour');
        ids.push(inserted.id);
      }
    }

    const links = input.links.flatMap((link) => {
      const fromVersionId = ids[link.from];
      const toVersionId = ids[link.to];
      if (!fromVersionId || !toVersionId) return [];
      return [
        {
          caseId: input.caseId,
          fromVersionId,
          toVersionId,
          changeType: link.changeType,
          note: link.note,
          confidence: link.confidence,
        },
      ];
    });
    if (links.length > 0) await tx.insert(versionLinks).values(links);
    return true;
  });
}

// Une nouvelle affaire et sa première version : le texte tel qu'il a été reçu.
export async function createCaseWithFirstVersion(input: {
  title: string;
  claim: string;
  embedding: number[] | null;
  sourceName: string;
  sourceUrl: string | null;
}) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(cases)
      .values({ title: input.title, claim: input.claim, embedding: input.embedding })
      .returning({ id: cases.id });
    if (!created) throw new Error('Insertion de l’affaire sans retour');
    await tx.insert(caseVersions).values({
      caseId: created.id,
      position: 1,
      content: input.claim,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      publishedAt: new Date(),
    });
    return created;
  });
}
