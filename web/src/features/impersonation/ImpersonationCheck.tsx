'use client';

import {
  BadgeCheck,
  Banknote,
  CircleHelp,
  FileText,
  Globe,
  type LucideIcon,
  MessageSquareText,
  Phone,
  ScanSearch,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { type FormEvent, useState, useTransition } from 'react';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { LoadingState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DiffText } from '@/features/investigation/VersionPanels';
import { WarningSigns } from '@/features/signals/WarningSigns';
import { formatDate } from '@/lib/format';
import { checkMessage } from './actions';
import {
  type ChannelFinding,
  type ChannelKind,
  formatPhone,
  type ImpersonationReport,
} from './check';

const KIND_ICONS = {
  domain: Globe,
  phone: Phone,
  page: Users,
  sender: MessageSquareText,
} satisfies Record<ChannelKind, LucideIcon>;

const KIND_LABELS = {
  domain: 'Adresse',
  phone: 'Numéro',
  page: 'Page',
  sender: 'Expéditeur',
} satisfies Record<ChannelKind, string>;

function Channel({ finding }: { finding: ChannelFinding }) {
  const Icon = KIND_ICONS[finding.kind];
  const value = finding.kind === 'phone' ? formatPhone(finding.value) : finding.value;
  return (
    <li className="grid gap-1.5 rounded-xl bg-card p-3">
      <span className="flex flex-wrap items-center gap-2">
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">{KIND_LABELS[finding.kind]}</span>
        <span className="break-all font-mono text-sm">{value}</span>
      </span>
      {finding.status === 'official' ? (
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <ToneBadge tone="success">
            <BadgeCheck aria-hidden />
            Canal officiel
          </ToneBadge>
          <span>de {finding.institution}</span>
        </span>
      ) : finding.status === 'lookalike' ? (
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <ToneBadge tone="danger">
            <ShieldAlert aria-hidden />
            Imitation
          </ToneBadge>
          <span>
            ressemble à <span className="font-mono">{finding.imitates}</span>, le canal officiel de{' '}
            {finding.institution}, sans l’être.
          </span>
        </span>
      ) : (
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <ToneBadge tone="neutral">
            <CircleHelp aria-hidden />
            Absent de l’annuaire
          </ToneBadge>
          <span>
            {finding.institution
              ? `ce n’est pas un canal connu de ${finding.institution}.`
              : 'aucune institution de l’annuaire n’utilise ce canal.'}
          </span>
        </span>
      )}
    </li>
  );
}

function Report({ report, message }: { report: ImpersonationReport; message: string }) {
  const sender = report.channels.some(
    (item) => item.kind === 'sender' && item.status === 'official',
  );
  const nevers = report.claimed.filter((item) => item.never);
  return (
    <div className="grid gap-4" aria-live="polite">
      <section className="grid gap-2 surface p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <ScanSearch aria-hidden className="size-5" />
          Qui le message dit-il être ?
        </h3>
        {report.claimed.length > 0 ? (
          <p className="text-pretty">
            Il se présente comme venant de{' '}
            <span className="font-semibold">
              {report.claimed.map((item) => item.name).join(', ')}
            </span>
            .
          </p>
        ) : (
          <p className="text-muted-foreground text-pretty">
            Il ne cite aucune institution de l’annuaire.
          </p>
        )}
      </section>

      <section className="grid gap-2 surface p-4">
        <h3 className="font-semibold">Les liens, numéros et pages du message</h3>
        {report.channels.length > 0 ? (
          <ul className="grid gap-2">
            {report.channels.map((finding) => (
              <Channel key={`${finding.kind}:${finding.value}`} finding={finding} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Aucun lien, numéro ni page relevé.</p>
        )}
        {sender && (
          <p className="text-muted-foreground text-sm">
            Un nom d’expéditeur SMS peut être imité : vérifiez aussi le contenu.
          </p>
        )}
      </section>

      {report.asksForMoney.length > 0 && (
        <section className="grid gap-2 rounded-2xl border-2 border-danger bg-danger-soft p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Banknote aria-hidden className="size-5 text-danger" />
            Le message demande de l’argent ou un code
          </h3>
          <p className="text-sm">Mots relevés : {report.asksForMoney.join(', ')}.</p>
          {nevers.map((item) => (
            <p key={item.id} className="text-pretty text-sm">
              {item.name} déclare : « {item.never} »
            </p>
          ))}
        </section>
      )}

      {report.notice ? (
        <section className="grid gap-3 surface p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <FileText aria-hidden className="size-5" />
            Le communiqué d’origine
          </h3>
          <p className="text-muted-foreground text-sm">
            {report.notice.institution} · {report.notice.title}
            {report.notice.publishedAt && ` · ${formatDate(report.notice.publishedAt)}`}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid content-start gap-1">
              <p className="font-medium text-sm">L’original (mots retirés barrés)</p>
              <DiffText parts={report.notice.diff.before} />
            </div>
            <div className="grid content-start gap-1">
              <p className="font-medium text-sm">Le message reçu (mots ajoutés surlignés)</p>
              <DiffText parts={report.notice.diff.after} />
            </div>
          </div>
          {report.notice.changedFigures.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              Chiffres absents de l’original :
              {report.notice.changedFigures.map((figure) => (
                <ToneBadge key={figure} tone="warning">
                  {figure}
                </ToneBadge>
              ))}
            </p>
          )}
        </section>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-muted-foreground text-sm">
          Aucun communiqué de l’annuaire ne ressemble à ce message.
        </p>
      )}

      <WarningSigns text={message} />

      <p className="text-muted-foreground text-pretty text-sm">
        Des faits relevés par comparaison avec l’annuaire, sans IA, et pas un verdict : un canal
        absent de l’annuaire n’est pas forcément faux, et l’annuaire peut être incomplet.
      </p>
    </div>
  );
}

// « Est-ce bien eux ? » : un message qui se réclame d'une institution, comparé à ses canaux
// officiels et à ses communiqués d'origine.
export function ImpersonationCheck() {
  const [message, setMessage] = useState('');
  const [sender, setSender] = useState('');
  const [report, setReport] = useState<{ value: ImpersonationReport; message: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await checkMessage({ message, sender });
      if (!result.ok) {
        setReport(null);
        setFieldErrors(result.error.fieldErrors ?? {});
        if (!result.error.fieldErrors) setError(result.error.message);
        return;
      }
      setReport({ value: result.data, message });
    });
  }

  const messageError = fieldErrors.message?.[0];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="grid content-start gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="imp-message">Message reçu</Label>
          <Textarea
            id="imp-message"
            rows={7}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Collez le message qui se présente comme venant d’une institution, d’un opérateur, d’une administration…"
            aria-invalid={messageError ? true : undefined}
            aria-describedby={messageError ? 'imp-message-error' : undefined}
          />
          {messageError && (
            <p id="imp-message-error" className="text-destructive text-sm">
              {messageError}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="imp-sender">Expéditeur (facultatif)</Label>
          <Input
            id="imp-sender"
            value={sender}
            onChange={(event) => setSender(event.target.value)}
            placeholder="Numéro, nom d’expéditeur SMS, page ou adresse e-mail"
            aria-describedby="imp-sender-hint"
          />
          <p id="imp-sender-hint" className="text-muted-foreground text-sm">
            Ce que votre téléphone affiche comme expéditeur.
          </p>
        </div>
        <Button type="submit" disabled={pending} className="justify-self-start">
          <ScanSearch aria-hidden />
          {pending ? 'Comparaison…' : 'Comparer avec l’annuaire'}
        </Button>
        <FormMessage message={error} />
      </form>

      <div className="grid content-start gap-4">
        {pending && <LoadingState title="Comparaison avec l’annuaire officiel…" />}
        {report && !pending && <Report report={report.value} message={report.message} />}
        {!report && !pending && (
          <p className="rounded-xl border border-dashed p-6 text-muted-foreground text-pretty">
            Un message dit venir de la Régie, de la mairie, d’un opérateur ? Vyra compare ses liens,
            ses numéros et son texte avec les canaux officiels et les communiqués d’origine de
            l’annuaire : imitation d’adresse, numéro inconnu, demande d’argent, chiffres changés.
          </p>
        )}
      </div>
    </div>
  );
}
