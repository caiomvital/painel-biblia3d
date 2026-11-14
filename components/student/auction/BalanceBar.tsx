import React from 'react';
import { AnimatedNumber, CoinIcon } from '@/components/ui/game';
import { AUCTION_TEXT as T } from './copy';

/** Saldo sempre visível: "Disponíveis" grande; o resto em fichas menores. */
export function BalanceBar({ available, reserved, total }: { available: number; reserved: number; total: number }) {
  return (
    <div className="rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-4" data-testid="auction-balance">
      <p className="text-sm text-game-ink-dim">{T.available}</p>
      <p className="flex items-center gap-2 text-game-coin">
        <CoinIcon width="2rem" height="2rem" />
        <AnimatedNumber value={available} className="font-[family-name:var(--font-game-title)] text-4xl leading-none text-game-ink" />
        <span className="text-lg text-game-ink-dim">fichas</span>
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-game-ink-dim">
        <span>{T.inBids}: <strong className="text-game-ink">{reserved.toLocaleString('pt-BR')}</strong></span>
        <span>{T.total}: <strong className="text-game-ink">{total.toLocaleString('pt-BR')}</strong></span>
      </p>
    </div>
  );
}
