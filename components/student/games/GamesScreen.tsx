'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui/game';
import { gamesCall, type GameItem, type MyGame } from './api';
import { GAMES_TEXT as T, myGameStatusView } from './copy';
import { GameCard } from './GameCard';
import { GamePlayer } from './GamePlayer';
import { SubmitGameForm } from './SubmitGameForm';

export function GamesScreen() {
  const [games, setGames] = useState<GameItem[] | null>(null);
  const [mine, setMine] = useState<MyGame[]>([]);
  const [playing, setPlaying] = useState<GameItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await gamesCall('/api/games');
      setGames(d.games); setMine(d.mine); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar.'); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const submit = async (data: { title: string; description: string; html: string }) => {
    setSending(true); setError('');
    try {
      await gamesCall('/api/games', 'POST', data);
      setNotice(T.sent);
      setShowForm(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível enviar.'); } finally { setSending(false); }
  };

  if (playing) return <GamePlayer game={playing} onBack={() => { setPlaying(null); load(); }} />;

  return (
    <div className="space-y-4" data-testid="games-screen">
      <div>
        <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">{T.title}</h1>
        <p className="text-game-ink-dim">{T.intro}</p>
      </div>
      {error && <div role="alert" className="rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</div>}
      {notice && <div role="status" className="rounded-game border-2 border-game-success bg-game-surface p-3 font-semibold">{notice}</div>}

      {!games && <p role="status" className="py-8 text-center text-game-ink-dim">{T.loading}</p>}
      {games && games.length === 0 && <p className="py-8 text-center text-game-ink-dim">{T.empty}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {games?.map((g) => <GameCard key={g.id} game={g} onPlay={setPlaying} />)}
      </div>

      {mine.length > 0 && (
        <Card title={T.mine} data-testid="my-games">
          <ul className="space-y-2">
            {mine.map((m) => {
              const v = myGameStatusView(m.status);
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-game bg-game-bg px-3 py-2">
                  <span className="min-w-0 truncate font-semibold">{m.title}</span>
                  <span className="shrink-0 text-sm text-game-ink-dim"><span aria-hidden="true">{v.symbol}</span> {v.label}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {!showForm ? (
        <Button size="lg" onClick={() => { setShowForm(true); setNotice(''); }} data-testid="game-submit-open">＋ {T.send}</Button>
      ) : (
        <SubmitGameForm sending={sending} onSubmit={submit} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
}
