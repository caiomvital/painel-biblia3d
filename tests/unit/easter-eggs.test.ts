import { describe, expect, test } from 'bun:test';
import { DAVI_JOKES, createTapCounter, daviJoke, levelTitle, nextLevelTitle } from '../../lib/easter-eggs';

describe('ranking secreto de níveis', () => {
  test('cada nível tem um título e o último se repete', () => {
    expect(levelTitle(1)).toBe('Aprendiz');
    expect(levelTitle(7)).toBe('Trombeteiro de Jericó');
    expect(levelTitle(10)).toBe('Lenda da Arca');
    expect(levelTitle(99)).toBe('Lenda da Arca');
  });
  test('valores estranhos viram o nível 1', () => {
    expect(levelTitle(0)).toBe('Aprendiz');
    expect(levelTitle(-3)).toBe('Aprendiz');
    expect(levelTitle(Number.NaN)).toBe('Aprendiz');
  });
  test('próximo título some no último nível', () => {
    expect(nextLevelTitle(1)).toBe('Explorador');
    expect(nextLevelTitle(9)).toBe('Lenda da Arca');
    expect(nextLevelTitle(10)).toBeNull();
  });
});

describe('piadas do Davi', () => {
  test('troca a cada vez e volta ao começo', () => {
    expect(daviJoke(0)).not.toBe(daviJoke(1));
    expect(daviJoke(DAVI_JOKES.length)).toBe(daviJoke(0));
  });
  test('nenhuma piada é vazia', () => {
    for (const j of DAVI_JOKES) expect(j.trim().length).toBeGreaterThan(10);
  });
});

describe('contador de toques seguidos', () => {
  test('7 toques rápidos acertam; o 8º recomeça', () => {
    let t = 1000;
    const tap = createTapCounter(7, 1500, () => t);
    const r: boolean[] = [];
    for (let i = 0; i < 8; i++) { t += 300; r.push(tap()); }
    expect(r).toEqual([false, false, false, false, false, false, true, false]);
  });
  test('uma pausa longa zera a conta', () => {
    let t = 1000;
    const tap = createTapCounter(3, 1000, () => t);
    t += 200; tap();
    t += 200; tap();
    t += 5000; expect(tap()).toBe(false);
    t += 200; expect(tap()).toBe(false);
    t += 200; expect(tap()).toBe(true);
  });
});
