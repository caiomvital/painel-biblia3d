'use client';

import React, { useState } from 'react';
import { BookIcon, LiveMascot, MASCOT_NAME, MoreIcon, SunIcon, TargetIcon } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import { ChestCard } from '../chests/ChestCard';
import { ProfileForm } from '../quests/ProfileForm';
import { MyDataSheet } from './MyDataSheet';
import type { View } from './views';

function BigAction({ icon, title, hint, onClick, disabled, highlight, testId }: {
  icon: React.ReactNode; title: string; hint: string; onClick: () => void; disabled?: boolean; highlight?: boolean; testId: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testId}
      className={`flex w-full items-center gap-4 rounded-game-lg border-2 border-b-4 p-4 text-left font-[family-name:var(--font-game-body)] transition-transform active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${
        highlight ? 'border-game-primary-deep bg-game-primary text-game-ink-on-light' : 'border-game-line bg-game-surface text-game-ink'}`}>
      <span className={`flex size-16 shrink-0 items-center justify-center rounded-full border-b-4 text-4xl ${highlight ? 'border-game-primary-deep bg-white/30' : 'border-game-line bg-game-surface-2 text-game-primary'}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block font-[family-name:var(--font-game-title)] text-3xl leading-tight tracking-wide">{title}</span>
        <span className={`block text-base ${highlight ? 'text-game-ink-on-light/80' : 'text-game-ink-dim'}`}>{hint}</span>
      </span>
    </button>
  );
}

/** Tela inicial pensada para celular: três botões grandes. Os dados do aluno ficam no menu de três pontinhos. */
export function HomeScreen({ home, celebrate, unread, onGo, onOpenNotices, onNotice, onError, onRefresh }: {
  home: KidsHomeData; celebrate: boolean; unread: number; onGo: (v: View) => void; onOpenNotices: () => void;
  onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const quizPending = home.quiz.available && !home.quiz.completedToday;
  const lessonOpen = !!home.lesson && !home.lesson.done;

  return (
    <div className="space-y-4">
      <div className="relative flex flex-col items-center text-center">
        <button type="button" onClick={() => setMenu(true)} aria-label="Meus dados e mais" data-testid="home-menu"
          className="absolute right-0 top-0 flex size-12 items-center justify-center rounded-full border-b-4 border-game-line bg-game-surface-2 text-2xl text-game-ink focus-visible:outline-3 focus-visible:outline-white">
          <MoreIcon />
          {unread ? <span className="absolute -right-1 -top-1 size-4 rounded-full bg-game-danger" aria-hidden /> : null}
        </button>
        <LiveMascot size={9.5} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} />
        <h1 className="mt-1 font-[family-name:var(--font-game-title)] text-3xl leading-tight tracking-wide">Olá, {home.firstName}!</h1>
        <p className="text-game-ink-dim">{MASCOT_NAME} está com você!</p>
      </div>

      <div className="space-y-3">
        <BigAction testId="home-day" icon={<SunIcon />} title="Dia" hint="Veja o que tem para hoje" onClick={() => onGo('day')} />
        <BigAction testId="home-learned" icon={<BookIcon />} title="O que aprendi"
          hint={lessonOpen ? 'Novo! Conte o que você aprendeu' : home.lesson ? 'Você já contou. Muito bem!' : 'Esperando o professor registrar a aula'}
          onClick={() => onGo('learned')} disabled={!home.lesson} highlight={lessonOpen} />
        <BigAction testId="home-daily" icon={<TargetIcon />} title="Desafio"
          hint={!home.quiz.available ? 'Ainda não tem perguntas' : quizPending ? 'Jogue e ganhe moedas!' : 'Feito hoje. Volte amanhã!'}
          onClick={() => onGo('quests')} highlight={quizPending} />
      </div>

      <ChestCard refreshKey={home.points + home.level} onOpened={onRefresh} />

      {!home.profileCompleted && (
        <ProfileForm home={home} onError={onError} onDone={(m) => { onNotice(m); onRefresh(); }} />
      )}
      {menu && <MyDataSheet home={home} unread={unread} onGo={onGo} onOpenNotices={onOpenNotices} onClose={() => setMenu(false)} />}
    </div>
  );
}
