import React from 'react';
import { Button } from '@/components/ui/game';
import type { GameItem } from './api';
import { GAMES_TEXT as T } from './copy';

export function GameCard({ game, onPlay, badge, action }: { game: GameItem; onPlay: (g: GameItem) => void; badge?: string; action?: React.ReactNode }) {
  return (
    <article data-testid={`game-card-${game.id}`} className="flex flex-col gap-2 rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-4">
      <h3 className="font-[family-name:var(--font-game-title)] text-xl leading-tight tracking-wide">{game.title}</h3>
      {game.description && <p className="flex-1 text-game-ink-dim">{game.description}</p>}
      <p className="text-sm text-game-ink-dim">{badge ? `${badge} · ` : `Por ${game.authorName} · `}jogado {game.plays}x</p>
      <Button size="lg" onClick={() => onPlay(game)} data-testid={`game-play-${game.id}`}>▶ {T.play}</Button>
      {action}
    </article>
  );
}
