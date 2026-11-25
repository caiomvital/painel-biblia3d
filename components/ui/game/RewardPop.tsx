'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CoinIcon, StarIcon } from './icons';

export interface RewardPopProps {
  /** Mostra o aviso quando não é null. Troque o `id` a cada recompensa nova. */
  reward: { id: number | string; amount: number; kind?: 'points' | 'coins'; label?: string } | null;
  /** Chamado ao terminar (some sozinho). */
  onDone?: () => void;
  /** Tempo na tela, em ms. */
  duration?: number;
}

/** Aviso de recompensa ("+10 pontos") com moedinhas subindo. Sem subida com movimento reduzido. */
export function RewardPop({ reward, onDone, duration = 1800 }: RewardPopProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!reward) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [reward, duration, onDone]);

  const kind = reward?.kind ?? 'points';
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center">
      <AnimatePresence>
        {reward && (
          <motion.div
            key={reward.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.7 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -40 }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 20 }}
            className="relative flex items-center gap-2 rounded-full border-b-4 border-game-primary-deep bg-game-primary px-6 py-3 text-game-ink-on-light shadow-lg"
          >
            {kind === 'coins' ? <CoinIcon width="1.6em" height="1.6em" /> : <StarIcon width="1.6em" height="1.6em" />}
            <span className="font-[family-name:var(--font-game-title)] text-2xl leading-none">+{reward.amount}</span>
            <span className="font-[family-name:var(--font-game-body)] text-base font-semibold">
              {reward.label ?? (kind === 'coins' ? (reward.amount === 1 ? 'ficha' : 'fichas') : reward.amount === 1 ? 'ponto' : 'pontos')}
            </span>
            {!reduce &&
              [0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  aria-hidden="true"
                  className="absolute left-1/2 top-0 text-game-coin"
                  initial={{ opacity: 1, x: (i - 1.5) * 18, y: 0 }}
                  animate={{ opacity: 0, x: (i - 1.5) * 34, y: -56 - i * 6 }}
                  transition={{ duration: 1.1, delay: 0.08 * i, ease: 'easeOut' }}
                >
                  <CoinIcon width="1.1em" height="1.1em" />
                </motion.span>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
