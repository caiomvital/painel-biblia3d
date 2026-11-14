import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_SHIM_ENABLED, SHIM_TAG, injectGameShim } from '../../lib/game-shim';

const doctypeEnd = (h: string) => { const m = /<!doctype[^>]*>/i.exec(h); return m ? m.index + m[0].length : 0; };

describe('injeção do aviso amigável nos jogos', () => {
  test('entra logo depois de <head>, depois do doctype', () => {
    const out = injectGameShim('<!doctype html><html><head><title>x</title></head><body>oi</body></html>');
    expect(out.indexOf(SHIM_TAG)).toBe('<!doctype html><html><head>'.length);
    expect(out.startsWith('<!doctype html>')).toBe(true);
  });
  test('nunca antes do <!doctype>, em nenhum formato', () => {
    for (const html of [
      '<!DOCTYPE html><html lang="pt"><body>a</body></html>',
      '<!doctype html><body class="x">a</body>',
      '<!doctype html>\n<div>fragmento</div>',
      '<!doctype html><script>var head="<head>"</script>',
      '<html><head></head></html>',
      '<div>sem nada</div>',
    ]) {
      const out = injectGameShim(html);
      expect(out.indexOf(SHIM_TAG)).toBeGreaterThanOrEqual(doctypeEnd(html));
      expect(out.replace(SHIM_TAG, '')).toBe(html); // só acrescenta o script, o resto fica igual
    }
  });
  test('GAME_SHIM_ENABLED liga e desliga a injeção sem mudar o resto', () => {
    expect(GAME_SHIM_ENABLED).toBe(true);
    const html = '<!doctype html><html><head></head><body>jogo</body></html>';
    expect(injectGameShim(html, false)).toBe(html);
    expect(injectGameShim(html, true)).not.toBe(html);
  });
  test('não injeta duas vezes', () => {
    const once = injectGameShim('<!doctype html><head></head>');
    expect(injectGameShim(once)).toBe(once);
  });
  test('script mínimo (menos de 1,3 KB), sintaxe válida e sem eval', () => {
    expect(SHIM_TAG.length).toBeLessThan(1300);
    const code = SHIM_TAG.replace('<script data-b3d-shim>', '').replace('</script>', '');
    expect(() => new Function(code)).not.toThrow();
    expect(code).not.toMatch(/\beval\s*\(|new Function/);
  });
  test('os 3 jogos de exemplo continuam com o mesmo conteúdo depois da injeção', () => {
    for (const f of ['memoria.html', 'estrela.html', 'numero.html']) {
      const html = readFileSync(join(import.meta.dir, '..', '..', '_scripts', 'games', f), 'utf8');
      const out = injectGameShim(html);
      expect(out.replace(SHIM_TAG, '')).toBe(html);
      expect(out.indexOf(SHIM_TAG)).toBeGreaterThanOrEqual(doctypeEnd(html));
    }
  });
});
