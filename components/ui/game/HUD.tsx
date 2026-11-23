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
  /** Se informado, o círculo do nível vira o botão que abre o perfil (discreto, sem aba própria). */
  onProfile?: () => void;
  /** O perfil está aberto (marca o círculo do nível). */
  profileActive?: boolean;
  className?: string;
  /** Computador: a barra usa a largura toda do conteúdo (ao lado do menu lateral). */
  wide?: boolean;
}

/** Barra fixa no topo: nível + barra de XP, pontos e moedas. O nível vem de lib/level. */
export function HUD({ coins, points, actions, onProfile, profileActive = false, className = '', wide = false }: HUDProps) {
  const { level, xpIntoLevel, xpForLevel } = levelProgress(points);
  return (
    <header
      className={`sticky top-0 z-30 border-b-2 border-game-line bg-game-bg/95 px-3 py-2 backdrop-blur ${className}`}
    >
      <div className={`mx-auto flex ${wide ? 'max-w-3xl lg:max-w-7xl' : 'max-w-3xl'} flex-wrap items-center gap-x-2 gap-y-2 sm:flex-nowrap sm:gap-x-3`}>
        {(() => {
          const cls = 'flex size-12 shrink-0 flex-col items-center justify-center rounded-full border-b-4 border-game-primary-deep bg-game-primary text-game-ink-on-light';
          const inner = (<>
            <span className="text-[0.55rem] font-bold uppercase leading-none">Nível</span>
            <span className="font-[family-name:var(--font-game-title)] text-lg leading-none">{level}</span>
          </>);
          return onProfile ? (
            <button type="button" onClick={onProfile} aria-label="Perfil" aria-current={profileActive ? 'page' : undefined} data-testid="hud-profile"
              className={`${cls} game-press focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${profileActive ? 'ring-4 ring-white/70' : ''}`}>{inner}</button>
          ) : (
            <div className={cls} aria-label={`Nível ${level}`}>{inner}</div>
          );
        })()}

        <div className="order-last min-w-0 basis-full sm:order-none sm:basis-0 sm:flex-1">
          <XPBar value={xpIntoLevel} max={xpForLevel} />
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-full bg-game-surface px-2.5 py-1.5 text-game-ink"
          aria-label={`${points} pontos`}
        >
          <StarIcon className="text-game-primary" width="1.1em" height="1.1em" />
          <AnimatedNumber value={points} className="font-[family-name:var(--font-game-title)] text-base" />
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-full bg-game-surface px-2.5 py-1.5 text-game-ink"
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
