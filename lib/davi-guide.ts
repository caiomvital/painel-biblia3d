/** Falas do Davi, o guia da tela inicial. Curtas, em linguagem de criança. Só decide o texto e o humor; não mexe em dados. */
export type DaviMood = 'feliz' | 'pensando' | 'comemorando';

export interface DaviContext {
  firstName: string;
  /** Há uma aula registrada que o aluno ainda não contou ("O que aprendi"). */
  lessonOpen: boolean;
  /** O desafio de hoje está disponível e ainda não foi feito. */
  quizPending: boolean;
  /** O aluno acabou de ganhar pontos/moedas. */
  celebrate: boolean;
}

export function daviMessage(c: DaviContext): { text: string; mood: DaviMood } {
  const nome = c.firstName.trim();
  if (c.celebrate) return { text: nome ? `Muito bem, ${nome}!` : 'Muito bem!', mood: 'comemorando' };
  if (c.lessonOpen) return { text: 'Me conta o que você aprendeu na aula!', mood: 'pensando' };
  if (c.quizPending) return { text: 'Bora fazer o desafio de hoje?', mood: 'feliz' };
  return { text: nome ? `Vamos aprender juntos, ${nome}?` : 'Vamos aprender juntos?', mood: 'feliz' };
}
