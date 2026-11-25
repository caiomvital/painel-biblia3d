'use client';

import React from 'react';
import { Card } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import { LessonCard } from '../quests/LessonCard';

/** "O que aprendi": só tem o que fazer quando o professor registrou conteúdo novo. */
export function LearnedScreen({ home, onNotice, onError, onRefresh }: {
  home: KidsHomeData; onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
}) {
  const done = (m: string) => { onNotice(m); onRefresh(); };
  return (
    <div className="space-y-4" data-testid="learned-screen">
      <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">O que aprendi</h1>
      {home.lesson ? (
        <LessonCard key={home.lesson.reportId + String(home.lesson.done)} lesson={home.lesson} onDone={done} onError={onError} />
      ) : (
        <Card as="div"><p className="text-game-ink-dim">Seu professor ainda não registrou nada novo. Quando ele registrar, esta tela abre para você.</p></Card>
      )}
    </div>
  );
}
