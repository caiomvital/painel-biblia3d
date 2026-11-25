import { describe, expect, test } from 'bun:test';
import { levelFromXp, levelProgress, xpToReachLevel } from '../../lib/level';

describe('curva de nível por XP (crescente)', () => {
  test('entrada em cada nível', () => {
    expect([1, 2, 3, 4, 5, 6].map(xpToReachLevel)).toEqual([0, 10, 50, 120, 220, 350]);
  });
  test('bordas', () => {
    expect([0, 9, 10, 49, 50, 119, 120, 219, 220].map(levelFromXp)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5]);
  });
  test('progresso dentro do nível', () => {
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpToNext: 10, xpForLevel: 10, ratio: 0 });
    const p = levelProgress(70);
    expect(p).toMatchObject({ level: 3, xpIntoLevel: 20, xpToNext: 50, xpForLevel: 70 });
    expect(levelProgress(49).ratio).toBeLessThan(1);
  });
  test('o degrau cresce e a fórmula inversa (usada no SQL) concorda', () => {
    for (let xp = 0; xp < 20000; xp += 7) {
      expect(levelFromXp(xp)).toBe(Math.floor((35 + Math.sqrt(60 * xp + 25)) / 30));
      expect(xpToReachLevel(levelFromXp(xp))).toBeLessThanOrEqual(xp);
      expect(xpToReachLevel(levelFromXp(xp) + 1)).toBeGreaterThan(xp);
    }
  });
  test('entradas inválidas viram nível 1', () => {
    for (const bad of [-5, NaN, Infinity, null, undefined, 'abc']) expect(levelFromXp(bad)).toBe(1);
    expect(levelFromXp('60')).toBe(3);
  });
});
