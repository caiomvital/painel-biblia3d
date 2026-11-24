import { expect, test, type Page } from "@playwright/test";
import { db, ids, password } from "./data";
import { dismissTour } from "./tour";

const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;
const H = { Origin: origin };

async function directorLogin(page: Page, project: string) {
  await page.goto("/");
  await page.getByTestId("login-continuar").click();
  await page.locator("#login-email").fill(ids(project).email("director"));
  await page.locator("#login-password").fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("navigation", { name: "Áreas do diretor" })).toBeVisible();
  await dismissTour(page);
}

test.afterAll(async () => {
  await db.auctionSeason.deleteMany({ where: { title: { startsWith: "Temporada e2e" } } });
  await db.$disconnect();
});

test("direção cria uma temporada de leilão pela tela e valida os dados", async ({ page }, info) => {
  const title = `Temporada e2e ${info.project.name}`;
  await directorLogin(page, info.project.name);
  await page.getByRole("navigation", { name: "Áreas do diretor" }).getByRole("button", { name: "Gamificação e Leilões", exact: true }).click();
  const box = page.getByTestId("new-season");
  await box.evaluate((el) => { (el as HTMLDetailsElement).open = true; });
  await box.locator('input[name="title"]').fill(title);
  const end = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  await box.locator('input[name="endDate"]').fill(end);
  await box.getByRole("button", { name: "Criar temporada" }).click();
  await expect.poll(async () => (await db.auctionSeason.findFirst({ where: { title } }))?.status, { timeout: 20_000 }).toBe("ACTIVE");
  const season = await db.auctionSeason.findFirstOrThrow({ where: { title } });
  expect(season.minBidIncrement).toBe(50);
  expect(season.endsAt.getTime()).toBeGreaterThan(Date.now());

  // pela API: data passada e nome curto são recusados, e professor/aluno não criam
  const bad = await page.request.post("/api/director/auction", { headers: H, data: { action: "CREATE_SEASON", title, endDate: "2020-01-01T23:59:00-03:00" } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error).toContain("futuro");
  const none = await page.request.post("/api/director/auction", { headers: H, data: { action: "CREATE_SEASON", title: "ab", endDate: `${end}T23:59:00-03:00` } });
  expect(none.status()).toBe(400);
  expect(await db.auctionSeason.count({ where: { title: { startsWith: "Temporada e2e" } } })).toBe(1);
});

test("direção troca o aluno de turma: a matrícula antiga fica no histórico e a nova vale", async ({ browser }, info) => {
  const f = ids(info.project.name);
  const studentId = `${f.student}_profile`;
  const ctx = await browser.newContext();
  try {
    const login = await ctx.request.post(`${origin}/api/auth/login`, { headers: H, data: { email: f.email("director"), password } });
    expect(login.status()).toBe(200);
    const list = await (await ctx.request.get(`${origin}/api/director/kids/students`)).json();
    expect(list.classes.some((c: { id: string }) => c.id === f.otherClass)).toBe(true);

    const move = await ctx.request.patch(`${origin}/api/director/kids/students`, { headers: H, data: { id: studentId, classId: f.otherClass } });
    expect(move.status()).toBe(200);
    const rows = await db.enrollment.findMany({ where: { studentId } });
    expect(rows.find((r) => r.classId === f.otherClass)?.status).toBe("ACTIVE");
    expect(rows.find((r) => r.classId === f.class)?.status).toBe("DROPPED");
    expect(rows.filter((r) => r.status === "ACTIVE").length).toBe(1);
    expect(await db.auditLog.count({ where: { action: "Aluno trocado de turma", entityId: studentId } })).toBeGreaterThan(0);

    // repetir a mesma troca não duplica nada, e voltar reativa a matrícula antiga
    expect((await ctx.request.patch(`${origin}/api/director/kids/students`, { headers: H, data: { id: studentId, classId: f.otherClass } })).status()).toBe(200);
    expect((await ctx.request.patch(`${origin}/api/director/kids/students`, { headers: H, data: { id: studentId, classId: f.class } })).status()).toBe(200);
    const back = await db.enrollment.findMany({ where: { studentId } });
    expect(back.length).toBe(2);
    expect(back.find((r) => r.classId === f.class)?.status).toBe("ACTIVE");
    expect(back.find((r) => r.classId === f.otherClass)?.status).toBe("DROPPED");

    // aluno não troca turma de ninguém
    const sctx = await browser.newContext();
    expect((await sctx.request.patch(`${origin}/api/director/kids/students`, { headers: H, data: { id: studentId, classId: f.otherClass } })).status()).toBe(403);
    await sctx.close();
  } finally {
    await db.enrollment.updateMany({ where: { studentId, classId: f.class }, data: { status: "ACTIVE" } });
    await db.enrollment.updateMany({ where: { studentId, classId: f.otherClass }, data: { status: "DROPPED" } });
    await ctx.close();
  }
});
