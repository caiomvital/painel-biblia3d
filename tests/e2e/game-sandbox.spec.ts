import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { PROBE_MARKER } from "../../lib/probe-guard";
import { db, ids, password } from "./data";

/**
 * SONDA DE SEGURANÇA dos jogos (SOMENTE banco de teste local).
 *
 * Joga, pelo caminho real do aluno (aba Jogos -> iframe), jogos "maliciosos" que tentam ler cookie e
 * localStorage, mexer no painel, navegar a página principal e falar com a rede. Um servidor "canário"
 * local (localhost, host diferente do painel em 127.0.0.1) conta toda requisição que chegar a ele.
 *
 * Garantias contra uso indevido:
 *  - os jogos de sonda carregam o marcador B3D-PROBE-GAME, que a trava de lib/probe-guard só deixa criar
 *    ou servir em e2e local (NODE_ENV/APP_ENV != production, TEST_APP_PORT definida, banco local _test);
 *  - o HTML da sonda vive só neste arquivo de teste (nunca em seed/prisma/app) e as linhas vão para o
 *    banco de teste, que o teardown descarta;
 *  - o canário só existe durante este teste, preso em 127.0.0.1.
 */
const origin = `http://127.0.0.1:${process.env.TEST_APP_PORT ?? 3100}`;

