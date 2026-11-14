import { test, expect, type Page } from '@playwright/test';
import { hash } from 'bcryptjs';
import { db, ids, password } from './data';

async function login(page: Page, email: string) {
  const response = await page.request.post('/api/auth/login', { data: { email, password } });
  expect(response.status()).toBe(200);
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Áreas do diretor' })).toBeVisible();
}
async function tools(page: Page, area: string) {
  await page.getByRole('button', { name: /^Meu painel/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Meu painel', exact: true });
  await dialog.getByRole('navigation', { name: 'Ferramentas do painel' }).getByRole('button', { name: area, exact: true }).click();
  return dialog;
}
test.afterAll(async () => { await db.$disconnect(); });

test('busca de aluno mostra seleção e permite buscar outro ou voltar à lista', async ({ page }, info) => {
  const f = ids(info.project.name);
  await login(page, f.email('director'));
  const dialog = await tools(page, 'Busca');
  await dialog.getByLabel('Buscar aluno, professor, turma ou leilão').fill(`Teste student ${info.project.name}`);
  await dialog.getByRole('button', { name: 'Buscar', exact: true }).click();
  await dialog.getByRole('button').filter({ hasText: `Teste student ${info.project.name}` }).click();
  await expect(page.getByText(`Aluno selecionado: Teste student ${info.project.name}`)).toBeVisible();
  await page.getByLabel('Buscar aluno por nome').fill(`Teste outsider ${info.project.name}`);
  await expect(page.getByTestId(`student-${f.outsider}_profile`)).toBeVisible();
  await page.getByTestId(`student-${f.outsider}_profile`).getByRole('button', { name: `Teste outsider ${info.project.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Ver todos os alunos' }).click();
  await expect(page.getByTestId(`student-${f.student}_profile`)).toBeVisible();
  await expect(page.getByTestId(`student-${f.outsider}_profile`)).toBeVisible();
});

test('preferências recuperam falha de leitura e persistem cor e tamanho de texto', async ({ page }, info) => {
  const f = ids(info.project.name);
  let allowRead = false;
  await page.route('**/api/account', async route => {
    if (route.request().method() === 'GET' && !allowRead) { await route.fulfill({ status: 503, json: { error: 'Falha temporária de teste' } }); }
    else await route.continue();
  });
  await login(page, f.email('director'));
  let dialog = await tools(page, 'Minha conta');
  await expect(dialog.getByRole('alert')).toContainText('Falha temporária de teste');
  await expect(dialog.getByLabel('Tamanho do texto')).toBeDisabled();
  allowRead = true;
  await dialog.getByRole('button', { name: 'Tentar carregar preferências novamente' }).click();
  await expect(dialog.getByLabel('Tamanho do texto')).toBeEnabled();
  await dialog.getByLabel('Cor do painel', { exact: true }).selectOption('violet');
  await expect(page.locator('html')).toHaveAttribute('data-panel-color', 'violet');
  await expect(dialog.getByLabel('Tamanho do texto')).toBeEnabled();
  await dialog.getByLabel('Tamanho do texto').selectOption('large');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-panel-color', 'violet');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  dialog = await tools(page, 'Minha conta');
  await expect(dialog.getByLabel('Tamanho do texto')).toHaveValue('large');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.request.put('/api/account', { data: { action: 'PREFERENCES', preferences: { color: 'default', textSize: 'normal', notifications: { ACCOUNT: true, ACADEMIC: true, AUCTION: true } } } });
});

test('notificações paginam, marcam leitura e protegem a conta do destinatário', async ({ page, browser, baseURL }, info) => {
  const f = ids(info.project.name);
  const prefix = `${f.prefix}_notice`;
  const baseDate = Date.now() + 3600000;
  await db.notification.createMany({ data: Array.from({ length: 27 }, (_, i) => ({ id: `${prefix}_${i}`, userId: f.director, category: 'ACCOUNT', title: `Aviso ${i}`, message: 'Mensagem de teste', target: 'overview', createdAt: new Date(baseDate - i * 1000) })) });
  try {
    await login(page, f.email('director'));
    const dialog = await tools(page, 'Notificações');
    const first = dialog.getByRole('article').filter({ has: page.getByRole('heading', { name: /^Aviso 0/ }) });
    await expect(first).toBeVisible();
    await first.getByRole('button', { name: 'Marcar como lido' }).click();
    await expect(first.getByText('Novo', { exact: true })).toHaveCount(0);
    expect((await db.notification.findUniqueOrThrow({ where: { id: `${prefix}_0` } })).readAt).not.toBeNull();
    await dialog.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: /^Aviso 25/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'Anterior', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: /^Aviso 0/ })).toBeVisible();
    expect((await page.request.put('/api/account', { data: { action: 'PREFERENCES', preferences: { color: 'default', textSize: 'normal', notifications: { ACCOUNT: false, ACADEMIC: true, AUCTION: true } } } })).status()).toBe(200);
    const filtered = await (await page.request.get('/api/notifications')).json();
    expect(filtered.notifications.every((notice: { category: string }) => notice.category !== 'ACCOUNT')).toBe(true);
    expect(JSON.stringify(filtered)).not.toContain(prefix);
    await page.request.put('/api/account', { data: { action: 'PREFERENCES', preferences: { color: 'default', textSize: 'normal', notifications: { ACCOUNT: true, ACADEMIC: true, AUCTION: true } } } });
    const other = await browser.newContext({ baseURL });
    try {
      expect((await other.request.post('/api/auth/login', { data: { email: f.email('teacher'), password } })).status()).toBe(200);
      const response = await other.request.patch('/api/notifications', { data: { id: `${prefix}_1` } });
      expect((await response.json()).updated).toBe(0);
      expect((await db.notification.findUniqueOrThrow({ where: { id: `${prefix}_1` } })).readAt).toBeNull();
      const notices = await (await other.request.get('/api/notifications')).json();
      expect(JSON.stringify(notices)).not.toContain(prefix);
      for (const path of ['/api/director/reports', '/api/director/history', '/api/director/search?q=Teste', '/api/director/auction/bids?itemId=invalid']) expect((await other.request.get(path)).status()).toBe(403);
    } finally { await other.close(); }
  } finally { await db.notification.deleteMany({ where: { id: { startsWith: prefix } } }); }
});

test('diretor consulta relatório, exporta CSV e encontra operação no histórico', async ({ page }, info) => {
  const f = ids(info.project.name);
  await login(page, f.email('director'));
  const reason = `${f.prefix}_motivo`;
  expect((await page.request.put('/api/director/classes', { data: { classId: f.class, scheduleTime: '08:30 - 12:30', reason } })).status()).toBe(200);
  let dialog = await tools(page, 'Histórico');
  await dialog.getByLabel('Filtrar por responsável, ação, registro ou motivo').fill(reason);
  await dialog.getByRole('button', { name: 'Consultar histórico' }).click();
  await expect(dialog.getByText(`Motivo: ${reason}`)).toBeVisible();
  await dialog.getByRole('navigation', { name: 'Ferramentas do painel' }).getByRole('button', { name: 'Relatórios', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Meu painel', exact: true });
  await expect(dialog.getByLabel('Turma').locator('option', { hasText: 'Turma E2E Java' })).not.toHaveCount(0);
  await dialog.getByLabel('Turma').selectOption(f.class);
  await dialog.getByRole('button', { name: 'Gerar relatório' }).click();
  await expect(dialog.getByRole('table')).toContainText(`Teste student ${info.project.name}`);
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Exportar CSV completo' }).click();
  expect((await download).suggestedFilename()).toBe('fuctura-relatorio.csv');
  const csv = await page.request.get(`/api/director/reports?type=attendance&classId=${f.class}&format=csv`);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain(`Teste student ${info.project.name}`);
  expect((await page.request.get('/api/director/reports?from=2026-02-30')).status()).toBe(400);
});

test('troca de senha pela interface mantém sessão atual e revoga a outra', async ({ page, browser, baseURL }, info) => {
  const f = ids(info.project.name);
  const id = `${f.prefix}_account`;
  const email = f.email('account');
  await db.user.create({ data: { id, name: 'Conta de teste', email, passwordHash: await hash(password, 10), role: 'DIRETOR', director: { create: {} } } });
  const other = await browser.newContext({ baseURL });
  try {
    await login(page, email);
    expect((await other.request.post('/api/auth/login', { data: { email, password } })).status()).toBe(200);
    const dialog = await tools(page, 'Minha conta');
    expect((await page.request.put('/api/account', { data: { action: 'PASSWORD', currentPassword: password, newPassword: 'senha456', confirmPassword: 'senha123' } })).status()).toBe(400);
    await dialog.getByLabel('Senha atual', { exact: true }).fill('senha-incorreta');
    await dialog.getByLabel('Nova senha', { exact: true }).fill('senha456');
    await dialog.getByLabel('Confirmar nova senha').fill('senha456');
    await dialog.getByRole('button', { name: 'Alterar senha', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Senha atual incorreta');
    await dialog.getByLabel('Senha atual', { exact: true }).fill(password);
    await dialog.getByRole('button', { name: 'Alterar senha', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('As outras sessões foram encerradas');
    expect((await page.request.get('/api/account')).status()).toBe(200);
    expect((await other.request.get('/api/account')).status()).toBe(401);
    expect((await other.request.post('/api/auth/login', { data: { email, password } })).status()).toBe(401);
    expect((await other.request.post('/api/auth/login', { data: { email, password: 'senha456' } })).status()).toBe(200);
    await page.reload(); await expect(page.getByRole('navigation', { name: 'Áreas do diretor' })).toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { id } })).sessionVersion).toBe(1);
  } finally { await other.close(); await db.auditLog.deleteMany({ where: { actorId: id } }); await db.user.deleteMany({ where: { id } }); }
});
