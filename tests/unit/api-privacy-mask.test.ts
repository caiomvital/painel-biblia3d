import { beforeEach, describe, expect, mock, test } from 'bun:test';

let role = 'ALUNO';
const OVERVIEW = {
  items: [
    { id: 'i1', title: 'Picolé', highestBidder: 'Rodrigo Oliveira', isMyHighestBid: false },
    { id: 'i2', title: 'Combo', highestBidder: 'Eu Mesma Silva (Você)', isMyHighestBid: true },
    { id: 'i3', title: 'Livro', highestBidder: 'Sem lances', isMyHighestBid: false },
  ],
  settings: {}, studentCoins: {}, coinTransactions: [],
  myBids: [
    { itemId: 'i1', highestBidderId: 'st_rodrigo', highestBidderName: 'Rodrigo Oliveira', isCurrentUserLeading: false },
    { itemId: 'i2', highestBidderId: 'st_me', highestBidderName: 'Eu Mesma Silva', isCurrentUserLeading: true },
  ],
};
const GAMES = [
  { id: 'g1', title: 'Jogo da Ana', description: null, authorName: 'Ana Beatriz Souza', authorStudentId: 'st_ana', plays: 3 },
  { id: 'g2', title: 'Exemplo', description: null, authorName: 'Exemplo da Bíblia 3D', authorStudentId: null, plays: 9 },
];
mock.module('@/lib/auth', () => ({ getSession: async () => ({ id: 'u1', role, studentId: 'st_me', name: 'Eu Mesma Silva' }) }));
mock.module('@/lib/auction-service', () => ({
  getAuctionOverview: async () => OVERVIEW, placeAuctionBid: async () => ({}), withdrawAuctionBid: async () => ({}),
}));
mock.module('@/lib/prisma', () => ({
  prisma: { student: { findUnique: async () => ({ id: 'st_me' }) }, game: {
      // lista pública (status APPROVED) devolve os jogos; a consulta dos pendentes do próprio aluno vem vazia
      findMany: async (args: { where?: { authorStudentId?: string } }) => (args?.where?.authorStudentId ? [] : GAMES),
      count: async () => 0,
    } },
}));

beforeEach(() => { role = 'ALUNO'; });

describe('Leilão: nomes de outros alunos', () => {
  test('aluno não recebe o nome de ninguém (nem o próprio, só "Você")', async () => {
    const { GET } = await import('../../app/api/auction/route');
    const body = await (await GET()).json();
    const json = JSON.stringify(body);
    expect(json).not.toContain('Rodrigo');
    expect(json).not.toContain('Oliveira');
    expect(json).not.toContain('Eu Mesma');
    expect(body.items.map((i: { highestBidder: string }) => i.highestBidder)).toEqual(['Outro aluno', 'Você', 'Sem lances']);
    // também em "meus lances": nome e id de quem me superou não saem
    expect(body.myBids.map((b: { highestBidderName: string }) => b.highestBidderName)).toEqual(['Outro aluno', 'Você']);
    expect(json).not.toContain('st_rodrigo');
  });
  test('diretor e professor continuam vendo o nome completo', async () => {
    const { GET } = await import('../../app/api/auction/route');
    for (const r of ['DIRETOR', 'PROFESSOR']) {
      role = r;
      const body = await (await GET()).json();
      expect(body.items[0].highestBidder).toBe('Rodrigo Oliveira');
      expect(body.myBids[0].highestBidderName).toBe('Rodrigo Oliveira');
    }
  });
});

describe('Jogos: nome do autor', () => {
  test('aluno vê só o primeiro nome do autor aluno e nenhum id de aluno', async () => {
    const { GET } = await import('../../app/api/games/route');
    const body = await (await GET()).json();
    const json = JSON.stringify(body);
    expect(json).not.toContain('Beatriz');
    expect(json).not.toContain('Souza');
    expect(json).not.toContain('st_ana');
    expect(body.games[0].authorName).toBe('Ana');
    expect(body.games[1].authorName).toBe('Exemplo da Bíblia 3D'); // jogo do diretor não é "nome de criança"
  });
  test('diretor vê o nome completo', async () => {
    const { GET } = await import('../../app/api/games/route');
    role = 'DIRETOR';
    const body = await (await GET()).json();
    expect(body.games[0].authorName).toBe('Ana Beatriz Souza');
    expect(JSON.stringify(body)).not.toContain('st_ana');
  });
});
