'use client';

import { MessageCircleQuestion, Send, Volume2, VolumeX, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { type AssistantAnswer, askAssistant } from './actions';

type Message =
  | { id: number; role: 'user'; text: string }
  | ({ id: number; role: 'assistant'; text: string } & Omit<AssistantAnswer, 'answer'>);

const SUGGESTIONS = [
  'Est-ce que la coupure d’eau de dix jours est vraie ?',
  'Que puis-je faire sur cette page ?',
  'Quelles affaires sont encore en cours ?',
];

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\[\d+\]/g, ''));
  utterance.lang = 'fr-FR';
  utterance.voice = synth.getVoices().find((voice) => voice.lang.startsWith('fr')) ?? null;
  synth.speak(utterance);
}

// L'assistant, sur chaque page de l'espace connecté : une question, une réponse courte qui cite
// les affaires du dossier. En mode vocal, la réponse est lue à voix haute ; la question se dicte.
export function Assistant() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [voice, setVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2 || pending) return;
    setError(null);
    setQuestion('');
    const history = messages.slice(-6).map((message) => ({
      role: message.role,
      text: message.text,
    }));
    setMessages((current) => [...current, { id: nextId.current++, role: 'user', text: trimmed }]);
    startTransition(async () => {
      const result = await askAssistant({ question: trimmed, pathname, history });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const { answer, ...rest } = result.data;
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: 'assistant', text: answer, ...rest },
      ]);
      if (voice) speak(answer);
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <Sheet>
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
        className="gap-0 overflow-hidden rounded-[24px] border border-border p-0 data-[side=right]:top-auto data-[side=right]:right-(--corner-x) data-[side=right]:bottom-[calc(var(--corner-y)+72px)] data-[side=right]:h-[min(620px,calc(100dvh-var(--corner-y)-156px))] data-[side=right]:w-[min(420px,calc(100vw-2*var(--inset)))] data-[side=right]:border data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="gap-2 bg-live p-4 pr-3 text-live-foreground">
          <div className="flex items-center gap-2">
            <SheetTitle className="mr-auto font-extrabold text-live-foreground text-lg tracking-[-0.01em]">
              Assistant
            </SheetTitle>
            <button
              type="button"
              aria-pressed={voice}
              className="inline-flex h-[34px] items-center gap-2 rounded-full border border-live-foreground/50 px-3 font-bold text-[13px] text-live-foreground uppercase tracking-[0.04em] outline-none hover:bg-live-foreground/10 focus-visible:ring-2 focus-visible:ring-live-foreground aria-pressed:border-live-foreground aria-pressed:bg-live-foreground aria-pressed:text-live"
              onClick={() => {
                setVoice(!voice);
                if (voice && 'speechSynthesis' in window) window.speechSynthesis.cancel();
              }}
            >
              {voice ? (
                <Volume2 aria-hidden className="size-4" />
              ) : (
                <VolumeX aria-hidden className="size-4" />
              )}
              Voix
              <span className="sr-only">{voice ? ' : activée' : ' : désactivée'}</span>
            </button>
            <SheetClose
              className="grid size-10 place-items-center rounded-full text-live-foreground outline-none hover:bg-live-foreground/10 focus-visible:ring-2 focus-visible:ring-live-foreground"
              aria-label="Fermer l’assistant"
            >
              <X aria-hidden className="size-5" />
            </SheetClose>
          </div>
          <SheetDescription className="text-live-muted">
            Il répond à partir des affaires du dossier et les cite. Il ne rend jamais de verdict.
          </SheetDescription>
        </SheetHeader>

        <div className="grid flex-1 content-start gap-3 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 && (
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
                <div className="flex flex-wrap items-center gap-2">
                  <SpeakButton text={message.text.replace(/\[\d+\]/g, '')} />
                  <AiSourceBadge source={message.source} />
                </div>
              </div>
            ),
          )}
          {pending && <p className="text-muted-foreground text-sm">Je cherche dans le dossier…</p>}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div ref={endRef} />
        </div>

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
                if (voice) ask(full);
                else setQuestion(full);
              }}
            />
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
