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

          errors.push(r.failure()?.errorText || "Falha de transporte");

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

async function login(page: Page, project: string, role = "teacher") {

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
  for (const name of ["Chamada", "Aula de hoje", "Atitudes", "Perguntas", "Quiz ao vivo", "Jogos", "Turmas"])
    await expect(nav.getByRole("button", { name, exact: true })).toBeVisible();
  for (const name of ["Aulas e Diário", "Exercícios", "Presenças", "Visão Geral", "Minhas Turmas", "Alunos", "Eventos"])
    await expect(nav.getByRole("button", { name, exact: true })).toHaveCount(0);
  const initial = await page.request.get("/api/teacher/dashboard");
  expect(initial.status()).toBe(200);
  const before = await initial.json();
  expect(before.classes.map((c: { id: string }) => c.id)).toEqual([f.class]);
  // cada botão abre só a sua tarefa
  await expect(page.getByTestId("teacher-game-upload")).toHaveCount(0);
  await nav.getByRole("button", { name: "Jogos", exact: true }).click();
  await expect(page.getByTestId("teacher-game-upload")).toBeVisible();
  await nav.getByRole("button", { name: "Perguntas", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Meu banco de perguntas/ })).toBeVisible();
  await expect(page.getByText("Seus pontos de professor")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("teacher-perguntas.png"),
    fullPage: true,
  });
  // a aula pode ser cadastrada com antecedência (até 21 dias); mais longe que isso é recusado
  const day = (n: number) => new Date(Date.now() - 3 * 3600_000 + n * 86400_000).toISOString().slice(0, 10);
  const ok = await page.request.post("/api/teacher/kids", { data: { action: "report", classId: f.class, day: day(3), topics: ["Tópico um", "Tópico dois"] } });
  expect(ok.status()).toBe(200);
  const far = await page.request.post("/api/teacher/kids", { data: { action: "report", classId: f.class, day: day(40), topics: ["Longe"] } });
  expect(far.status()).toBe(400);
  await db.lessonReport.deleteMany({ where: { classId: f.class, day: day(3) } });
  // pergunta do professor entra direto (sem revisão da direção)
  const q = await page.request.post("/api/teacher/kids", { data: { action: "question", classId: f.class, text: "Quanto é 1 + 1?", options: ["1", "2", "3", "4"], correctIndex: 1 } });
  expect(q.status()).toBe(200);
  const saved = await db.quizQuestion.findUniqueOrThrow({ where: { id: (await q.json()).id } });
  expect(saved.status).toBe("APPROVED");
  expect(saved.kind).toBe("WEEKLY");
  await db.quizQuestion.delete({ where: { id: saved.id } });
  // chamada: marca quem veio; os pontos de presença saem uma vez só
  const sid = `${f.student}_profile`;
  const roll = await (await page.request.get(`/api/teacher/roll-call?classId=${f.class}`)).json();
  expect(roll.students.map((x: { id: string }) => x.id)).toEqual([sid]);
  const xp0 = (await db.student.findUniqueOrThrow({ where: { id: sid } })).currentXp;
  const first = await page.request.post("/api/teacher/roll-call", { data: { classId: f.class, presentIds: [sid] } });
  expect(first.status()).toBe(200);
  const r1 = await first.json();
  expect(r1).toMatchObject({ presents: 1, absents: 0 });
  expect((await db.attendance.findUniqueOrThrow({ where: { lessonId_studentId: { lessonId: r1.lessonId, studentId: sid } } })).status).toBe("PRESENT");
  const xp1 = (await db.student.findUniqueOrThrow({ where: { id: sid } })).currentXp;
  expect(xp1 - xp0).toBe(r1.xpPerPresence);
  expect((await page.request.post("/api/teacher/roll-call", { data: { classId: f.class, presentIds: [sid] } })).status()).toBe(200);
  expect((await db.student.findUniqueOrThrow({ where: { id: sid } })).currentXp).toBe(xp1);
  // aluno de outra turma não entra; a falta não mexe em pontos
  expect((await page.request.post("/api/teacher/roll-call", { data: { classId: f.class, presentIds: [`${f.outsider}_profile`] } })).status()).toBe(400);
  expect((await page.request.post("/api/teacher/roll-call", { data: { classId: f.otherClass, presentIds: [] } })).status()).toBe(400);
  await db.pointTransaction.deleteMany({ where: { studentId: sid, originReference: r1.lessonId } });
  await db.coinTransaction.deleteMany({ where: { studentId: sid, originReference: r1.lessonId } });
  await db.lesson.delete({ where: { id: r1.lessonId } });
  await db.student.update({ where: { id: sid }, data: { currentXp: xp0, coinBalance: { decrement: r1.xpPerPresence } } });
  // o professor ajusta dia e horário da própria turma; da turma dos outros, não
  const original = await db.class.findUniqueOrThrow({ where: { id: f.class } });
  const patch = (data: object) => page.request.patch("/api/teacher/classes", { data });
  expect((await patch({ classId: f.class, daysOfWeek: "SAB", startTime: "09:00", endTime: "12:30" })).status()).toBe(200);
  expect((await db.class.findUniqueOrThrow({ where: { id: f.class } })).scheduleTime).toBe("09:00 - 12:30");
  expect((await patch({ classId: f.class, daysOfWeek: "SAB", startTime: "13:00", endTime: "12:00" })).status()).toBe(400);
  expect((await patch({ classId: f.class, daysOfWeek: "XXX", startTime: "09:00", endTime: "10:00" })).status()).toBe(400);
  expect((await patch({ classId: f.otherClass, daysOfWeek: "SAB", startTime: "09:00", endTime: "10:00" })).status()).toBe(400);
  await db.class.update({ where: { id: f.class }, data: { daysOfWeek: original.daysOfWeek, scheduleTime: original.scheduleTime } });
  await nav.getByRole("button", { name: "Turmas", exact: true }).click();
  await expect(page.getByTestId(`class-schedule-${f.class}`)).toBeVisible();
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

  await page.getByTestId("login-continuar").click();

  await page.locator("#login-email").fill(f.email("student"));

  await page.locator("#login-password").fill(password);

  const auth = page.waitForResponse((r) => r.url().endsWith("/api/auth/login"));

  await page.getByRole("button", { name: "Entrar", exact: true }).click();

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

