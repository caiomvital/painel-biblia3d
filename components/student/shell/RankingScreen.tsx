'use client';

import React from 'react';
import { Card, Mascot } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';

/** Ranking só com a posição da própria criança (sem nomes de colegas). */
export function RankingScreen({ home }: { home: KidsHomeData }) {
  const first = home.rankTurma?.position === 1;
  return (
    <div className="space-y-4" data-testid="ranking-screen">
      <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Ranking</h1>
      <div className="flex justify-center"><Mascot pose={first ? 'cheer' : 'idle'} size={8} /></div>
      <Card title="Na sua turma" tone={first ? 'success' : 'default'}>
        {home.rankTurma ? (
          <p><span className="font-[family-name:var(--font-game-title)] text-5xl">{home.rankTurma.position}º</span> <span className="text-game-ink-dim">de {home.rankTurma.total} alunos</span></p>
        ) : <p className="text-game-ink-dim">Você ainda não está numa turma.</p>}
      </Card>
      <Card title="Na escola toda">
        <p><span className="font-[family-name:var(--font-game-title)] text-5xl">{home.rankAcademia.position}º</span> <span className="text-game-ink-dim">de {home.rankAcademia.total} alunos</span></p>
      </Card>
      <p className="text-center text-game-ink-dim">O ranking mostra só a sua posição. Ganhe pontos e suba!</p>
    </div>
  );
}
