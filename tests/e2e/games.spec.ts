import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db, ids, password } from "./data";

/**
 * Jogos do aluno (rede de segurança antes do redesenho da Fase 2b).
 * Cobre quem vê o quê, o isolamento do iframe, os cabeçalhos de segurança e o envio de jogo.
 * As funções em `ui` concentram os seletores: se a tela mudar, só elas mudam.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;

async function login(page: Page, project: string) {
  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await page.goto("/");
  await page.getByTestId("login-continuar").click();
  await page.locator("#login-email").fill(ids(project).email("student"));
  await page.locator("#login-password").fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  expect((await response).status()).toBe(200);
}

const ui = {
  openGamesTab: (page: Page) => page.getByRole("button", { name: "Jogos", exact: true }).click(),
  card: (page: Page, gameId: string) => page.getByTestId(`game-card-${gameId}`),
  play: (page: Page, gameId: string) => page.getByTestId(`game-play-${gameId}`).click(),
  back: (page: Page) => page.getByRole("button", { name: "Voltar", exact: true }).click(),
  openSubmit: (page: Page) => page.getByTestId("game-submit-open").click(),
};

const GAME_HTML = (word: string) => `<!doctype html><html><head><title>${word}</title></head><body><h1 id="ok">${word}</h1></body></html>`;

function fixtures(project: string) {
  const f = ids(project);
  const g = (n: string) => `${f.prefix}_game_${n}`;
  return {
    f,
    studentId: `${f.student}_profile`,
    outsiderId: `${f.outsider}_profile`,
    approved: { id: g("approved"), title: `Jogo Aprovado ${project}`, word: "JOGO-APROVADO-OK" },
    byClassmate: { id: g("classmate"), title: `Jogo da Colega ${project}`, author: "Colega Reservada Silva" },
    mine: { id: g("mine"), title: `Meu Pendente ${project}` },
    theirs: { id: g("theirs"), title: `Pendente Alheio ${project}` },
  };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, info) => {
  const x = fixtures(info.project.name);
  await db.game.deleteMany({ where: { id: { startsWith: `${x.f.prefix}_game_` } } });
  await db.game.createMany({
    data: [
      { id: x.approved.id, title: x.approved.title, description: "Um jogo de teste.", authorName: "Exemplo da Bíblia 3D", html: GAME_HTML(x.approved.word), status: "APPROVED", isPublic: true },
      { id: x.byClassmate.id, title: x.byClassmate.title, description: "Feito por uma colega.", authorName: x.byClassmate.author, authorStudentId: x.outsiderId, html: GAME_HTML("COLEGA-OK"), status: "APPROVED", isPublic: true },
      { id: x.mine.id, title: x.mine.title, authorName: "Aluno Teste Da Silva", authorStudentId: x.studentId, html: GAME_HTML("MEU-PENDENTE-OK"), status: "PENDING", isPublic: true },
      { id: x.theirs.id, title: x.theirs.title, authorName: x.byClassmate.author, authorStudentId: x.outsiderId, html: GAME_HTML("ALHEIO-PENDENTE"), status: "PENDING", isPublic: true },
    ],
  });
});
test.afterAll(async ({}, info) => {
  await db.game.deleteMany({ where: { id: { startsWith: `${fixtures(info.project.name).f.prefix}_game_` } } });
  await db.$disconnect();
});

test("lista só jogos aprovados, autor só pelo primeiro nome", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  await login(page, info.project.name);
  await ui.openGamesTab(page);
  await expect(page.getByRole("heading", { name: x.approved.title, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: x.byClassmate.title, exact: true })).toBeVisible();
  await expect(page.getByText(x.theirs.title)).toHaveCount(0); // pendente de outro aluno não aparece
  await expect(page.locator("body")).not.toContainText("Reservada Silva"); // sobrenome da colega nunca na tela
  await expect(ui.card(page, x.byClassmate.id)).toContainText("Colega");
  const api = await (await page.request.get("/api/games")).json();
  expect(JSON.stringify(api)).not.toContain("Reservada Silva");
  expect(JSON.stringify(api)).not.toContain(x.outsiderId);
  expect(api.games.map((g: { id: string }) => g.id)).not.toContain(x.theirs.id);
  expect(api.mine.map((g: { id: string }) => g.id)).toEqual([x.mine.id]); // só os meus pendentes
});

test("jogar abre o jogo isolado e dá para voltar", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  await login(page, info.project.name);
  await ui.openGamesTab(page);
  await ui.play(page, x.approved.id);
  const iframe = page.locator("iframe");
  await expect(iframe).toHaveAttribute("sandbox", "allow-scripts"); // sem same-origin: sem cookies nem sessão
  await expect(page.frameLocator("iframe").locator("#ok")).toHaveText(x.approved.word);
  await ui.back(page);
  await expect(page.getByRole("heading", { name: x.approved.title, exact: true })).toBeVisible();
});

test("cabeçalhos de segurança e permissões da rota de jogar", async ({ page, browser }, info) => {
  const x = fixtures(info.project.name);
  await login(page, info.project.name);
  const ok = await page.request.get(`/api/games/${x.approved.id}/play`);
  expect(ok.status()).toBe(200);
  const csp = ok.headers()["content-security-policy"] ?? "";
  for (const part of ["sandbox allow-scripts", "default-src 'none'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "frame-ancestors 'self'"]) expect(csp).toContain(part);
  expect(ok.headers()["x-content-type-options"]).toBe("nosniff");
  expect(ok.headers()["cache-control"]).toContain("no-store");
  expect((await page.request.get(`/api/games/${x.mine.id}/play`)).status()).toBe(200); // o próprio pendente
  expect((await page.request.get(`/api/games/${x.theirs.id}/play`)).status()).toBe(404); // pendente alheio
  expect((await page.request.get(`/api/games/inexistente/play`)).status()).toBe(404);
  const anon = await browser.newContext();
  expect((await anon.request.get(`${origin}/api/games/${x.approved.id}/play`)).status()).toBe(401); // sem login
  await anon.close();
  expect((await (await page.request.get("/")).headers())["x-frame-options"]).toBe("DENY"); // o resto do site continua sem iframe
});

test("aluno envia um jogo e ele fica pendente", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  await login(page, info.project.name);
  await ui.openGamesTab(page);
  await ui.openSubmit(page);
  const title = `Enviado Pelo Teste ${info.project.name}`;
  await page.getByLabel("Nome do jogo").fill(title);
  await page.getByLabel("Código do jogo (HTML)").fill(GAME_HTML("ENVIADO-OK"));
  await page.getByTestId("game-public").check(); // "Tornar público": vai para a revisão da equipe
  const sent = page.waitForResponse((r) => r.url().endsWith("/api/games") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  expect((await sent).status()).toBe(200);
  const row = await db.game.findFirstOrThrow({ where: { title } });
  expect(row.status).toBe("PENDING");
  expect(row.isPublic).toBe(true);
  expect(row.authorStudentId).toBe(x.studentId);
  await expect(page.getByText(title).first()).toBeVisible(); // aparece em "Meus jogos"
  await db.game.delete({ where: { id: row.id } });
});

test("erros da rota de jogar viram páginas amigáveis (não texto solto)", async ({ page, browser }, info) => {
  const x = fixtures(info.project.name);
  await login(page, info.project.name);
  const missing = await page.request.get(`/api/games/${x.theirs.id}/play`);
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-type"]).toContain("text/html");
  expect(await missing.text()).toContain("Este jogo não está disponível agora.");
  const anon = await browser.newContext();
  const noLogin = await anon.request.get(`${origin}/api/games/${x.approved.id}/play`);
  expect(noLogin.status()).toBe(401);
  expect(await noLogin.text()).toContain("Entre no painel para jogar.");
  await anon.close();
});

test("alert e eval no jogo mostram um aviso amigável em vez de falhar em silêncio", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  const mk = (n: string, script: string) =>
    db.game.create({
      data: { id: `${x.f.prefix}_game_${n}`, title: `Aviso ${n} ${info.project.name}`, authorName: "Exemplo da Bíblia 3D", status: "APPROVED", isPublic: true,
        html: `<!doctype html><html><head><title>t</title></head><body><p id="vivo">vivo</p><script>${script}</script></body></html>` },
    });
  await mk("alert", `alert("oi");`);
  await mk("eval", `try { eval("1+1"); } catch (e) {}`); // o eval parte do código do jogo (o CDP do Playwright ignoraria o CSP)
  await login(page, info.project.name);

  await page.goto(`/api/games/${x.f.prefix}_game_alert/play`);
  await expect(page.getByRole("alert")).toContainText("aviso do navegador"); // alert() trocado pelo aviso
  await expect(page.locator("#vivo")).toBeVisible(); // o jogo continua vivo
  expect(await page.locator("script[data-b3d-shim]").count()).toBe(1);

  await page.goto(`/api/games/${x.f.prefix}_game_eval/play`);
  await expect(page.getByRole("alert")).toContainText("Ops!"); // eval bloqueado -> aviso
  await expect(page.locator("#vivo")).toBeVisible();
});

test("os 3 jogos de exemplo continuam funcionando com o aviso injetado", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  const dir = join(process.cwd(), "_scripts", "games");
  const ids3 = { memoria: `${x.f.prefix}_game_ex_m`, estrela: `${x.f.prefix}_game_ex_e`, numero: `${x.f.prefix}_game_ex_n` };
  for (const [name, id] of Object.entries(ids3))
    await db.game.create({ data: { id, title: `Ex ${name} ${info.project.name}`, authorName: "Exemplo da Bíblia 3D", status: "APPROVED", isPublic: true, html: readFileSync(join(dir, `${name}.html`), "utf8") } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, info.project.name);

  await page.goto(`/api/games/${ids3.memoria}/play`);
  await expect(page.locator("script[data-b3d-shim]")).toHaveCount(1);
  const cards = page.locator("#board > *");
  await expect(cards).toHaveCount(16);
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.locator("#moves")).toHaveText("1");

  await page.goto(`/api/games/${ids3.estrela}/play`);
  await page.locator("#go").click();
  await page.locator("#star").click();
  await expect(page.locator("#score")).not.toHaveText("0");

  await page.goto(`/api/games/${ids3.numero}/play`);
  await page.locator("#n").fill("50");
  await page.getByRole("button", { name: "Chutar" }).click();
  await expect(page.locator("#tries")).toHaveText("1");
  await expect(page.locator("#hint")).not.toHaveText("");

  expect(errors).toEqual([]); // nenhum erro de JavaScript nos 3 jogos
});

test("jogo que navega o próprio quadro para outra página é parado com um aviso neutro", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  const id = `${x.f.prefix}_game_selfnav`;
  await db.game.create({
    data: { id, title: `Navega ${info.project.name}`, authorName: "Exemplo da Bíblia 3D", status: "APPROVED", isPublic: true,
      html: `<!doctype html><html><head><title>t</title></head><body><p>oi</p><script>setTimeout(function(){location.href='/api/games/${x.approved.id}/play';},300);</script></body></html>` },
  });
  await login(page, info.project.name);
  await ui.openGamesTab(page);
  await ui.play(page, id);
  await expect(page.getByTestId("game-navigated")).toContainText("O jogo recarregou");
  await ui.back(page);
  await ui.play(page, x.approved.id); // um jogo normal continua sem o aviso
  await expect(page.frameLocator("iframe").locator("#ok")).toHaveText(x.approved.word);
  await expect(page.getByTestId("game-navigated")).toHaveCount(0);
});

test('jogo legítimo que reinicia com location.reload(): aviso neutro e Tentar de novo volta ao jogo', async ({ page }, info) => {
  const x = fixtures(info.project.name);
  const id = `${x.f.prefix}_game_reload`;
  await db.game.create({
    data: { id, title: `Reinicia ${info.project.name}`, authorName: "Exemplo da Bíblia 3D", status: "APPROVED", isPublic: true,
      html: `<!doctype html><html><head><title>t</title></head><body><button id="again" onclick="location.reload()">Jogar de novo</button></body></html>` },
  });
  await login(page, info.project.name);
  await ui.openGamesTab(page);
  await ui.play(page, id);
  await page.frameLocator("iframe").locator("#again").click();
  await page.waitForTimeout(1500);
  // Reiniciar e fugir são indistinguíveis para o painel: por isso o aviso é neutro (não acusa) e oferece "Tentar de novo".
  await expect(page.getByTestId("game-navigated")).toContainText("O jogo recarregou. Tentar de novo?");
  await expect(page.getByTestId("game-navigated")).not.toContainText("tentou abrir");
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByTestId("game-navigated")).toHaveCount(0);
  await expect(page.frameLocator("iframe").locator("#again")).toBeVisible(); // o jogo volta
});

test("jogo sem \"Tornar público\" fica só do autor: nem aparece nem abre para os colegas", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  await login(page, info.project.name);
  await ui.openGamesTab(page);
  await ui.openSubmit(page);
  const title = `Privado Pelo Teste ${info.project.name}`;
  await page.getByLabel("Nome do jogo").fill(title);
  await page.getByLabel("Código do jogo (HTML)").fill(GAME_HTML("PRIVADO-OK"));
  const sent = page.waitForResponse((r) => r.url().endsWith("/api/games") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  expect((await sent).status()).toBe(200);
  const row = await db.game.findFirstOrThrow({ where: { title } });
  expect(row.isPublic).toBe(false);
  expect(row.authorStudentId).toBe(x.studentId);
  // o dono joga; "Meus jogos" vem primeiro
  expect((await page.request.get(`/api/games/${row.id}/play`)).status()).toBe(200);
  const list = await (await page.request.get("/api/games")).json();
  expect(list.mine.map((g: { id: string }) => g.id)).toContain(row.id);
  expect(list.games.map((g: { id: string }) => g.id)).not.toContain(row.id);
  await db.game.delete({ where: { id: row.id } });
});
