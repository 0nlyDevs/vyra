import { Play, Users } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/PageHeader';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GAME_GRADE_LABELS, GAME_GRADE_TONES, GAME_GRADES, gameGradeOf } from '@/lib/domain';
import { countScenarios, getPlayerRecord } from '@/server/dal/game';
import { requireProfile } from '@/server/session';

export const metadata = { title: 'Vrai ou fake ?' };

const HOW_TO_PLAY = [
  'Lisez l’information, présentée comme dans un fil d’actualité.',
  'Retournez les indices un par un et dites ce que chacun vous inspire.',
  'Répondez : vrai, fake, ou impossible à dire. Puis découvrez le réflexe à garder.',
];

// Les bonnes réponses qui mènent à chaque grade, pour une série de `total` informations.
function gradeRange(grade: (typeof GAME_GRADES)[number], total: number) {
  const scores = Array.from({ length: total + 1 }, (_, score) => score).filter(
    (score) => gameGradeOf(score, total) === grade,
  );
  const [first, last] = [scores[0], scores.at(-1)];
  if (first === undefined || last === undefined) return '';
  return first === last ? `${first} sur ${total}` : `${first} à ${last} sur ${total}`;
}

// Accueil du jeu vrai ou fake : comment jouer, et la progression de la personne.
export default async function GamePage() {
  const profile = await requireProfile();
  const [total, record] = await Promise.all([countScenarios(), getPlayerRecord(profile.id)]);
  const best = record.best;
  const bestGrade = best ? gameGradeOf(best.score, best.total) : null;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 4"
        title="Vrai ou fake ?"
        description={`Une série de ${total} informations : examinez les indices, puis dites si c’est vrai, fake, ou impossible à dire.`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Comment se joue une série</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <ol className="grid gap-3">
              {HOW_TO_PLAY.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground text-sm tabular-nums">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/game/play">
                  <Play aria-hidden />
                  Jouer une série
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/game/family">
                  <Users aria-hidden />
                  Bonus : le groupe famille
                </Link>
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              Toutes les informations du jeu sont inventées, comme les lieux et les médias cités.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Votre progression</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {best && bestGrade ? (
              <div className="grid gap-2">
                <p className="text-muted-foreground text-sm">Meilleure série</p>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-3xl tabular-nums">
                    {best.score} / {best.total}
                  </p>
                  <ToneBadge tone={GAME_GRADE_TONES[bestGrade]}>
                    {GAME_GRADE_LABELS[bestGrade]}
                  </ToneBadge>
                </div>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {record.runsPlayed} série{record.runsPlayed > 1 ? 's' : ''} jouée
                  {record.runsPlayed > 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Pas encore de série jouée. Votre grade apparaîtra ici.
              </p>
            )}

            <div className="grid gap-2">
              <p className="font-medium text-sm">Les grades</p>
              <ul className="grid gap-2">
                {GAME_GRADES.map((grade) => (
                  <li key={grade} className="flex items-center justify-between gap-3">
                    <ToneBadge tone={GAME_GRADE_TONES[grade]}>{GAME_GRADE_LABELS[grade]}</ToneBadge>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {gradeRange(grade, total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
