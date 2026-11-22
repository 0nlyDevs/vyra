// Panneau latéral : montre ce qui sera vérifié, l'envoie à la plateforme au clic, puis affiche
// l'affaire déjà jugée, les signes d'alerte et les vérifications publiées. Jamais de verdict nouveau.
// Ce fichier tient l'état et branche les gestes ; l'affichage est dans view.js, les appels réseau
// dans api.js, les réglages fixes dans config.js.

import { callPlatform, baseUrl } from './api.js';
import { DEFAULT_BASE_URL, IMAGE_TYPES, MAX_IMAGE_BYTES } from './config.js';
import { $, icon } from './dom.js';
import { renderImageLinks, renderImageReport, renderResult, setStatus, setSteps } from './view.js';

// Ce que le panneau a à vérifier : le type choisi, l'image (fichier en mémoire, ou adresse venue du
// clic droit) et la page d'où vient le contenu.
let mode = 'text';
let imageFile = null;
let imageUrl = '';
let pageUrl = '';

function setMode(next) {
  mode = next;
  for (const tab of document.querySelectorAll('.tab')) {
    const selected = tab.dataset.mode === next;
    tab.setAttribute('aria-selected', String(selected));
    // Un seul onglet dans l'ordre de tabulation : les flèches passent d'un onglet à l'autre.
    tab.tabIndex = selected ? 0 : -1;
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

async function examineFile(file, url = '') {
  if (!IMAGE_TYPES.includes(file.type)) {
    setStatus('Formats acceptés : JPEG, PNG ou WebP.', 'error');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    setStatus('Cette image dépasse 4 Mo.', 'error');
    return;
  }
  setBusy(true);
  setSteps(1);
  setStatus('Lecture des informations du fichier…');
  const form = new FormData();
  form.set('file', file);
  const { data, error } = await callPlatform('/api/check/image', { method: 'POST', body: form });
  setBusy(false);
  if (error) {
    setSteps(1, true);
    setStatus(error, 'error');
    return;
  }
  setStatus('');
  renderImageReport(data, url);
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

async function check() {
  if (mode === 'image') {
    if (imageFile) await examineFile(imageFile);
    else if (imageUrl) renderImageLinks(imageUrl, () => examineFromUrl(imageUrl));
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
  setBusy(true);
  setSteps(1);
  setStatus('Recherche dans les affaires jugées et chez les vérificateurs… La première demande peut prendre quelques secondes.');
  const { data, base, error } = await callPlatform('/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pending.kind === 'text' ? { text: pending.text } : { url: pending.url }),
  });
  setBusy(false);
  if (error) {
    setSteps(1, true);
    setStatus(error, 'error');
    return;
  }
  setStatus('');
  renderResult(data, base, pending);
}

async function loadPending() {
  const { pending } = await chrome.storage.session.get('pending');
  showPending(pending ?? null);
}

chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.pending?.newValue) showPending(changes.pending.newValue);
});

for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => setMode(tab.dataset.mode));
// Clavier des onglets : flèches gauche et droite (en boucle), Début et Fin. L'onglet atteint est choisi.
document.querySelector('.tabs').addEventListener('keydown', (event) => {
  const tabs = [...document.querySelectorAll('.tab')];
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  const target = {
    ArrowRight: (current + 1) % tabs.length,
    ArrowLeft: (current - 1 + tabs.length) % tabs.length,
    Home: 0,
    End: tabs.length - 1,
  }[event.key];
  if (target === undefined) return;
  event.preventDefault();
  setMode(tabs[target].dataset.mode);
  tabs[target].focus();
});
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
