'use client';

import React from 'react';
import { Button } from '@/components/ui/game';
import { StudentBadges } from '../StudentBadges';
import { StudentCurriculum } from '../StudentCurriculum';
import { StudentExercises } from '../StudentExercises';
import { StudentLessons } from '../StudentLessons';
import { StudentOverview } from '../StudentOverview';
import { useStudentDashboard } from '../useStudentDashboard';
import type { StudentTab } from '../student-types';

export type LegacyView = 'overview' | 'lessons' | 'exercises' | 'curriculum' | 'badges';

/** Telas herdadas (alcançadas por Perfil > Mais). Só carregam o painel antigo quando abertas. */
export function LegacyArea({ view, expandedLessonId, onExpandLesson, onGo, onBack, coinsAvailable }: {
  view: LegacyView; expandedLessonId: string | null; onExpandLesson: (id: string | null) => void;
  onGo: (tab: StudentTab) => void; onBack: () => void; coinsAvailable: number;
}) {
  const needsDashboard = view === 'overview' || view === 'lessons' || view === 'badges';
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>← Voltar</Button>
      {needsDashboard ? (
        <DashboardViews view={view} expandedLessonId={expandedLessonId} onExpandLesson={onExpandLesson} onGo={onGo} coinsAvailable={coinsAvailable} />
      ) : view === 'exercises' ? <StudentExercises /> : <StudentCurriculum />}
    </div>
  );
}

function DashboardViews({ view, expandedLessonId, onExpandLesson, onGo, coinsAvailable }: {
  view: LegacyView; expandedLessonId: string | null; onExpandLesson: (id: string | null) => void; onGo: (tab: StudentTab) => void; coinsAvailable: number;
}) {
  const dash = useStudentDashboard();
  if (dash.loading) {
    return <p role="status" className="py-10 text-center text-game-ink-dim">Carregando…</p>;
  }
  if (dash.error || !dash.data) {
    return (
      <div role="alert" className="rounded-game-lg border-2 border-game-danger bg-game-surface p-4 text-center">
        <p className="font-semibold">{dash.error || 'Não foi possível carregar os dados.'}</p>
        <Button className="mt-3" onClick={dash.fetchDashboard}>Tentar de novo</Button>
      </div>
    );
  }
  return (
    <>
      {dash.attendanceSuccessMsg && <div role="status" className="rounded-game border-2 border-game-success bg-game-surface p-3">{dash.attendanceSuccessMsg}</div>}
      {dash.attendanceErrorMsg && <div role="alert" className="rounded-game border-2 border-game-danger bg-game-surface p-3">{dash.attendanceErrorMsg}</div>}
      {view === 'overview' && (
        <StudentOverview data={dash.data} studentBalance={coinsAvailable} requestingAttendance={dash.requestingAttendance}
          onMarkAttendance={dash.markAttendance} onGo={onGo} onExpandLesson={(id) => onExpandLesson(id)} />
      )}
      {view === 'lessons' && <StudentLessons data={dash.data} expandedLessonId={expandedLessonId} onExpandLesson={onExpandLesson} />}
      {view === 'badges' && <StudentBadges data={dash.data} onGo={onGo} />}
    </>
  );
}
