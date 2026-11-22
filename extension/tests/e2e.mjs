// Test de bout en bout : charge l'extension dans un vrai Chromium et joue les gestes du panneau
// contre la plateforme (en ligne par défaut, ou VYRA_URL=http://localhost:3000).
//
//   npm i --no-save playwright-core && npx playwright-core install chromium
//   node extension/tests/e2e.mjs
//
// CHROMIUM_PATH : un autre navigateur à utiliser (Chrome, Brave, Edge).
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const extension = fileURLToPath(new URL('..', import.meta.url));
const sample = fileURLToPath(new URL('../../web/public/demo/image-generee.png', import.meta.url));
const baseUrl = process.env.VYRA_URL;

const context = await chromium.launchPersistentContext('', {
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: false,
  args: ['--headless=new', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
});

let failures = 0;
async function step(name, run) {
  try {
    await run();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures++;
    console.log(`FAIL ${name}\n     ${error.message.split('\n')[0]}`);
  }
}

try {
  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent('serviceworker', { timeout: 15_000 });
  const id = worker.url().split('/')[2];
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`chrome-extension://${id}/sidepanel.html`);
  if (baseUrl) await worker.evaluate((url) => chrome.storage.local.set({ baseUrl: url }), baseUrl);

  await step('le manifeste se charge', async () => {
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    assert.equal(manifest.manifest_version, 3);
  });

  await step('les trois onglets sont là', async () => {
    assert.deepEqual(await page.locator('.tab').allInnerTexts(), ['Texte', 'Lien', 'Image']);
  });

  await step('un texte trop court est refusé avant tout envoi', async () => {
    await page.fill('#paste', 'court');
    await page.click('#check');
    assert.match(await page.locator('#status').innerText(), /10 caractères/);
  });

  await step('un texte est vérifié : signes d’alerte relevés', async () => {
    await page.fill('#paste', 'URGENT : inondation ce matin, 3 morts. Partagez vite !');
    await page.click('#check');
    await page.waitForSelector('#result .signal', { timeout: 60_000 });
    assert.ok((await page.locator('#result .signal').count()) >= 1);
  });

  await step('un lien invalide est refusé', async () => {
    await page.click('#tab-link');
    await page.fill('#link-input', 'pas une adresse');
    await page.click('#check');
    assert.match(await page.locator('#status').innerText(), /http/);
  });

  await step('un fichier qui n’est pas une image est refusé avant tout envoi', async () => {
    await page.click('#tab-image');
    await page.setInputFiles('#file', { name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    await page.click('#check');
    assert.match(await page.locator('#status').innerText(), /JPEG, PNG ou WebP/);
  });

  await step('une image est examinée sans verdict', async () => {
    await page.setInputFiles('#file', sample);
    await page.click('#check');
    await page.waitForSelector('.image-result', { timeout: 60_000 });
    const text = await page.locator('.image-result').innerText();
    assert.match(text, /Marqueur|Aucun marqueur|Rien à en conclure/);
    assert.doesNotMatch(text, /\b(vrai|fausse?)\b/i);
  });

  await step('aucune erreur dans la console du panneau', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await context.close();
}
process.exit(failures ? 1 : 0);
