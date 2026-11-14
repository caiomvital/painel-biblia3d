import { expect, test, type Page } from "@playwright/test";
import { db, ids, password } from "./data";

/**
 * Leilão do aluno (rede de segurança para o redesenho da Fase 2a).
 * Confere o que o aluno vê e, principalmente, o que fica no banco (lance, reserva, saldo).
 * As funções em `ui` concentram os seletores: se a tela mudar, só elas mudam.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;

async function login(page: Page, project: string) {
  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await page.goto("/");
  await page.getByLabel("Usuário ou e-mail").fill(ids(project).email("student"));
  await page.getByLabel("Senha de Acesso").fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await response).status()).toBe(200);
}

const ui = {
  openAuctionTab: (page: Page) => page.getByRole("button", { name: "Leilão", exact: true }).click(),
  card: (page: Page, title: string) =>
    page.getByRole("heading", { name: title, exact: true }).locator('xpath=ancestor::div[contains(@class,"group")][1]'),
  openBid: (page: Page, title: string) => ui.card(page, title).getByRole("button", { name: /Dar Lance|Aumentar/ }).click(),
  confirmBid: (page: Page) => page.getByRole("button", { name: "Confirmar Lance", exact: true }).click(),
  withdraw: (page: Page, title: string) => ui.card(page, title).getByRole("button", { name: "Retirar meu lance" }).click(),
};

/** Mesma regra do servidor (placeAuctionBid): aberto a partir das 19h de Recife (UTC-3). */
const auctionOpenNow = () => new Date(Date.now() - 3 * 3600 * 1000).getUTCHours() >= 19;

test.describe.configure({ mode: "serial" });
test.afterAll(async () => db.$disconnect());

function fixtures(project: string) {
  const f = ids(project);
  return {
    f,
    seasonId: `${f.prefix}_season`,
    itemA: { id: `${f.prefix}_auction_a`, title: `Picolé ${project}` },
    itemB: { id: `${f.prefix}_auction_b`, title: `Guaraná ${project}` },
    studentId: `${f.student}_profile`,
    outsiderId: `${f.outsider}_profile`,
  };
}

test.beforeAll(async ({}, info) => {
  const x = fixtures(info.project.name);
  const endsAt = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  await db.auctionSeason.deleteMany({ where: { id: x.seasonId } });
  await db.auctionSeason.create({
    data: { id: x.seasonId, title: "Leilão E2E", status: "ACTIVE", minBidIncrement: 50, endsAt },
  });
  const base = { seasonId: x.seasonId, category: "Guloseimas", iconType: "book", marketValue: "R$ 5,00", status: "ACTIVE" as const, endsAt };
  await db.auctionItem.create({
    data: { ...base, id: x.itemA.id, title: x.itemA.title, description: "Um picolé gelado.", startingBid: 100, currentBid: 100, minNextBid: 150 },
  });
  await db.auctionItem.create({
    data: {
      ...base, id: x.itemB.id, title: x.itemB.title, description: "Um guaraná.", startingBid: 200, currentBid: 200, minNextBid: 250,
      highestBidderId: x.outsiderId, highestBidderName: "Colega Reservado Silva", totalBids: 1,
    },
  });
  await db.student.update({ where: { id: x.studentId }, data: { coinBalance: 1000 } });
});

test("aluno vê prêmios e saldo, e nenhum nome de colega", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  await login(page, info.project.name);
  await ui.openAuctionTab(page);

  await expect(page.getByRole("heading", { name: x.itemA.title, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: x.itemB.title, exact: true })).toBeVisible();
  await expect(page.getByText("1.000").first()).toBeVisible(); // saldo em fichas

  // privacidade: nem na tela nem na API aparece o nome de quem lidera
  await expect(page.locator("body")).not.toContainText("Colega Reservado");
  const api = await (await page.request.get("/api/auction")).json();
  expect(JSON.stringify(api)).not.toContain("Colega Reservado");
});

test("lance, reserva e saldo conferem no banco (e retirar libera as fichas)", async ({ page }, info) => {
  const x = fixtures(info.project.name);
  await login(page, info.project.name);
  await ui.openAuctionTab(page);
  await ui.openBid(page, x.itemA.title);
  await ui.confirmBid(page);

  if (!auctionOpenNow()) {
    // Fora da janela das 19h o servidor recusa: nada pode ser reservado.
    await expect(page.getByText(/abre todo dia às 19h/)).toBeVisible();
    expect(await db.coinReservation.count({ where: { studentId: x.studentId, itemId: x.itemA.id } })).toBe(0);
    expect((await db.student.findUniqueOrThrow({ where: { id: x.studentId } })).coinBalance).toBe(1000);
    return;
  }

  // Dentro da janela: lance de 150 vira reserva ativa, o saldo total não muda (só o disponível).
  await expect
    .poll(async () => (await db.coinReservation.findFirst({ where: { studentId: x.studentId, itemId: x.itemA.id, status: "ACTIVE" } }))?.amount)
    .toBe(150);
  const item = await db.auctionItem.findUniqueOrThrow({ where: { id: x.itemA.id } });
  expect(item.currentBid).toBe(150);
  expect(item.highestBidderId).toBe(x.studentId);
  expect((await db.student.findUniqueOrThrow({ where: { id: x.studentId } })).coinBalance).toBe(1000);
  const api = await (await page.request.get("/api/auction")).json();
  expect(api.studentCoins).toMatchObject({ coinBalance: 1000, reservedCoins: 150, availableCoins: 850 });

  // Retirar o lance libera a reserva.
  await ui.withdraw(page, x.itemA.title);
  await expect
    .poll(async () => (await db.coinReservation.findFirst({ where: { studentId: x.studentId, itemId: x.itemA.id } }))?.status)
    .toBe("RELEASED");
  const after = await (await page.request.get("/api/auction")).json();
  expect(after.studentCoins).toMatchObject({ coinBalance: 1000, reservedCoins: 0, availableCoins: 1000 });
});
