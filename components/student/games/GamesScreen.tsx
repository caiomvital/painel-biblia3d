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

  const submit = async (data: { title: string; description: string; html: string; isPublic: boolean }) => {
    setSending(true); setError('');
    try {
      await gamesCall('/api/games', 'POST', data);
      setNotice(data.isPublic ? T.sent : T.sentPrivate);
      setShowForm(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível enviar.'); } finally { setSending(false); }
  };

  const toggle = async (m: MyGame) => {
    setError(''); setNotice('');
    try {
      await gamesCall('/api/games', 'PATCH', { id: m.id, isPublic: !m.isPublic || m.status === 'REJECTED' });
      setNotice(m.isPublic && m.status !== 'REJECTED' ? 'Pronto! Agora só você vê esse jogo.' : T.sent);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
  };

  if (playing) return <GamePlayer game={playing} onBack={() => { setPlaying(null); load(); }} />;

  const total = (list: { plays: number }[]) => list.reduce((n, g) => n + g.plays, 0);
  const waiting = mine.filter((m) => m.isPublic && m.status === 'PENDING').length;
  const published = mine.filter((m) => m.isPublic && m.status === 'APPROVED').length;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]" data-testid="games-screen">
    <div className="min-w-0 space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide lg:text-4xl">{T.title}</h1>
        <p className="text-game-ink-dim">{T.intro}</p>
      </div>
      {error && <div role="alert" className="rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</div>}
      {notice && <div role="status" className="rounded-game border-2 border-game-success bg-game-surface p-3 font-semibold">{notice}</div>}

      {!games && <p role="status" className="py-8 text-center text-game-ink-dim">{T.loading}</p>}

      {mine.length > 0 && (
        <section aria-label={T.mine} data-testid="my-games" className="space-y-3">
          <h2 className="font-[family-name:var(--font-game-title)] text-2xl tracking-wide">{T.mine}</h2>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {mine.map((m) => {
              const v = myGameStatusView(m.status, m.isPublic);
              const canPublish = !m.isPublic || m.status === 'REJECTED';
              return (
                <GameCard key={m.id} game={{ id: m.id, title: m.title, description: m.description, authorName: 'você', plays: m.plays }}
                  onPlay={setPlaying} badge={`${v.symbol} ${v.label}`}
                  action={<Button variant="ghost" onClick={() => toggle(m)} data-testid={`game-visibility-${m.id}`} disabled={!canPublish && m.status === 'PENDING'}>
                    {canPublish ? T.makePublic : T.makePrivate}</Button>} />
              );
            })}
          </div>
        </section>
      )}

      {games && (games.length > 0 || mine.length === 0) && (
        <section aria-label={T.others} className="space-y-3">
          {mine.length > 0 && <h2 className="font-[family-name:var(--font-game-title)] text-2xl tracking-wide">{T.others}</h2>}
          {games.length === 0 && <p className="py-8 text-center text-game-ink-dim">{T.empty}</p>}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {games.map((g) => <GameCard key={g.id} game={g} onPlay={setPlaying} />)}
          </div>
        </section>
      )}

      {!showForm ? (
        <Button size="lg" onClick={() => { setShowForm(true); setNotice(''); }} data-testid="game-submit-open">＋ {T.send}</Button>
      ) : (
        <SubmitGameForm sending={sending} onSubmit={submit} onCancel={() => setShowForm(false)} />
      )}
    </div>

    <aside className="hidden space-y-4 xl:block" aria-label="Resumo dos jogos">
      <Card title="Seus jogos">
        <dl className="space-y-1.5 text-base">
          <div className="flex justify-between"><dt className="text-game-ink-dim">Que você criou</dt><dd className="font-semibold">{mine.length}</dd></div>
          <div className="flex justify-between"><dt className="text-game-ink-dim">Públicos</dt><dd className="font-semibold">{published}</dd></div>
          <div className="flex justify-between"><dt className="text-game-ink-dim">Esperando o professor</dt><dd className="font-semibold">{waiting}</dd></div>
          <div className="flex justify-between"><dt className="text-game-ink-dim">Vezes que jogaram</dt><dd className="font-semibold">{total(mine)}</dd></div>
        </dl>
      </Card>
      <Card title="Jogos da turma" tone="highlight">
        <p className="font-[family-name:var(--font-game-title)] text-4xl">{games?.length ?? 0}</p>
        <p className="text-game-ink-dim">jogos dos colegas para você jogar{games && games.length > 0 ? ` (${total(games)} partidas no total)` : ''}.</p>
      </Card>
      <Card title="Crie o seu jogo">
        <ol className="list-decimal space-y-1.5 pl-5 text-game-ink-dim">
          <li>Faça o jogo em um arquivo só (HTML).</li>
          <li>Toque em “Enviar um jogo meu” e cole o código.</li>
          <li>Marque “Tornar público” para mostrar aos colegas.</li>
          <li>O professor testa e aprova. Aí todo mundo joga!</li>
        </ol>
        <p className="mt-3 text-sm text-game-ink-dim">Jogos que usam a internet ou abrem outras páginas não são aceitos.</p>
      </Card>
    </aside>
    </div>
  );
}
