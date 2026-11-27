'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui/game';
import { DAVI_LIVE_LOBBY, DAVI_LIVE_OPEN, daviLiveFinal, daviLiveResult } from '@/lib/davi-guide';
import { DaviTutor } from '../guide/DaviGuide';
import { kidsCall } from '../kids-api';

type LiveState = {
  id: string; phase: 'LOBBY' | 'OPEN' | 'CLOSED' | 'FINISHED'; index: number; total: number; seconds: number; secondsLeft: number;
  teamName: string | null; question: { text: string; options: string[] } | null; answered: { choice: number } | null;
  result: { correctIndex: number; correct: boolean; points: number } | null; myPoints: number; finalRank: number | null;
};

const COLORS = [
  'border-red-300 bg-red-500/80 text-white', 'border-sky-300 bg-sky-500/80 text-white',
  'border-yellow-200 bg-yellow-400/90 text-[#3b2f00]', 'border-emerald-300 bg-emerald-500/80 text-white',
];

/** Quiz ao vivo: o aluno entra pelo PIN do professor e responde no computador. O professor decide equipes e ritmo. */
export function LiveQuizScreen({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState('');
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  // retoma a sala em que o aluno já estava (recarregou a página)
  useEffect(() => {
    let off = false;
    kidsCall('/api/kids/live').then((r) => { if (!off) { setRoomId(r.id); setReady(true); } }).catch(() => { if (!off) setReady(true); });
    return () => { off = true; };
  }, []);

  const phase = state?.phase;
  useEffect(() => {
    if (!roomId) return;
    let off = false;
    const tick = async () => {
      try {
        const s: LiveState = await kidsCall(`/api/kids/live?id=${roomId}`);
        if (!off) { setState(s); setLeft(s.secondsLeft); setError(''); }
      } catch (e) { if (!off) setError(e instanceof Error ? e.message : 'Sem conexão. Tentando de novo…'); }
    };
    tick();
    const timer = setInterval(() => { if (phase !== 'FINISHED') tick(); }, 1500);
    return () => { off = true; clearInterval(timer); };
  }, [roomId, phase]);

  useEffect(() => {
    if (phase !== 'OPEN') return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const join = async () => {
    setBusy(true); setError('');
    try { const r = await kidsCall('/api/kids/live', 'POST', { action: 'join', pin }); setRoomId(r.id); setState(null); setPin(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar.'); } finally { setBusy(false); }
  };

  const answer = useCallback(async (choice: number) => {
    if (!roomId) return;
    setError('');
    try {
      await kidsCall('/api/kids/live', 'POST', { action: 'answer', id: roomId, choice });
      setState((s) => (s ? { ...s, answered: { choice } } : s));
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível responder.'); }
  }, [roomId]);

  // teclas 1 a 4
  const open = state?.phase === 'OPEN' && !state.answered;
  const optionCount = state?.question?.options.length ?? 0;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= optionCount) answer(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, optionCount, answer]);

  if (!ready) return <p role="status" className="text-lg text-game-ink-dim">Carregando…</p>;

  if (!roomId) {
    return (
      <div className="mx-auto max-w-md space-y-4" data-testid="live-join">
        <h1 className="text-center font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Quiz ao vivo</h1>
        <Card as="div" className="space-y-3">
          <label className="block text-lg font-semibold" htmlFor="live-pin">PIN da sala</label>
          <p className="text-game-ink-dim">O professor mostra os 6 números.</p>
          <input id="live-pin" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} placeholder="000000" data-testid="live-pin-input"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => { if (e.key === 'Enter' && pin.length === 6 && !busy) join(); }}
            className="w-full rounded-game border-2 border-game-line bg-game-surface-2 px-3 py-3 text-center text-4xl font-bold tracking-[0.4em] text-game-ink placeholder:text-game-ink-dim/40" />
          {error && <p role="alert" className="font-semibold text-game-danger">{error}</p>}
          <Button onClick={join} disabled={pin.length !== 6 || busy} className="w-full" data-testid="live-join-go">Entrar</Button>
        </Card>
        <Button variant="ghost" onClick={onBack} className="w-full">Voltar</Button>
      </div>
    );
  }

  if (!state) return <p role="status" className="text-lg text-game-ink-dim">{error || 'Entrando na sala…'}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4" data-testid="live-room">
      {error && <p role="alert" className="rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</p>}

      {state.phase === 'LOBBY' && (
        <Card as="div" className="space-y-2 text-center">
          <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Você está dentro!</h1>
          <p className="text-xl">Espere o professor começar.</p>
          <p className="text-game-ink-dim" data-testid="live-team">{state.teamName ? `Sua equipe: ${state.teamName}` : 'O professor vai colocar você em uma equipe.'}</p>
          <DaviTutor text={DAVI_LIVE_LOBBY.text} mood={DAVI_LIVE_LOBBY.mood} className="mx-auto max-w-sm" />
        </Card>
      )}

      {(state.phase === 'OPEN' || state.phase === 'CLOSED') && state.question && (
        <>
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Pergunta {state.index + 1}</span>
            {state.phase === 'OPEN'
              ? <span className={`rounded-full border-2 px-3 ${left <= 5 ? 'border-game-danger text-game-danger' : 'border-game-line'}`} data-testid="live-timer" aria-live="off">{left}s</span>
              : <span className="text-game-ink-dim">Tempo encerrado</span>}
          </div>
          <Card as="div"><p className="text-2xl font-bold leading-snug" data-testid="live-question">{state.question.text}</p></Card>
          <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Respostas">
            {state.question.options.map((o, i) => {
              const picked = state.answered?.choice === i;
              const right = state.result?.correctIndex === i;
              const dim = (state.phase === 'CLOSED' && !right && !picked) || (state.phase === 'OPEN' && !!state.answered && !picked);
              return (
                <button key={i} type="button" disabled={state.phase !== 'OPEN' || !!state.answered} onClick={() => answer(i)} data-testid={`live-opt-${i}`}
                  className={`min-h-20 rounded-game-lg border-2 border-b-4 px-4 py-3 text-left text-xl font-bold focus-visible:outline-3 focus-visible:outline-white ${COLORS[i % 4]} ${dim ? 'opacity-40' : ''} ${picked ? 'ring-4 ring-white' : ''} ${right ? 'ring-4 ring-emerald-200' : ''}`}>
                  <span className="mr-2 opacity-80">{i + 1}</span>{o}{right && <span aria-hidden="true"> ✓</span>}
                </button>
              );
            })}
          </div>
          {state.phase === 'OPEN' && !state.answered && (
            <>
              <DaviTutor text={DAVI_LIVE_OPEN.text} mood={DAVI_LIVE_OPEN.mood} className="mx-auto max-w-sm" />
              <p className="text-center text-game-ink-dim">Dica: aperte as teclas 1 a 4.</p>
            </>
          )}
          {state.phase === 'OPEN' && state.answered && <p role="status" className="text-center text-xl font-semibold">Resposta enviada! Espere o tempo acabar.</p>}
          {state.phase === 'CLOSED' && (
            <Card as="div" className="text-center" data-testid="live-result">
              <p className="text-2xl font-bold" role="status">
                {state.result?.correct ? 'Você acertou!' : state.answered ? 'Não foi dessa vez.' : 'Você não respondeu.'}
              </p>
              {state.result?.correct && <p className="text-xl text-game-primary">+{state.result.points} pontos</p>}
              <DaviTutor text={daviLiveResult(!!state.answered, !!state.result?.correct).text} mood={daviLiveResult(!!state.answered, !!state.result?.correct).mood} className="mx-auto max-w-sm text-left" />
              <p className="text-game-ink-dim">Espere a próxima pergunta.</p>
            </Card>
          )}
        </>
      )}

      {state.phase === 'FINISHED' && (
        <Card as="div" className="space-y-2 text-center" data-testid="live-finished">
          <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Fim do quiz!</h1>
          {state.finalRank !== null && <p className="text-2xl font-bold">{state.teamName ?? 'Sua equipe'} ficou em {state.finalRank}º lugar</p>}
          <p className="text-xl">Você fez {state.myPoints} pontos.</p>
          <DaviTutor text={daviLiveFinal(state.finalRank).text} mood={daviLiveFinal(state.finalRank).mood} className="mx-auto max-w-sm text-left" />
          <Button onClick={() => { setRoomId(null); setState(null); onBack(); }} className="w-full">Voltar ao início</Button>
        </Card>
      )}
    </div>
  );
}
