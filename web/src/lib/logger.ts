import { env } from '@/lib/env';

// Seul fichier autorisé à utiliser `console` (règle Biome `noConsole`).
// Usage : `logger.info('message constant', { contexte })`. Chaque ligne commence par `[web]`.

type LogLevel = 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

// `JSON.stringify` transforme une Error en `{}` : on garde son nom, son message et sa pile.
function serialize(_key: string, value: unknown) {
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack };
  return value;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  let details = '';
  try {
    if (context)
      details = ` ${JSON.stringify(context, serialize, env.NODE_ENV === 'production' ? 0 : 2)}`;
  } catch {
    // Contexte non sérialisable : un log ne doit jamais faire planter.
  }
  console[level](`[web] ${level.toUpperCase()} ${message}${details}`);
}

export const logger = {
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};
