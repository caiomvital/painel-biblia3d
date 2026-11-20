import { describe, expect, test } from 'bun:test';
import { POINTS_COMPLETE, quizBreakdown } from '../../lib/quiz-points';

describe('pontuação do desafio', () => {
  test('1 por responder, 5 por acertar (não soma) e 50 por concluir', () => {
    const b = quizBreakdown([true, false, true, false, false]);
    expect(b.perQuestion).toEqual([5, 1, 5, 1, 1]);
    expect(b.completion).toBe(POINTS_COMPLETE);
    expect(b.total).toBe(13 + 50);
  });
  test('errar tudo ainda dá 1 por pergunta e o bônus por concluir', () => {
    expect(quizBreakdown([false, false, false]).total).toBe(3 + 50);
  });
  test('quantidade de perguntas varia', () => {
    expect(quizBreakdown([true]).total).toBe(55);
    expect(quizBreakdown(Array(8).fill(true)).total).toBe(40 + 50);
  });
  test('sem perguntas não há pontos', () => {
    expect(quizBreakdown([]).total).toBe(0);
  });
});
