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
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const STEPS = ['Contenu', 'Recherche', 'Résultat'];

const $ = (id) => document.getElementById(id);

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

// Ce que le panneau a à vérifier : le type choisi, l'image (fichier en mémoire, ou adresse venue du
// clic droit) et la page d'où vient le contenu.
let mode = 'text';
let imageFile = null;
let imageUrl = '';
let pageUrl = '';

function setMode(next) {
  mode = next;
  for (const tab of document.querySelectorAll('.tab')) {
    tab.setAttribute('aria-selected', String(tab.dataset.mode === next));
  }
  $('panel-text').hidden = next !== 'text';
  $('panel-link').hidden = next !== 'link';
  $('panel-image').hidden = next !== 'image';
  $('privacy').hidden = next === 'image';
  updateAction();
}

function updateAction() {
  const examine = mode === 'image' && imageFile;
  $('check').replaceChildren(
    icon(mode === 'image' ? 'image' : 'magnifying-glass'),
    mode === 'image' ? (examine ? 'Examiner cette image' : 'Chercher sa première publication') : 'Vérifier ce contenu',
  );
  $('check').disabled = mode === 'image' && !imageFile && !imageUrl;
}

function setImage(file, url = '') {
  imageFile = file;
  imageUrl = url;
  const shown = file ? URL.createObjectURL(file) : url;
  $('image-preview').hidden = !shown;
  if (shown) $('image-preview').src = shown;
  $('drop-hint').hidden = Boolean(shown);
  $('image-url').hidden = !url;
  $('image-url').textContent = url ? `Image de la page : ${new URL(url).hostname}` : '';
  updateAction();
}

function clearAll() {
  $('paste').value = '';
  $('link-input').value = '';
  setImage(null);
  pageUrl = '';
  $('result').replaceChildren();
  setStatus('');
  setSteps(0);
  chrome.storage.session.remove('pending');
}

/** Un contenu venu du clic droit : il remplit le bon onglet, l'envoi attend le clic. */
function showPending(pending) {
  $('result').replaceChildren();
  setStatus('');
  if (!pending) return;
  pageUrl = pending.pageUrl ?? '';
  if (pending.kind === 'text') {
    $('paste').value = pending.text;
    setMode('text');
  } else if (pending.kind === 'link') {
    $('link-input').value = pending.url;
    setMode('link');
  } else {
    setImage(null, pending.url);
    setMode('image');
  }
  setSteps(1);
}

/** Les liens de recherche inversée, pour une image qui a une adresse. */
function reverseLinks(url) {
  const links = el('div', { class: 'reverse-links' });
  for (const [name, build] of REVERSE_SEARCH) links.append(externalLink(build(url), name, 'button'));
  return links;
}

function renderImageLinks(url) {
  const examine = el('button', { class: 'button', type: 'button' }, icon('sparkle'), 'Examiner ses informations cachées');
  examine.addEventListener('click', () => examineFromUrl(url));
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

function renderImageReport(report, url) {
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

async function examineFile(file, url = '') {
  if (!IMAGE_TYPES.includes(file.type)) {
    setStatus('Formats acceptés : JPEG, PNG ou WebP.', 'error');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    setStatus('Cette image dépasse 4 Mo.', 'error');
    return;
  }
  const base = await baseUrl();
  setBusy(true);
  setSteps(1);
  setStatus('Lecture des informations du fichier…');
  try {
    const form = new FormData();
    form.set('file', file);
    const response = await fetch(`${base}/api/check/image`, { method: 'POST', body: form, signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      setSteps(1, true);
      setStatus(data?.error || `La plateforme a répondu une erreur (${response.status}). Réessayez dans un instant.`, 'error');
      return;
    }
    setStatus('');
    renderImageReport(data, url);
  } catch (error) {
    setSteps(1, true);
    setStatus(
      error?.name === 'TimeoutError'
        ? 'La plateforme met trop de temps à répondre. Réessayez dans un instant.'
        : `Plateforme injoignable à ${base}. Vérifiez votre connexion, ou changez son adresse dans Réglages.`,
      'error',
    );
  } finally {
    setBusy(false);
  }
}

/** Une image de page : le fichier doit être lu, ce qui demande l'accord de la personne pour ce site. */
async function examineFromUrl(url) {
  try {
    const origin = new URL(url).origin;
    const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
    if (!granted) {
      setStatus('Accès refusé : l’image n’a pas été lue.', 'error');
      return;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    await examineFile(new File([blob], 'image', { type: blob.type }), url);
  } catch {
    setStatus('Impossible de lire cette image depuis la page. Enregistrez-la, puis choisissez le fichier.', 'error');
  }
}

function setBusy(busy) {
  $('check').disabled = busy;
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

async function check() {
  if (mode === 'image') {
    if (imageFile) await examineFile(imageFile);
    else if (imageUrl) renderImageLinks(imageUrl);
    return;
  }
  let pending;
  if (mode === 'text') {
    const text = $('paste').value.trim();
    if (text.length < 10) {
      setStatus('Un texte de 10 caractères au moins.', 'error');
      return;
    }
    pending = { kind: 'text', text: text.slice(0, 3000), pageUrl };
  } else {
    const url = $('link-input').value.trim();
    if (!/^https?:\/\/\S+$/.test(url)) {
      setStatus('Collez une adresse qui commence par http:// ou https://.', 'error');
      return;
    }
    pending = { kind: 'link', url, pageUrl };
  }
  const base = await baseUrl();
  setBusy(true);
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
      setStatus(data?.error || `La plateforme a répondu une erreur (${response.status}). Réessayez dans un instant.`, 'error');
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
    setBusy(false);
  }
}

async function loadPending() {
  const { pending } = await chrome.storage.session.get('pending');
  showPending(pending ?? null);
}

chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.pending?.newValue) showPending(changes.pending.newValue);
});

for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => setMode(tab.dataset.mode));
$('check').addEventListener('click', check);
$('clear').addEventListener('click', clearAll);

// Une image : choisie, déposée sur le panneau ou collée. Les contrôles de type et de taille se font
// avant tout envoi.
function takeImage(file) {
  setMode('image');
  setImage(file);
  $('result').replaceChildren();
  setStatus('');
}
$('pick').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', () => {
  const file = $('file').files?.[0];
  if (file) takeImage(file);
  $('file').value = '';
});
document.addEventListener('dragover', (event) => {
  if ([...(event.dataTransfer?.types ?? [])].includes('Files')) {
    event.preventDefault();
    $('drop').classList.add('over');
  }
});
document.addEventListener('dragleave', (event) => {
  if (!event.relatedTarget) $('drop').classList.remove('over');
});
document.addEventListener('drop', (event) => {
  const file = [...(event.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
  $('drop').classList.remove('over');
  if (!file) return;
  event.preventDefault();
  takeImage(file);
});
document.addEventListener('paste', (event) => {
  const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (!file) return;
  event.preventDefault();
  takeImage(file);
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
setMode('text');
loadPending();
