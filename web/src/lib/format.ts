// Mise en forme des dates, la même partout dans l'application.

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export function formatDateTime(date: Date | null | undefined) {
  return date ? dateTime.format(date) : 'Date inconnue';
}

export function formatDate(date: Date | null | undefined) {
  return date ? dateOnly.format(date) : 'Date inconnue';
}
