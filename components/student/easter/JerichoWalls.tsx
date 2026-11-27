'use client';

import React, { useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { useGameSound } from '@/components/ui/game';

const COLS = 8;
const ROWS = 6;

/**
 * Easter egg: sete toques no Lofi e "os muros de Jericó caem" (Josué 6).
 * Só enfeite: não dá pontos nem grava nada. Fecha sozinho, com toque, Esc ou Enter.
 */
export function JerichoWalls({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const { play } = useGameSound();

  useEffect(() => {
    play('fanfarra'); // respeita o botão de som: mudo = silêncio
    const t = setTimeout(onDone, reduce ? 5000 : 6500);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onDone(); };
    window.addEventListener('keydown', key);
    return () => { clearTimeout(t); window.removeEventListener('keydown', key); };
    // roda uma vez, quando abre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Os muros de Jericó caíram"
      data-testid="easter-jericho"
      onClick={onDone}
      className="fixed inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#ffb347_0%,#ff7e5f_55%,#4b2a9e_100%)] font-[family-name:var(--font-game-body)] text-game-ink"
    >
      {/* o muro: cada tijolo balança e depois cai, coluna por coluna */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[12%] mx-auto grid w-[min(92vw,34rem)] grid-cols-8 gap-1">
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const delay = 1.1 + col * 0.12 + (ROWS - row) * 0.06;
          const style: React.CSSProperties = reduce
            ? { opacity: row < 2 ? 0.25 : 0 }
            : { animation: `b3d-wall-shake 0.5s ${delay - 0.9}s 2, b3d-wall-fall 1.4s ${delay}s ease-in forwards`, ['--rot' as string]: `${((i * 37) % 60) - 30}deg` };
          return <span key={i} className="block h-8 rounded-sm border-2 border-[#7a3b1d] bg-[#c4693a] sm:h-10" style={style} />;
        })}
      </div>

      <div className="relative z-10 mt-24 flex flex-col items-center gap-3 px-6 text-center">
        <p className="text-6xl" aria-hidden="true">🎺</p>
        <h1 className="font-[family-name:var(--font-game-title)] text-4xl leading-tight text-white [-webkit-text-stroke:6px_#15123a] [paint-order:stroke_fill] drop-shadow-[0_5px_0_#15123a] sm:text-5xl">
          Os muros de Jericó caíram!
        </h1>
        <p className="max-w-md text-xl font-semibold text-white">Sete voltas, sete trombetas e um grande grito. Deus cumpre o que promete!</p>
        <p className="text-sm text-white/80">Toque para fechar</p>
      </div>
    </div>
  );
}
