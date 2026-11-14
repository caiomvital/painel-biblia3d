/**
 * Máscaras de privacidade para respostas enviadas a ALUNOS (crianças).
 * Diretor, professor e secretaria continuam vendo nomes completos.
 */
export function firstName(full: string): string {
  return String(full ?? '').trim().split(/\s+/)[0] ?? '';
}

type AuctionItemLike = { highestBidder: string; isMyHighestBid: boolean };
type MyBidLike = { highestBidderId: string | null; highestBidderName: string; isCurrentUserLeading: boolean };

/** Meus lances: o líder de cada prêmio vira "Você" / "Outro aluno" e o id do colega some. */
export function maskMyBidsForStudent<T extends MyBidLike>(bids: T[]): T[] {
  return bids.map((b) => ({
    ...b,
    highestBidderId: null,
    highestBidderName: b.isCurrentUserLeading ? 'Você' : b.highestBidderName === 'Sem lances' ? 'Sem lances' : 'Outro aluno',
  }));
}

/** Leilão: o líder vira "Você" (a própria criança) ou "Outro aluno". "Sem lances" é mantido. */
export function maskAuctionOverviewForStudent<T extends { items: AuctionItemLike[]; myBids?: MyBidLike[] }>(overview: T): T {
  return {
    ...overview,
    items: overview.items.map((item) => ({
      ...item,
      highestBidder: item.isMyHighestBid ? 'Você' : item.highestBidder === 'Sem lances' ? 'Sem lances' : 'Outro aluno',
    })),
    ...(overview.myBids ? { myBids: maskMyBidsForStudent(overview.myBids) } : {}),
  };
}

/** Jogos criados por alunos mostram só o primeiro nome do autor; jogos do diretor/exemplos ficam como estão. */
export function maskGameAuthorForStudent<T extends { authorName: string; authorStudentId: string | null }>(
  game: T,
): Omit<T, 'authorStudentId'> {
  const { authorStudentId, ...rest } = game;
  return { ...rest, authorName: authorStudentId ? firstName(game.authorName) : game.authorName };
}
