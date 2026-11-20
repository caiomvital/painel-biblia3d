'use client';

import React from 'react';
import { Card } from '@/components/ui/game';
import { POINTS_PER_LESSON_TOPIC } from '@/lib/lesson-points';
import type { KidsHomeData } from '../kids-api';
import { LessonCard } from '../quests/LessonCard';

/** "O que aprendi": só tem o que fazer quando o professor registrou conteúdo novo. Explica a pontuação antes de marcar. */
export function LearnedScreen({ home, onNotice, onError, onRefresh }: {
  home: KidsHomeData; onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
}) {
  const done = (m: string) => { onNotice(m); onRefresh(); };
  return (
    <div className="space-y-4" data-testid="learned-screen">
      <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">O que aprendi</h1>
      <Card tone="highlight" title="Como funciona">
        <ul className="list-disc space-y-1 pl-5 text-game-ink-dim">
          <li>Cada coisa que você marcar vale <strong className="text-game-ink">{POINTS_PER_LESSON_TOPIC} pontos</strong>.</li>
          <li>Marque <strong className="text-game-ink">só o que você lembra</strong> de verdade.</li>
          <li>Não lembra de algum? Deixe sem marcar, sem problema.</li>
          <li>Depois de salvar, não dá para mudar.</li>
        </ul>
      </Card>
      {home.lesson ? (
        <LessonCard key={home.lesson.reportId + String(home.lesson.done)} lesson={home.lesson} onDone={done} onError={onError} />
      ) : (
        <Card as="div"><p className="text-game-ink-dim">Seu professor ainda não registrou nada novo. Quando ele registrar, esta tela abre para você.</p></Card>
      )}
    </div>
  );
}
