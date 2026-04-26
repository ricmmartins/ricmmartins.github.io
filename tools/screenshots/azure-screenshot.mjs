// tools/screenshots/azure-screenshot.mjs
// Tira screenshots do portal Azure para usar nos posts do blog.
// Usa um perfil persistente de browser (como Chrome real), então o login sobrevive entre execuções.
//
// Uso:
//   node azure-screenshot.mjs login              # Abre browser, faz login, fecha quando pronto
//   node azure-screenshot.mjs shot <url> <nome>  # Screenshot de qualquer URL do portal
//   node azure-screenshot.mjs shot <url> <nome> --selector ".some-class"  # Elemento específico
//   node azure-screenshot.mjs shot <url> <nome> --full                    # Página inteira (scroll)
//   node azure-screenshot.mjs shot <url> <nome> --wait 15000              # Espera extra (ms)

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

const PROFILE_DIR = resolve('./browser-profile');
const OUTPUT_DIR = resolve('../../static/assets/images/screenshots');

async function openBrowser(opts = {}) {
  const { viewport = { width: 1920, height: 1080 }, scaleFactor = 2 } = opts;
  // Perfil persistente: cookies, localStorage, sessão, tudo fica salvo em browser-profile/
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport,
    deviceScaleFactor: scaleFactor,
    locale: 'pt-BR',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  return context;
}

async function waitForPortal(page) {
  // Detecta se está na tela de login (email ou senha)
  const onLogin = await page.locator('input[name="loginfmt"], input[name="passwd"], input[type="password"]')
    .first().isVisible({ timeout: 5000 }).catch(() => false);

  if (onLogin) {
    console.log('Portal pediu login. Faça login no browser...');
    // Espera até o portal carregar de verdade (URL muda e dashboard aparece)
    await page.waitForURL('**/portal.azure.com/**', { timeout: 300000 });
    console.log('Login detectado, aguardando portal...');
    await page.waitForTimeout(10000);
  }

  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
}

async function dismissPopups(page) {
  const selectors = [
    'button[aria-label="Dismiss"]',
    'button[aria-label="Fechar"]',
    'button[aria-label="Close"]',
    'button[aria-label="Dispensar"]',
    '[data-testid="dismiss-button"]',
    'button:has-text("Maybe later")',
    'button:has-text("Talvez mais tarde")',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function login() {
  console.log('Abrindo browser com perfil persistente...');
  console.log('Faça login no Azure Portal. Quando o dashboard carregar, feche o browser.');

  const context = await openBrowser({ scaleFactor: 1 });
  const page = context.pages()[0] || await context.newPage();

  await page.goto('https://portal.azure.com');
  console.log('Aguardando login...');

  // Espera o usuário fechar o browser manualmente
  await new Promise(resolve => context.on('close', resolve));
  console.log('Browser fechado. Sessão salva no perfil persistente.');
}

async function screenshot(url, name, options = {}) {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const context = await openBrowser();
  const page = context.pages()[0] || await context.newPage();

  console.log(`Navegando para: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await waitForPortal(page);

  const extraWait = options.wait || 5000;
  console.log(`Aguardando ${extraWait}ms extras pro conteúdo renderizar...`);
  await page.waitForTimeout(extraWait);

  await dismissPopups(page);

  const outputPath = join(OUTPUT_DIR, `${name}.png`);

  if (options.selector) {
    console.log(`Capturando elemento: ${options.selector}`);
    const element = page.locator(options.selector).first();
    await element.waitFor({ timeout: 15000 }).catch(() => {});
    await element.screenshot({ path: outputPath, type: 'png' });
  } else if (options.full) {
    await page.screenshot({ path: outputPath, fullPage: true, type: 'png' });
  } else {
    await page.screenshot({ path: outputPath, type: 'png' });
  }

  console.log(`Screenshot salva: ${outputPath}`);
  await context.close();

  const relativePath = `/assets/images/screenshots/${name}.png`;
  console.log(`\nUse no post:\n  ![${name}](${relativePath})`);
  return relativePath;
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === 'login') {
  await login();
} else if (command === 'shot') {
  const url = args[1];
  const name = args[2];

  if (!url || !name) {
    console.error('Uso: node azure-screenshot.mjs shot <url> <nome>');
    process.exit(1);
  }

  const options = {};
  if (args.includes('--full')) options.full = true;
  const selectorIdx = args.indexOf('--selector');
  if (selectorIdx !== -1) options.selector = args[selectorIdx + 1];
  const waitIdx = args.indexOf('--wait');
  if (waitIdx !== -1) options.wait = parseInt(args[waitIdx + 1], 10);

  await screenshot(url, name, options);
} else {
  console.log(`
Azure Portal Screenshot Tool (perfil persistente)

Comandos:
  login              Abre browser pra login (sessão fica salva no perfil)
  shot <url> <nome>  Tira screenshot de uma página do portal

Opções:
  --full             Captura página inteira (com scroll)
  --selector <css>   Captura apenas um elemento específico
  --wait <ms>        Tempo extra de espera (default: 5000ms)

Exemplos:
  node azure-screenshot.mjs login
  node azure-screenshot.mjs shot "https://portal.azure.com/#view/..." "cost-analysis"
  node azure-screenshot.mjs shot "https://portal.azure.com/#view/..." "vm-blade" --selector "[class*='blade-content']"
  node azure-screenshot.mjs shot "https://portal.azure.com/#home" "dashboard" --wait 10000
`);
}
