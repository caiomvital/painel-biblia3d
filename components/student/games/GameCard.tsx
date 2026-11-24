import React from 'react';
import { Button, GamepadIcon } from '@/components/ui/game';
import type { GameItem } from './api';
import { GAMES_TEXT as T } from './copy';

const COVERS = ['from-[#4a6fb0] to-[#243a5c]', 'from-[#2a82ee] to-[#1349a8]', 'from-[#1f9b46] to-[#0f672b]', 'from-[#f1700e] to-[#a8480a]', 'from-[#d6409f] to-[#7a1d5c]'];
const hash = (s: string) => Array.from(s).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

export function GameCard({ game, onPlay, badge, action }: { game: GameItem; onPlay: (g: GameItem) => void; badge?: string; action?: React.ReactNode }) {
  return (
    <article data-testid={`game-card-${game.id}`} className="flex flex-col gap-2 rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-4">
      <div aria-hidden="true" className={`hidden h-24 items-center justify-center rounded-game bg-gradient-to-br text-5xl text-white/90 lg:flex ${COVERS[hash(game.id) % COVERS.length]}`}><GamepadIcon /></div>
      <h3 className="font-[family-name:var(--font-game-title)] text-xl leading-tight tracking-wide">{game.title}</h3>
      {game.description && <p className="flex-1 text-game-ink-dim">{game.description}</p>}
      <p className="text-sm text-game-ink-dim">{badge ? `${badge} · ` : `Por ${game.authorName} · `}jogado {game.plays}x</p>
      <Button size="lg" onClick={() => onPlay(game)} data-testid={`game-play-${game.id}`}>▶ {T.play}</Button>
      {action}
    </article>
  );
}
