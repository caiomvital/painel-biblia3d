import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { db, ids, password } from "./data";

/**
 * Tela de Resultado (RewardSummary) depois do desafio do dia:
 * aparece, mostra o TOTAL que o servidor creditou e o CONTINUAR fecha.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;
const SHOTS = process.env.B3D_SHOTS_DIR; // opcional: salva prints (360px e 768px)

function fx(project: string) {
  const f = ids(project);
  return { f, studentId: `${f.student}_profile`, q: (n: number) => `${f.prefix}_rs_q${n}` };
}

test.beforeAll(async ({}, info) => {
  const x = fx(info.project.name);
  await db.quizDay.deleteMany({ where: { studentId: x.studentId } });
  await db.quizQuestion.deleteMany({ where: { id: { startsWith: `${x.f.prefix}_rs_q` } } });
  for (let n = 1; n <= 6; n++) {
    await db.quizQuestion.create({
      data: {
        id: x.q(n), text: `Pergunta resumo ${n} ${info.project.name}`, status: "APPROVED", kind: "DAILY", source: "DIRECTOR",
        options: [`R${n}-A`, `R${n}-B`, `R${n}-C`, `R${n}-D`], correctIndex: n % 4,
      },
    });
  }
});
test.afterAll(async ({}, info) => {
  const x = fx(info.project.name);
  await db.quizDay.deleteMany({ where: { studentId: x.studentId } });
  await db.quizQuestion.deleteMany({ where: { id: { startsWith: `${x.f.prefix}_rs_q` } } });
  await db.$disconnect();
});

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

test("resultado do desafio: tela aparece, mostra o total do servidor e CONTINUAR fecha", async ({ page }, info) => {
  const x = fx(info.project.name);
  await login(page, info.project.name);
  await page.getByRole("button", { name: "Desafios", exact: true }).click();

  const quizCard = page.getByTestId("quiz-daily");
  // o desafio abre direto na primeira pergunta (uma por vez), sem tela de escolha
  await expect(quizCard.getByRole("radio").first()).toBeVisible();
  // pergunta quais perguntas foram sorteadas e responde todas certo (a correta vem do banco de teste)
  const drawn = await db.quizDay.findFirstOrThrow({ where: { studentId: x.studentId } });
  const questions = await db.quizQuestion.findMany({ where: { id: { in: drawn.questionIds } } });
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const [i, id] of drawn.questionIds.entries()) {
    const q = byId.get(id)!;
    await quizCard.getByText(q.options[q.correctIndex], { exact: true }).click();
    await quizCard.getByRole("button", { name: "Responder" }).click();
    await expect(quizCard.getByTestId("quiz-feedback")).toContainText("Acertou");
    await quizCard.getByRole("button", { name: /Próxima|Ver meus pontos/ }).click();
  }
  // as moedas sobem pergunta por pergunta antes da Tela de Resultado
  await expect(quizCard.getByTestId("coin-rise").first()).toBeAttached();

  const dialog = page.getByRole("dialog", { name: "MISSÃO CUMPRIDA" });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByRole("button", { name: "CONTINUAR" })).toBeFocused();

  // o total mostrado é o que o servidor creditou (fichas EARNED desse desafio)
  const creditedRows = await db.coinTransaction.findMany({ where: { studentId: x.studentId, originReference: { startsWith: `QUIZ_${x.studentId}_` } } });
  const credited = { amount: creditedRows.reduce((n, r) => n + r.amount, 0) };
  expect(credited.amount).toBeGreaterThan(0);
  await expect(dialog.getByTestId("reward-total")).toContainText(`+${credited.amount}`, { timeout: 15_000 });
  await expect(dialog.getByRole("listitem")).toHaveCount(2);

  if (SHOTS) {
    mkdirSync(SHOTS, { recursive: true });
    for (const [w, h] of [[360, 740], [768, 1024]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(3500);
      await page.screenshot({ path: `${SHOTS}/reward-summary-${w}.png` });
    }
  }

  await dialog.getByRole("button", { name: "CONTINUAR" }).click();
  await expect(dialog).toBeHidden();
  // ganho simples não usa a tela cheia: o aviso pequeno (RewardPop) não ficou duplicado por baixo
  await expect(page.getByTestId("student-shell")).toBeVisible();
});

/** Desafio v2: responde quantas quiser e encerra; o bônus de 50 só vem a cada 5 perguntas completas. */
test("desafio v2: encerrar com poucas perguntas não dá bônus; 5 completas dão 50; encerrar duas vezes é recusado", async ({ page }, info) => {
  const x = fx(info.project.name);
  await db.quizDay.deleteMany({ where: { studentId: x.studentId } });
  await db.pointTransaction.deleteMany({ where: { studentId: x.studentId, originReference: { startsWith: `QUIZ_${x.studentId}_` } } });
  await db.coinTransaction.deleteMany({ where: { studentId: x.studentId, originReference: { startsWith: `QUIZ_${x.studentId}_` } } });
  await login(page, info.project.name);
  const H = { Origin: origin };
  const quiz = await (await page.request.get("/api/kids/quiz?kind=daily")).json();
  expect(quiz.total).toBe(6); // todas as perguntas aprovadas do dia (até 25)
  expect(quiz.blockSize).toBe(5);
  const day = await db.quizDay.findFirstOrThrow({ where: { studentId: x.studentId } });
  const rows = await db.quizQuestion.findMany({ where: { id: { in: day.questionIds } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const answer = async (i: number, right: boolean) => {
    const q = byId.get(day.questionIds[i])!;
    const choice = right ? q.correctIndex : (q.correctIndex + 1) % 4;
    const r = await page.request.post("/api/kids/quiz", { data: { kind: "daily", check: true, index: i, choice }, headers: H });
    expect(r.status()).toBe(200);
  };
  const sum = async () => (await db.pointTransaction.findMany({ where: { studentId: x.studentId, originReference: { startsWith: `QUIZ_${x.studentId}_` } } })).reduce((n, t) => n + t.amount, 0);
  // não dá para encerrar sem responder
  expect((await page.request.post("/api/kids/quiz", { data: { kind: "daily", finish: true }, headers: H })).status()).toBe(400);
  // 2 respostas (uma certa, uma errada) = 5 + 1, sem bônus
  await answer(0, true); await answer(1, false);
  expect(await sum()).toBe(6);
  await answer(1, true); // repetir a pergunta não paga de novo
  expect(await sum()).toBe(6);
  // 3 respostas certas a mais completam o desafio 1 (5 perguntas): + 50 de bônus
  await answer(2, true); await answer(3, true); await answer(4, true);
  expect(await sum()).toBe(6 + 15 + 50);
  const fin = await (await page.request.post("/api/kids/quiz", { data: { kind: "daily", finish: true }, headers: H })).json();
  expect(fin).toMatchObject({ completed: true, total: 5, score: 4, pointsAwarded: 6 + 15 + 50 });
  expect(await sum()).toBe(6 + 15 + 50); // encerrar não paga de novo
  expect((await page.request.post("/api/kids/quiz", { data: { kind: "daily", finish: true }, headers: H })).status()).toBe(400);
  expect((await page.request.post("/api/kids/quiz", { data: { kind: "daily", check: true, index: 5, choice: 0 }, headers: H })).status()).toBe(400);
});

test("desafio v2 na tela: depois de responder aparece Encerrar, que leva à Tela de Resultado e ao início", async ({ page }, info) => {
  const x = fx(info.project.name);
  await db.quizDay.deleteMany({ where: { studentId: x.studentId } });
  await db.pointTransaction.deleteMany({ where: { studentId: x.studentId, originReference: { startsWith: `QUIZ_${x.studentId}_` } } });
  await db.coinTransaction.deleteMany({ where: { studentId: x.studentId, originReference: { startsWith: `QUIZ_${x.studentId}_` } } });
  await login(page, info.project.name);
  await page.getByRole("button", { name: "Desafios", exact: true }).click();
  const card = page.getByTestId("quiz-daily");
  await expect(card.getByRole("radio").first()).toBeVisible();
  const day = await db.quizDay.findFirstOrThrow({ where: { studentId: x.studentId } });
  const q = await db.quizQuestion.findUniqueOrThrow({ where: { id: day.questionIds[0] } });
  await expect(card.getByTestId("quiz-finish")).toHaveCount(0); // sem resposta ainda, não há o que encerrar
  await card.getByText(q.options[q.correctIndex], { exact: true }).click();
  await card.getByRole("button", { name: "Responder" }).click();
  await expect(card.getByTestId("quiz-feedback")).toContainText("Acertou");
  await expect(card.getByRole("button", { name: "Próxima pergunta" })).toBeVisible();
  await card.getByTestId("quiz-finish").click();
  const dialog = page.getByRole("dialog", { name: /MISSÃO CUMPRIDA|BOA!/ });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await dialog.getByRole("button", { name: "CONTINUAR" }).click();
  await expect(page.getByTestId("student-shell")).toBeVisible();
  expect((await db.quizDay.findFirstOrThrow({ where: { studentId: x.studentId } })).completedAt).not.toBeNull();
});
