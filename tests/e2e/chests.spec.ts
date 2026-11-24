import { expect, request as pwRequest, test, type APIRequestContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { db, ids, password } from "./data";

/**
 * Baús: concessão (nível, atitudes, sequência), abertura única e atômica, repetido vira fichas,
 * permissões/privacidade e a tela de abertura. O sorteio é sempre do servidor.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;
const H = { Origin: origin };
const SHOTS = process.env.B3D_SHOTS_DIR;
const DUP = { COMMON: 3, RARE: 6, EPIC: 12, LEGENDARY: 25 } as Record<string, number>;
test.describe.configure({ mode: "serial" });

async function api(email: string): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL: origin });
  const r = await ctx.post("/api/auth/login", { data: { email, password } });
  expect(r.status()).toBe(200);
  return ctx;
}
const recifeDay = (offset = 0) => new Date(Date.now() - 3 * 3600_000 + offset * 86400_000).toISOString().slice(0, 10);

test.afterAll(async ({}, info) => {
  const f = ids(info.project.name);
  const sids = [`${f.student}_profile`, `${f.outsider}_profile`];
  await db.attitude.deleteMany({ where: { studentId: { in: sids } } });
  await db.chest.deleteMany({ where: { studentId: { in: sids } } });
  await db.studentItem.deleteMany({ where: { studentId: { in: sids } } });
  await db.streak.deleteMany({ where: { studentId: { in: sids } } });
  await db.$disconnect();
});

test("nível 3 dá 2 baús (níveis 2 e 3) e repetir a consulta não duplica", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  await db.student.update({ where: { id: sid }, data: { currentXp: 650, level: 3 } });
  const s = await api(f.email("student"));
  const r = await (await s.get("/api/kids/chests")).json();
  expect(r.chests.map((c: any) => c.label).sort()).toEqual(["Baú do nível 2", "Baú do nível 3"]);
  await s.get("/api/kids/chests");
  expect(await db.chest.count({ where: { studentId: sid } })).toBe(2);
});

test("abrir: item vai ao inventário, só abre uma vez, abertura simultânea não duplica", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  const s = await api(f.email("student"));
  const [a, b] = (await (await s.get("/api/kids/chests")).json()).chests;
  const xpBefore = (await db.student.findUniqueOrThrow({ where: { id: sid } })).currentXp;

  const open = await s.post("/api/kids/chests", { data: { chestId: a.id }, headers: H });
  expect(open.status()).toBe(200);
  const res = await open.json();
  expect(res.isNew).toBe(true);
  expect(res.item.name).toBeTruthy();
  expect(await db.studentItem.count({ where: { studentId: sid } })).toBe(1);
  expect((await db.chest.findUniqueOrThrow({ where: { id: a.id } })).itemId).not.toBeNull();

  expect((await s.post("/api/kids/chests", { data: { chestId: a.id }, headers: H })).status()).toBe(400); // já aberto

  const [x, y] = await Promise.all([
    s.post("/api/kids/chests", { data: { chestId: b.id }, headers: H }),
    s.post("/api/kids/chests", { data: { chestId: b.id }, headers: H }),
  ]);
  expect([x.status(), y.status()].sort()).toEqual([200, 400]);
  expect(await db.chest.count({ where: { studentId: sid, openedAt: { not: null } } })).toBe(2);
  expect((await s.get("/api/kids/chests")).status()).toBe(200);
  // nada vira vantagem: XP e nível não mudam ao abrir baú
  const st = await db.student.findUniqueOrThrow({ where: { id: sid } });
  expect(st.currentXp).toBe(xpBefore);
});

test("cada 5 atitudes positivas dão um baú; item repetido vira fichas (sem XP) no valor da tabela", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  await db.attitude.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({
      id: `${f.prefix}_chestatt_${i}_0123456789`, kind: "POSITIVE" as const, code: "PARTICIPATED", studentId: sid, classId: f.class,
      actorUserId: f.teacher, xp: 0, coins: 0, day: recifeDay(),
    })),
  });
  const s = await api(f.email("student"));
  const chests = (await (await s.get("/api/kids/chests")).json()).chests;
  expect(chests.length).toBe(1);
  expect(chests[0].label).toBe("Baú de boas atitudes");

  // com o inventário completo, qualquer sorteio é repetido
  const all = await db.cosmeticItem.findMany();
  expect(all.length).toBeGreaterThanOrEqual(16); // o catálogo cresceu (itens do Davi)
  await db.studentItem.createMany({ data: all.map((i) => ({ studentId: sid, itemId: i.id })), skipDuplicates: true });
  const before = await db.student.findUniqueOrThrow({ where: { id: sid } });
  const r = await (await s.post("/api/kids/chests", { data: { chestId: chests[0].id }, headers: H })).json();
  expect(r.isNew).toBe(false);
  expect(r.duplicateCoins).toBe(DUP[r.item.rarity]);
  const after = await db.student.findUniqueOrThrow({ where: { id: sid } });
  expect(after.coinBalance - before.coinBalance).toBe(r.duplicateCoins);
  expect(after.currentXp).toBe(before.currentXp);
  expect(await db.studentItem.count({ where: { studentId: sid } })).toBe(all.length);
});

test("sequência: 3º dia seguido concede o baú, e logar de novo no mesmo dia não repete", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.outsider}_profile`;
  await db.streak.deleteMany({ where: { studentId: sid } });
  await db.streak.create({ data: { studentId: sid, currentStreak: 2, maxStreak: 2, lastAttendedDate: new Date(`${recifeDay(-1)}T12:00:00Z`) } });
  const s = await api(f.email("outsider")); // o login atualiza a sequência
  const row = await db.streak.findUniqueOrThrow({ where: { studentId: sid } });
  expect(row.currentStreak).toBe(3);
  const labels = (await (await s.get("/api/kids/chests")).json()).chests.map((c: any) => c.label);
  expect(labels).toContain("Baú da sequência de 3 dias");
  await api(f.email("outsider")); // segundo login no mesmo dia
  expect((await db.streak.findUniqueOrThrow({ where: { studentId: sid } })).currentStreak).toBe(3);
  expect(await db.chest.count({ where: { studentId: sid, originReference: { startsWith: "CHEST_STREAK_3_" } } })).toBe(1);
});

test("permissões e privacidade: só aluno, só o seu baú, sem chances na resposta", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  const anon = await pwRequest.newContext({ baseURL: origin });
  expect((await anon.get("/api/kids/chests")).status()).toBe(401);
  const t = await api(f.email("teacher"));
  expect((await t.get("/api/kids/chests")).status()).toBe(403);
  expect((await t.post("/api/kids/chests", { data: { chestId: "x" }, headers: H })).status()).toBe(403);

  const chest = await db.chest.create({ data: { studentId: sid, originReference: "CHEST_E2E_PRIVADO" } });
  const other = await api(f.email("outsider"));
  const steal = await other.post("/api/kids/chests", { data: { chestId: chest.id }, headers: H });
  expect(steal.status()).toBe(400);
  expect((await db.chest.findUniqueOrThrow({ where: { id: chest.id } })).openedAt).toBeNull();
  const mine = JSON.stringify(await (await other.get("/api/kids/chests")).json());
  expect(mine).not.toMatch(/rarity|COMMON|LEGENDARY|chance|%|CHEST_E2E_PRIVADO/i);
  await db.chest.delete({ where: { id: chest.id } });
});

async function loginUi(page: Page, email: string) {
  await page.request.post("/api/auth/logout", { headers: H });
  await page.goto("/");
  await page.getByTestId("login-continuar").click();
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  expect((await response).status()).toBe(200);
}

test("tela: card na Home, abertura animada e Tela de Resultado com NOVO ITEM", async ({ page }, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  await db.studentItem.deleteMany({ where: { studentId: sid } }); // inventário vazio: o item será novo
  await db.chest.create({ data: { studentId: sid, originReference: "CHEST_E2E_UI" } });
  await loginUi(page, f.email("student"));
  const card = page.getByTestId("home-chest");
  await expect(card).toBeVisible();
  await page.locator('button[data-testid="home-chest"], [data-testid="home-chest"] button').first().click(); // celular: o botão do baú; tela larga: cartão
  const opening = page.getByRole("dialog", { name: "Abrir baú" });
  await expect(opening).toBeVisible();
  if (SHOTS) {
    mkdirSync(SHOTS, { recursive: true });
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/bau-abertura-360.png` });
  }
  await opening.getByRole("button", { name: "Abrir baú" }).click();
  const result = page.getByRole("dialog", { name: "NOVO ITEM!" });
  await expect(result).toBeVisible({ timeout: 20_000 });
  await expect(result.getByTestId("reward-total")).toHaveCount(0); // item novo: sem fichas
  await expect(result.getByRole("button", { name: "CONTINUAR" })).toBeFocused();
  if (SHOTS) {
    for (const [w, h] of [[360, 740], [768, 1024]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${SHOTS}/bau-resultado-${w}.png` });
    }
  }
  await result.getByRole("button", { name: "CONTINUAR" }).click();
  await expect(result).toBeHidden();
  await expect(page.getByTestId("home-chest")).toHaveCount(0);
  expect(await db.studentItem.count({ where: { studentId: sid } })).toBe(1);
});
