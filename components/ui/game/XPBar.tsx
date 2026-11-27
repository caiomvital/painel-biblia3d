'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface XPBarProps {
  /** Pontos já feitos dentro do nível. */
  value: number;
  /** Pontos do nível inteiro. */
  max: number;
  className?: string;
  /** Mostra "150 / 300" dentro da barra (além do ícone, não só cor). */
  showNumbers?: boolean;
}

/** Barra de XP que enche com animação (sem animação com movimento reduzido). */
export function XPBar({ value, max, className = '', showNumbers = true }: XPBarProps) {
  const reduce = useReducedMotion();
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const pct = (clamped / safeMax) * 100;
  return (
    <div
      role="progressbar"
      aria-label="Pontos do nível"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      className={`relative h-5 overflow-hidden rounded-full border-2 border-game-line bg-game-xp-track ${className}`}
    >
      <motion.div
        className="h-full rounded-full bg-game-xp"
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 18 }}
      />
      {showNumbers && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.8rem] font-bold leading-none text-white [-webkit-text-stroke:3px_#15123a] [paint-order:stroke_fill]">
          {clamped} / {safeMax}
        </span>
      )}
    </div>
  );
}
