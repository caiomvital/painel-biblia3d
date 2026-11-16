'use client';

import React from 'react';
import type { KidsHomeData } from '../kids-api';
import { LessonCard } from '../quests/LessonCard';
import { QuizCard } from '../quests/QuizCard';
import type { RewardSummaryData } from '@/lib/reward-summary';
import { RatingCard } from '../quests/RatingCard';

export function QuestsScreen({ home, onNotice, onError, onRefresh, onReward }: {
  home: KidsHomeData; onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
  onReward?: (s: RewardSummaryData) => void;
}) {
  const done = (m: string) => { onNotice(m); onRefresh(); };
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Desafios</h1>
      {home.lesson && (
        <LessonCard key={home.lesson.reportId + String(home.lesson.done)} lesson={home.lesson} onDone={done} onError={onError} />
      )}
      <QuizCard kind="daily" title="Desafio do dia" summary={home.quiz}
        intro="5 perguntas. Cada acerto vale 5 pontos. Acertou tudo? Ganha mais 10!"
        doneText="Você acertou {n} hoje! Volte amanhã."
        emptyText="Ainda não tem perguntas. Volte logo!"
        onDone={onRefresh} onError={onError} onReward={onReward} />
      {home.rating && (
        <RatingCard key={String(home.rating.done)} rating={home.rating} googleUrl={home.googleReviewUrl} onDone={done} onError={onError} />
      )}
      {(home.weekly.available || home.weekly.completedToday) && (
        <QuizCard kind="weekly" title="Desafio da semana" summary={home.weekly}
          intro="Perguntas do seu professor sobre as aulas. Mesmos pontos!"
          doneText="Você acertou {n} nesta semana! Volte na próxima."
          emptyText="" onDone={onRefresh} onError={onError} onReward={onReward} />
      )}
    </div>
  );
}
