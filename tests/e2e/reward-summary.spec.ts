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
  await page.getByLabel("Usuário ou e-mail").fill(ids(project).email("student"));
  await page.getByLabel("Senha de Acesso").fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
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
  const credited = await db.coinTransaction.findFirstOrThrow({
    where: { studentId: x.studentId, originReference: { startsWith: `QUIZ_${x.studentId}_` } },
  });
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
