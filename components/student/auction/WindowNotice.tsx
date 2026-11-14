import React from 'react';

export type BidWindow = { open: boolean; opensAt: string; timeZone: string };

/** Avisa se o leilão está aberto agora. Vem do servidor (mesma função que valida o lance). Ícone + texto. */
export function WindowNotice({ window: w }: { window: BidWindow | null }) {
  if (!w) return null;
  const hour = `${parseInt(w.opensAt.slice(0, 2), 10)}h`;
  return (
    <p data-testid="auction-window" data-open={w.open ? 'true' : 'false'}
      className={`flex min-h-12 items-center gap-2 rounded-game border-2 px-4 py-2 font-semibold ${w.open ? 'border-game-success' : 'border-game-primary'}`}>
      <span aria-hidden="true" className="text-xl">{w.open ? '🟢' : '🌙'}</span>
      {w.open ? 'Aberto agora! Dê seus lances.' : `Fechado agora. Abre às ${hour}.`}
    </p>
  );
}
