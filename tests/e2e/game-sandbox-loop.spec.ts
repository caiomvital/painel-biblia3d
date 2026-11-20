import { expect, test, type Page } from "@playwright/test";
import { PROBE_MARKER } from "../../lib/probe-guard";
import { db, ids, password } from "./data";

/**
 * SONDA (SOMENTE banco de teste local): laço infinito dentro de um jogo.
 * Fica em arquivo próprio porque pode inutilizar a aba (e o navegador do teste).
 * O jogo carrega o marcador B3D-PROBE-GAME: a trava de lib/probe-guard só o deixa existir em e2e local.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;
const loopHtml = `<!doctype html><html><head><title>laco</title></head><body><!-- ${PROBE_MARKER} --><p id="alive">começou</p>
<script>setTimeout(function(){ document.getElementById('alive').textContent='travando'; while (true) {} }, 600);</script></body></html>`;

async function login(page: Page, project: string) {
  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await page.goto("/");
  await page.getByLabel("Usuário ou e-mail").fill(ids(project).email("student"));
  await page.getByLabel("Senha de Acesso").fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await response).status()).toBe(200);
}

test.setTimeout(90_000);
// Sem trace/screenshot: o fim do teste não pode depender de uma aba que o próprio jogo travou.
test.use({ trace: "off", screenshot: "off", video: "off" });

test("sonda: laço infinito num jogo", async ({ browser }, info) => {
  // Contexto próprio: se a aba travar de vez, não prendemos o fechamento do contexto padrão do teste.
  const context = await browser.newContext({ baseURL: origin });
  const page = await context.newPage();
  const f = ids(info.project.name);
  const id = `${f.prefix}_game_probe_loop`;
  const rows: string[] = [];
  const print = async () => {
    const table = ["", "==== RESULTADO DA SONDA (laço infinito) ====", ...rows, ""].join(String.fromCharCode(10));
    console.log(table);
    await info.attach("sonda-laco.txt", { body: table, contentType: "text/plain" });
  };
  await db.game.deleteMany({ where: { id } });
  await db.game.create({ data: { id, title: `Sonda laço ${info.project.name}`, authorName: "Sonda de segurança", status: "APPROVED", isPublic: true, html: loopHtml } });
  try {
    await login(page, info.project.name);
    await page.getByRole("button", { name: "Jogos", exact: true }).click();
    await page.getByTestId(`game-play-${id}`).click();
    await expect(page.frameLocator("iframe").locator("#alive")).toBeVisible({ timeout: 60_000 }); // jogo carregado (a 1ª abertura compila a rota)
    await page.waitForTimeout(2_000); // o laço começa 600 ms depois de abrir
    const frameState = await page.frameLocator("iframe").locator("#alive").textContent({ timeout: 3_000 }).then(() => "responde", () => "TRAVADO");
    rows.push(`o iframe do jogo | esperado: trava (é o próprio jogo) | observado: ${frameState === "TRAVADO" ? "trava" : "não travou"}`);
    const parent = await Promise.race([
      page.evaluate(() => 1 + 1).then(() => "continua respondendo", (e: Error) => `FALHOU (${e.message.slice(0, 70)})`),
      new Promise<string>((r) => setTimeout(() => r("TRAVOU (sem resposta em 8 s)"), 8_000)),
    ]);
    rows.push(`painel principal na mesma aba | esperado: continua respondendo | observado: ${parent}`);
    if (parent === "continua respondendo") {
      await page.getByRole("button", { name: "Voltar", exact: true }).click({ timeout: 8_000 });
      await expect(page.getByTestId("games-screen")).toBeVisible({ timeout: 8_000 });
      rows.push("botão Voltar com o jogo travado | esperado: funciona | observado: funciona (voltou para a lista)");
    }
    await print();
    info.annotations.push({ type: "achado", description: `laço infinito: iframe ${frameState}; painel na mesma aba: ${parent}` });
    expect(frameState).toBe("TRAVADO");
  } finally {
    void context.close().catch(() => undefined); // sem await: uma aba travada pode nunca responder ao fechamento
    await db.game.deleteMany({ where: { id } });
    await db.$disconnect();
  }
});
