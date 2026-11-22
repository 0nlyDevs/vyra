// Ce que le panneau affiche : la ligne numérotée, les messages, le résultat d'une vérification et
// l'examen d'une image. Rien ici n'appelle le réseau ; le texte venu de la plateforme passe par
// textContent (voir dom.js).

import { FAMILIES, REVERSE_SEARCH, STEPS } from './config.js';
import { $, el, icon } from './dom.js';

function family(tone) {
  return FAMILIES[tone] ?? FAMILIES.neutral;
}

/** Le niveau d'un signe d'alerte : à l'encre, jamais une couleur ni une icône de verdict (il ne
 * dit rien de la vérité). Comme sur le site (SignalBadge) et dans l'application mobile. */
function signalTag(label, tone) {
  const alert = tone === 'warning' || tone === 'danger';
  return el('span', { class: `tag ${alert ? 'signal-alert' : 'signal-calm'}` }, icon(alert ? 'warning' : 'circle-dashed'), label);
}

export function externalLink(href, label, className) {
  const props = { href, target: '_blank', rel: 'noopener noreferrer' };
  if (className) props.class = className;
  return el('a', props, label, icon('arrow-square-out'));
}

/** Message sous le contenu : en cours, ou une erreur (cadre d'encre). */
export function setStatus(text, kind = 'info') {
  const node = $('status');
  node.className = kind === 'error' ? 'notice error' : 'notice';
  node.replaceChildren(...(text ? [icon(kind === 'error' ? 'wifi-slash' : 'magnifying-glass'), text] : []));
}

/**
 * La ligne numérotée : 01 contenu, 02 recherche, 03 résultat. `stage` est l'étape en cours
 * (0 à 2) ; 3 veut dire tout est fait ; `failed` marque l'étape en cours comme échouée.
 */
export function setSteps(stage, failed = false) {
  const items = STEPS.map((label, i) => {
    const state = i < stage ? 'done' : i === stage ? (failed ? 'failed' : 'active') : 'waiting';
    const mark = state === 'done' ? icon('check') : state === 'failed' ? icon('x') : String(i + 1).padStart(2, '0');
    const props = { class: state };
    if (state === 'active') props['aria-current'] = 'step';
    return el('li', props, el('span', { class: 'disc' }, mark), el('span', {}, label));
  });
  $('steps').replaceChildren(...items);
}

/** Les liens de recherche inversée, pour une image qui a une adresse. */
export function reverseLinks(url) {
  const links = el('div', { class: 'reverse-links' });
  for (const [name, build] of REVERSE_SEARCH) links.append(externalLink(build(url), name, 'button'));
  return links;
}

export function renderImageLinks(url, onExamine) {
  const examine = el('button', { class: 'button', type: 'button' }, icon('sparkle'), 'Examiner ses informations cachées');
  examine.addEventListener('click', onExamine);
  $('result').replaceChildren(
    el('h2', { class: 'section-title' }, icon('image'), 'Déjà vue ailleurs ?'),
    el('p', { class: 'muted' }, 'Une photo vraie peut dater d’il y a dix ans. Cherchez sa première publication :'),
    reverseLinks(url),
    el('h2', { class: 'section-title' }, icon('sparkle'), 'Ce que le fichier déclare'),
    el('p', { class: 'muted' }, 'Outil de génération, appareil, date : lus sur le fichier, qui part vers la plateforme. Votre navigateur vous demandera d’autoriser l’accès à ce site.'),
    examine,
    el('p', { class: 'notice' }, icon('info'), 'Aucun outil ne dit avec certitude si une image est générée par IA.'),
  );
  setSteps(3);
}

const IMAGE_LEVELS = {
  detected: { icon: 'sparkle', label: 'Marqueur d’image générée trouvé' },
  inconclusive: { icon: 'magnifying-glass', label: 'Rien à en conclure' },
  none: { icon: 'image', label: 'Aucun marqueur trouvé' },
};

