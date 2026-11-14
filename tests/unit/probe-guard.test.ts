import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PROBE_MARKER, gameHtmlAllowedHere, isLocalTestDatabase, probeGamesAllowed } from '../../lib/probe-guard';

const LOCAL = 'postgresql://u:p@127.0.0.1:54329/fuctura_local_test?schema=public';
const e2e = { NODE_ENV: 'development', TEST_APP_PORT: '3100', DATABASE_URL: LOCAL };
const probe = `<html><!-- ${PROBE_MARKER} --></html>`;

describe('trava dos jogos de sonda', () => {
  test('só liga em e2e local: dev + TEST_APP_PORT + banco local _test', () => {
    expect(probeGamesAllowed(e2e)).toBe(true);
  });
  test('produção nunca permite (NODE_ENV ou APP_ENV), mesmo com o resto certo', () => {
    expect(probeGamesAllowed({ ...e2e, NODE_ENV: 'production' })).toBe(false);
    expect(probeGamesAllowed({ ...e2e, APP_ENV: 'production' })).toBe(false);
  });
  test('sem TEST_APP_PORT (ex.: servidor normal) não permite', () => {
    expect(probeGamesAllowed({ NODE_ENV: 'development', DATABASE_URL: LOCAL })).toBe(false);
  });
  test('banco que não é local e descartável não permite (ex.: Supabase)', () => {
    for (const url of [
      'postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?schema=biblia3d',
      'postgresql://u:p@127.0.0.1:5432/producao',
      'postgresql://u:p@10.0.0.5:5432/x_test',
      undefined,
    ]) {
      expect(isLocalTestDatabase(url)).toBe(false);
      expect(probeGamesAllowed({ ...e2e, DATABASE_URL: url })).toBe(false);
    }
  });
  test('jogo com marcador só passa no e2e local; jogo normal sempre passa', () => {
    expect(gameHtmlAllowedHere(probe, e2e)).toBe(true);
    expect(gameHtmlAllowedHere(probe, { NODE_ENV: 'production', APP_ENV: 'production' })).toBe(false);
    expect(gameHtmlAllowedHere('<html>jogo normal</html>', { NODE_ENV: 'production' })).toBe(true);
  });
});

describe('jogos de sonda não viram dado de produção', () => {
  const walk = (dir: string, out: string[] = []) => {
    for (const name of readdirSync(dir)) {
      if (['node_modules', '.next', '.git', 'test-results', 'playwright-report'].includes(name) || name.startsWith('.next')) continue;
      const full = join(dir, name);
      statSync(full).isDirectory() ? walk(full, out) : out.push(full);
    }
    return out;
  };
  test('o marcador só aparece em lib/probe-guard.ts e em tests/ (nunca em seed, prisma, app ou components)', () => {
    const root = join(import.meta.dir, '..', '..');
    const hits = walk(root)
      .filter((f) => /\.(ts|tsx|js|cjs|mjs|html|json|sql|md)$/.test(f))
      .filter((f) => readFileSync(f, 'utf8').includes(PROBE_MARKER))
      .map((f) => f.slice(root.length + 1).split(String.fromCharCode(92)).join('/'));
    for (const f of hits) expect(f === 'lib/probe-guard.ts' || f.startsWith('tests/')).toBe(true);
  });
});
