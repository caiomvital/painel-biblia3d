'use client';

import React from 'react';
import { playSound } from '@/components/ui/game/sound-store';

/** Cores dos quatro botões da jornada: degradê, "pé" de sombra e brilho do contorno. */
const TONE = {
  blue: { bg: 'linear-gradient(180deg,#59c8ff 0%,#2a82ee 100%)', edge: '#1349a8', ring: '#bfe9ff' },
  orange: { bg: 'linear-gradient(180deg,#ffbe4d 0%,#f1700e 100%)', edge: '#a8480a', ring: '#ffe1a8' },
  teal: { bg: 'linear-gradient(180deg,#3fd9c4 0%,#12877f 100%)', edge: '#0a5650', ring: '#bff5ec' },
  gold: { bg: 'linear-gradient(180deg,#ffd95a 0%,#d98a0b 100%)', edge: '#8a5206', ring: '#fff0b8' },
  rose: { bg: 'linear-gradient(180deg,#ff8fa8 0%,#d63d6a 100%)', edge: '#8c1f40', ring: '#ffd0dc' },
  green: { bg: 'linear-gradient(180deg,#5fdc72 0%,#1f9b46 100%)', edge: '#0f672b', ring: '#c4f5cc' },
} as const;

export type JourneyTone = keyof typeof TONE;

/**
 * Botão grande da tela inicial (faixa colorida com ícone 3D, nome, dica curta e seta de "jogar").
 * Afunda e brilha ao toque (.game-press). `glow` faz o botão pulsar quando há algo novo para fazer.
 */
export function JourneyButton({ tone, img, emoji, title, hint, onClick, disabled, glow, testId, className = '', grid }: {
  tone: JourneyTone; img?: string; emoji?: string; title: string; hint: string; onClick: () => void;
  disabled?: boolean; glow?: boolean; testId: string; className?: string;
  /** Versão quadrada da grade 2x2 (app instalado): ícone em cima, nome e dica embaixo. Sem isso, é a faixa larga. */
  grid?: boolean;
}) {
  const t = TONE[tone];
  if (grid) {
    return (
      <button
        type="button"
        data-testid={testId}
        disabled={disabled}
        onClick={() => { playSound('tap'); onClick(); }}
        style={{ backgroundImage: t.bg, borderColor: t.ring, ['--btn-edge' as string]: t.edge }}
        className={`game-btn game-press relative flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[1.75rem] border-2 p-3 text-center text-white font-[family-name:var(--font-game-body)] disabled:cursor-not-allowed disabled:opacity-60 disabled:saturate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${glow ? 'game-glow' : ''} ${className}`}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" draggable={false} className="min-h-10 w-auto max-w-[60%] flex-1 object-contain drop-shadow-[0_3px_3px_rgb(0_0_0/0.35)]" />
        ) : (
          <span aria-hidden="true" className="flex min-h-10 flex-1 items-center text-7xl leading-none drop-shadow-[0_3px_3px_rgb(0_0_0/0.35)]">{emoji}</span>
        )}
        <span className="font-[family-name:var(--font-game-title)] text-xl leading-tight tracking-wide [text-shadow:0_2px_0_rgb(0_0_0/0.35),0_0_6px_rgb(0_0_0/0.25)]">{title}</span>
        <span className="text-xs font-semibold leading-tight [text-shadow:0_1px_2px_rgb(0_0_0/0.55)] [@media(max-height:640px)]:hidden">{hint}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={() => { playSound('tap'); onClick(); }}
      style={{ backgroundImage: t.bg, borderColor: t.ring, ['--btn-edge' as string]: t.edge }}
      className={`game-btn game-press relative flex min-h-0 w-full items-center gap-3 rounded-[1.75rem] border-2 py-2 pl-3 pr-3 text-left text-white font-[family-name:var(--font-game-body)] disabled:cursor-not-allowed disabled:opacity-60 disabled:saturate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${glow ? 'game-glow' : ''} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img ?? ''} alt="" draggable={false} className="h-full max-h-20 min-h-10 w-auto shrink-0 object-contain drop-shadow-[0_3px_3px_rgb(0_0_0/0.35)]" />
      <span className="min-w-0 flex-1">
        <span className="block font-[family-name:var(--font-game-title)] text-[1.7rem] leading-none tracking-wide [text-shadow:0_2px_0_rgb(0_0_0/0.35),0_0_6px_rgb(0_0_0/0.25)] [@media(max-height:700px)]:text-2xl">{title}</span>
        <span className="mt-1 block text-sm font-semibold leading-tight [text-shadow:0_1px_2px_rgb(0_0_0/0.55)] [@media(max-height:700px)]:hidden">{hint}</span>
      </span>
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] border-2 border-[#fff2b8] bg-gradient-to-b from-[#ffd54a] to-[#ffa400] shadow-[0_3px_0_#b36b00] [@media(max-height:700px)]:size-9">
        <svg viewBox="0 0 24 24" className="size-5 translate-x-px fill-[#3b2200]"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>
      </span>
    </button>
  );
}
