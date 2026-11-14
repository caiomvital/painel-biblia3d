'use client';

import React, { useEffect, useState } from 'react';
import { Button, LiveMascot } from '@/components/ui/game';
import type { GameItem } from './api';
import { GAMES_TEXT as T, GAME_ALLOW } from './copy';

/**
 * Tela de jogar. O jogo roda isolado: sandbox só com allow-scripts (sem same-origin: sem cookies,
 * sessão ou API do painel) e allow explícito negando todos os recursos do navegador.
 */
export function GamePlayer({ game, onBack }: { game: GameItem; onBack: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [attempt]);

  const retry = () => { setLoaded(false); setSlow(false); setAttempt((n) => n + 1); };

  return (
    <div className="space-y-3" data-testid="game-player">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="lg" onClick={onBack} icon={<span aria-hidden="true">←</span>}>{T.back}</Button>
        <div className="min-w-0">
          <h2 className="truncate font-[family-name:var(--font-game-title)] text-2xl leading-tight">{game.title}</h2>
          <p className="truncate text-sm text-game-ink-dim">Por {game.authorName}</p>
        </div>
      </div>

      <div className="relative">
        {!loaded && !slow && (
          <div role="status" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-game-lg bg-game-surface">
            <LiveMascot size={6} />
            <p className="text-lg text-game-ink-dim">{T.opening}</p>
          </div>
        )}
        {!loaded && slow && (
          <div role="alert" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-game-lg bg-game-surface p-4 text-center">
            <p className="text-lg font-semibold">{T.slow}</p>
            <Button onClick={retry}>{T.retry}</Button>
          </div>
        )}
        <iframe
          key={attempt}
          title={game.title}
          src={`/api/games/${game.id}/play`}
          sandbox="allow-scripts"
          allow={GAME_ALLOW}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          className="h-[70dvh] min-h-96 w-full rounded-game-lg border-2 border-game-line bg-white"
        />
      </div>
    </div>
  );
}
