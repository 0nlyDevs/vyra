'use client';

import { LoaderCircle, MessageCircleQuestion, Mic, Send, Volume2, VolumeX, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react';
import { AiSourceBadge, CertaintyBadge } from '@/components/common/DomainBadges';
import { SpeakButton } from '@/components/common/SpeakButton';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { appendText, DictateButton } from '@/features/dictation/DictateButton';
import { ERRORS } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { type AssistantAnswer, askAssistant } from './actions';
import { loadingLabel } from './intent';
import { useVoiceConversation } from './useVoiceConversation';

type Message =
  | { id: number; role: 'user'; text: string }
  | ({ id: number; role: 'assistant'; text: string } & Omit<AssistantAnswer, 'answer'>);

const SUGGESTIONS = [
  'Est-ce que la coupure d’eau de dix jours est vraie ?',
  'Que puis-je faire sur cette page ?',
  'Quelles affaires sont encore en cours ?',
];

// L'assistant, sur chaque page de l'espace connecté : une question, une réponse courte qui cite
// les affaires du dossier. Le mode voix enchaîne écoute, question et lecture sans autre clic.
export function Assistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const requestBusy = useRef(false);
  const voice = useVoiceConversation(open, ask);

  function changeOpen(next: boolean) {
    if (!next) voice.stop();
    setOpen(next);
  }

  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  function ask(text: string, signal?: AbortSignal): Promise<string | null> {
    const trimmed = text.trim();
    if (trimmed.length < 2 || requestBusy.current || signal?.aborted) return Promise.resolve(null);
    requestBusy.current = true;
    setError(null);
    setQuestion('');
    const history = messages
      .slice(-6)
      .map((message) => ({ role: message.role, text: message.text }));
    setMessages((current) => [...current, { id: nextId.current++, role: 'user', text: trimmed }]);
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          const result = await askAssistant({ question: trimmed, pathname, history });
          if (!result.ok) {
            setError(result.error.message);
            resolve(null);
            return;
          }
          const { answer, ...rest } = result.data;
          setMessages((current) => [
            ...current,
            { id: nextId.current++, role: 'assistant', text: answer, ...rest },
          ]);
          if (result.data.autorun && !signal?.aborted) {
            // La conversation continue sur la page demandée ; le clavier peut fermer le panneau.
            if (!signal) changeOpen(false);
            router.push(result.data.autorun);
          }
          resolve(answer);
        } catch {
          setError(ERRORS.INTERNAL.message);
          resolve(null);
        } finally {
          requestBusy.current = false;
        }
      });
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      {/* En bas à droite : une pilule d'encre de 60 px, son libellé sort
          vers la gauche au survol et au focus. */}
      <SheetTrigger className="assist-fab" aria-label="Ouvrir l’assistant">
        <span className="assist-fab-label" aria-hidden>
          <span>
            <b>Assistant</b>
          </span>
        </span>
        <span className="assist-fab-icon" aria-hidden>
          <MessageCircleQuestion />
        </span>
      </SheetTrigger>
      {/* Le panneau sort du coin de l'assistant, au-dessus du bouton. */}
      <SheetContent
        showCloseButton={false}
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="gap-0 overflow-hidden rounded-[24px] border border-border p-0 data-[side=right]:top-auto data-[side=right]:right-(--corner-x) data-[side=right]:bottom-[calc(var(--corner-y)+72px)] data-[side=right]:h-[min(620px,calc(100dvh-var(--corner-y)-156px))] data-[side=right]:w-[min(420px,calc(100vw-2*var(--inset)))] data-[side=right]:border data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="gap-2 bg-live p-4 pr-3 text-live-foreground">
          <div className="flex items-center gap-2">
            <SheetTitle className="mr-auto font-extrabold text-live-foreground text-lg tracking-[-0.01em]">
              Assistant
            </SheetTitle>
            <button
              type="button"
              aria-pressed={voice.active}
              className="inline-flex h-[34px] items-center gap-2 rounded-full border border-live-foreground/50 px-3 font-bold text-[13px] text-live-foreground uppercase tracking-[0.04em] outline-none hover:bg-live-foreground/10 focus-visible:ring-2 focus-visible:ring-live-foreground aria-pressed:border-live-foreground aria-pressed:bg-live-foreground aria-pressed:text-live"
              disabled={pending && !voice.active}
              onClick={() => (voice.active ? voice.stop() : voice.start())}
            >
              {voice.active ? (
                <Volume2 aria-hidden className="size-4" />
              ) : (
                <VolumeX aria-hidden className="size-4" />
              )}
              Voix
              <span className="sr-only">{voice.active ? ' : activée' : ' : désactivée'}</span>
            </button>
            <SheetClose
              className="grid size-10 place-items-center rounded-full text-live-foreground outline-none hover:bg-live-foreground/10 focus-visible:ring-2 focus-visible:ring-live-foreground"
              aria-label="Fermer l’assistant"
            >
              <X aria-hidden className="size-5" />
            </SheetClose>
          </div>
          <SheetDescription className="text-live-muted">
            Il consulte les affaires et peut chercher sur le web, Wikipédia et chez les
            vérificateurs. Il ne rend jamais de verdict.
          </SheetDescription>
        </SheetHeader>

        <div
          className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-4"
          aria-live="polite"
        >
          {messages.length === 0 && !voice.active && (
            <div className="grid gap-2">
              <p className="text-muted-foreground text-sm">Par exemple :</p>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="justify-self-start rounded-full border border-border bg-card px-3.5 py-2 text-left text-sm outline-none hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => ask(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {messages.map((message) =>
            message.role === 'user' ? (
              <p
                key={message.id}
                className="max-w-[85%] justify-self-end rounded-[10px_10px_2px_10px] bg-live px-3 py-2 text-live-foreground"
              >
                {message.text}
              </p>
            ) : (
              <div
                key={message.id}
                className="grid max-w-[95%] gap-2 rounded-[10px_10px_10px_2px] bg-muted p-3"
              >
                <p className="text-pretty">{message.text}</p>
                {message.citations.length > 0 && (
                  <ul className="grid gap-1.5">
                    {message.citations.map((citation) => (
                      <li key={citation.number} className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground text-sm tabular-nums">
                          [{citation.number}]
                        </span>
                        <Link
                          href={citation.href}
                          className="text-sm underline-offset-4 hover:underline"
                        >
                          {citation.title}
                        </Link>
                        {citation.certainty && <CertaintyBadge level={citation.certainty} />}
                      </li>
                    ))}
                  </ul>
                )}
                {message.references.length > 0 && (
                  <ul className="grid gap-1.5" aria-label="Sources extérieures">
                    {message.references.map((reference) => (
                      <li key={reference.number}>
                        <a
                          href={reference.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline underline-offset-4"
                        >
                          [S{reference.number}] {reference.label} : {reference.title}
                        </a>
                        {reference.publishedAt && (
                          <span className="block text-muted-foreground text-xs">
                            Publié le {formatDate(new Date(reference.publishedAt))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {message.searchNotice && (
                  <p className="text-muted-foreground text-xs">{message.searchNotice}</p>
                )}
                {message.proposals.some((proposal) => proposal.href !== message.autorun) && (
                  <nav className="grid gap-1.5" aria-label="Actions proposées">
                    <p className="text-muted-foreground text-xs">À confirmer d’un clic :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {message.proposals
                        .filter((proposal) => proposal.href !== message.autorun)
                        .map((proposal) => (
                          <Button key={proposal.href} asChild size="sm" variant="outline">
                            <Link href={proposal.href}>{proposal.label}</Link>
                          </Button>
                        ))}
                    </div>
                  </nav>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {!voice.active && (
                    <SpeakButton text={message.text.replace(/\[(?:S)?\d+\]/g, '')} />
                  )}
                  <AiSourceBadge source={message.source} />
                </div>
              </div>
            ),
          )}
          {pending && !voice.active && (
            <p className="text-muted-foreground text-sm">
              {loadingLabel(messages.findLast((message) => message.role === 'user')?.text ?? '')}
            </p>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          {voice.error && (
            <p role="alert" className="text-destructive text-sm">
              {voice.error}
            </p>
          )}
          <div ref={endRef} />
        </div>

        {voice.active ? (
          <fieldset
            className="grid shrink-0 justify-items-center gap-2 border-t bg-muted px-4 py-5 text-center"
            aria-label="Conversation vocale"
          >
            <div role="status" className="grid justify-items-center gap-2">
              {voice.phase === 'listening' ? (
                <Mic aria-hidden className="size-7" />
              ) : voice.phase === 'speaking' ? (
                <Volume2 aria-hidden className="size-7" />
              ) : (
                <LoaderCircle
                  aria-hidden
                  className="size-7 animate-spin motion-reduce:animate-none"
                />
              )}
              <p className="font-semibold">
                {voice.phase === 'listening'
                  ? 'Je vous écoute…'
                  : voice.phase === 'transcribing'
                    ? 'Je transcris…'
                    : voice.phase === 'speaking'
                      ? 'Je vous réponds…'
                      : loadingLabel(
                          messages.findLast((message) => message.role === 'user')?.text ?? '',
                        )}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              Parlez, puis marquez une pause. L’écoute reprend après ma réponse.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={voice.stop}>
              Revenir au clavier
            </Button>
          </fieldset>
        ) : (
          <form onSubmit={submit} className="grid gap-2 border-t px-3 pt-3 pb-3">
            <Textarea
              rows={2}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask(question);
                }
              }}
              placeholder="Votre question…"
              aria-label="Votre question"
              maxLength={600}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={pending || question.trim().length < 2}>
                <Send aria-hidden />
                Demander
              </Button>
              <DictateButton
                onText={(text) => {
                  const full = appendText(question, text);
                  setQuestion(full);
                }}
              />
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
