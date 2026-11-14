'use client';

import React, { useCallback, useEffect, useState } from 'react';

type GameItem = { id: string; title: string; description: string | null; authorName: string; plays: number };
type Mine = { id: string; title: string; status: string };

const card = 'rounded-3xl border border-slate-800 bg-slate-900/70 p-5';
const input = 'mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white';
const btn = 'rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40';
const statusText: Record<string, string> = { PENDING: 'esperando revisão', REJECTED: 'não aprovado' };

async function call(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Algo deu errado.');
  return json;
}

export function GamesSection() {
  const [games, setGames] = useState<GameItem[] | null>(null);
  const [mine, setMine] = useState<Mine[]>([]);
  const [playing, setPlaying] = useState<GameItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await call('/api/games');
      setGames(d.games); setMine(d.mine); setError('');
    } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true); setError('');
    try {
      await call('/api/games', 'POST', { title: f.get('title'), description: f.get('description'), html: f.get('html') });
      setNotice('Seu jogo foi enviado! Quando o professor aprovar, ele aparece na lista. 🎉');
      setShowForm(false); await load();
    } catch (err: any) { setError(err.message); } finally { setSending(false); }
  };

  if (playing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-white">{playing.title}</h2>
            <p className="text-xs text-slate-400">Criado por {playing.authorName}</p>
          </div>
          <button onClick={() => { setPlaying(null); load(); }} className={btn}>Voltar</button>
        </div>
        <iframe
          title={playing.title}
          src={`/api/games/${playing.id}/play`}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="h-[75vh] w-full rounded-2xl border border-slate-700 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}

      <div className={card}>
        <h2 className="text-xl font-black text-white">🎮 Jogos da Bíblia 3D</h2>
        <p className="mt-1 text-sm text-slate-300">Jogue os jogos da turma — e crie o seu também!</p>
      </div>

      {!games && <div className={card}>Carregando...</div>}
      {games && games.length === 0 && <div className={card}>Ainda não há jogos. Que tal criar o primeiro?</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {games?.map((g) => (
          <div key={g.id} className={`${card} flex flex-col`}>
            <h3 className="text-base font-bold text-white">{g.title}</h3>
            {g.description && <p className="mt-1 flex-1 text-sm text-slate-300">{g.description}</p>}
            <p className="mt-2 text-xs text-slate-400">Criado por {g.authorName} · jogado {g.plays}x</p>
            <button onClick={() => setPlaying(g)} className={`${btn} mt-3`}>▶ Jogar</button>
          </div>
        ))}
      </div>

      {mine.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white">Meus jogos enviados</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {mine.map((m) => <li key={m.id}>{m.title} — <span className="text-slate-400">{statusText[m.status] ?? m.status}</span></li>)}
          </ul>
        </div>
      )}

      <div className={card}>
        {!showForm ? (
          <button onClick={() => { setShowForm(true); setNotice(''); }} className={btn}>＋ Enviar um jogo que eu criei</button>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h3 className="text-base font-bold text-white">Enviar meu jogo</h3>
            <p className="text-xs text-slate-400">O jogo precisa ser um arquivo HTML só (com o CSS e o JavaScript dentro). Peça ajuda ao professor, se precisar.</p>
            <label className="block text-xs font-semibold text-slate-300">Nome do jogo
              <input name="title" required minLength={3} maxLength={60} className={input} /></label>
            <label className="block text-xs font-semibold text-slate-300">Como se joga? (opcional)
              <input name="description" maxLength={200} className={input} /></label>
            <label className="block text-xs font-semibold text-slate-300">Código do jogo (HTML)
              <textarea name="html" required rows={8} className={`${input} font-mono text-xs`} placeholder="<!doctype html>..." /></label>
            <div className="flex gap-2">
              <button type="submit" disabled={sending} className={btn}>Enviar</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300">Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
