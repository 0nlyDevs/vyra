// Panneau latéral : montre ce qui sera vérifié, l'envoie à la plateforme au clic, puis affiche
// l'affaire déjà jugée, les signes d'alerte et les vérifications publiées. Jamais de verdict nouveau.
// Tout le texte venu du réseau passe par textContent : rien n'est interprété comme du HTML.

// La plateforme en ligne par défaut ; une autre adresse (http://localhost:3000 en développement)
// se règle dans Réglages.
const DEFAULT_BASE_URL = 'https://vyra-mg.vercel.app';
// Une première requête sur un hébergement qui s'endort peut être longue : au-delà, on s'arrête.
const CHECK_TIMEOUT_MS = 40_000;
const REVERSE_SEARCH = [
  ['Google Lens', (url) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`],
  ['TinEye', (url) => `https://tineye.com/search?url=${encodeURIComponent(url)}`],
  ['Yandex Images', (url) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`],
  ['Bing', (url) => `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${encodeURIComponent(url)}`],
];

// Les tons de la plateforme, rangés dans les familles de verdict (icône et mot, jamais
// la couleur seule).
const FAMILIES = {
  success: { family: 'true', icon: 'seal-check' },
  danger: { family: 'false', icon: 'x' },
  warning: { family: 'misleading', icon: 'warning' },
  info: { family: 'unverifiable', icon: 'question' },
  neutral: { family: 'neutral', icon: 'info' },
};
const KINDS = {
  text: { label: 'Texte sélectionné', icon: 'text-align-left' },
  link: { label: 'Lien', icon: 'link' },
  image: { label: 'Image', icon: 'image' },
};
const STEPS = ['Contenu', 'Recherche', 'Résultat'];

const $ = (id) => document.getElementById(id);
let current = null;
// Un contenu collé se vérifie tout de suite, une fois affiché (sinon l'affichage efface le message
// « Recherche… » qui vient d'apparaître).
let checkWhenShown = null;

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child !== null && child !== undefined) node.append(child);
  }
  return node;
}

/** Une icône du sprite de sidepanel.html. */
function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `#ph-${name}`);
  svg.append(use);
  return svg;
}

function family(tone) {
  return FAMILIES[tone] ?? FAMILIES.neutral;
}

/** Le niveau d'un signe d'alerte : à l'encre, jamais une couleur ni une icône de verdict (il ne
 * dit rien de la vérité). Comme sur le site (SignalBadge) et dans l'application mobile. */
function signalTag(label, tone) {
  const alert = tone === 'warning' || tone === 'danger';
  return el('span', { class: `tag ${alert ? 'signal-alert' : 'signal-calm'}` }, icon(alert ? 'warning' : 'circle-dashed'), label);
}

function externalLink(href, label, className) {
  const props = { href, target: '_blank', rel: 'noopener noreferrer' };
  if (className) props.class = className;
  return el('a', props, label, icon('arrow-square-out'));
}

async function baseUrl() {
  const { baseUrl: stored } = await chrome.storage.local.get('baseUrl');
  return (stored || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/** Message sous le contenu : en cours, ou une erreur (cadre d'encre). */
function setStatus(text, kind = 'info') {
  const node = $('status');
  node.className = kind === 'error' ? 'notice error' : 'notice';
  node.replaceChildren(...(text ? [icon(kind === 'error' ? 'wifi-slash' : 'magnifying-glass'), text] : []));
}

/**
 * La ligne numérotée : 01 contenu, 02 recherche, 03 résultat. `stage` est l'étape en cours
 * (0 à 2) ; 3 veut dire tout est fait ; `failed` marque l'étape en cours comme échouée.
 */
function setSteps(stage, failed = false) {
  const items = STEPS.map((label, i) => {
    const state = i < stage ? 'done' : i === stage ? (failed ? 'failed' : 'active') : 'waiting';
    const mark = state === 'done' ? icon('check') : state === 'failed' ? icon('x') : String(i + 1).padStart(2, '0');
    const props = { class: state };
    if (state === 'active') props['aria-current'] = 'step';
    return el('li', props, el('span', { class: 'disc' }, mark), el('span', {}, label));
  });
  $('steps').replaceChildren(...items);
}

function showPending(pending) {
  current = pending;
  $('result').replaceChildren();
  setStatus('');
  $('empty').hidden = Boolean(pending);
  $('preview').hidden = !pending;
  setSteps(pending ? 1 : 0);
  if (!pending) return;
  const kind = KINDS[pending.kind];
  $('preview-kind').replaceChildren(icon(kind.icon), kind.label);
  $('preview-text').textContent = pending.kind === 'text' ? pending.text : pending.url;
  $('preview-text').hidden = pending.kind === 'image';
  $('preview-text').classList.toggle('passage', pending.kind === 'text');
  $('preview-image').hidden = pending.kind !== 'image';
  if (pending.kind === 'image') $('preview-image').src = pending.url;
  $('check').replaceChildren(
    icon(pending.kind === 'image' ? 'image' : 'magnifying-glass'),
    pending.kind === 'image' ? 'Chercher sa première publication' : 'Vérifier ce contenu',
  );
  if (checkWhenShown !== null && pending.at === checkWhenShown) {
    checkWhenShown = null;
    check(pending);
  }
}

function renderImage(url) {
  const links = el('div', { class: 'reverse-links' });
  for (const [name, build] of REVERSE_SEARCH) links.append(externalLink(build(url), name, 'button'));
  $('result').replaceChildren(
    el('h2', { class: 'section-title' }, icon('image'), 'Déjà vue ailleurs ?'),
    el('p', { class: 'muted' }, 'Une photo vraie peut dater d’il y a dix ans. Cherchez sa première publication :'),
    links,
    el('p', { class: 'notice' }, icon('info'), 'Aucun outil ne dit avec certitude si une image est générée par IA.'),
  );
  setSteps(3);
}

function renderResult(data, base, pending) {
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

async function check(pending) {
  if (pending.kind === 'image') {
    renderImage(pending.url);
    return;
  }
  const base = await baseUrl();
  const button = $('check');
  button.disabled = true;
  $('paste-check').disabled = true;
  setSteps(1);
  setStatus('Recherche dans les affaires jugées et chez les vérificateurs… La première demande peut prendre quelques secondes.');
  try {
    const response = await fetch(`${base}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending.kind === 'text' ? { text: pending.text } : { url: pending.url }),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    // Une panne de l'hébergeur renvoie une page, pas du JSON : on ne la prend pas pour un réseau coupé.
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      setSteps(1, true);
      setStatus(
        data?.error || `La plateforme a répondu une erreur (${response.status}). Réessayez dans un instant.`,
        'error',
      );
      return;
    }
    setStatus('');
    renderResult(data, base, pending);
  } catch (error) {
    setSteps(1, true);
    setStatus(
      error?.name === 'TimeoutError'
        ? 'La plateforme met trop de temps à répondre. Réessayez dans un instant.'
        : `Plateforme injoignable à ${base}. Vérifiez votre connexion, ou changez son adresse dans Réglages.`,
      'error',
    );
  } finally {
    button.disabled = false;
    $('paste-check').disabled = false;
  }
}

async function loadPending() {
  const { pending } = await chrome.storage.session.get('pending');
  showPending(pending ?? null);
}

chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.pending) showPending(changes.pending.newValue ?? null);
});

$('check').addEventListener('click', () => current && check(current));
$('clear').addEventListener('click', () => chrome.storage.session.remove('pending'));
$('paste-check').prepend(icon('magnifying-glass'));
$('paste-check').addEventListener('click', () => {
  const value = $('paste').value.trim();
  if (!value) return;
  const pending = /^https?:\/\/\S+$/.test(value)
    ? { kind: 'link', url: value, pageUrl: '' }
    : { kind: 'text', text: value.slice(0, 3000), pageUrl: '' };
  const at = Date.now();
  checkWhenShown = at;
  chrome.storage.session.set({ pending: { ...pending, at } });
});

$('settings-toggle').addEventListener('click', async () => {
  const form = $('settings');
  form.hidden = !form.hidden;
  $('settings-toggle').setAttribute('aria-expanded', String(!form.hidden));
  $('base-url').value = await baseUrl();
});

$('settings').addEventListener('submit', async (event) => {
  event.preventDefault();
  let origin;
  try {
    origin = new URL($('base-url').value).origin;
  } catch {
    $('settings-status').textContent = 'Adresse invalide.';
    return;
  }
  // Une adresse que l'extension ne connaît pas demande l'accord de la personne (permission facultative).
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) {
    $('settings-status').textContent = 'Permission refusée : adresse non enregistrée.';
    return;
  }
  await chrome.storage.local.set({ baseUrl: origin });
  $('settings-status').textContent = `Enregistré : ${origin}`;
});

$('settings-reset').addEventListener('click', async () => {
  await chrome.storage.local.remove('baseUrl');
  $('base-url').value = DEFAULT_BASE_URL;
  $('settings-status').textContent = `Adresse rétablie : ${DEFAULT_BASE_URL}`;
});

setSteps(0);
loadPending();
