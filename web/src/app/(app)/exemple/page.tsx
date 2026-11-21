import { EmptyState } from '@/components/states/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NoteForm } from '@/features/notes/NoteForm';
import { SearchForm } from '@/features/notes/SearchForm';
import { SummaryCard } from '@/features/notes/SummaryCard';
import { listNotes } from '@/server/dal/notes';
import { requireProfile } from '@/server/session';

// Page d'exemple : montre toute la chaîne (base, recherche par le sens, IA avec secours).
// Modèle à copier pour une vraie fonctionnalité ; la page reste accessible depuis le kit.
export default async function ExamplePage() {
  const profile = await requireProfile();
  const notes = await listNotes(profile.id);

  return (
    <div className="grid gap-8">
      <h1 className="font-semibold text-3xl">Exemple complet : les notes</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Mes notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <NoteForm />
            {notes.length === 0 ? (
              <EmptyState title="Aucune note pour l’instant." />
            ) : (
              <ul className="grid gap-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-lg border px-4 py-3">
                    {note.content}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <div className="grid content-start gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Assistant IA</CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryCard />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recherche</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
