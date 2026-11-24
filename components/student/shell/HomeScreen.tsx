'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button, LiveMascot, MASCOT_NAME } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import { NextEventCard } from './EventsScreen';
import { ChestButton, ChestCard, useChests } from '../chests/ChestCard';
import { ProfileForm } from '../quests/ProfileForm';
import { JourneyButton } from './JourneyButton';
import { HomeDashboard } from './HomeDashboard';
import { useWide } from './useWide';
import type { View } from './views';

/**
 * No app instalado (celular) a tela inicial usa a grade com Dia, O que aprendi e Desafio (em destaque, largo).
 * O Quiz ao vivo é da sala de aula, então só aparece no navegador comum, que é a versão em lista.
 * No celular o Desafio fica em cima e o mascote sozinho embaixo.
 */
function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function useStandalone() {
  return useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
}

/** O cadastro não fica aberto na tela inicial: o aluno abre quando quiser, por um botão. */
function ProfileSheet({ home, onClose, onNotice, onError, onRefresh }: {
  home: KidsHomeData; onClose: () => void; onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  return (
    <dialog ref={ref} aria-label="Complete seu cadastro" onCancel={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} data-testid="profile-sheet"
      className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-0 text-game-ink shadow-2xl backdrop:bg-black/70">
      <div className="space-y-3 p-4">
        <ProfileForm home={home} onError={onError} onDone={(m) => { onNotice(m); onRefresh(); onClose(); }} />
        <Button variant="ghost" onClick={onClose} className="w-full">Agora não</Button>
      </div>
    </dialog>
  );
}

/** Tela inicial pensada para celular: três botões grandes. Os dados do aluno ficam no menu de três pontinhos. */
export function HomeScreen({ home, celebrate, onGo, onNotice, onError, onRefresh }: {
  home: KidsHomeData; celebrate: boolean; onGo: (v: View) => void;
  onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const quizPending = home.quiz.available && !home.quiz.completedToday;
  const lessonOpen = !!home.lesson && !home.lesson.done;
  const pwa = useStandalone();
  const wide = useWide();
  const chest = useChests(home.points + home.level, onRefresh);

  const tail = (
    <>
      <NextEventCard onOpen={() => onGo('events')} />
      {wide && <ChestCard ctl={chest} />}

        {!home.profileCompleted && (
          <button type="button" onClick={() => setProfileOpen(true)} data-testid="home-profile-open"
            className="w-full rounded-full border-2 border-dashed border-game-line px-4 py-3 text-center font-semibold text-game-ink-dim focus-visible:outline-3 focus-visible:outline-white">
            Complete seu cadastro e ganhe 20 pontos
          </button>
        )}
        {profileOpen && <ProfileSheet home={home} onClose={() => setProfileOpen(false)} onNotice={onNotice} onError={onError} onRefresh={onRefresh} />}
    </>
  );

  if (wide) return <><HomeDashboard home={home} celebrate={celebrate} onGo={onGo}>{tail}</HomeDashboard>{chest.portal}</>;

  return (
    <div className="space-y-4">
      <div className="flex h-[calc(100dvh-var(--home-chrome,14rem))] min-h-80 flex-col gap-3" data-testid="home-grid">
        <div className="flex shrink-0 items-center justify-center gap-2">
          {!pwa && <LiveMascot bare size={3} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} />}
          <h1 className="font-[family-name:var(--font-game-title)] text-2xl leading-tight tracking-wide">Olá, {home.firstName}!</h1>
        </div>

        {/* O Desafio é a atração principal: vai na frente, em cima e largo. */}
        <JourneyButton grid testId="home-daily" tone="teal" img="/jornada/desafio.png" title="Desafio"
          hint={!home.quiz.available ? 'Ainda não tem perguntas' : quizPending ? 'Jogue e ganhe fichas!' : 'Feito hoje. Volte amanhã!'}
          onClick={() => onGo('quests')} glow={quizPending} className="flex-1" />

        <div className="grid min-h-0 flex-[1.2] grid-cols-2 gap-3 pt-1">
          <JourneyButton grid testId="home-day" tone="blue" img="/jornada/dia.png" title="Dia" hint="O que tem para hoje" onClick={() => onGo('day')} />
          <JourneyButton grid testId="home-learned" tone="orange" img="/jornada/aprendi.png" title="O que aprendi"
            hint={lessonOpen ? 'Novo! Conte para nós' : home.lesson ? 'Você já contou. Muito bem!' : 'Esperando a aula'}
            onClick={() => onGo('learned')} disabled={!home.lesson} glow={lessonOpen} />
        </div>

        {pwa ? (
          /* No app instalado o mascote fica sozinho embaixo (pula enquanto o Desafio de hoje não foi feito).
             Com baú para abrir, o botão do baú toma o lugar do mascote: assim não precisa rolar a tela. */
          chest.chests.length > 0 ? <ChestButton ctl={chest} className="min-h-24 shrink-0" /> : <div className={`flex shrink-0 justify-center ${quizPending ? 'game-bounce' : ''}`}>
            <LiveMascot bare size={4.5} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} />
          </div>
        ) : (
          /* No navegador do celular o Quiz ao vivo (sala de aula) fica à mão; Jogos e Leilão estão na barra de baixo. */
          <>
            <ChestButton ctl={chest} className="min-h-20 shrink-0" />
            <JourneyButton testId="home-live" tone="green" img="/jornada/quiz.png" title="Quiz ao vivo" hint="Digite o PIN" onClick={() => onGo('live')} className="h-20 shrink-0" />
          </>
        )}
      </div>

      {tail}
      {chest.portal}
    </div>
  );
}
