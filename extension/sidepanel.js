// Panneau latéral : montre ce qui sera vérifié, l'envoie à la plateforme au clic, puis affiche
// l'affaire déjà jugée, les signes d'alerte et les vérifications publiées. Jamais de verdict nouveau.
// Tout le texte venu du réseau passe par textContent : rien n'est interprété comme du HTML.

const DEFAULT_BASE_URL = 'http://localhost:3000';
const REVERSE_SEARCH = [
  ['Google Lens', (url) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`],
  ['TinEye', (url) => `https://tineye.com/search?url=${encodeURIComponent(url)}`],
  ['Yandex Images', (url) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`],
  ['Bing', (url) => `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${encodeURIComponent(url)}`],
];

const $ = (id) => document.getElementById(id);
let current = null;

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

function badge(label, tone) {
  return el('span', { class: `badge tone-${tone}` }, label);
}

function externalLink(href, label) {
  return el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label);
}

async function baseUrl() {
  const { baseUrl: stored } = await chrome.storage.local.get('baseUrl');
  return (stored || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function setStatus(text) {
  $('status').textContent = text;
}

function showPending(pending) {
  current = pending;
  $('result').replaceChildren();
  setStatus('');
  $('empty').hidden = Boolean(pending);
  $('preview').hidden = !pending;
  if (!pending) return;
  const labels = { text: 'Texte sélectionné', link: 'Lien', image: 'Image' };
  $('preview-kind').textContent = labels[pending.kind];
  $('preview-text').textContent = pending.kind === 'text' ? pending.text : pending.url;
  $('preview-text').hidden = pending.kind === 'image';
  $('preview-image').hidden = pending.kind !== 'image';
  if (pending.kind === 'image') $('preview-image').src = pending.url;
  $('check').textContent = pending.kind === 'image' ? 'Chercher sa première publication' : 'Vérifier ce contenu';
}

function renderImage(url) {
  const links = el('div', { class: 'links' });
  for (const [name, build] of REVERSE_SEARCH) links.append(externalLink(build(url), name));
  $('result').replaceChildren(
    el(
      'div',
      { class: 'card' },
      el('h2', {}, 'Déjà vue ailleurs ?'),
      el('p', { class: 'muted' }, 'Une photo vraie peut dater d’il y a dix ans. Cherchez sa première publication :'),
      links,
      el('p', { class: 'muted' }, 'Aucun outil ne dit avec certitude si une image est générée par IA.'),
    ),
  );
}

function renderResult(data, base, pending) {
  const cards = [];
  if (data.title) cards.push(el('p', { class: 'muted' }, `Page lue : ${data.title}`));

  if (data.judged) {
    cards.push(
      el(
        'div',
        { class: 'card' },
        el('p', { class: 'eyebrow' }, 'Déjà jugée'),
        el('h2', {}, data.judged.title, ' ', badge(data.judged.label, data.judged.tone)),
        data.judged.conclusion ? el('p', {}, data.judged.conclusion) : null,
        externalLink(`${base}${data.judged.url}`, 'Voir les preuves'),
      ),
    );
  } else {
    cards.push(
      el(
        'div',
        { class: 'card' },
        el('h2', {}, 'Pas encore jugée'),
        el('p', { class: 'muted' }, 'Aucune affaire jugée ne ressemble à ce contenu. Cela ne veut pas dire qu’il est vrai.'),
      ),
    );
  }

  for (const signal of data.signals) {
    const list = el('ul');
    for (const sign of signal.signs) list.append(el('li', {}, `${sign.label} : « ${sign.quote} »`));
    cards.push(
      el(
        'div',
        { class: 'card' },
        el('h2', {}, badge(signal.label, signal.tone)),
        signal.signs.length ? list : el('p', { class: 'muted' }, 'Aucun signe relevé dans les mots.'),
      ),
    );
  }

  if (data.factChecks.length) {
    const list = el('ul');
    for (const check of data.factChecks) {
      list.append(
        el(
          'li',
          {},
          `${check.publisher}${check.rating ? ` (« ${check.rating} »)` : ''} : `,
          externalLink(check.url, check.title || 'Lire la vérification'),
        ),
      );
    }
    cards.push(el('div', { class: 'card' }, el('h2', {}, 'Déjà vérifiée ailleurs'), list));
  }

  const params = new URLSearchParams({ information: (pending.text || data.text || '').slice(0, 1500) });
  const source = pending.kind === 'link' ? pending.url : pending.pageUrl;
  if (source?.startsWith('http')) params.set('lien', source);
  cards.push(
    el(
      'div',
      { class: 'card' },
      el('p', { class: 'muted' }, 'Vous voulez aller plus loin ? L’enquête retrace ses versions, le tribunal conclut.'),
      externalLink(`${base}/cases?${params.toString()}`, 'Ouvrir une enquête dans la plateforme'),
    ),
  );
  $('result').replaceChildren(...cards);
}

async function check(pending) {
  if (pending.kind === 'image') {
    renderImage(pending.url);
    return;
  }
  const base = await baseUrl();
  const button = $('check');
  button.disabled = true;
  setStatus('Recherche dans les affaires jugées et chez les vérificateurs…');
  try {
    const response = await fetch(`${base}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending.kind === 'text' ? { text: pending.text } : { url: pending.url }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || 'Vérification impossible.');
      return;
    }
    setStatus('');
    renderResult(data, base, pending);
  } catch {
    setStatus(`Plateforme injoignable à ${base}. Vérifiez qu’elle tourne, ou changez son adresse dans Réglages.`);
  } finally {
    button.disabled = false;
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
$('paste-check').addEventListener('click', () => {
  const value = $('paste').value.trim();
  if (!value) return;
  const pending = /^https?:\/\/\S+$/.test(value)
    ? { kind: 'link', url: value, pageUrl: '' }
    : { kind: 'text', text: value.slice(0, 3000), pageUrl: '' };
  chrome.storage.session.set({ pending: { ...pending, at: Date.now() } }).then(() => check(pending));
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
  // Une autre adresse que localhost demande l'accord de la personne (permission facultative).
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) {
    $('settings-status').textContent = 'Permission refusée : adresse non enregistrée.';
    return;
  }
  await chrome.storage.local.set({ baseUrl: origin });
  $('settings-status').textContent = `Enregistré : ${origin}`;
});

loadPending();
