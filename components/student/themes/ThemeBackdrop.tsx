'use client';
import { COSMETICS } from '@/lib/cosmetics';
import type { MascotLook } from '@/lib/mascot-look';
import { hasScene, ThemeScene } from './scenes';

/** Cenário do tema ocupando a tela toda, parado atrás do painel (como o papel de parede de um tema do Chrome). */
export function ThemeBackdrop({ themeId, look }: { themeId: string; look: MascotLook }) {
  if (!hasScene(themeId)) return null;
  const tint = COSMETICS.find((c) => c.code === look.color)?.tint;
  return (
    <div aria-hidden data-testid="theme-backdrop" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-game-bg">
      <ThemeScene id={themeId} tint={tint} className="h-full w-full" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 35%, var(--color-game-bg) 120%)', opacity: 0.55 }} />
    </div>
  );
}
