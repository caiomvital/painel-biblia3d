'use client';

import React, { useEffect, useState } from 'react';
import { CoinIcon } from '@/components/ui/game';
import type { AuctionItem } from '@/components/auction/AuctionSection';
import { countdownText, itemEmoji } from '../auction/copy';

/** Canto da tela inicial: os prêmios do leilão se revezam, sempre com o lance atual. Toque abre o leilão. */
export function AuctionCorner({ onOpen }: { onOpen: () => void }) {
  const [items, setItems] = useState<AuctionItem[] | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    let off = false;
    const load = () => fetch('/api/auction').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!off && d && Array.isArray(d.items)) setItems(d.items.filter((x: AuctionItem) => x.endsInSeconds > 0));
    }).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { off = true; clearInterval(t); };
  }, []);

  const count = items?.length ?? 0;
  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setI((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, [count]);

  const item = count ? items![i % count] : null;
  return (
    <button type="button" onClick={onOpen} data-testid="home-auction-corner" aria-label={item ? `Leilão: ${item.title}, lance atual ${item.currentBid} fichas` : 'Leilão'}
      className="flex min-h-28 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-2 text-center text-game-ink transition-transform active:translate-y-0.5 active:border-b-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none">
      {!item ? (
        <>
          <span aria-hidden="true" className="text-4xl">🔨</span>
          <span className="font-[family-name:var(--font-game-title)] text-lg leading-tight">{items === null ? 'Leilão' : 'Leilão sem prêmios agora'}</span>
        </>
      ) : (
        <span key={item.id} className="davi-in-fade flex w-full min-w-0 flex-col items-center gap-0.5">
          <span aria-hidden="true" className="text-4xl leading-none">{itemEmoji(item.iconType)}</span>
          <span className="w-full truncate font-[family-name:var(--font-game-title)] text-lg leading-tight">{item.title}</span>
          <span className="inline-flex items-center gap-1 text-base font-bold text-game-primary"><CoinIcon /> {item.currentBid}</span>
          <span className="text-xs text-game-ink-dim">{item.isMyHighestBid ? 'Você lidera!' : `Lance atual · ${countdownText(item.endsInSeconds)}`}</span>
        </span>
      )}
    </button>
  );
}
