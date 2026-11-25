'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import { QuizPlayer } from '../quests/QuizPlayer';
import type { RewardSummaryData } from '@/lib/reward-summary';

/** Desafio: abre direto nas perguntas (sem tela de escolha). O desafio da semana, quando existe, fica a um toque. */
export function ChallengeScreen({ home, onError, onRefresh, onReward, onExit }: {
  home: KidsHomeData; onError: (m: string) => void; onRefresh: () => void; onReward?: (s: RewardSummaryData) => void; onExit?: () => void;
}) {
  const [kind, setKind] = useState<'daily' | 'weekly'>('daily');
  const hasWeekly = home.weekly.available || home.weekly.completedToday;
  return (
    <div className="space-y-4" data-testid="challenge-screen">
      <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Desafio</h1>
      {hasWeekly && (
        <div role="group" aria-label="Qual desafio" className="flex gap-2">
          <Button variant={kind === 'daily' ? 'primary' : 'ghost'} aria-pressed={kind === 'daily'} onClick={() => setKind('daily')}>Do dia</Button>
          <Button variant={kind === 'weekly' ? 'primary' : 'ghost'} aria-pressed={kind === 'weekly'} onClick={() => setKind('weekly')}>Da semana</Button>
        </div>
      )}
      <QuizPlayer key={kind} kind={kind} onDone={onRefresh} onError={onError} onReward={onReward} onExit={onExit}
        emptyText={kind === 'daily' ? 'Ainda não tem perguntas. Volte logo!' : 'Ainda não tem desafio da semana.'} />
    </div>
  );
}
