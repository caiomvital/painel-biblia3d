import { expect, test, type Page } from "@playwright/test";
import { hash } from "bcryptjs";
import { db, ids, password as e2ePassword } from "./data";

/**
 * Primeiro acesso do aluno: senha padrão -> só a tela "Crie sua senha nova"; o SERVIDOR bloqueia o resto.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;
const DEFAULT = "123";
const NEW_PASSWORD = "estrela7";

function fx(project: string) {
  const f = ids(project);
  const n = project === "desktop" ? "1" : "2";
  return {
    f,
    userId: `${f.prefix}_firstkid`,
    studentId: `${f.prefix}_firstkid_profile`,
    email: `${f.prefix}_firstkid@example.test`,
    phone: `8199900000${n}`,
    maskedPhone: `(81) 99900-000${n}`,
    limiterPhone: `8199911111${n}`,
  };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, info) => {
  const x = fx(info.project.name);
  await db.user.deleteMany({ where: { id: x.userId } });
  await db.user.create({
    data: {
      id: x.userId, email: x.email, name: "Crianca Primeiro Acesso", role: "ALUNO",
      passwordHash: await hash(DEFAULT, 10), mustChangePassword: true,
      student: { create: { id: x.studentId, registrationNumber: x.userId, guardianPhone: x.phone, guardianName: "Responsavel Teste" } },
    },
  });
  await db.enrollment.create({ data: { studentId: x.studentId, classId: x.f.class } });
});
test.afterAll(async ({}, info) => {
  const x = fx(info.project.name);
  await db.enrollment.deleteMany({ where: { studentId: x.studentId } });
  await db.user.deleteMany({ where: { id: x.userId } });
  await db.$disconnect();
});

async function loginUi(page: Page, who: string, pass: string) {
  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await page.goto("/");
  await page.getByLabel("Usuário ou e-mail").fill(who);
  await page.getByLabel("Senha de Acesso").fill(pass);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  return response;
}

test("senha padrão cai na tela de troca e o servidor bloqueia todo o resto", async ({ page }, info) => {
  const x = fx(info.project.name);
  const response = await loginUi(page, x.maskedPhone, DEFAULT); // telefone formatado, como o responsável digita
  expect((await response).status()).toBe(200);
  await expect(page.getByTestId("first-password-screen")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crie sua senha nova" })).toBeVisible();
  await expect(page.getByTestId("student-shell")).toHaveCount(0); // sem painel nem barra de abas

  // Bloqueio no SERVIDOR: mesmo com cookie de sessão válido, nenhuma rota de aluno responde.
  for (const path of ["/api/student/dashboard", "/api/kids/home", "/api/games", "/api/auction", "/api/auction/my-bids", "/api/notifications", "/api/student/exercises", "/api/account"]) {
    expect((await page.request.get(path)).status(), path).toBe(401);
  }
  expect((await page.request.get(`/api/games/qualquer/play`)).status()).toBe(401);
  expect((await page.request.post("/api/auction", { headers: { Origin: origin }, data: { itemId: "x", amount: 100 } })).status()).toBe(401);
  const prefs = await page.request.put("/api/account", { headers: { Origin: origin }, data: { action: "PREFERENCES", preferences: {} } });
  expect(prefs.status()).toBe(403);
  const pwd = await page.request.put("/api/account", { headers: { Origin: origin }, data: { action: "PASSWORD", currentPassword: DEFAULT, newPassword: "outra123", confirmPassword: "outra123" } });
  expect(pwd.status()).toBe(403); // a troca "normal" também não vale: só a de primeiro acesso
  const me = await (await page.request.get("/api/auth/me")).json();
  expect(me.user.mustChangePassword).toBe(true);
  expect((await db.user.findUniqueOrThrow({ where: { id: x.userId } })).mustChangePassword).toBe(true);
});

test("senhas fracas são recusadas com mensagem amigável, no navegador e no servidor", async ({ page }, info) => {
  const x = fx(info.project.name);
  await (await loginUi(page, x.phone, DEFAULT)).finished();
  const screen = page.getByTestId("first-password-screen");
  await expect(screen).toBeVisible();
  const save = () => page.getByRole("button", { name: "Salvar senha" }).click();
  const fill = async (a: string, b: string) => {
    await page.getByLabel("Senha nova").fill(a);
    await page.getByLabel("Escreva de novo").fill(b);
  };
  for (const weak of ["12345", "123456", "111111", "000000", "654321"]) {
    await fill(weak, weak);
    await save();
    await expect(page.getByTestId("first-password-error"), weak).toBeVisible();
  }
  await fill(NEW_PASSWORD, "outra-coisa");
  await save();
  await expect(page.getByTestId("first-password-error")).toContainText("diferentes");
  // O telefone só o servidor conhece: o navegador deixa passar e o servidor recusa.
  await fill(x.phone, x.phone);
  await save();
  await expect(page.getByTestId("first-password-error")).toContainText("telefone");
  await expect(screen).toBeVisible();
  expect((await db.user.findUniqueOrThrow({ where: { id: x.userId } })).mustChangePassword).toBe(true); // nada mudou
  const apiWeak = await page.request.put("/api/account", { headers: { Origin: origin }, data: { action: "FIRST_PASSWORD", newPassword: "123456" } });
  expect(apiWeak.status()).toBe(400);
  const apiSame = await page.request.put("/api/account", { headers: { Origin: origin }, data: { action: "FIRST_PASSWORD", newPassword: DEFAULT } });
  expect(apiSame.status()).toBe(400);
});

test("depois de trocar, o aluno cai na tela inicial e acessa tudo normalmente", async ({ page }, info) => {
  const x = fx(info.project.name);
  await (await loginUi(page, x.phone, DEFAULT)).finished();
  await page.getByLabel("Senha nova").fill(NEW_PASSWORD);
  await page.getByLabel("Escreva de novo").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page.getByTestId("student-shell")).toBeVisible(); // tela inicial do painel
  await expect(page.getByTestId("first-password-screen")).toHaveCount(0);
  const row = await db.user.findUniqueOrThrow({ where: { id: x.userId } });
  expect(row.mustChangePassword).toBe(false);
  for (const path of ["/api/kids/home", "/api/games", "/api/auction", "/api/student/dashboard"]) expect((await page.request.get(path)).status(), path).toBe(200);
  expect((await page.request.put("/api/account", { headers: { Origin: origin }, data: { action: "FIRST_PASSWORD", newPassword: "outraSenha9" } })).status()).toBe(409); // só uma vez
  // A senha padrão não entra mais; a nova entra direto, sem a tela de troca.
  await (await loginUi(page, x.phone, DEFAULT)).finished();
  await expect(page.getByText(/Credenciais inválidas/)).toBeVisible();
  const ok = await loginUi(page, x.phone, NEW_PASSWORD);
  expect((await ok).status()).toBe(200);
  await expect(page.getByTestId("student-shell")).toBeVisible();
  await expect(page.getByTestId("first-password-screen")).toHaveCount(0);
});

test("diretor redefine a senha e a troca obrigatória volta", async ({ page, browser }, info) => {
  const x = fx(info.project.name);
  expect((await db.user.findUniqueOrThrow({ where: { id: x.userId } })).mustChangePassword).toBe(false); // ponto de partida
  const dctx = await browser.newContext();
  const login = await dctx.request.post(`${origin}/api/auth/login`, { headers: { Origin: origin }, data: { email: x.f.email("director"), password: e2ePassword } });
  expect(login.status()).toBe(200);
  const reset = await dctx.request.patch(`${origin}/api/director/kids/students`, { headers: { Origin: origin }, data: { id: x.studentId, resetPassword: true } });
  expect(reset.status()).toBe(200);
  await dctx.close();
  const row = await db.user.findUniqueOrThrow({ where: { id: x.userId } });
  expect(row.mustChangePassword).toBe(true);
  // a sessão antiga caiu e a senha padrão volta a exigir a tela de troca
  const again = await loginUi(page, x.phone, DEFAULT);
  expect((await again).status()).toBe(200);
  await expect(page.getByTestId("first-password-screen")).toBeVisible();
  expect((await page.request.get("/api/kids/home")).status()).toBe(401);
});

test("limite de tentativas vale igual para o telefone em qualquer formato", async ({ page }, info) => {
  const x = fx(info.project.name);
  const p = x.limiterPhone;
  const forms = [p, `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`, `${p.slice(0, 2)} ${p.slice(2, 7)} ${p.slice(7)}`];
  const post = (email: string) => page.request.post("/api/auth/login", { headers: { Origin: origin }, data: { email, password: "errada-errada" } });
  for (let i = 0; i < 10; i++) expect((await post(forms[i % 3])).status()).toBe(401);
  for (const f of forms) expect((await post(f)).status(), f).toBe(429); // 11ª tentativa, em qualquer forma
});
