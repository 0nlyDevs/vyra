'use client';

import { MessageCircleQuestion, Send, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react';
import { AiSourceBadge, CertaintyBadge } from '@/components/common/DomainBadges';
import { SpeakButton } from '@/components/common/SpeakButton';
import { Button } from '@/components/ui/button';
import {
  Sheet,
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
      <SheetTrigger asChild>
        <Button size="lg" className="fixed right-5 bottom-5 z-40 rounded-full shadow-lg">
          <MessageCircleQuestion aria-hidden />
          Assistant
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Assistant</SheetTitle>
          <SheetDescription>
            Il répond à partir des affaires du dossier et les cite. Il ne rend jamais de verdict.
          </SheetDescription>
          <Button
            type="button"
            variant={voice ? 'default' : 'outline'}
            size="sm"
            aria-pressed={voice}
            className="justify-self-start"
            onClick={() => {
              setVoice(!voice);
              if (voice && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            }}
          >
            {voice ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
            {voice ? 'Mode vocal activé' : 'Mode vocal'}
          </Button>
        </SheetHeader>

        <div className="grid flex-1 content-start gap-3 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="grid gap-2">
              <p className="text-muted-foreground text-sm">Par exemple :</p>
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start whitespace-normal py-2 text-left"
                  onClick={() => ask(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
          {messages.map((message) =>
            message.role === 'user' ? (
              <p
                key={message.id}
                className="max-w-[85%] justify-self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
              >
                {message.text}
              </p>
            ) : (
              <div
                key={message.id}
                className="grid max-w-[95%] gap-2 rounded-2xl rounded-bl-sm bg-muted p-3"
              >
                <p className="text-pretty">{message.text}</p>
                {message.citations.length > 0 && (
                  <ul className="grid gap-1.5">
                    {message.citations.map((citation) => (
                      <li key={citation.number} className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-primary text-sm">
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

        <form onSubmit={submit} className="grid gap-2 border-t p-4">
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
