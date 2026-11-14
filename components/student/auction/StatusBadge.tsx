import React from 'react';
import { bidStatusView, type BidStatus } from './copy';

const TONE = {
  success: 'border-game-success text-game-success',
  warning: 'border-game-primary text-game-primary',
  win: 'border-game-coin bg-game-coin/15 text-game-coin',
  neutral: 'border-game-line text-game-ink-dim',
} as const;

/** Estado do lance com símbolo + texto (a cor só reforça). */
export function StatusBadge({ status }: { status: BidStatus }) {
  const v = bidStatusView(status);
  return (
    <span data-testid={`bid-status-${status}`} className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold ${TONE[v.tone]}`}>
      <span aria-hidden="true" className="text-base leading-none">{v.symbol}</span>
      {v.label}
    </span>
  );
}
