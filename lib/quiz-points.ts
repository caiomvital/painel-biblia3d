/**
 * Pontuação do desafio (função pura, usada pelo servidor para creditar e pela tela para animar as moedas).
 * 1 ponto por responder (mesmo errando), 5 por acerto (no lugar do 1, não somado) e 50 a cada desafio completo.
 * Desafio v2: as perguntas vêm em desafios de 5. O aluno responde quantas quiser (de 1 até o máximo do dia) e pode
 * encerrar quando quiser; o bônus de 50 só vale para cada desafio de 5 perguntas COMPLETO (meio desafio não ganha bônus).
 */
export const POINTS_WRONG = 1;
export const POINTS_CORRECT = 5;
export const POINTS_COMPLETE = 50;
/** Perguntas por desafio. */
export const QUIZ_BLOCK = 5;
/** Máximo de perguntas por dia (ou por semana, no desafio da semana). */
export const QUIZ_MAX = 25;

export interface QuizBreakdown {
  /** Pontos de cada pergunta respondida, na ordem. */
  perQuestion: number[];
  /** Desafios de 5 perguntas completos. */
  blocks: number;
  /** Bônus por desafios completos (50 cada). */
  completion: number;
  total: number;
}

export const pointsForAnswer = (ok: boolean) => (ok ? POINTS_CORRECT : POINTS_WRONG);
export const completedBlocks = (answered: number) => Math.floor(Math.max(0, answered) / QUIZ_BLOCK);

export function quizBreakdown(correct: readonly boolean[]): QuizBreakdown {
  const perQuestion = correct.map(pointsForAnswer);
  const blocks = completedBlocks(correct.length);
  const completion = blocks * POINTS_COMPLETE;
  return { perQuestion, blocks, completion, total: perQuestion.reduce((s, n) => s + n, 0) + completion };
}
