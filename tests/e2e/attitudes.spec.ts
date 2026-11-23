import { expect, request as pwRequest, test, type APIRequestContext, type Page } from "@playwright/test";
import { db, ids, password } from "./data";

/**
 * Atitudes (professor/diretor): permissões, idempotência, limite diário, ponto de atenção privado
 * e o aviso ao aluno (Tela de Resultado) sem expor quem registrou.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;
const H = { Origin: origin };
test.describe.configure({ mode: "serial" });

async function api(email: string): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL: origin });
  const r = await ctx.post("/api/auth/login", { data: { email, password } });
  expect(r.status()).toBe(200);
  return ctx;
}
const batch = (n: string) => `b${n}${"0123456789abcdef".repeat(2)}`.slice(0, 32);

test.afterAll(async ({}, info) => {
  const f = ids(info.project.name);
  await db.attitude.deleteMany({ where: { studentId: { in: [`${f.student}_profile`, `${f.outsider}_profile`] } } });
  await db.$disconnect();
});

test("professor registra; repetir o mesmo toque não duplica; valores vêm do servidor", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  const t = await api(f.email("teacher"));
  const before = await db.student.findUniqueOrThrow({ where: { id: sid } });
  const body = { classId: f.class, studentIds: [sid], code: "HELPED", batchId: batch("a"), note: "ignorada" };
  const r1 = await t.post("/api/attitudes", { data: body, headers: H });
  expect(r1.status()).toBe(200);
  expect((await r1.json()).results[0].status).toBe("OK");
  const r2 = await t.post("/api/attitudes", { data: body, headers: H }); // duplo toque
  expect((await r2.json()).results[0].status).toBe("DUPLICATE");
  const after = await db.student.findUniqueOrThrow({ where: { id: sid } });
  expect(after.currentXp - before.currentXp).toBe(10);
  expect(after.coinBalance - before.coinBalance).toBe(10);
  expect(await db.pointTransaction.count({ where: { studentId: sid, originReference: { startsWith: "ATT_" } } })).toBe(1);
  expect(await db.coinTransaction.count({ where: { studentId: sid, originReference: { startsWith: "ATT_" } } })).toBe(1);
  // o cliente não manda valores: tentar impor um código/valor inventado é recusado
  const bad = await t.post("/api/attitudes", { data: { ...body, code: "XP_INFINITO", batchId: batch("b") }, headers: H });
  expect(bad.status()).toBe(400);
});

test("permissões: aluno, outro professor e turma alheia", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  const stu = await api(f.email("student"));
  expect((await stu.get("/api/attitudes")).status()).toBe(403);
  expect((await stu.post("/api/attitudes", { data: { classId: f.class, studentIds: [sid], code: "HELPED", batchId: batch("c") }, headers: H })).status()).toBe(403);

  const other = await api(f.email("otherTeacher"));
  const denied = await other.post("/api/attitudes", { data: { classId: f.class, studentIds: [sid], code: "HELPED", batchId: batch("d") }, headers: H });
  expect(denied.status()).toBe(403);
  expect((await other.get(`/api/attitudes?view=history&classId=${f.class}`)).status()).toBe(403);
  expect((await other.get(`/api/attitudes?view=students&classId=${f.class}`)).status()).toBe(403);

  const t = await api(f.email("teacher"));
  // aluno de outra turma, mesmo na minha turma permitida: recusado por não estar matriculado
  const notIn = await t.post("/api/attitudes", { data: { classId: f.class, studentIds: [`${f.outsider}_profile`], code: "HELPED", batchId: batch("e") }, headers: H });
  expect((await notIn.json()).results[0].status).toBe("NOT_IN_CLASS");
  expect(await db.pointTransaction.count({ where: { studentId: `${f.outsider}_profile`, originReference: { startsWith: "ATT_" } } })).toBe(0);
});

test("limite diário por aluno e ponto de atenção privado (sem tirar nada)", async ({}, info) => {
  const f = ids(info.project.name);
  const sid = `${f.student}_profile`;
  const t = await api(f.email("teacher"));
  const send = async (code: string, n: string, note?: string) =>
    (await (await t.post("/api/attitudes", { data: { classId: f.class, studentIds: [sid], code, batchId: batch(n), note }, headers: H })).json()).results[0];
  expect((await send("PARTICIPATED", "f")).status).toBe("OK");
  expect((await send("BROUGHT_TASK", "g")).status).toBe("OK");
  const full = await send("CAPRICHOU", "h"); // 4ª positiva do dia
  expect(full.status).toBe("LIMIT");
  expect(full.message).toContain("3");
  const mid = await db.student.findUniqueOrThrow({ where: { id: sid } });

  const att = await send("ATTENTION", "i", "conversar com o responsável");
  expect(att.status).toBe("OK"); // ponto de atenção não conta no limite
  const end = await db.student.findUniqueOrThrow({ where: { id: sid } });
  expect(end.currentXp).toBe(mid.currentXp);
  expect(end.coinBalance).toBe(mid.coinBalance);
  expect(end.level).toBe(mid.level);

  const hist = await (await t.get(`/api/attitudes?view=history&classId=${f.class}`)).json();
  expect(hist.items.some((h: any) => h.kind === "ATTENTION" && h.note === "conversar com o responsável")).toBe(true);
  expect(hist.items.filter((h: any) => h.kind === "POSITIVE").every((h: any) => h.note === null)).toBe(true);

  // o aluno nunca vê o ponto de atenção nem quem registrou
  const stu = await api(f.email("student"));
  const pending = await (await stu.get("/api/kids/attitudes")).json();
  expect(pending.count).toBe(3);
  expect(pending.xp).toBe(20);
  expect(JSON.stringify(pending)).not.toMatch(/atenção|ATTENTION|responsável|teacher/i);
});

test("diretor registra em qualquer turma", async ({}, info) => {
  const f = ids(info.project.name);
  const d = await api(f.email("director"));
  const r = await d.post("/api/attitudes", { data: { classId: f.otherClass, studentIds: [`${f.outsider}_profile`], code: "CAPRICHOU", batchId: batch("j") }, headers: H });
  expect((await r.json()).results[0].status).toBe("OK");
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

test("aluno vê a Tela de Resultado ao entrar, só com os totais dele, e não repete", async ({ page }, info) => {
  const f = ids(info.project.name);
  await loginUi(page, f.email("student"));
  const dialog = page.getByRole("dialog", { name: "BOA ATITUDE!" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("reward-total")).toContainText("+20", { timeout: 15_000 });
  await expect(dialog).not.toContainText(/colega/i); // só a frase genérica do Davi cita "professor", nunca quem deu a atitude
  if (process.env.B3D_SHOTS_DIR) {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${process.env.B3D_SHOTS_DIR}/atitudes-aluno-360.png` });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${process.env.B3D_SHOTS_DIR}/atitudes-aluno-768.png` });
  }
  await dialog.getByRole("button", { name: "CONTINUAR" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await db.attitude.count({ where: { studentId: `${f.student}_profile`, kind: "POSITIVE", seenAt: null } }))).toBe(0);
  await page.reload();
  await expect(page.getByTestId("student-shell")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "BOA ATITUDE!" })).toHaveCount(0);
});

test("prints da tela do professor (360px e 768px)", async ({ page }, info) => {
  const dir = process.env.B3D_SHOTS_DIR;
  test.skip(!dir, "só gera prints quando B3D_SHOTS_DIR está definido");
  const f = ids(info.project.name);
  await loginUi(page, f.email("teacher"));
  await page.getByRole("button", { name: "Atitudes", exact: true }).click();
  const panel = page.getByTestId("attitudes-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("checkbox").first().check();
  await expect(panel.getByTestId("attitude-history").getByRole("listitem").first()).toBeVisible();
  for (const [w, h] of [[360, 900], [768, 1100]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/atitudes-${w}.png`, fullPage: true });
  }
});
