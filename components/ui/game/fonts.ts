import { Fredoka, Lilita_One } from 'next/font/google';

/** Títulos e números de destaque. */
export const gameTitleFont = Lilita_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-game-title-src',
});

/** Texto corrido e botões. */
export const gameBodyFont = Fredoka({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-game-body-src',
});

/**
 * Classes a aplicar no elemento <html> (Fase 1b, em app/layout.tsx). Precisam estar na raiz:
 * os tokens de fonte de game.css são definidos em :root e leem estas variáveis.
 */
export const gameFontVariables = `${gameTitleFont.variable} ${gameBodyFont.variable}`;
