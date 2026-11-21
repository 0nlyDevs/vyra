import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Écran d'attente d'un module pas encore construit : ce qu'il doit faire, et quand il est fini.
// À supprimer de la page dès que le module a son vrai contenu.
export function ModulePlaceholder({
  icon: Icon,
  todo,
  doneWhen,
}: {
  icon: LucideIcon;
  todo: string[];
  doneWhen: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Icon aria-hidden className="size-5 text-primary" />À construire
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="grid list-disc gap-1.5 pl-5">
          {todo.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-muted-foreground text-sm">Fini quand : {doneWhen}</p>
      </CardContent>
    </Card>
  );
}