export function renderImageReport(report, url) {
  const level = IMAGE_LEVELS[report.level] ?? IMAGE_LEVELS.none;
  const list = el('ul');
  for (const finding of report.findings) list.append(el('li', {}, finding));
  const blocks = [
    el(
      'div',
      { class: `image-result level-${report.level}` },
      el('p', { class: 'eyebrow' }, 'Ce que le fichier déclare'),
      el('p', { class: 'published-word' }, icon(level.icon), level.label),
      report.findings.length ? list : null,
      el('p', { class: 'muted' }, 'Aucun marqueur ne veut pas dire « authentique » : une capture ou un réseau social les efface.'),
    ),
  ];
  if (url) {
    blocks.push(el('h2', { class: 'section-title' }, icon('image'), 'Déjà vue ailleurs ?'), reverseLinks(url));
  }
  $('result').replaceChildren(...blocks);
  setSteps(3);
}

export function renderResult(data, base, pending) {
  const blocks = [];
  if (data.title) blocks.push(el('p', { class: 'muted page-read' }, `Page lue : ${data.title}`));

  if (data.judged) {
    const { family: name, icon: glyph } = family(data.judged.tone);
    blocks.push(
      el(
        'div',
        { class: `verdict ${name}` },
        el('p', { class: 'eyebrow' }, 'Déjà jugée par le tribunal'),
        el('p', { class: 'published-word' }, icon(glyph), data.judged.label),
        el('h3', {}, data.judged.title),
        data.judged.conclusion ? el('p', {}, data.judged.conclusion) : null,
        el('p', {}, externalLink(`${base}${data.judged.url}`, 'Voir les preuves')),
      ),
    );
  } else {
    blocks.push(
      el(
        'div',
        { class: 'no-conclusion' },
        el('h2', {}, icon('question'), 'Pas encore jugée'),
        el('p', {}, 'Aucune affaire jugée ne ressemble à ce contenu. Cela ne veut pas dire qu’il est vrai.'),
      ),
    );
  }

  blocks.push(el('h2', { class: 'section-title' }, icon('warning'), 'Signes d’alerte dans le message'));
  for (const signal of data.signals) {
    const list = el('ul');
    for (const sign of signal.signs) {
      list.append(el('li', {}, `${sign.label} :`, el('span', { class: 'passage' }, `« ${sign.quote} »`)));
    }
    blocks.push(
      el(
        'div',
        { class: 'signal' },
        signalTag(signal.label, signal.tone),
        signal.signs.length ? list : el('p', { class: 'muted' }, 'Aucun signe relevé dans les mots.'),
      ),
    );
  }

  if (data.factChecks.length) {
    blocks.push(el('h2', { class: 'section-title' }, icon('seal-check'), 'Déjà vérifiée ailleurs'));
    for (const check of data.factChecks) {
      blocks.push(
        el(
          'div',
          { class: 'source' },
          el(
            'p',
            { class: 'source-meta' },
            check.publisher,
            check.rating ? el('span', { class: 'tag neutral' }, `« ${check.rating} »`) : null,
          ),
          el('h3', {}, externalLink(check.url, check.title || 'Lire la vérification')),
        ),
      );
    }
  }

  const params = new URLSearchParams({ information: (pending.text || data.text || '').slice(0, 1500) });
  const source = pending.kind === 'link' ? pending.url : pending.pageUrl;
  if (source?.startsWith('http')) params.set('lien', source);
  blocks.push(
    el(
      'div',
      { class: 'save-section' },
      el('p', {}, 'Vous voulez aller plus loin ? L’enquête retrace ses versions, le tribunal conclut.'),
      el(
        'a',
        { class: 'button ink', href: `${base}/cases?${params.toString()}`, target: '_blank', rel: 'noopener noreferrer' },
        icon('folder-open'),
        'Ouvrir une enquête dans la plateforme',
      ),
    ),
  );
  $('result').replaceChildren(...blocks);
  setSteps(3);
}
