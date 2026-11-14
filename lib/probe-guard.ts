/**
 * Trava de segurança dos "jogos de sonda" (jogos maliciosos usados SÓ nos testes de segurança).
 *
 * Um jogo de sonda carrega o marcador abaixo. Ele só pode existir/ser servido quando TODAS as
 * condições valem: não é produção (NODE_ENV e APP_ENV), é uma execução de e2e (TEST_APP_PORT definida)
 * e o banco é local e descartável (loopback, nome terminado em _test). Em produção, qualquer jogo com o
 * marcador é recusado na criação (aluno e diretor) e nunca é servido.
 */
export const PROBE_MARKER = 'B3D-PROBE-GAME';

type Env = Record<string, string | undefined>;

export function isLocalTestDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ['postgresql:', 'postgres:'].includes(u.protocol)
      && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)
      && /^\/[A-Za-z0-9_]+_test$/.test(u.pathname)
      && !u.searchParams.has('host');
  } catch {
    return false;
  }
}

export function probeGamesAllowed(env: Env = process.env): boolean {
  return env.NODE_ENV !== 'production'
    && env.APP_ENV !== 'production'
    && Boolean(env.TEST_APP_PORT)
    && isLocalTestDatabase(env.DATABASE_URL);
}

export const isProbeGame = (html: string): boolean => html.includes(PROBE_MARKER);

/** true = pode criar/servir este HTML neste ambiente. Jogos normais sempre podem. */
export function gameHtmlAllowedHere(html: string, env: Env = process.env): boolean {
  return !isProbeGame(html) || probeGamesAllowed(env);
}
