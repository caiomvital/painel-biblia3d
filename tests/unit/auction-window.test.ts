import { describe, expect, test } from 'bun:test';

// Sem mock.module aqui: bun compartilha mocks entre arquivos e este teste só usa uma função pura.
const { isAuctionOpen, AUCTION_OPEN_HOUR_RECIFE } = await import('../../lib/auction-service');

/** Regra ORIGINAL (inline em placeAuctionBid antes da extração): recusava se a hora de Recife fosse < 19. */
const originalRefuses = (nowMs: number) => new Date(nowMs - 3 * 3600 * 1000).getUTCHours() < 19;

// Recife = UTC-3 (sem horário de verão): 19:00 em Recife = 22:00 UTC.
const recife = (iso: string) => Date.parse(`${iso}-03:00`);

describe('janela de lances do leilão (fuso de Recife, UTC-3)', () => {
  test('abre às 19h em ponto, um segundo antes ainda está fechado', () => {
    expect(isAuctionOpen(recife('2026-11-14T18:59:59'))).toBe(false);
    expect(isAuctionOpen(recife('2026-11-14T19:00:00'))).toBe(true);
    expect(AUCTION_OPEN_HOUR_RECIFE).toBe(19);
  });
  test('continua aberta até 23:59:59 e fecha à meia-noite de Recife', () => {
    expect(isAuctionOpen(recife('2026-11-14T23:59:59'))).toBe(true);
    expect(isAuctionOpen(recife('2026-11-15T00:00:00'))).toBe(false);
    expect(isAuctionOpen(recife('2026-11-15T12:00:00'))).toBe(false);
  });
  test('o "19h" é a hora LOCAL de Recife, não o UTC puro', () => {
    expect(isAuctionOpen(Date.parse('2026-11-14T19:00:00Z'))).toBe(false); // 16h em Recife
    expect(isAuctionOpen(Date.parse('2026-11-14T22:00:00Z'))).toBe(true); // 19h em Recife
    expect(isAuctionOpen(Date.parse('2026-11-15T02:59:59Z'))).toBe(true); // 23:59:59 em Recife
    expect(isAuctionOpen(Date.parse('2026-11-15T03:00:00Z'))).toBe(false); // meia-noite em Recife
  });
  test('mesmo comportamento em qualquer época do ano (sem horário de verão)', () => {
    for (const day of ['2026-01-15', '2026-07-15', '2026-10-19', '2026-12-31']) {
      expect(isAuctionOpen(recife(`${day}T18:59:59`))).toBe(false);
      expect(isAuctionOpen(recife(`${day}T19:00:00`))).toBe(true);
    }
  });
  test('resultado IDÊNTICO à regra original, minuto a minuto, em 14 dias', () => {
    const start = Date.parse('2026-11-01T00:00:00Z');
    for (let m = 0; m < 14 * 24 * 60; m++) {
      const t = start + m * 60_000;
      expect(isAuctionOpen(t)).toBe(!originalRefuses(t));
    }
  });
  test('sem argumento usa o relógio atual (Date.now)', () => {
    const realNow = Date.now;
    try {
      Date.now = () => recife('2026-11-14T20:30:00');
      expect(isAuctionOpen()).toBe(true);
      Date.now = () => recife('2026-11-14T10:30:00');
      expect(isAuctionOpen()).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });
});
