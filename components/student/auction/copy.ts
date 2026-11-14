/** Textos do Leilão para crianças: curtos, sem jargão, sempre "fichas". */
export const AUCTION_TEXT = {
  title: 'Leilão',
  intro: 'Dê lances nos prêmios com suas fichas. Quem der mais, leva!',
  howTitle: 'Como funciona?',
  how: [
    'O leilão abre todo dia às 19h.',
    'Seu lance guarda fichas até alguém passar você.',
    'Mudou de ideia? Retire o lance e as fichas voltam.',
  ],
  tabs: { lots: 'Prêmios', mine: 'Meus lances', history: 'Histórico' },
  available: 'Disponíveis',
  inBids: 'Em lances',
  total: 'Total',
  noItems: 'Ainda não há prêmios. Volte logo!',
  noBids: 'Você ainda não deu nenhum lance.',
  noHistory: 'Nada por aqui ainda.',
} as const;

export type BidStatus = 'LIDERANDO' | 'SUPERADO' | 'ARREMATADO' | 'ENCERRADO';
export type BidStatusTone = 'success' | 'warning' | 'win' | 'neutral';

/** Como cada estado do lance aparece: ícone (símbolo), texto curto e tom. Nunca só cor. */
export function bidStatusView(status: BidStatus): { symbol: string; label: string; tone: BidStatusTone } {
  switch (status) {
    case 'LIDERANDO': return { symbol: '↑', label: 'Vencendo', tone: 'success' };
    case 'SUPERADO': return { symbol: '↓', label: 'Superado', tone: 'warning' };
    case 'ARREMATADO': return { symbol: '★', label: 'Ganhou!', tone: 'win' };
    default: return { symbol: '■', label: 'Encerrado', tone: 'neutral' };
  }
}

/** Quem lidera, para a tela (o servidor já manda "Você" / "Outro aluno" / "Sem lances" para alunos). */
export function leaderLabel(isMine: boolean, highestBidder: string): string {
  if (isMine) return 'Você';
  return highestBidder === 'Sem lances' ? 'Sem lances' : 'Outro aluno';
}

/** Tempo que falta, em texto curto: "2d 3h", "5h 10min", "12min", "Encerrado". */
export function countdownText(seconds: number): string {
  if (seconds <= 0) return 'Encerrado';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${Math.max(1, m)}min`;
}

export const ITEM_EMOJI: Record<string, string> = {
  keyboard: '⌨️', mentorship: '🚀', cert: '📜', swag: '👕', headphone: '🎧', book: '📚',
};
export const itemEmoji = (iconType: string) => ITEM_EMOJI[iconType] ?? '🎁';
