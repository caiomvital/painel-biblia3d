import { expect, request as pwRequest, test, type APIRequestContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { db, ids, password } from "./data";

/**
 * Meu Lofi: só equipa o que está no inventário (validado no servidor), prévia antes de salvar,
 * coleção com silhuetas sem revelar o que falta, e o visual aparece nas telas do aluno.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;
const H = { Origin: origin };
const SHOTS = process.env.B3D_SHOTS_DIR;
const OWNED = ["color-azul", "acc-coroa", "bg-noite", "frame-estrelas"];
test.describe.configure({ mode: "serial" });

async function api(email: string): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL: origin });
  const r = await ctx.post("/api/auth/login", { data: { email, password } });
  expect(r.status()).toBe(200);
  return ctx;
}

test.afterAll(async ({}, info) => {
  const f = ids(info.project.name);
  await db.studentItem.deleteMany({ where: { studentId: `${f.student}_profile` } });
  await db.student.update({ where: { id: `${f.student}_profile` }, data: { mascotLook: {} } });
  await db.$disconnect();
});

test("servidor: só equipa o que o aluno tem, no encaixe certo; coleção não revela o que falta", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  const s = await api(f.email("student"));
  const first = await (await s.get("/api/kids/mascot")).json(); // garante o catálogo
  expect(first.total).toBe(39);
  expect(first.ownedCount).toBe(0);
  const items = await db.cosmeticItem.findMany({ where: { code: { in: OWNED } } });
  await db.studentItem.createMany({ data: items.map((i) => ({ studentId: sid, itemId: i.id })) });

  const text = await (await s.get("/api/kids/mascot")).text();
  const col = JSON.parse(text);
  expect(col.ownedCount).toBe(4);
  const locked = col.items.filter((i: any) => !i.owned);
  expect(locked.length).toBe(35);
  expect(locked.every((i: any) => Object.keys(i).sort().join() === "owned,slot")).toBe(true); // só silhueta
  for (const hidden of ["acc-oculos", "Lofi Dourado", "color-dourado", "frame-dourada", "LEGENDARY"]) expect(text).not.toContain(hidden);

  const ok = await s.put("/api/kids/mascot", { data: { look: { color: "color-azul", accessory: "acc-coroa", background: "bg-noite", frame: "frame-estrelas" } }, headers: H });
  expect(ok.status()).toBe(200);
  const row = await db.student.findUniqueOrThrow({ where: { id: sid } });
  expect(row.mascotLook).toEqual({ color: "color-azul", accessory: "acc-coroa", background: "bg-noite", frame: "frame-estrelas" });
  expect((await (await s.get("/api/kids/home")).json()).mascotLook.accessory).toBe("acc-coroa");

  const before = row.mascotLook;
  for (const bad of [
    { accessory: "acc-oculos" },          // existe, mas o aluno não tem
    { color: "acc-coroa" },               // encaixe errado
    { color: "color-inventada" },         // não existe
    { color: "color-azul", xp: 999 },     // campo desconhecido
  ]) {
    expect((await s.put("/api/kids/mascot", { data: { look: bad }, headers: H })).status()).toBe(400);
  }
  expect((await db.student.findUniqueOrThrow({ where: { id: sid } })).mascotLook).toEqual(before);

  expect((await s.put("/api/kids/mascot", { data: { look: {} }, headers: H })).status()).toBe(200); // tirar tudo
  expect((await db.student.findUniqueOrThrow({ where: { id: sid } })).mascotLook).toEqual({});

  const anon = await pwRequest.newContext({ baseURL: origin });
  expect((await anon.get("/api/kids/mascot")).status()).toBe(401);
  const t = await api(f.email("teacher"));
  expect((await t.get("/api/kids/mascot")).status()).toBe(403);
  expect((await t.put("/api/kids/mascot", { data: { look: {} }, headers: H })).status()).toBe(403);
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

test("tela: prévia antes de salvar, salva, aparece na Home e depois de recarregar", async ({ page }, info) => {
  const f = ids(info.project.name);
  await loginUi(page, f.email("student"));
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByTestId("profile-wardrobe").click();
  const screen = page.getByTestId("wardrobe-screen");
  await expect(screen).toBeVisible();
  await expect(screen.getByTestId("wardrobe-count")).toContainText("4 de 16");
  await expect(screen.getByTestId("item-locked")).toHaveCount(12);

  const preview = screen.getByTestId("wardrobe-preview");
  await expect(preview).toContainText("Este é o visual salvo");
  await screen.getByTestId("item-color-azul").click();
  await screen.getByTestId("item-acc-coroa").click();
  await screen.getByTestId("item-bg-noite").click();
  await expect(preview.locator("svg[data-look]")).toHaveAttribute("data-look", /color-azul/);
  await expect(preview).toContainText("ainda não salvou");
  // prévia não salva: o banco ainda está sem visual
  expect((await db.student.findUniqueOrThrow({ where: { id: `${f.student}_profile` } })).mascotLook).toEqual({});

  if (SHOTS) {
    mkdirSync(SHOTS, { recursive: true });
    for (const [w, h] of [[360, 800], [768, 1100]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SHOTS}/lofi-personalizar-${w}.png`, fullPage: true });
    }
  }
  await preview.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Lofi atualizado!" })).toBeVisible();
  expect((await db.student.findUniqueOrThrow({ where: { id: `${f.student}_profile` } })).mascotLook).toEqual({ color: "color-azul", accessory: "acc-coroa", background: "bg-noite" });

  await page.getByRole("button", { name: "Início", exact: true }).click();
  const shell = page.getByTestId("student-shell");
  await expect(shell.locator("svg[data-look*='color-azul']").first()).toBeVisible();
  if (SHOTS) {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/lofi-home-360.png` });
  }
  await page.reload();
  await expect(page.getByTestId("student-shell").locator("svg[data-look*='acc-coroa']").first()).toBeVisible();
});
