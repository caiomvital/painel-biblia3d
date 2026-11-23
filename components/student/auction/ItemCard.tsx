import React from 'react';
import { Button, CoinIcon } from '@/components/ui/game';
import type { AuctionItem } from '@/components/auction/AuctionSection';
import { countdownText, itemEmoji, leaderLabel } from './copy';
import { StatusBadge } from './StatusBadge';

/** Cartão de um prêmio. Só visual: lance e retirada chamam as funções do AuctionSection. */
export function ItemCard({ item, balance, withdrawing, onBid, onWithdraw }: {
  item: AuctionItem; balance: number; withdrawing: boolean; onBid: (item: AuctionItem) => void; onWithdraw: (id: string) => void;
}) {
  const canBid = balance >= item.minNextBid;
  const soon = item.endsInSeconds > 0 && item.endsInSeconds < 3600 * 12;
  const leader = leaderLabel(item.isMyHighestBid, item.highestBidder);
  return (
    <article data-testid={`auction-item-${item.id}`}
      className={`flex flex-col gap-3 rounded-game-lg border-2 border-b-4 p-4 ${item.isMyHighestBid ? 'border-game-success bg-game-surface-2' : 'border-game-line bg-game-surface'}`}>
      <div aria-hidden="true" className="hidden h-28 items-center justify-center rounded-game bg-gradient-to-br from-[#5b3fd0] to-[#2a1f7a] text-6xl lg:flex">{itemEmoji(item.iconType)}</div>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-14 shrink-0 lg:hidden items-center justify-center rounded-game bg-game-bg text-3xl">{itemEmoji(item.iconType)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-[family-name:var(--font-game-title)] text-xl leading-tight tracking-wide">{item.title}</h3>
          <p className="text-sm text-game-ink-dim">{item.description}</p>
        </div>
      </div>

      <p className={`inline-flex w-fit items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold ${soon ? 'border-game-primary text-game-primary' : 'border-game-line text-game-ink-dim'}`}>
        <span aria-hidden="true">⏰</span> {item.endsInSeconds <= 0 ? '' : soon ? 'Acaba em ' : 'Faltam '}{countdownText(item.endsInSeconds)}
      </p>

      <dl className="grid grid-cols-2 gap-2 rounded-game bg-game-bg p-3 text-sm">
        <div><dt className="text-game-ink-dim">Lance atual</dt><dd className="font-semibold">{item.currentBid} fichas</dd></div>
        <div><dt className="text-game-ink-dim">Quem lidera</dt><dd className="font-semibold">{leader}</dd></div>
      </dl>

      {item.isMyHighestBid && <div><StatusBadge status="LIDERANDO" /></div>}

      <div className="flex flex-col gap-2">
        {canBid || item.isMyHighestBid ? (
          <Button size="lg" disabled={!canBid} onClick={() => onBid(item)} icon={<CoinIcon />} data-testid={`auction-bid-${item.id}`}>
            {item.isMyHighestBid ? 'Aumentar lance' : `Dar lance (${item.minNextBid})`}
          </Button>
        ) : (
          <p data-testid={`auction-short-${item.id}`} className="flex min-h-14 items-center justify-center gap-2 rounded-game border-2 border-dashed border-game-line px-3 text-center font-semibold text-game-ink">
            <CoinIcon /> Faltam {item.minNextBid - balance} fichas para dar lance
          </p>
        )}
        {item.isMyHighestBid && (
          <Button variant="ghost" disabled={withdrawing} onClick={() => onWithdraw(item.id)} data-testid={`auction-withdraw-${item.id}`}>
            Retirar lance
          </Button>
        )}
      </div>
    </article>
  );
}
