import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const credentials = JSON.parse(readFileSync('/etc/fuctura/director-initial.json', 'utf8'));
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', () => errors.push('browser-error'));
    await page.goto(credentials.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('#login-email').fill(credentials.email);
    await page.locator('#login-password').fill(credentials.password);
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.getByTitle('Sair da conta', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(errors.length, 0, 'Browser raised an application error');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'Page overflows viewport');
    console.log(JSON.stringify({ width: viewport.width, login: true, dashboard: true, browserErrors: false, horizontalOverflow: false }));
    await context.close();
  }
} finally {
  await browser.close();
}
