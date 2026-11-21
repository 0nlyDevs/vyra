'use client';

import { ArrowRight, Send } from 'lucide-react';
import Link from 'next/link';
import { type Ref, useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FormField, FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { appendText, DictateButton } from '@/features/dictation/DictateButton';
import { REPORT_CASE_THRESHOLD, REPORT_REASON_LABELS, REPORT_REASONS } from '@/lib/domain';
import { submitReport } from './actions';

export type ReportDefaults = { content: string; url: string; feedPostId: string };

function reportedBy(count: number) {
  return count > 1 ? `${count} personnes ont signalé` : `${count} personne a signalé`;
}

// Formulaire de signalement. Les champs sont contrôlés : ils gardent leur valeur quand le serveur
// renvoie une erreur, et se vident après un envoi réussi.
export function ReportForm({ defaults }: { defaults: ReportDefaults }) {
  const [state, formAction, pending] = useActionState(submitReport, null);
  const [content, setContent] = useState(defaults.content);
  const [url, setUrl] = useState(defaults.url);
  const [feedPostId, setFeedPostId] = useState(defaults.feedPostId);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const outcomeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    setContent('');
    setUrl('');
    setFeedPostId('');
    setReason('');
    setDescription('');
    const { reporterCount, caseId } = state.data;
    toast.success(caseId ? 'Une vérification commence' : 'Signalement envoyé', {
      id: `report-${reporterCount}-${caseId ?? 'none'}`,
      description: `${reportedBy(reporterCount)} ce contenu.`,
    });
    // Le résultat s'affiche sous le formulaire : on l'amène à l'écran (moment clé de la démo).
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    outcomeRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [state]);

  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const formError = state && !state.ok && !fieldErrors ? state.error.message : null;

  return (
    <div className="grid gap-6">
      <form action={formAction} className="grid gap-5">
        <input type="hidden" name="feedPostId" value={feedPostId} />

        <div className="grid gap-2">
          <Label htmlFor="content">Le contenu</Label>
          <Textarea
            id="content"
            name="content"
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            aria-invalid={fieldErrors?.content ? true : undefined}
            aria-describedby={fieldErrors?.content ? 'content-hint content-error' : 'content-hint'}
          />
          <p id="content-hint" className="text-muted-foreground text-sm">
            {feedPostId
              ? 'Repris de la publication du fil d’actualité.'
              : 'Collez le texte tel que vous l’avez reçu.'}
          </p>
          <DictateButton onText={(text) => setContent((current) => appendText(current, text))} />
          {fieldErrors?.content && (
            <p id="content-error" className="text-destructive text-sm">
              {fieldErrors.content[0]}
            </p>
          )}
        </div>

        <FormField
          name="url"
          label="Ou son lien (facultatif)"
          inputMode="url"
          placeholder="https://"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          errors={fieldErrors?.url}
        />

        <fieldset className="grid gap-2">
          <legend className="mb-2 font-medium text-sm">Motif</legend>
          <RadioGroup
            name="reason"
            value={reason}
            onValueChange={setReason}
            aria-invalid={fieldErrors?.reason ? true : undefined}
            aria-describedby={fieldErrors?.reason ? 'reason-error' : undefined}
            className="grid gap-2 sm:grid-cols-2"
          >
            {REPORT_REASONS.map((value) => (
              <Label
                key={value}
                htmlFor={`reason-${value}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 font-normal transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
              >
                <RadioGroupItem id={`reason-${value}`} value={value} />
                {REPORT_REASON_LABELS[value]}
              </Label>
            ))}
          </RadioGroup>
          {fieldErrors?.reason && (
            <p id="reason-error" className="text-destructive text-sm">
              {fieldErrors.reason[0]}
            </p>
          )}
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor="description">Pourquoi il vous semble suspect (facultatif)</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={fieldErrors?.description ? true : undefined}
          />
          {fieldErrors?.description && (
            <p className="text-destructive text-sm">{fieldErrors.description[0]}</p>
          )}
        </div>

        <FormMessage message={formError} />
        <Button type="submit" size="lg" disabled={pending} className="justify-self-start">
          <Send aria-hidden />
          {pending ? 'Envoi…' : 'Envoyer le signalement'}
        </Button>
      </form>

      {state?.ok && <ReportOutcomePanel ref={outcomeRef} {...state.data} />}
    </div>
  );
}

// Ce que le signalement a déclenché : le compte vers le seuil, ou l'affaire ouverte.
function ReportOutcomePanel({
  ref,
  reporterCount,
  caseId,
}: {
  ref: Ref<HTMLElement>;
  reporterCount: number;
  caseId: string | null;
}) {
  const reached = Math.min(reporterCount, REPORT_CASE_THRESHOLD);
  return (
    <section
      ref={ref}
      aria-live="polite"
      className="grid gap-3 rounded-xl border bg-muted/40 p-5"
      aria-label="Résultat du signalement"
    >
      <p className="font-semibold text-lg">
        {caseId ? 'Une vérification commence.' : 'Merci, votre signalement est enregistré.'}
      </p>
      <div className="grid gap-1.5">
        <Progress value={(reached / REPORT_CASE_THRESHOLD) * 100} aria-hidden />
        <p className="text-muted-foreground text-sm tabular-nums">
          {reportedBy(reporterCount)} ce contenu
          {caseId
            ? ' : une affaire est ouverte pour le vérifier.'
            : `. À ${REPORT_CASE_THRESHOLD}, une vérification commence.`}
        </p>
      </div>
      {caseId && (
        <Button asChild className="justify-self-start">
          <Link href={`/cases/${caseId}`}>
            Voir l’affaire
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Link>
        </Button>
      )}
    </section>
  );
}
