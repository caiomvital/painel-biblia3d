import { describe, expect, test } from 'bun:test';
import { daviResultMessage } from '../../lib/davi-guide';

describe('falas do Davi no resultado', () => {
  test('acertar tudo comemora', () => {
    expect(daviResultMessage(5, 5).mood).toBe('comemorando');
  });
  test('metade ou mais é elogio, menos que isso incentiva', () => {
    expect(daviResultMessage(3, 5).mood).toBe('feliz');
    expect(daviResultMessage(1, 5).mood).toBe('pensando');
  });
  test('nenhuma fala revela o total de perguntas', () => {
    for (const [s, t] of [[5, 5], [3, 5], [0, 5], [2, 7]]) expect(daviResultMessage(s, t).text).not.toMatch(/\d/);
  });
  test('total zero não quebra', () => {
    expect(daviResultMessage(0, 0).mood).toBe('pensando');
  });
});

describe('Davi no quiz ao vivo', () => {
  test('comemora quem acerta ou chega ao pódio e acolhe quem erra', async () => {
    const { daviLiveFinal, daviLiveResult } = await import('../../lib/davi-guide');
    expect(daviLiveResult(true, true).mood).toBe('comemorando');
    expect(daviLiveResult(true, false).mood).toBe('pensando');
    expect(daviLiveResult(false, false).text).toContain('tempo');
    expect(daviLiveFinal(2).mood).toBe('comemorando');
    expect(daviLiveFinal(5).mood).toBe('feliz');
    expect(daviLiveFinal(null).mood).toBe('feliz');
  });
});
