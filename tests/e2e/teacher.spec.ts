import { test as base, expect, type Page } from "@playwright/test";
import { db, ids, password } from "./data";
const test = base.extend<{ health: void }>({
  health: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => {
        if (!r.failure()?.errorText.includes("ERR_ABORTED"))
          errors.push(r.failure()?.errorText || "Falha de transporte");
      });
      page.on("response", (r) => {
        if (
          r.status() >= 400 &&
          !(new URL(r.url()).pathname === "/api/auth/me" && r.status() === 401)
        )
          errors.push(`${new URL(r.url()).pathname}: ${r.status()}`);
      });
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
async function login(page: Page, project: string, role = "teacher") {
  await page.goto("/");
  await page.getByLabel("Usuário ou e-mail").fill(ids(project).email(role));
  await page.getByLabel("Senha de Acesso").fill(password);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Painel do Professor" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Painel do Professor" }),
  ).toBeVisible();
}
test.afterAll(async () => {
  await db.$disconnect();
});
test("Professor: áreas atuais do painel, sem vestígios do sistema antigo", async ({
  page,
}, info) => {
  const f = ids(info.project.name);
  await login(page, info.project.name);
  const nav = page.getByRole("navigation", { name: "Área do professor" });
  for (const name of [
    "Visão Geral",
    "Minhas Turmas",
    "Aula e Perguntas",
    "Quiz ao vivo",
    "Atitudes",
    "Alunos",
  ])
    await expect(nav.getByRole("button", { name, exact: true })).toBeVisible();
  for (const name of ["Aulas e Diário", "Exercícios", "Presenças"])
    await expect(nav.getByRole("button", { name, exact: true })).toHaveCount(0);
  const initial = await page.request.get("/api/teacher/dashboard");
  expect(initial.status()).toBe(200);
  const before = await initial.json();
  expect(before.classes.map((c: { id: string }) => c.id)).toEqual([f.class]);
  await nav.getByRole("button", { name: "Minhas Turmas", exact: true }).click();
  await expect(page.getByTestId(`class-${f.class}`)).toBeVisible();
  await nav.getByRole("button", { name: "Alunos", exact: true }).click();
  await expect(page.getByText("Pontos:").first()).toBeVisible();
  await page.screenshot({
    path: info.outputPath("teacher-alunos.png"),
    fullPage: true,
  });
});
test("Marco 8: API docente recusa aluno e professor de outra turma", async ({
  page,
}, info) => {
  const f = ids(info.project.name);
  await login(page, info.project.name, "otherTeacher");
  for (const path of [
    `/api/lessons/${f.lesson}`,
    `/api/classes/${f.class}/lessons`,
    `/api/admin/student-attendance?studentId=${f.student}_profile`,
  ])
    expect((await page.request.get(path)).status()).toBe(403);
  for (const action of ["confirm", "reject"])
    expect(
      (
        await page.request.post(`/api/teacher/attendance/${action}`, {
          data: { attendanceId: f.attendance },
        })
      ).status(),
    ).toBe(403);
  await page.request.post("/api/auth/logout");
  await page.goto("/");
  await page.getByLabel("Usuário ou e-mail").fill(f.email("student"));
  await page.getByLabel("Senha de Acesso").fill(password);
  const auth = page.waitForResponse((r) => r.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await auth).status()).toBe(200);
  expect((await page.request.get("/api/teacher/dashboard")).status()).toBe(403);
  for (const action of ["confirm", "reject"])
    expect(
      (
        await page.request.post(`/api/teacher/attendance/${action}`, {
          data: { attendanceId: f.attendance },
        })
      ).status(),
    ).toBe(403);
});
