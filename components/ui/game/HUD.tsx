'use client';

import React from 'react';
import { levelProgress } from '@/lib/level';
import { AnimatedNumber } from './AnimatedNumber';
import { CoinIcon, StarIcon } from './icons';
import { XPBar } from './XPBar';

export interface HUDProps {
  /** Fichas (moedas) que a criança pode gastar. */
  coins: number;
  /** Pontos totais (definem o nível e o ranking). */
  points: number;
  /** Conteúdo extra à direita (ex.: botão de som). */
  actions?: React.ReactNode;
  className?: string;
}

/** Barra fixa no topo: nível + barra de XP, pontos e moedas. O nível vem de lib/level. */
export function HUD({ coins, points, actions, className = '' }: HUDProps) {
  const { level, xpIntoLevel, xpForLevel } = levelProgress(points);
  return (
    <header
      className={`sticky top-0 z-30 border-b-2 border-game-line bg-game-bg/95 px-3 py-2 backdrop-blur ${className}`}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div
          className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full border-b-4 border-game-primary-deep bg-game-primary text-game-ink-on-light"
          aria-label={`Nível ${level}`}
        >
          <span className="text-[0.55rem] font-bold uppercase leading-none">Nível</span>
          <span className="font-[family-name:var(--font-game-title)] text-lg leading-none">{level}</span>
        </div>

        <div className="min-w-0 flex-1">
          <XPBar value={xpIntoLevel} max={xpForLevel} />
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-full bg-game-surface px-3 py-1.5 text-game-ink"
          aria-label={`${points} pontos`}
        >
          <StarIcon className="text-game-primary" width="1.1em" height="1.1em" />
          <AnimatedNumber value={points} className="font-[family-name:var(--font-game-title)] text-base" />
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-full bg-game-surface px-3 py-1.5 text-game-ink"
          aria-label={`${coins} fichas`}
        >
          <CoinIcon className="text-game-coin" width="1.1em" height="1.1em" />
          <AnimatedNumber value={coins} className="font-[family-name:var(--font-game-title)] text-base" />
        </div>

        {actions}
      </div>
    </header>
  );
}
