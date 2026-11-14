// Cria a temporada e os prêmios iniciais do leilão infantil (só se ainda não existir nada).
const { PrismaClient } = require('/opt/painel-biblia3d/node_modules/@prisma/client');
const p = new PrismaClient();
(async () => {
  console.log('itens antes:', await p.auctionItem.count(), '| temporadas antes:', await p.auctionSeason.count());
  if (await p.auctionItem.count()) { console.log('já existem itens; nada a fazer'); return; }
  // fecha daqui a 7 dias às 21h de Recife (00h UTC do dia seguinte)
  const end = new Date(Date.now() + 7 * 86400 * 1000);
  end.setUTCHours(24, 0, 0, 0);
  const season = await p.auctionSeason.upsert({
    where: { id: 'season_biblia3d_kids' },
    update: { status: 'ACTIVE', endsAt: end },
    create: {
      id: 'season_biblia3d_kids', title: 'Leilão Bíblia 3D',
      description: 'Todo dia às 19h! Use suas fichas e leve o prêmio.', status: 'ACTIVE',
      minBidIncrement: 10, startsAt: new Date(), endsAt: end,
    },
  });
  const items = [
    { id: 'kids_picole', title: 'Picolé', category: 'Lanche', description: 'Um picolé do sabor que você escolher.', startingBid: 100, isFeatured: false },
    { id: 'kids_guarana_picole', title: 'Guaraná + picolé', category: 'Lanche', description: 'Um guaraná geladinho e um picolé.', startingBid: 250, isFeatured: false },
    { id: 'kids_combo', title: 'Sanduíche + guaraná + picolé', category: 'Lanche', description: 'O combo completo do mês!', startingBid: 500, isFeatured: true },
  ];
  for (const i of items) {
    await p.auctionItem.create({
      data: {
        ...i, seasonId: season.id, iconType: 'swag', currentBid: i.startingBid, minNextBid: i.startingBid,
        marketValue: 'Prêmio da turma', highestBidderName: 'Sem lances', totalBids: 0, status: 'ACTIVE', endsAt: end,
      },
    });
  }
  console.log('criados:', items.length, '| fecha em', end.toISOString());
})().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
