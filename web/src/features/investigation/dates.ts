// Dates de l'arbre, toujours à l'heure de Madagascar : le serveur (UTC) et le navigateur affichent
// le même jour, sans écart à l'hydratation pour un article publié tard le soir.
const day = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'Indian/Antananarivo',
});

export function formatDay(date: Date | null | undefined) {
  return date ? day.format(date) : 'Date inconnue';
}
