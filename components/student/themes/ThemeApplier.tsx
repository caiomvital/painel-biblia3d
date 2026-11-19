'use client';
import { useEffect } from 'react';
import { COSMETICS } from '@/lib/cosmetics';
import { themeById, type ThemeDef } from '@/lib/game-themes';
import type { MascotLook } from '@/lib/mascot-look';

/** Resolve os tokens do tema; o "Combina com meu Lofi" pega as cores do Lofi equipado. */
export function resolveThemeVars(theme: ThemeDef, look: MascotLook): Record<string, string> {
  if (theme.group !== 'lofi') return theme.vars ?? {};
  const tint = COSMETICS.find((c) => c.code === look.color)?.tint;
  if (!tint) return {};
  return { primary: tint[0], 'primary-deep': tint[1], secondary: tint[0], 'secondary-deep': tint[1], line: tint[1] };
}

/** Pinta o painel do aluno: troca os tokens `--color-game-*` na raiz e devolve tudo ao padrão ao sair. */
export function ThemeApplier({ themeId, look }: { themeId: string; look: MascotLook }) {
  const lookKey = JSON.stringify(look);
  useEffect(() => {
    const root = document.documentElement;
    const vars = resolveThemeVars(themeById(themeId), JSON.parse(lookKey) as MascotLook);
    const names = Object.keys(vars).map((k) => `--color-game-${k}`);
    names.forEach((n, i) => root.style.setProperty(n, Object.values(vars)[i]));
    root.dataset.gameTheme = themeId;
    return () => { names.forEach((n) => root.style.removeProperty(n)); delete root.dataset.gameTheme; };
  }, [themeId, lookKey]);
  return null;
}
