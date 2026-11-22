/**
 * Navigation « priorité + » : chaque onglet reste dans la barre tant qu'il tient ; le reste se
 * replie dans « Plus », en partant de la fin. Le premier onglet ne se replie jamais. `widths` :
 * la largeur des onglets (écarts compris), `room` : la place de l'île, `moreWidth` : celle du
 * bouton « Plus ». `activeFolded` dit à la barre de donner à « Plus » le nom de l'onglet actif.
 */
export function foldTabs(
  widths: number[],
  room: number,
  moreWidth: number,
  active: number,
): { visible: number; activeFolded: boolean } {
  const total = widths.reduce((sum, w) => sum + w, 0);
  let visible = widths.length;
  if (total > room) {
    let used = moreWidth;
    visible = 0;
    while (visible < widths.length && used + widths[visible] <= room) used += widths[visible++];
    visible = Math.max(1, Math.min(visible, widths.length));
  }
  return { visible, activeFolded: active >= visible };
}
