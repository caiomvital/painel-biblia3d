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

/** Falas do Davi no quiz ao vivo (nunca mostram resposta antes de a pergunta fechar). */
export const DAVI_LIVE_LOBBY = { text: 'Que bom ter você aqui! Prepare-se para o quiz!', mood: 'feliz' as DaviMood };
export const DAVI_LIVE_OPEN = { text: 'Pense bem e escolha a sua resposta!', mood: 'pensando' as DaviMood };

export function daviLiveResult(answered: boolean, correct: boolean): { text: string; mood: DaviMood } {
  if (correct) return { text: 'Isso! Mandou muito bem!', mood: 'comemorando' };
  if (answered) return { text: 'Quase! Errar também ensina. Vamos para a próxima!', mood: 'pensando' };
  return { text: 'O tempo passou! Na próxima, responda mais rápido.', mood: 'pensando' };
}

export function daviLiveFinal(rank: number | null): { text: string; mood: DaviMood } {
  if (rank !== null && rank <= 3) return { text: 'Você está no pódio! Parabéns!', mood: 'comemorando' };
  return { text: 'Você jogou muito bem! Até o próximo quiz!', mood: 'feliz' };
}
