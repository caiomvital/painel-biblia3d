'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { Button } from './Button';
import { LiveMascot } from './Mascot';
import { CoinIcon, StarIcon, TrophyIcon } from './icons';
import { SoundToggle, useGameSound } from './useGameSound';
import { XPBar } from './XPBar';

export interface RewardSummaryItem {
  label: string;
  icon: React.ReactNode;
  value: number;
  /** Quantidade ("×3") mostrada ao lado do rótulo. */
  count?: number;
  /** Moeda ao lado do valor: fichas (padrão) ou pontos de XP. */
  unit?: 'coins' | 'xp';
}

export interface RewardSummaryProps {
  title: string;
  subtitle?: string;
  /** XP ganho (ícone de troféu com "+N"). */
  xp?: number;
  items: RewardSummaryItem[];
  /** Total de fichas, exatamente como o servidor devolveu. */
  totalCoins: number;
  onContinue: () => void;
  /** Barra de XP do nível (valores do servidor). */
  progress?: { value: number; max: number };
  /** Nível novo, quando o aluno subiu de nível. */
  levelUp?: number | null;
}

/** Número que conta de 0 até o valor depois de `delay` segundos (direto com movimento reduzido). */
function CountUp({ value, delay, reduce, prefix = '' }: { value: number; delay: number; reduce: boolean; prefix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, value, {
      duration: 0.8,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, delay, reduce]);
  const display = reduce ? value : shown;
  return <span>{prefix}{display.toLocaleString('pt-BR')}</span>;
}

const OUTLINE = '[-webkit-text-stroke:7px_#15123a] [paint-order:stroke_fill] drop-shadow-[0_5px_0_#15123a]';

/**
 * Tela de resultado em tela cheia (missão cumprida, vitória...). Só EXIBE valores já calculados pelo servidor.
 * Foco no CONTINUAR; Esc também continua. Movimento reduzido: sem animação, só o conteúdo.
 */
export function RewardSummary({ title, subtitle, xp, items, totalCoins, onContinue, progress, levelUp }: RewardSummaryProps) {
  const reduce = useReducedMotion() ?? false;
  const { play } = useGameSound();
  const continueRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    continueRef.current?.focus();
    play(levelUp ? 'levelUp' : 'coin'); // respeita o botão de som (mudo = silêncio)
    // toca uma vez, quando a tela abre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onContinue();
      return;
    }
    if (e.key !== 'Tab') return;
    const f = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const rowsStart = 0.45;
  const step = 0.18;
  const totalDelay = rowsStart + items.length * step + 0.25;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-summary-title"
      data-testid="reward-summary"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[70] overflow-y-auto bg-[linear-gradient(160deg,#2a2f9e_0%,#4b2a9e_55%,#2b1a6e_100%)] font-[family-name:var(--font-game-body)] text-game-ink"
    >
      {/* padrão sutil de ícones (decorativo) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 grid grid-cols-5 content-around justify-items-center gap-y-10 text-4xl text-white opacity-[0.07] sm:grid-cols-8">
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className={i % 2 ? 'rotate-12' : '-rotate-12'}>
            {i % 3 === 0 ? <StarIcon /> : i % 3 === 1 ? <CoinIcon /> : <TrophyIcon />}
          </span>
        ))}
      </div>

      <div className="absolute right-3 top-3 z-10"><SoundToggle /></div>

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col items-center gap-4 px-4 pb-8 pt-14">
        <motion.h1
          id="reward-summary-title"
          initial={reduce ? false : { scale: 0.3, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 14 }}
          className={`text-center font-[family-name:var(--font-game-title)] text-5xl leading-none text-game-primary min-[420px]:text-6xl ${OUTLINE}`}
        >
          {title}
        </motion.h1>
        {subtitle && <p className="text-center text-xl font-semibold">{subtitle}</p>}

        <div className="flex items-center gap-3">
          <LiveMascot size={6} cheering={!reduce} label="" />
          {typeof xp === 'number' && (
            <motion.div
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reduce ? { duration: 0 } : { delay: 0.25, type: 'spring', stiffness: 300, damping: 15 }}
              className="flex items-center gap-2 text-game-xp"
              aria-label={`${xp} pontos de experiência`}
            >
              <TrophyIcon width="3.2rem" height="3.2rem" />
              <span className={`font-[family-name:var(--font-game-title)] text-5xl ${OUTLINE}`}>
                <CountUp value={xp} delay={0.3} reduce={reduce} prefix="+" />
              </span>
            </motion.div>
          )}
        </div>

        {levelUp ? (
          <p role="status" className="rounded-full border-2 border-game-primary bg-game-surface px-5 py-2 text-xl font-bold text-game-primary">
            Subiu de nível! Agora você é nível {levelUp}
          </p>
        ) : null}
        {progress && <XPBar value={progress.value} max={progress.max} className="w-full max-w-xs" />}

        <ul className="w-full space-y-2">
          {items.map((it, i) => (
            <motion.li
              key={`${it.label}-${i}`}
              initial={reduce ? false : { x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={reduce ? { duration: 0 } : { delay: rowsStart + i * step, type: 'spring', stiffness: 320, damping: 24 }}
              className="flex min-h-14 items-center gap-3 rounded-full border-2 border-game-line bg-game-surface/90 px-4 py-2"
            >
              <span className="text-2xl text-game-primary">{it.icon}</span>
              <span className="flex-1 text-lg font-semibold leading-tight">
                {it.label}
                {typeof it.count === 'number' && <span className="ml-1 text-game-ink-dim">×{it.count}</span>}
              </span>
              <span className="flex items-center gap-1.5 text-xl font-bold">
                <CountUp value={it.value} delay={rowsStart + i * step + 0.1} reduce={reduce} />
                <span className="text-game-coin">{it.unit === 'xp' ? <StarIcon /> : <CoinIcon />}</span>
                <span className="sr-only">{it.unit === 'xp' ? 'pontos' : 'fichas'}</span>
              </span>
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={reduce ? false : { y: -120, rotate: 0, opacity: 0 }}
          animate={{ y: 0, rotate: -3, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { delay: totalDelay, type: 'spring', stiffness: 260, damping: 12 }}
          className="flex items-center gap-3 rounded-game border-4 border-game-coin-deep bg-game-primary px-6 py-3 text-game-ink-on-light shadow-lg"
          data-testid="reward-total"
        >
          <span className="font-[family-name:var(--font-game-title)] text-xl">TOTAL</span>
          <span className="flex items-center gap-1 font-[family-name:var(--font-game-title)] text-4xl leading-none">
            <CountUp value={totalCoins} delay={totalDelay + 0.2} reduce={reduce} prefix="+" />
            <CoinIcon />
          </span>
          <span className="sr-only">fichas no total</span>
        </motion.div>

        <motion.div
          className="mt-2 w-full"
          animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
          transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: totalDelay + 0.6 }}
        >
          <Button ref={continueRef} size="lg" variant="success" onClick={onContinue} className="min-h-16 w-full text-2xl">
            CONTINUAR
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
