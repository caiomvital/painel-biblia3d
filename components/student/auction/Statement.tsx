import React from 'react';
import type { StudentCoinTransactionItem } from '@/components/auction/AuctionSection';
import { AUCTION_TEXT as T } from './copy';

/** Histórico de fichas. O sinal (+ / −) vem escrito, não só pela cor. */
export function Statement({ transactions }: { transactions: StudentCoinTransactionItem[] }) {
  if (transactions.length === 0) return <p className="py-8 text-center text-game-ink-dim">{T.noHistory}</p>;
  return (
    <ul className="space-y-2" data-testid="auction-statement">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between gap-3 rounded-game-lg border-2 border-game-line bg-game-surface p-3">
          <div className="min-w-0">
            <p className="font-semibold">{tx.friendlyType}</p>
            <p className="truncate text-sm text-game-ink-dim">{tx.description}</p>
            <p className="text-xs text-game-ink-dim">{new Date(tx.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
          <p className={`shrink-0 font-[family-name:var(--font-game-title)] text-xl ${tx.amount >= 0 ? 'text-game-success' : 'text-game-danger'}`}>
            {tx.amount >= 0 ? '+' : '−'}{Math.abs(tx.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}
