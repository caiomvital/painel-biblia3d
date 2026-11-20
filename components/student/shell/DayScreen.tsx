'use client';

import React from 'react';
import { Button, Card } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import { RatingCard } from '../quests/RatingCard';
import type { View } from './views';

const ord = (n: number) => `${n}º`;

/** "Dia": o resumo de hoje, o que já foi feito e o que falta. */
export function DayScreen({ home, onGo, onNotice, onError, onRefresh }: {
  home: KidsHomeData; onGo: (v: View) => void; onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
}) {
  const goal = home.prize?.pointsGoal ?? 0;
  const pct = goal ? Math.min(100, Math.round((home.points / goal) * 100)) : 0;
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const items: { label: string; done: boolean; available: boolean; to: View }[] = [
    { label: 'Desafio do dia', done: home.quiz.completedToday, available: home.quiz.available, to: 'quests' },
    ...(home.lesson ? [{ label: 'O que aprendi', done: home.lesson.done, available: true, to: 'learned' as View }] : []),
  ];
  const left = items.filter((i) => i.available && !i.done).length;

  return (
    <div className="space-y-4" data-testid="day-screen">
      <div>
        <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Dia</h1>
        <p className="capitalize text-game-ink-dim">{today}</p>
      </div>

      <Card title="Hoje" tone={left === 0 ? 'success' : 'highlight'}>
        <p className="mb-3 text-game-ink-dim">{left === 0 ? 'Tudo feito por hoje. Parabéns!' : left === 1 ? 'Falta 1 coisa para hoje.' : `Faltam ${left} coisas para hoje.`}</p>
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.label} className="flex items-center justify-between gap-3 rounded-game border-2 border-game-line bg-game-surface-2 px-4 py-2">
              <span>{i.done ? '✔' : '○'} {i.label}</span>
              {i.available && !i.done ? <Button className="min-h-10 px-4 text-sm" onClick={() => onGo(i.to)}>Ir</Button> : <span className="text-game-ink-dim">{i.done ? 'Feito' : 'Sem novidade'}</span>}
            </li>
          ))}
        </ul>
      </Card>

      {home.rating && (
        <RatingCard key={String(home.rating.done)} rating={home.rating} googleUrl={home.googleReviewUrl}
          onDone={(m) => { onNotice(m); onRefresh(); }} onError={onError} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card as="div" className="text-center" data-testid="home-rank-class">
          <p className="text-sm text-game-ink-dim">Na turma</p>
          <p className="font-[family-name:var(--font-game-title)] text-4xl">{home.rankTurma ? ord(home.rankTurma.position) : '—'}</p>
          <p className="text-sm text-game-ink-dim">{home.rankTurma ? `de ${home.rankTurma.total}` : 'Sem turma'}</p>
        </Card>
        <Card as="div" className="text-center" data-testid="home-rank-academy">
          <p className="text-sm text-game-ink-dim">Na escola</p>
          <p className="font-[family-name:var(--font-game-title)] text-4xl">{ord(home.rankAcademia.position)}</p>
          <p className="text-sm text-game-ink-dim">de {home.rankAcademia.total}</p>
        </Card>
      </div>

      {home.prize && (
        <Card title="Prêmio do mês" tone="highlight" data-testid="home-prize">
          <p className="font-semibold">{home.prize.title}</p>
          {home.prize.description && <p className="text-game-ink-dim">{home.prize.description}</p>}
          <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-game-line bg-game-xp-track" role="progressbar"
            aria-label="Pontos para o prêmio" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-game-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 font-semibold text-game-primary">{home.points} de {goal} pontos{home.points >= goal ? ' · Conseguiu!' : ''}</p>
        </Card>
      )}
    </div>
  );
}
