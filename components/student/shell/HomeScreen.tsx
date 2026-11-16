'use client';

import React from 'react';
import { Button, Card, LiveMascot, MASCOT_NAME, MedalIcon, TargetIcon, TrophyIcon, BellIcon } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import { ChestCard } from '../chests/ChestCard';
import { ProfileForm } from '../quests/ProfileForm';
import { SideShortcut } from './SideShortcut';
import type { View } from './views';

const ord = (n: number) => `${n}º`;

export function HomeScreen({ home, celebrate, unread, onGo, onOpenNotices, onNotice, onError, onRefresh }: {
  home: KidsHomeData; celebrate: boolean; unread: number; onGo: (v: View) => void; onOpenNotices: () => void;
  onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
}) {
  const goal = home.prize?.pointsGoal ?? 0;
  const pct = goal ? Math.min(100, Math.round((home.points / goal) * 100)) : 0;
  const pending = !home.quiz.completedToday && home.quiz.available;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
        <div className="flex flex-col gap-3">
          <SideShortcut label="Ranking" icon={<TrophyIcon />} onClick={() => onGo('ranking')} />
          <SideShortcut label="Conquistas" icon={<MedalIcon />} onClick={() => onGo('badges')} />
        </div>
        <div className="flex flex-col items-center text-center">
          <LiveMascot size={9.5} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} />
          <h1 className="mt-1 font-[family-name:var(--font-game-title)] text-3xl leading-tight tracking-wide">Olá, {home.firstName}!</h1>
          <p className="flex max-w-full items-baseline justify-center gap-1 text-game-ink-dim">
            {home.className && <span className="min-w-0 truncate" title={home.className}>{home.className}</span>}
            <span className="shrink-0">{home.className ? '· ' : ''}Nível {home.level}</span>
          </p>
          <p className="text-sm text-game-ink-dim">{MASCOT_NAME} está com você!</p>
        </div>
        <div className="flex flex-col gap-3">
          <SideShortcut label="Avisos" icon={<BellIcon />} onClick={onOpenNotices} badge={unread} />
        </div>
      </div>

      <Card title="Desafio do dia" tone={pending ? 'highlight' : 'success'} data-testid="home-daily">
        <p className="text-game-ink-dim">
          {!home.quiz.available ? 'Ainda não tem perguntas. Volte logo!' : home.quiz.completedToday ? `Você acertou ${home.quiz.scoreToday ?? 0} hoje. Volte amanhã!` : '5 perguntas. Ganhe pontos!'}
        </p>
        <Button className="mt-3" icon={<TargetIcon />} onClick={() => onGo('quests')}>{pending ? 'Jogar' : 'Ver'}</Button>
      </Card>

      <ChestCard refreshKey={home.points + home.level} onOpened={onRefresh} />

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

      {!home.profileCompleted && (
        <ProfileForm home={home} onError={onError} onDone={(m) => { onNotice(m); onRefresh(); }} />
      )}
    </div>
  );
}
