'use client';
import { COSMETICS } from '@/lib/cosmetics';
import { themeById } from '@/lib/game-themes';
import type { MascotLook } from '@/lib/mascot-look';

/** Faixa com o cenário do tema, logo abaixo do topo. O tema padrão não tem faixa. */
export function ThemeBanner({ themeId, look }: { themeId: string; look: MascotLook }) {
  const theme = themeById(themeId);
  let scene = theme.scene;
  if (theme.group === 'lofi') {
    const tint = COSMETICS.find((c) => c.code === look.color)?.tint;
    if (tint) scene = { gradient: `linear-gradient(90deg,${tint[1]},${tint[0]},${tint[1]})`, emojis: '🤖 ✨ 🤖 ✨ 🤖' };
  }
  if (!scene) return null;
  return (
    <div aria-hidden data-testid="theme-banner" className="overflow-hidden border-b-2 border-game-line py-1.5 text-center text-2xl tracking-[0.5em]" style={{ background: scene.gradient }}>
      {scene.emojis}
    </div>
  );
}
