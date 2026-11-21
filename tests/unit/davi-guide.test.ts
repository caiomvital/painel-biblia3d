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
