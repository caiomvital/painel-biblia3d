/**
 * Máscaras de privacidade para respostas enviadas a ALUNOS (crianças).
 * Diretor, professor e secretaria continuam vendo nomes completos.
 */
export function firstName(full: string): string {
  return String(full ?? '').trim().split(/\s+/)[0] ?? '';
}

type AuctionItemLike = { highestBidder: string; isMyHighestBid: boolean };

/** Leilão: o líder vira "Você" (a própria criança) ou "Outro aluno". "Sem lances" é mantido. */
export function maskAuctionOverviewForStudent<T extends { items: AuctionItemLike[] }>(overview: T): T {
  return {
    ...overview,
    items: overview.items.map((item) => ({
      ...item,
      highestBidder: item.isMyHighestBid ? 'Você' : item.highestBidder === 'Sem lances' ? 'Sem lances' : 'Outro aluno',
    })),
  };
}

/** Jogos criados por alunos mostram só o primeiro nome do autor; jogos do diretor/exemplos ficam como estão. */
export function maskGameAuthorForStudent<T extends { authorName: string; authorStudentId: string | null }>(
  game: T,
): Omit<T, 'authorStudentId'> {
  const { authorStudentId, ...rest } = game;
  return { ...rest, authorName: authorStudentId ? firstName(game.authorName) : game.authorName };
}
