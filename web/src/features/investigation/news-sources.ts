// Les journaux de l'index de presse : leurs derniers articles sont récoltés dans leur flux RSS.
// Flux vérifiés le 21 novembre 2026 ; NewsMada (saturé) et L'Express de Madagascar (pas de flux)
// n'y sont pas. Pour en ajouter un : son nom et l'adresse de son flux.
export const NEWS_FEEDS = [
  { name: 'Midi Madagasikara', url: 'https://midi-madagasikara.mg/feed/' },
  { name: '2424.mg', url: 'https://www.2424.mg/feed/' },
  { name: 'Madagascar Tribune', url: 'https://www.madagascar-tribune.com/spip.php?page=backend' },
  { name: 'RFI Afrique', url: 'https://www.rfi.fr/fr/afrique/rss' },
  { name: 'France 24 Afrique', url: 'https://www.france24.com/fr/afrique/rss' },
  { name: 'Le Monde Afrique', url: 'https://www.lemonde.fr/afrique/rss_full.xml' },
  { name: 'Jeune Afrique', url: 'https://www.jeuneafrique.com/feed/' },
  { name: 'Clicanoo (La Réunion)', url: 'https://www.clicanoo.re/rss' },
] as const;
