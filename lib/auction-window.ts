import { isAuctionOpen } from './auction-service';

/**
 * Informação da janela de lances para a tela (campo aditivo `bidWindow` de GET /api/auction).
 * `open` vem de isAuctionOpen() (a mesma função que valida o lance no servidor).
 * `opensAt`/`closesAt` são só os rótulos dessa mesma regra (Recife, UTC-3): abre às 19:00 e fecha à meia-noite.
 * Um teste percorre todos os minutos do dia e garante que os rótulos concordam com a função.
 */
export function bidWindowInfo(nowMs: number = Date.now()) {
  return { open: isAuctionOpen(nowMs), opensAt: '19:00', closesAt: '00:00', timeZone: 'America/Recife' };
}
