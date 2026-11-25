import { describe, expect, test } from 'bun:test';
import { POINTS_COMPLETE, QUIZ_BLOCK, completedBlocks, quizBreakdown } from '../../lib/quiz-points';

describe('pontuação do desafio (v2)', () => {
  test('1 por responder, 5 por acertar (não soma) e 50 por desafio de 5 completo', () => {
    const b = quizBreakdown([true, false, true, false, false]);
    expect(b.perQuestion).toEqual([5, 1, 5, 1, 1]);
    expect(b.blocks).toBe(1);
    expect(b.completion).toBe(POINTS_COMPLETE);
    expect(b.total).toBe(13 + 50);
  });
  test('encerrar antes de completar 5 não dá bônus', () => {
    expect(quizBreakdown([false, false, false]).total).toBe(3);
    expect(quizBreakdown([true]).total).toBe(5);
    expect(quizBreakdown(Array(4).fill(true)).completion).toBe(0);
  });
  test('o bônus vale para cada desafio completo (5, 10, 15...)', () => {
    expect(QUIZ_BLOCK).toBe(5);
    expect(completedBlocks(14)).toBe(2);
    expect(quizBreakdown(Array(8).fill(true)).total).toBe(40 + 50);
    expect(quizBreakdown(Array(25).fill(true)).total).toBe(125 + 5 * 50);
  });
  test('sem perguntas não há pontos', () => {
    expect(quizBreakdown([]).total).toBe(0);
  });
});
