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
    subtitle: `Você acertou ${safe(r.score)} de ${safe(r.total)}`,
    xp: points,
    items,
    totalCoins: coins,
  };
}
