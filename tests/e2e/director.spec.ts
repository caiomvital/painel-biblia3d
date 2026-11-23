import { dismissTour } from "./tour";
import { test as base, expect, type Page } from "@playwright/test";
import { db, ids, password } from "./data";
const test = base.extend<{ health: void }>({
  health: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => {
        if (!r.failure()?.errorText.includes("ERR_ABORTED"))
          errors.push(r.failure()?.errorText ?? "Falha de transporte");
      });
      page.on("response", (r) => {
        if (
          r.status() >= 400 &&
          !(new URL(r.url()).pathname === "/api/auth/me" && r.status() === 401)
          // o painel de contas de teste desligado responde 404 de propósito
          && !(new URL(r.url()).pathname === "/api/test-accounts" && r.status() === 404)
        )
          errors.push(`${new URL(r.url()).pathname}: ${r.status()}`);
      });
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
async function login(page: Page, project: string, role = "director") {
  await page.goto("/");
  await page.getByTestId("login-continuar").click();
  await page.locator("#login-email").fill(ids(project).email(role));
  await page.locator("#login-password").fill(password);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  expect((await response).status()).toBe(200);
  await dismissTour(page);
  if (role === "director")
    await expect(
      page.getByRole("navigation", { name: "Áreas do diretor" }),
    ).toBeVisible();
}
async function saveForm(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(dialog).toHaveCount(0);
}
test.afterAll(async () => {
  await db.$disconnect();
});
test("Direção: áreas atuais do painel, sem vestígios do sistema antigo", async ({
  page,
}, info) => {
  await login(page, info.project.name);
  const nav = page.getByRole("navigation", { name: "Áreas do diretor" });
  for (const name of [
    "Visão Geral",
    "Cursos",
    "Turmas",
    "Professores",
    "Gamificação e Leilões",
    "Alunos",
    "Atitudes",
  ])
    await expect(nav.getByRole("button", { name, exact: true })).toBeVisible();
  for (const name of ["Aulas e Presenças", "Currículos", "Crianças", "Matrículas"])
    await expect(nav.getByRole("button", { name, exact: true })).toHaveCount(0);
  const initial = await (
    await page.request.get("/api/director/dashboard")
  ).json();
  expect(JSON.stringify(initial)).not.toContain("passwordHash");
  await expect(page.getByText("Presenças pendentes")).toHaveCount(0);
  await expect(page.getByText("Diários pendentes")).toHaveCount(0);
  await nav.getByRole("button", { name: "Turmas", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Nova Turma", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("director-turmas.png"),
    fullPage: true,
  });
});
test("Marco 9: endpoints administrativos bloqueiam professor, aluno e sessão ausente", async ({
  page,
}, info) => {
  const paths = [
    "dashboard",
    "classes",
    "teachers",
    "students",
    "enrollments",
    "attendance",
    "coins",
    "auction",
  ];
  for (const path of ["dashboard", "teachers", "students", "coins", "auction"])
    expect(
      (await page.request.get(`/api/director/${path}`)).status(),
    ).toBeGreaterThanOrEqual(401);
  for (const role of ["teacher", "student"]) {
    await login(page, info.project.name, role);
    for (const path of paths) {
      const response =
        path === "dashboard"
          ? await page.request.get(`/api/director/${path}`)
          : await page.request.post(`/api/director/${path}`, { data: {} });
      expect(response.status(), `${role} POST/GET ${path}`).toBe(403);
      if (
        ["classes", "teachers", "students", "enrollments", "auction"].includes(
          path,
        )
      )
        expect(
          (
            await page.request.put(`/api/director/${path}`, { data: {} })
          ).status(),
        ).toBe(403);
      if (["classes", "teachers", "students", "auction"].includes(path))
        expect(
          (
            await page.request.delete(`/api/director/${path}?id=invalid`)
          ).status(),
        ).toBe(403);
      if (["teachers", "students", "coins", "auction"].includes(path))
        expect((await page.request.get(`/api/director/${path}`)).status()).toBe(
          403,
        );
    }
    await page.context().clearCookies();
  }
});

test("Marco 9: controles existentes de XP, Coins e lotes persistem e mantêm ledgers", async ({
  page,
}, info) => {
  const f = ids(info.project.name);
  await login(page, info.project.name);
  await page
    .getByRole("navigation", { name: "Áreas do diretor" })
    .getByRole("button", { name: "Gamificação e Leilões", exact: true })
    .click();
  const studentId = `${f.outsider}_profile`;
  const before = await db.student.findUniqueOrThrow({
    where: { id: studentId },
  });
  await page.getByLabel("Aluno para ajuste").selectOption(studentId);
  await page.getByLabel("Novo total de pontos").fill(String(before.currentXp + 7));
  await page
    .getByRole("button", { name: "Registrar ajuste", exact: true })
    .click();
  await expect(
    page.getByText("Ajuste registrado no ledger.", { exact: true }),
  ).toBeVisible();
  let updated = await db.student.findUniqueOrThrow({
    where: { id: studentId },
  });
  expect(updated.currentXp).toBe(before.currentXp + 7);
  expect(updated.coinBalance).toBe(before.coinBalance);
  expect(
    await db.pointTransaction.count({
      where: { studentId, type: "MANUAL", amount: 7 },
    }),
  ).toBe(1);
  await page.getByLabel("Tipo de ajuste").selectOption("Coins");
  await page.getByLabel("Variação de fichas").fill("11");
  await page.getByLabel("Descrição do ajuste").fill("Ajuste E2E Marco 9");
  const coinsResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/director/coins") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Registrar ajuste", exact: true })
    .click();
  expect((await coinsResponse).status()).toBe(200);
  updated = await db.student.findUniqueOrThrow({ where: { id: studentId } });
  expect(updated.coinBalance).toBe(before.coinBalance + 11);
  expect(updated.currentXp).toBe(before.currentXp + 7);
  expect(
    await db.coinTransaction.count({
      where: {
        studentId,
        type: "MANUAL",
        description: "Ajuste E2E Marco 9",
        amount: 11,
      },
    }),
  ).toBe(1);
  await page
    .getByRole("button", { name: "Incluir Novo Item no Leilão", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  const title = `Lote Marco 9 ${f.prefix}`;
  await dialog.getByLabel("Título do Prêmio / Lote").fill(title);
  await dialog
    .getByLabel("Descrição Detalhada do Item")
    .fill("Lote criado pela direção no banco isolado");
  await dialog.getByRole("button", { name: "Cadastrar no Leilão" }).click();
  await expect(dialog).toHaveCount(0);
  const item = await db.auctionItem.findFirstOrThrow({ where: { title } });
  const card = page.getByTestId(`auction-${item.id}`);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Editar Lote / Datas" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Descrição Detalhada do Item")
    .fill("Descrição revisada pela direção");
  await expect(
    dialog.getByLabel("Lance Mínimo Inicial (fichas)"),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Salvar Alterações", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(card).toContainText("Descrição revisada pela direção");
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Encerrar lote", exact: true })
    .click();
  await expect(
    card.getByRole("button", { name: "Encerrar lote", exact: true }),
  ).toBeDisabled();
  expect(
    (await db.auctionItem.findUniqueOrThrow({ where: { id: item.id } })).status,
  ).toBe("FINISHED");
  const after = await db.student.findUniqueOrThrow({
    where: { id: studentId },
  });
  expect(after.currentXp).toBe(updated.currentXp);
  expect(after.coinBalance).toBe(updated.coinBalance);
});
