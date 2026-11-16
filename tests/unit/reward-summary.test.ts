import { describe, expect, test } from 'bun:test';
import { quizRewardSummary, shouldShowSummary } from '../../lib/reward-summary';

describe('quizRewardSummary', () => {
  test('copia os valores do servidor, sem recalcular', () => {
    const s = quizRewardSummary({ score: 5, total: 5, pointsAwarded: 35, coinsAwarded: 35 });
    expect(s?.title).toBe('MISSÃO CUMPRIDA');
    expect(s?.xp).toBe(35);
    expect(s?.totalCoins).toBe(35);
    expect(s?.items.map((i) => i.value)).toEqual([35, 35]);
  });
  test('acerto parcial não é "missão cumprida"', () => {
    const s = quizRewardSummary({ score: 3, total: 5, pointsAwarded: 15, coinsAwarded: 15 });
    expect(s?.title).toBe('BOA!');
    expect(s?.subtitle).toBe('Você acertou 3 de 5');
  });
  test('se o servidor não creditou fichas (já recebido), mostra 0 e não inventa', () => {
    const s = quizRewardSummary({ score: 3, total: 5, pointsAwarded: 15, coinsAwarded: 0 });
    expect(s?.totalCoins).toBe(0);
  });
  test('sem ganho nenhum não há tela', () => {
    expect(quizRewardSummary({ score: 0, total: 5, pointsAwarded: 0, coinsAwarded: 0 })).toBeNull();
  });
  test('valores inválidos viram 0', () => {
    const s = quizRewardSummary({ score: 1, total: 5, pointsAwarded: 5, coinsAwarded: Number.NaN });
    expect(s?.totalCoins).toBe(0);
  });
});

describe('shouldShowSummary', () => {
  test('2+ itens ou subida de nível', () => {
    expect(shouldShowSummary(1, false)).toBe(false);
    expect(shouldShowSummary(2, false)).toBe(true);
    expect(shouldShowSummary(1, true)).toBe(true);
  });
});
