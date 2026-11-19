'use client';
import { useMemo } from 'react';

const PIECES: Record<string, string[]> = {
  estrelas: ['⭐', '✨', '🌟'],
  coracoes: ['💛', '💖', '🧡'],
  confete: ['🟥', '🟦', '🟨', '🟩', '🟪', '🟧'],
};

/** Chuva de partículas por cima de tudo, uns 3 segundos. Troque `burst` para disparar de novo; some com movimento reduzido. */
export function LevelEffect({ effect, burst }: { effect: string; burst: number }) {
  const pieces = PIECES[effect];
  const items = useMemo(() => {
    if (!pieces || burst === 0) return [];
    return Array.from({ length: 28 }, (_, i) => ({
      key: `${burst}-${i}`,
      char: pieces[i % pieces.length],
      left: Math.round((i * 37 + burst * 11) % 100),
      delay: (i % 10) * 0.12,
      dur: 2.2 + (i % 5) * 0.3,
      dx: `${((i % 7) - 3) * 14}px`,
      rot: `${(i % 2 ? 1 : -1) * (180 + (i % 4) * 120)}deg`,
      size: 1.1 + (i % 4) * 0.3,
    }));
  }, [pieces, burst]);
  if (!items.length) return null;
  return (
    <div aria-hidden data-testid="level-effect" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden motion-reduce:hidden">
      {items.map((p) => (
        <span key={p.key} className="absolute top-0" style={{ left: `${p.left}%`, fontSize: `${p.size}rem`, opacity: 0,
          animation: `b3d-fall ${p.dur}s ${p.delay}s ease-in forwards`, ['--dx' as string]: p.dx, ['--rot' as string]: p.rot }}>{p.char}</span>
      ))}
    </div>
  );
}
