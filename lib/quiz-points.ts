/**
 * Pontuação do desafio (função pura, usada pelo servidor para creditar e pela tela para animar as moedas).
 * Pedido da direção: 1 ponto por responder (mesmo errando), 5 por acerto (no lugar do 1, não somado) e 50 por concluir.
 */
export const POINTS_WRONG = 1;
export const POINTS_CORRECT = 5;
export const POINTS_COMPLETE = 50;

export interface QuizBreakdown {
  /** Pontos de cada pergunta, na ordem. */
  perQuestion: number[];
  /** Bônus por concluir (0 se não havia perguntas). */
  completion: number;
  total: number;
}

export function quizBreakdown(correct: readonly boolean[]): QuizBreakdown {
  const perQuestion = correct.map((ok) => (ok ? POINTS_CORRECT : POINTS_WRONG));
  const completion = correct.length > 0 ? POINTS_COMPLETE : 0;
  return { perQuestion, completion, total: perQuestion.reduce((s, n) => s + n, 0) + completion };
}
