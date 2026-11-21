import { daviResultMessage } from './davi-guide';

/**
 * Monta os dados da Tela de Resultado a partir do que o SERVIDOR devolveu.
 * Função pura: não calcula pontos nem moedas, só escolhe textos e copia os valores recebidos.
 */
export interface QuizServerResult {
  score: number;
  total: number;
  pointsAwarded: number;
  coinsAwarded: number;
}

export type RewardUnit = 'coins' | 'xp';

export interface RewardItemData {
  label: string;
  /** Nome do ícone do design system (resolvido pelo componente). */
  icon: 'star' | 'coin' | 'check' | 'trophy';
  value: number;
  count?: number;
  unit?: RewardUnit;
}

export interface RewardSummaryData {
  title: string;
  subtitle?: string;
  /** Fala do Davi (tutor) nesta tela. */
  tutor?: { text: string; mood: 'feliz' | 'pensando' | 'comemorando' };
  xp?: number;
  items: RewardItemData[];
  totalCoins: number;
}

/** Só vale a tela cheia com 2+ itens ou subida de nível; ganho simples fica com o RewardPop. */
export function shouldShowSummary(itemCount: number, leveledUp: boolean): boolean {
  return itemCount >= 2 || leveledUp;
}

/** Resultado do desafio (dia/semana). Devolve null quando não houve ganho (nada a mostrar). */
export function quizRewardSummary(r: QuizServerResult): RewardSummaryData | null {
  const safe = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  const points = safe(r.pointsAwarded);
  const coins = safe(r.coinsAwarded);
  if (points === 0 && coins === 0) return null;
  const perfect = r.total > 0 && r.score === r.total;
  const items: RewardItemData[] = [
    { label: 'Pontos do desafio', icon: 'star', value: points, unit: 'xp' },
  ];
  // linhas só com valores devolvidos pelo servidor
  items.push({ label: 'Fichas ganhas', icon: 'coin', value: coins, unit: 'coins' });
  return {
    title: perfect ? 'MISSÃO CUMPRIDA' : 'BOA!',
    // o aluno não sabe quantas perguntas tem o desafio: nunca mostramos o total
    subtitle: safe(r.score) === 0 ? 'Você deu o seu melhor!' : safe(r.score) === 1 ? 'Você acertou 1 pergunta' : `Você acertou ${safe(r.score)} perguntas`,
    tutor: daviResultMessage(safe(r.score), safe(r.total)),
    xp: points,
    items,
    totalCoins: coins,
  };
}

export interface AttitudeServerResult {
  count: number;
  xp: number;
  coins: number;
}

/** Ganhos por atitude positiva que o aluno ainda não viu. Só totais dele (sem professor nem colegas). */
export function attitudeRewardSummary(r: AttitudeServerResult): RewardSummaryData | null {
  const safe = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  const xp = safe(r.xp);
  const coins = safe(r.coins);
  const count = safe(r.count);
  if (count === 0 || (xp === 0 && coins === 0)) return null;
  return {
    title: 'BOA ATITUDE!',
    subtitle: count === 1 ? 'Reconheceram uma atitude sua' : `Reconheceram ${count} atitudes suas`,
    tutor: { text: 'Seu professor reparou em você!', mood: 'comemorando' },
    xp,
    items: [
      { label: 'Pontos', icon: 'star', value: xp, unit: 'xp' },
      { label: 'Fichas', icon: 'coin', value: coins, unit: 'coins' },
    ],
    totalCoins: coins,
  };
}
