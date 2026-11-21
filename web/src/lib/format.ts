// Mise en forme des dates, la même partout dans l'application.

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export function formatDateTime(date: Date | null | undefined) {
  return date ? dateTime.format(date) : 'Date inconnue';
}

export function formatDate(date: Date | null | undefined) {
  return date ? dateOnly.format(date) : 'Date inconnue';
}

const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

// « il y a 3 heures », « hier »… pour les publications du fil.
export function formatRelative(date: Date | null | undefined, now = new Date()) {
  if (!date) return 'Date inconnue';
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
}
