import { expect, test } from "@playwright/test";
import { hash } from "bcryptjs";
import { db, ids } from "./data";

/** Primeiro acesso do professor: com a senha padrão só dá para criar a senha nova; o servidor bloqueia o resto. */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;
const H = { Origin: origin };

function fx(project: string) {
  const f = ids(project);
  return { userId: `${f.prefix}_firstteacher`, teacherId: `${f.prefix}_firstteacher_profile`, email: `${f.prefix}_firstteacher@example.test` };
}

test.beforeAll(async ({}, info) => {
  const x = fx(info.project.name);
  await db.user.deleteMany({ where: { id: x.userId } });
  await db.user.create({ data: { id: x.userId, email: x.email, name: "Professor Primeiro Acesso", role: "PROFESSOR", passwordHash: await hash("tecnologia", 10), mustChangePassword: true, teacher: { create: { id: x.teacherId } } } });
});
test.afterAll(async ({}, info) => {
  await db.user.deleteMany({ where: { id: fx(info.project.name).userId } });
  await db.$disconnect();
});

test("professor com a senha padrão só consegue criar a senha nova", async ({ page }, info) => {
  const x = fx(info.project.name);
  await page.request.post("/api/auth/logout", { headers: H });
  const login = await page.request.post("/api/auth/login", { data: { email: x.email, password: "tecnologia" }, headers: H });
  expect(login.status()).toBe(200);
  expect((await login.json()).user.mustChangePassword).toBe(true);
  expect((await page.request.get("/api/teacher/dashboard")).status()).toBe(401);
  // a mesma senha não vale como senha nova
  const same = await page.request.put("/api/account", { data: { action: "FIRST_PASSWORD", newPassword: "tecnologia" }, headers: H });
  expect(same.status()).toBe(400);
  const ok = await page.request.put("/api/account", { data: { action: "FIRST_PASSWORD", newPassword: "estrela7" }, headers: H });
  expect(ok.status()).toBe(200);
  expect((await page.request.get("/api/teacher/dashboard")).status()).toBe(200);
  expect((await db.user.findUniqueOrThrow({ where: { id: x.userId } })).mustChangePassword).toBe(false);
});
