'use client';

import { Building2, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FormField, FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';
import { addInstitution, addNotice, removeFromDirectory } from './actions';
import { type DirectoryEntry, formatPhone } from './check';

type Errors = Record<string, string[] | undefined>;

// Un formulaire de l'annuaire : envoie ses champs, affiche les erreurs, se vide une fois fait.
function useDirectoryForm(
  send: (
    values: Record<string, string>,
  ) => Promise<{ ok: true } | { ok: false; error: { message: string; fieldErrors?: Errors } }>,
  done: string,
) {
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(
      [...new FormData(form).entries()].map(([key, value]) => [key, String(value)]),
    );
    setErrors({});
    setMessage(null);
    startTransition(async () => {
      const result = await send(values);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        if (!result.error.fieldErrors) setMessage(result.error.message);
        return;
      }
      form.reset();
      toast.success(done);
    });
  }
  return { errors, message, pending, onSubmit };
}

function TextareaField({
  name,
  label,
  errors,
  rows = 4,
}: {
  name: string;
  label: string;
  errors?: string[];
  rows?: number;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        rows={rows}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? errorId : undefined}
      />
      {errors?.[0] && (
        <p id={errorId} className="text-destructive text-sm">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

function InstitutionForm() {
  const form = useDirectoryForm(addInstitution, 'Institution ajoutée à l’annuaire');
  return (
    <form onSubmit={form.onSubmit} className="grid gap-3 surface p-4">
      <h4 className="font-semibold">Ajouter une institution</h4>
      <FormField name="name" label="Nom" required errors={form.errors.name} />
      <FormField
        name="aliases"
        label="Autres noms"
        hint="Séparés par des virgules : la Régie, Régie des eaux…"
        errors={form.errors.aliases}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          name="domains"
          label="Sites et e-mails officiels"
          hint="regie-eaux.mg, autre-site.mg"
          errors={form.errors.domains}
        />
        <FormField
          name="phones"
          label="Numéros officiels"
          hint="034 00 001 01, +261 20 22 000 00"
          errors={form.errors.phones}
        />
        <FormField
          name="pages"
          label="Pages officielles"
          hint="facebook.com/regieeaux"
          errors={form.errors.pages}
        />
        <FormField
          name="senders"
          label="Noms d’expéditeur SMS"
          hint="REGIE-EAUX"
          errors={form.errors.senders}
        />
      </div>
      <FormField
        name="never"
        label="Ce qu’elle ne fait jamais"
        hint="Ne demande jamais de paiement par mobile money."
        errors={form.errors.never}
      />
      <FormMessage message={form.message} />
      <Button type="submit" disabled={form.pending} className="justify-self-start">
        <Plus aria-hidden />
        {form.pending ? 'Ajout…' : 'Ajouter l’institution'}
      </Button>
    </form>
  );
}

function NoticeForm({ institutionId }: { institutionId: string }) {
  // Un formulaire par institution sur la page : ses champs portent l'identifiant de l'institution
  // (identifiants uniques), retiré avant l'envoi.
  const suffix = `-${institutionId}`;
  const form = useDirectoryForm(
    (values) =>
      addNotice(
        Object.fromEntries(
          Object.entries(values).map(([key, value]) => [key.replace(suffix, ''), value]),
        ),
      ),
    'Communiqué ajouté',
  );
  const id = (name: string) => `${name}${suffix}`;
  return (
    <form onSubmit={form.onSubmit} className="grid gap-3 border-t pt-3">
      <input type="hidden" name="institutionId" value={institutionId} />
      <p className="font-medium text-sm">Ajouter un communiqué d’origine</p>
      <FormField name={id('title')} label="Titre" required errors={form.errors.title} />
      <TextareaField
        name={id('content')}
        label="Texte exact du communiqué"
        errors={form.errors.content}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          name={id('sourceUrl')}
          label="Lien vers l’original (facultatif)"
          type="url"
          errors={form.errors.sourceUrl}
        />
        <FormField
          name={id('publishedAt')}
          label="Date de publication (facultative)"
          type="date"
          errors={form.errors.publishedAt}
        />
      </div>
      <FormMessage message={form.message} />
      <Button
        type="submit"
        variant="outline"
        disabled={form.pending}
        className="justify-self-start"
      >
        <Plus aria-hidden />
        {form.pending ? 'Ajout…' : 'Ajouter le communiqué'}
      </Button>
    </form>
  );
}

function RemoveButton({
  kind,
  id,
  label,
}: {
  kind: 'institution' | 'notice';
  id: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={label}
      onClick={() =>
        startTransition(async () => {
          const result = await removeFromDirectory({ kind, id });
          if (result.ok) toast.success('Retiré de l’annuaire');
          else toast.error(result.error.message);
        })
      }
    >
      <Trash2 aria-hidden />
      Retirer
    </Button>
  );
}

function Channels({ entry }: { entry: DirectoryEntry }) {
  const { domains, phones, pages, senders } = entry.channels;
  const rows = [
    ['Sites', domains],
    ['Numéros', phones.map(formatPhone)],
    ['Pages', pages],
    ['SMS', senders],
  ] as const;
  return (
    <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
      {rows
        .filter(([, values]) => values.length > 0)
        .map(([label, values]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-all font-mono">{values.join(' · ')}</dd>
          </div>
        ))}
    </dl>
  );
}

// L'annuaire officiel : lisible par tous, tenu à jour par les vérificateurs.
export function Directory({ entries, canEdit }: { entries: DirectoryEntry[]; canEdit: boolean }) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="font-semibold text-xl">L’annuaire officiel</h2>
        <p className="text-muted-foreground text-pretty text-sm">
          Les canaux par lesquels chaque institution parle vraiment, et ses communiqués d’origine.
          {canEdit
            ? ' Recopiez-les depuis le site ou la page officielle, jamais depuis un message transféré.'
            : ' Tenu à jour par les vérificateurs.'}
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-muted-foreground">
          L’annuaire est vide pour le moment.
        </p>
      ) : (
        <ul className="grid gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="grid gap-3 surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  <Building2 aria-hidden className="size-5" />
                  {entry.name}
                </p>
                {canEdit && (
                  <RemoveButton kind="institution" id={entry.id} label={`Retirer ${entry.name}`} />
                )}
              </div>
              <Channels entry={entry} />
              {entry.never && <p className="text-pretty text-sm">Ne fait jamais : {entry.never}</p>}
              {entry.notices.length > 0 && (
                <ul className="grid gap-2">
                  {entry.notices.map((notice) => (
                    <li key={notice.id} className="grid gap-1 rounded-xl bg-card p-3 text-sm">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {notice.title}
                          {notice.publishedAt && (
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              · {formatDate(notice.publishedAt)}
                            </span>
                          )}
                        </span>
                        {canEdit && (
                          <RemoveButton
                            kind="notice"
                            id={notice.id}
                            label={`Retirer le communiqué ${notice.title}`}
                          />
                        )}
                      </span>
                      <span className="text-pretty">{notice.content}</span>
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && <NoticeForm institutionId={entry.id} />}
            </li>
          ))}
        </ul>
      )}
      {canEdit && <InstitutionForm />}
    </section>
  );
}
