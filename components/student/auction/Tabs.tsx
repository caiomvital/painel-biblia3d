import React from 'react';

export type AuctionView = 'lots' | 'my-bids' | 'statement';

/** Três abas grandes (Prêmios, Meus lances, Histórico), com contagem em texto. */
export function AuctionTabs({ value, onChange, items }: {
  value: AuctionView; onChange: (v: AuctionView) => void;
  items: { id: AuctionView; label: string; count?: number }[];
}) {
  return (
    <div role="tablist" aria-label="Leilão" className="grid grid-cols-3 gap-1.5 rounded-game-lg bg-game-surface p-1.5">
      {items.map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={on} type="button" onClick={() => onChange(t.id)}
            className={`min-h-12 rounded-game px-1.5 text-center font-[family-name:var(--font-game-body)] text-sm font-semibold leading-tight sm:px-3 sm:text-base focus-visible:outline-3 focus-visible:outline-white ${
              on ? 'border-b-4 border-game-primary-deep bg-game-primary text-game-ink-on-light' : 'text-game-ink-dim'
            }`}>
            {t.label}{t.count ? ` (${t.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
