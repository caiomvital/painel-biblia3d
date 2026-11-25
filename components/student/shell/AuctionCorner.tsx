'use client';

import React, { useEffect, useState } from 'react';
import { CoinIcon } from '@/components/ui/game';
import { playSound } from '@/components/ui/game/sound-store';
import type { AuctionItem } from '@/components/auction/AuctionSection';
import { countdownText, itemEmoji, leaderLabel } from '../auction/copy';

/**
 * Vitrine do Leilão na tela inicial: os prêmios se revezam em carrossel (a cada 6 s, com setas e pontinhos),
 * sempre com o lance atual e o tempo que falta. Tocar na vitrine abre o leilão.
 */
export function AuctionCorner({ onOpen, compact }: { onOpen: () => void; compact?: boolean }) {
  const [items, setItems] = useState<AuctionItem[] | null>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

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
    if (count < 2 || paused) return;
    const t = setInterval(() => setI((n) => n + 1), 6000);
    return () => clearInterval(t);
  }, [count, paused]);

  const idx = count ? ((i % count) + count) % count : 0;
  const item = count ? items![idx] : null;
  const go = (d: number) => { playSound('tap'); setI(idx + d); };

  return (
    <section aria-label="Leilão" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[1.75rem] border-2 border-[#c9a24a] bg-gradient-to-b from-[#26334a] to-[#151f31] shadow-[0_5px_0_#6b5322,0_0_24px_rgb(201_162_74/0.25)]">
      <header className={`flex items-center justify-between ${compact ? 'px-3 pt-2' : 'px-4 pt-3'}`}>
        <h2 className={`font-[family-name:var(--font-game-title)] ${compact ? 'text-sm' : 'text-lg'} uppercase tracking-[0.2em] text-[#e8c875]`}>Leilão</h2>
        {count > 1 && <span className="flex gap-1" aria-hidden="true">{items!.map((x, k) => <span key={x.id} className={`size-1.5 rounded-full ${k === idx ? 'bg-[#e8c875]' : 'bg-game-line'}`} />)}</span>}
      </header>

      {!item ? (
        <button type="button" onClick={() => { playSound('tap'); onOpen(); }} data-testid="home-auction-corner" aria-label="Abrir o leilão"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 pb-4 text-center focus-visible:outline-3 focus-visible:outline-offset-[-6px] focus-visible:outline-white">
          <span className="font-[family-name:var(--font-game-title)] text-2xl leading-tight text-game-ink">{items === null ? 'Carregando…' : 'Nenhum prêmio agora'}</span>
          {items !== null && <span className="text-sm text-game-ink-dim">Novos prêmios chegam em breve. Junte fichas!</span>}
        </button>
      ) : (
        <button type="button" onClick={() => { playSound('tap'); onOpen(); }} data-testid="home-auction-corner"
          aria-label={`Leilão: ${item.title}, lance atual ${item.currentBid} fichas`}
          className={`flex min-h-0 flex-1 flex-col gap-1.5 text-left ${compact ? 'px-3 pb-2 pt-1' : 'gap-2 px-4 pb-2 pt-2'} focus-visible:outline-3 focus-visible:outline-offset-[-6px] focus-visible:outline-white`}>
          <span key={item.id} className="davi-in-fade flex min-h-0 flex-1 flex-col gap-2">
            <span aria-hidden="true" className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#4a6fb0] to-[#243a5c] ${compact ? '[@media(max-height:600px)]:hidden' : ''}`}>
              {item.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.imageUrl} alt="" draggable={false} className="size-full object-cover" />
                : <span className={`${compact ? 'text-5xl' : 'text-8xl'} leading-none drop-shadow-[0_4px_6px_rgb(0_0_0/0.4)]`}>{itemEmoji(item.iconType)}</span>}
            </span>
            <span className={`block truncate font-[family-name:var(--font-game-title)] ${compact ? 'text-base' : 'text-xl'} leading-tight text-game-ink`}>{item.title}</span>
            <span className={`flex justify-between gap-2 ${compact ? 'flex-col' : 'items-end'}`}>
              <span>
                {!compact && <span className="block text-xs font-semibold uppercase tracking-wide text-game-ink-dim">Lance atual</span>}
                <span className={`inline-flex items-center gap-1.5 font-[family-name:var(--font-game-title)] ${compact ? 'text-xl' : 'text-2xl'} text-game-coin`}><CoinIcon /> {item.currentBid}</span>
              </span>
              <span className={`text-xs font-semibold leading-tight text-game-ink-dim ${compact ? '' : 'text-right'}`}>
                {item.isMyHighestBid ? <span className="text-game-success">Você lidera!</span> : compact ? null : leaderLabel(false, item.highestBidder)}
                {compact ? (item.isMyHighestBid ? ' · ' : '') : <br />}{compact ? '' : 'Acaba em '}{countdownText(item.endsInSeconds)}
              </span>
            </span>
          </span>
        </button>
      )}

      {count > 1 && !compact && (
        <footer className="flex items-center justify-between px-3 pb-3">
          <button type="button" onClick={() => go(-1)} aria-label="Prêmio anterior" className="flex size-8 items-center justify-center rounded-full border border-game-line bg-game-surface-2 text-game-ink focus-visible:outline-3 focus-visible:outline-white">‹</button>
          <span className="flex gap-1.5" aria-hidden="true">
            {items!.map((x, k) => <span key={x.id} className={`size-2 rounded-full ${k === idx ? 'bg-[#e8c875]' : 'bg-game-line'}`} />)}
          </span>
          <button type="button" onClick={() => go(1)} aria-label="Próximo prêmio" className="flex size-8 items-center justify-center rounded-full border border-game-line bg-game-surface-2 text-game-ink focus-visible:outline-3 focus-visible:outline-white">›</button>
        </footer>
      )}
    </section>
  );
}
