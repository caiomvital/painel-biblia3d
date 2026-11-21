/** Davi é o tutor da Fuctura: aparece nos momentos de ação (desafio e resultado), nunca na tela inicial. Falas curtas, em linguagem de criança. */
export type DaviMood = 'feliz' | 'pensando' | 'comemorando';

/** Falas do tutor nos momentos de ação do desafio. */
export const DAVI_QUIZ_INTRO = 'Vamos ver o que você sabe?';

/** Fala do Davi no resultado do desafio, conforme os acertos. Nunca mostra o total de perguntas. */
export function daviResultMessage(score: number, total: number): { text: string; mood: DaviMood } {
  if (total > 0 && score >= total) return { text: 'Você arrasou! Acertou tudo!', mood: 'comemorando' };
  if (total > 0 && score * 2 >= total) return { text: 'Muito bem! Cada acerto conta!', mood: 'feliz' };
  return { text: 'Quase lá! Na próxima você vai melhor.', mood: 'pensando' };
}
