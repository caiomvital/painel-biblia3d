import { expect, test, type Page } from "@playwright/test";
import { db, ids, password } from "./data";

const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;

async function login(page: Page, project: string, role: "teacher" | "student" | "otherTeacher") {
  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await page.goto("/");
  await page.getByLabel("E-mail Institucional").fill(ids(project).email(role));
  await page.getByLabel("Senha de Acesso").fill(password);
  const response = page.waitForResponse(r => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await response).status()).toBe(200);
}

function exercise(f: ReturnType<typeof ids>, title: string, question: string, correctOption: string, explanation: string) {
  return {
    classId: f.class,
    lessonId: f.lesson,
    title,
    question,
    explanation,
    options: correctOption === "boolean"
      ? [{ id: "boolean", text: "boolean" }, { id: "string", text: "String" }]
      : [{ id: "single", text: "Aspas simples" }, { id: "double", text: "Aspas duplas" }],
    correctOption,
    correctXp: 20,
    correctCoins: 15,
    attemptXp: 5,
    attemptCoins: 2,
  };
}

test.afterAll(async () => db.$disconnect());

test("atividades por aula, rascunhos, pendências, feedback e bloqueio de edição após resposta", async ({ page }, info) => {
  const f = ids(info.project.name);
  const first = exercise(f, "Exercício 1", "Que tipo só aceita true ou false?", "boolean", "boolean armazena um valor lógico verdadeiro ou falso.");
  const second = exercise(f, "Exercício 2", "String usa aspas simples ou duplas?", "double", "Em Java, textos String usam aspas duplas; aspas simples delimitam char.");

  await login(page, info.project.name, "teacher");
  const createdFirst = await page.request.post("/api/teacher/exercises", { data: first });
  expect(createdFirst.status()).toBe(201);
  const firstId = (await createdFirst.json()).exercise.id as string;
  const createdSecond = await page.request.post("/api/teacher/exercises", { data: second });
  expect(createdSecond.status()).toBe(201);
  const secondId = (await createdSecond.json()).exercise.id as string;

  const editedDraft = await page.request.patch("/api/teacher/exercises", { data: { id: firstId, action: "update", ...{ ...first, question: "Que tipo primitivo aceita true ou false?", explanation: "O tipo boolean representa um valor lógico." } } });
  expect(editedDraft.status()).toBe(200);
  const draftList = await (await page.request.get("/api/teacher/exercises?classId=" + f.class)).json();
  expect(draftList.exercises.find((item: any) => item.id === firstId).publishedAt).toBeNull();

  await login(page, info.project.name, "student");
  const hiddenDrafts = await (await page.request.get("/api/student/exercises")).json();
  expect(hiddenDrafts.exercises.some((item: any) => item.id === firstId || item.id === secondId)).toBe(false);

  await login(page, info.project.name, "teacher");
  for (const id of [firstId, secondId]) {
    const publish = await page.request.patch("/api/teacher/exercises", { data: { id, action: "publish" } });
    expect(publish.status()).toBe(200);
  }
  const teacherNav = page.getByRole("navigation", { name: "Área do professor" });
  await teacherNav.getByRole("button", { name: "Exercícios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Turma E2E Java · Herança em Java" })).toBeVisible();
  await expect(page.getByText("2 questão(ões)", { exact: true })).toBeVisible();
  const beforeAnswers = await (await page.request.get("/api/teacher/exercises?classId=" + f.class)).json();
  const firstBefore = beforeAnswers.exercises.find((item: any) => item.id === firstId);
  expect(firstBefore.pendingStudents.map((student: any) => student.studentName)).toContain(`Teste student ${info.project.name}`);

  await login(page, info.project.name, "student");
  const published = await (await page.request.get("/api/student/exercises")).json();
  expect(published.exercises).toHaveLength(2);
  expect(published.exercises.every((item: any) => item.correctOption === null && item.explanation === null)).toBe(true);
  await page.getByRole("button", { name: "Exercícios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Turma E2E Java · Herança em Java · 2 questão(ões)" })).toBeVisible();

  const firstCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Exercício 1", exact: true }) });
  await firstCard.locator('input[type="radio"]').nth(0).check();
  page.once("dialog", async dialog => { expect(dialog.message()).toContain("não poderá ser alterada"); await dialog.accept(); });
  const firstAnswerResponse = page.waitForResponse(r => r.url().endsWith("/api/student/exercises") && r.request().method() === "POST");
  await firstCard.getByRole("button", { name: "Confirmar resposta" }).click();
  const firstAnswer = await (await firstAnswerResponse).json();
  expect(firstAnswer.answer.isCorrect).toBe(true);
  expect(firstAnswer.answer.xpAwarded).toBe(20);
  await expect(firstCard.getByText("Alternativa correta: boolean", { exact: true })).toBeVisible();
  await expect(firstCard.getByText("O tipo boolean representa um valor lógico.", { exact: true })).toBeVisible();

  const secondCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Exercício 2", exact: true }) });
  await secondCard.locator('input[type="radio"]').nth(0).check();
  page.once("dialog", dialog => dialog.accept());
  const secondAnswerResponse = page.waitForResponse(r => r.url().endsWith("/api/student/exercises") && r.request().method() === "POST");
  await secondCard.getByRole("button", { name: "Confirmar resposta" }).click();
  const secondAnswer = await (await secondAnswerResponse).json();
  expect(secondAnswer.answer.isCorrect).toBe(false);
  expect(secondAnswer.answer.xpAwarded).toBe(5);
  expect(secondAnswer.answer.coinsAwarded).toBe(2);
  await expect(secondCard.getByText("Alternativa correta: Aspas duplas", { exact: true })).toBeVisible();

  await login(page, info.project.name, "teacher");
  const afterAnswers = await (await page.request.get("/api/teacher/exercises?classId=" + f.class)).json();
  const trackedFirst = afterAnswers.exercises.find((item: any) => item.id === firstId);
  const trackedSecond = afterAnswers.exercises.find((item: any) => item.id === secondId);
  expect(trackedFirst.correctCount).toBe(1);
  expect(trackedFirst.pendingStudents).toHaveLength(0);
  expect(trackedFirst.answers[0].studentName).toBe(`Teste student ${info.project.name}`);
  expect(trackedSecond.wrongCount).toBe(1);
  expect(trackedSecond.answers[0].selectedText).toBe("Aspas simples");

  const blockedEdit = await page.request.patch("/api/teacher/exercises", { data: { id: firstId, action: "update", ...first } });
  expect(blockedEdit.status()).toBe(409);
  const archived = await page.request.patch("/api/teacher/exercises", { data: { id: firstId, action: "archive" } });
  expect(archived.status()).toBe(200);
  expect((await archived.json()).exercise.archivedAt).not.toBeNull();
  await login(page, info.project.name, "student");
  const hiddenArchived = await (await page.request.get("/api/student/exercises")).json();
  expect(hiddenArchived.exercises.some((item: any) => item.id === firstId)).toBe(false);
  expect((await page.request.post("/api/student/exercises", { data: { exerciseId: firstId, selectedOption: "boolean" } })).status()).toBe(404);
  await login(page, info.project.name, "teacher");
  const restored = await page.request.patch("/api/teacher/exercises", { data: { id: firstId, action: "restore" } });
  expect(restored.status()).toBe(200);
  expect((await restored.json()).exercise.archivedAt).toBeNull();
  const restoredList = await (await page.request.get("/api/teacher/exercises?classId=" + f.class)).json();
  expect(restoredList.exercises.find((item: any) => item.id === firstId).answerCount).toBe(1);

  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await login(page, info.project.name, "otherTeacher");
  expect((await page.request.get("/api/teacher/exercises?classId=" + f.class)).status()).toBe(200);
  expect((await page.request.patch("/api/teacher/exercises", { data: { id: firstId, action: "publish" } })).status()).toBe(404);

  const stored = await db.$queryRawUnsafe<{ question: string; publishedAt: Date; attempts: number }[]>(
    'SELECT e."question",e."publishedAt",count(a."id")::int AS "attempts" FROM "ClassExercise" e LEFT JOIN "ClassExerciseAttempt" a ON a."exerciseId"=e."id" WHERE e."id"=$1 GROUP BY e."id"', firstId,
  );
  expect(stored[0].question).toBe("Que tipo primitivo aceita true ou false?");
  expect(stored[0].publishedAt).not.toBeNull();
  expect(stored[0].attempts).toBe(1);
});