type Hit = { method: string; url: string; cookie: boolean; referer: string };
async function startCanary() {
  const hits: Hit[] = [];
  let connections = 0;
  const server: Server = createServer((req, res) => {
    hits.push({ method: req.method ?? "", url: req.url ?? "", cookie: Boolean(req.headers.cookie), referer: String(req.headers.referer ?? "") });
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
    res.end("<!doctype html><title>CANARIO</title><p id='canary'>CANARIO</p>");
  });
  server.on("connection", () => { connections++; });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  return { hits, connections: () => connections, url: `http://localhost:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

/** Jogo de sonda principal: tenta tudo e escreve o resultado em #out (JSON). */
const probeHtml = (c: string) => `<!doctype html><html><head><title>sonda</title></head><body><!-- ${PROBE_MARKER} --><pre id="out"></pre>
<script>
const R = {};
const rec = (k, v) => { R[k] = v; };
const attempt = async (k, fn) => { try { const v = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))]); rec(k, 'PERMITIDO:' + String(v).slice(0, 40)); } catch (e) { rec(k, 'BLOQUEADO:' + (e && e.name || 'erro')); } };
(async () => {
  await attempt('document.cookie', () => document.cookie);
  await attempt('localStorage', () => localStorage.getItem('x'));
  await attempt('sessionStorage', () => sessionStorage.getItem('x'));
  await attempt('indexedDB', () => new Promise((ok, no) => { const r = indexedDB.open('x'); r.onsuccess = () => ok('abriu'); r.onerror = () => no(r.error); }));
  await attempt('parent.document', () => parent.document.title);
  await attempt('top.document', () => top.document.title);
  await attempt('top.location = canário', () => { top.location = '${c}/topnav'; return 'atribuiu'; });
  await attempt('window.open', () => { const w = window.open('${c}/popup'); if (!w) throw new Error('bloqueado'); return 'abriu'; });
  await attempt('fetch painel /api/auth/me', async () => (await fetch('/api/auth/me')).status);
  await attempt('fetch canário', async () => (await fetch('${c}/fetch', { mode: 'no-cors' })).type);
  await attempt('XMLHttpRequest canário', () => new Promise((ok, no) => { const x = new XMLHttpRequest(); x.open('GET', '${c}/xhr'); x.onload = () => ok(x.status); x.onerror = () => no(new Error('xhr')); x.send(); }));
  await attempt('WebSocket canário', () => new Promise((ok, no) => { const w = new WebSocket('ws://localhost:' + '${c}'.split(':').pop() + '/ws'); w.onopen = () => ok('abriu'); w.onerror = () => no(new Error('ws')); }));
  await attempt('sendBeacon canário', () => { if (!navigator.sendBeacon('${c}/beacon', 'x')) throw new Error('recusado'); return 'enfileirou'; });
  await attempt('Worker blob', () => new Promise((ok, no) => { try { const w = new Worker(URL.createObjectURL(new Blob(['postMessage(1)']))); w.onmessage = () => ok('executou'); w.onerror = () => no(new Error('worker')); } catch (e) { no(e); } }));
  await attempt('eval', () => eval('1+1'));
  await attempt('new Function', () => new Function('return 1')());
  await attempt('getUserMedia (câmera)', () => navigator.mediaDevices.getUserMedia({ video: true }));
  await attempt('geolocation', () => new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no)));
  await attempt('clipboard.readText', () => navigator.clipboard.readText());
  await attempt('requestFullscreen', () => document.documentElement.requestFullscreen());
  // elementos que tentam sair para a rede (nenhum deve chegar ao canário)
  const add = (tag, attrs) => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); document.body.appendChild(e); return e; };
  add('img', { src: '${c}/img' });
  add('script', { src: '${c}/script.js' });
  add('link', { rel: 'stylesheet', href: '${c}/style.css' });
  add('link', { rel: 'prefetch', href: '${c}/prefetch' });
  add('link', { rel: 'preload', as: 'fetch', href: '${c}/preload', crossorigin: '' });
  add('link', { rel: 'preconnect', href: '${c}' });
  add('iframe', { src: '${c}/iframe' });
  add('video', { src: '${c}/video' });
  add('object', { data: '${c}/object' });
  const f = add('form', { action: '${c}/form', method: 'post' }); try { f.submit(); } catch (e) {}
  await new Promise((r) => setTimeout(r, 1500));
  document.getElementById('out').textContent = JSON.stringify(R);
  document.title = 'DONE';
})();
</script></body></html>`;

const navHtml = (how: string, c: string) => `<!doctype html><html><head><title>nav</title>${how === "meta" ? `<meta http-equiv="refresh" content="0;url=${c}/selfnav-meta">` : ""}</head><body><!-- ${PROBE_MARKER} -->
<script>${how === "location" ? `location.href='${c}/selfnav-location';` : ""}${how === "link" ? `setTimeout(function(){var a=document.createElement('a');a.href='${c}/selfnav-link';document.body.appendChild(a);a.click();},300);` : ""}</script></body></html>`;

async function login(page: Page, project: string) {
  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await page.goto("/");
  await page.getByLabel("Usuário ou e-mail").fill(ids(project).email("student"));
  await page.getByLabel("Senha de Acesso").fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await response).status()).toBe(200);
}
const play = async (page: Page, id: string) => {
  await page.getByRole("button", { name: "Jogos", exact: true }).click();
  await page.getByTestId(`game-play-${id}`).click();
};

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

test("sonda: jogo malicioso não alcança cookies, sessão, painel nem a rede", async ({ page }, info) => {
  const f = ids(info.project.name);
  const canary = await startCanary();
  const gid = (n: string) => `${f.prefix}_game_probe_${n}`;
  const rows: Array<[string, string, string]> = []; // [tentativa, esperado, observado]
  try {
    await db.game.deleteMany({ where: { id: { startsWith: `${f.prefix}_game_probe_` } } });
    const mk = (n: string, html: string) => db.game.create({ data: { id: gid(n), title: `Sonda ${n} ${info.project.name}`, authorName: "Sonda de segurança", status: "APPROVED", isPublic: true, html } });
    await mk("main", probeHtml(canary.url));
    for (const how of ["location", "meta", "link"]) await mk(`nav_${how}`, navHtml(how, canary.url));

    await login(page, info.project.name);

    // 1) bateria principal ---------------------------------------------------------------
    await play(page, gid("main"));
    const frame = page.frameLocator("iframe");
    await expect(frame.locator("#out")).not.toHaveText("", { timeout: 60_000 });
    const R: Record<string, string> = JSON.parse((await frame.locator("#out").textContent()) ?? "{}");
    const expectBlocked = [
      "document.cookie", "localStorage", "sessionStorage", "parent.document", "top.document", "window.open",
      "fetch painel /api/auth/me", "fetch canário", "XMLHttpRequest canário", "WebSocket canário",
      "Worker blob", "eval", "new Function", "getUserMedia (câmera)", "geolocation", "clipboard.readText", "requestFullscreen",
    ];
    for (const k of expectBlocked) {
      rows.push([k, "BLOQUEADO", R[k] ?? "sem resposta"]);
    }
    rows.push(["indexedDB", "BLOQUEADO", R["indexedDB"] ?? "sem resposta"]);
    rows.push(["sendBeacon canário (a chamada enfileira; o que vale é o canário não receber nada)", "não chega ao canário", R["sendBeacon canário"] ?? "sem resposta"]);
    rows.push(["top.location = canário", "sem efeito na página principal", R["top.location = canário"] ?? "sem resposta"]);

    for (const k of expectBlocked) expect(R[k], `${k}: ${R[k]}`).toMatch(/^BLOQUEADO/);
    expect(R["indexedDB"]).toMatch(/^BLOQUEADO/);
    expect(page.url()).toContain(origin); // a navegação do topo não funcionou
    rows.push(["URL da página principal depois de tudo", "inalterada", page.url() === `${origin}/` ? "inalterada" : page.url()]);

    // nada do que o jogo tentou chegou ao canário (elementos, fetch, xhr, websocket, beacon, form, popup, top)
    const mainHits = canary.hits.map((h) => `${h.method} ${h.url}`);
    rows.push(["requisições que chegaram ao canário (bateria principal)", "0", String(mainHits.length) + (mainHits.length ? " -> " + mainHits.join(", ") : "")]);
    expect(mainHits, "canário recebeu requisições da bateria principal").toEqual([]);
    rows.push(["conexões TCP ao canário (preconnect)", "0", String(canary.connections())]);

    await page.getByRole("button", { name: "Voltar", exact: true }).click();

    // 3) navegação do próprio iframe (achado esperado: o CSP não controla) -----------------------------
    const navResults: Record<string, string> = {};
    for (const how of ["location", "meta", "link"]) {
      const before = canary.hits.length;
      await play(page, gid(`nav_${how}`));
      await page.waitForTimeout(3_000);
      const hit = canary.hits.slice(before).find((h) => h.url.startsWith(`/selfnav-${how}`));
      navResults[how] = hit ? `NAVEGOU (canário recebeu GET ${hit.url}; cookie do painel enviado: ${hit.cookie ? "SIM" : "não"}; referer: ${hit.referer || "(nenhum)"})` : "não navegou";
      rows.push([`iframe navega a si mesmo: ${how === "location" ? "location.href" : how === "meta" ? "<meta refresh>" : "<a> clicado"}`, "idealmente bloqueado", navResults[how]]);
      await page.getByRole("button", { name: "Voltar", exact: true }).click();
    }
    // O iframe não tem cookies nem sessão do painel, e o host do canário é outro: nada do painel deve ter ido junto.
    for (const h of canary.hits) expect(h.cookie, `cookie enviado ao canário em ${h.url}`).toBe(false);
  } finally {
    const width = Math.max(...rows.map((r) => r[0].length));
    const table = ["", "==== RESULTADO DA SONDA (jogos) ====", ...rows.map(([a, e, o]) => `${a.padEnd(width)} | esperado: ${e} | observado: ${o}`), ""].join("\n");
    console.log(table);
    await info.attach("sonda-jogos.txt", { body: table, contentType: "text/plain" });
    await db.game.deleteMany({ where: { id: { startsWith: `${f.prefix}_game_probe_` } } });
    await canary.close();
    await db.$disconnect();
  }
});
