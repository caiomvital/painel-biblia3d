// Jogos de exemplo (só cria se ainda não houver nenhum jogo).
const { PrismaClient } = require('/opt/painel-biblia3d/node_modules/@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
(async () => {
  if (await p.game.count()) { console.log('já existem jogos; nada a fazer'); return; }
  const read = (f) => fs.readFileSync('/tmp/b3d/games/' + f, 'utf8');
  const games = [
    { title: 'Jogo da Memória', description: 'Vire as cartas e ache os 8 pares de figurinhas.', html: read('memoria.html') },
    { title: 'Pega a Estrela', description: 'Toque na estrela antes que ela fuja. Quantas você pega em 20 segundos?', html: read('estrela.html') },
    { title: 'Adivinhe o Número', description: 'Pensei num número de 1 a 100. Use as dicas para descobrir!', html: read('numero.html') },
  ];
  for (const g of games) await p.game.create({ data: { ...g, authorName: 'Exemplo da Bíblia 3D', status: 'APPROVED' } });
  console.log('jogos criados:', games.length);
})().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
