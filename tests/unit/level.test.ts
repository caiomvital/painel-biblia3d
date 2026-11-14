import { describe, expect, test } from 'bun:test';
import { XP_PER_LEVEL, levelFromXp, levelProgress } from '../../lib/level';

describe('level', () => {
  test('começa no nível 1 com 0 pontos', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpToNext: 300, xpForLevel: 300, ratio: 0 });
  });

  test('vira de nível exatamente em 300 pontos', () => {
    expect(levelFromXp(299)).toBe(1);
    expect(levelFromXp(300)).toBe(2);
    expect(levelFromXp(599)).toBe(2);
    expect(levelFromXp(600)).toBe(3);
  });

  test('calcula o progresso dentro do nível', () => {
    const p = levelProgress(450);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(150);
    expect(p.xpToNext).toBe(150);
    expect(p.ratio).toBe(0.5);
  });

  test('a razão nunca chega a 1', () => {
    expect(levelProgress(299).ratio).toBeLessThan(1);
    expect(levelProgress(300).ratio).toBe(0);
  });

  test('entradas inválidas viram 0 e decimais são truncados', () => {
    for (const bad of [-5, Number.NaN, Infinity, undefined, null, 'abc']) {
      expect(levelFromXp(bad)).toBe(1);
      expect(levelProgress(bad).xpIntoLevel).toBe(0);
    }
    expect(levelFromXp(300.9)).toBe(2);
    expect(levelFromXp('450')).toBe(2);
  });

  test('concorda com a regra do servidor (floor(pontos / 300) + 1)', () => {
    for (const xp of [0, 1, 10, 299, 300, 301, 899, 900, 12345]) {
      expect(levelFromXp(xp)).toBe(Math.floor(xp / XP_PER_LEVEL) + 1);
    }
  });
});
