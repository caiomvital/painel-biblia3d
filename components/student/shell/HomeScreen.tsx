'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button, GamepadIcon, GavelIcon, LiveMascot, MASCOT_NAME } from '@/components/ui/game';
import { playSound } from '@/components/ui/game/sound-store';
import type { KidsHomeData } from '../kids-api';
import { ChestCard } from '../chests/ChestCard';
import { ProfileForm } from '../quests/ProfileForm';
import { JourneyButton } from './JourneyButton';
import type { View } from './views';

function Tile({ icon, title, onClick, testId }: { icon: React.ReactNode; title: string; onClick: () => void; testId: string }) {
  return (
    <button type="button" onClick={() => { playSound('tap'); onClick(); }} data-testid={testId}
      className="game-btn game-press flex min-h-28 flex-col items-center justify-center gap-1 rounded-game-lg border-2 border-game-line bg-game-surface-2 p-3 text-game-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white">
      <span className="text-5xl text-game-primary">{icon}</span>
      <span className="font-[family-name:var(--font-game-title)] text-2xl tracking-wide">{title}</span>
    </button>
  );
}

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

  return (
    <div className="space-y-4">
      {pwa ? (
        <div className="flex h-[calc(100dvh-var(--home-chrome,15rem))] min-h-72 flex-col gap-3">
      <div className="relative flex shrink-0 items-center justify-center">
        <h1 className="font-[family-name:var(--font-game-title)] text-2xl leading-tight tracking-wide">Olá, {home.firstName}!</h1>
      </div>

      {/* O Desafio é a atração principal: vai na frente, em cima e largo. */}
      <JourneyButton grid testId="home-daily" tone="purple" img="/jornada/desafio.png" title="Desafio"
        hint={!home.quiz.available ? 'Ainda não tem perguntas' : quizPending ? 'Jogue e ganhe fichas!' : 'Feito hoje. Volte amanhã!'}
        onClick={() => onGo('quests')} glow={quizPending} className="flex-1" />

      <div className="grid min-h-0 flex-[1.5] grid-cols-2 gap-3 pt-1">
        <JourneyButton grid testId="home-day" tone="blue" img="/jornada/dia.png" title="Dia" hint="O que tem para hoje" onClick={() => onGo('day')} />
        <JourneyButton grid testId="home-learned" tone="orange" img="/jornada/aprendi.png" title="O que aprendi"
          hint={lessonOpen ? 'Novo! Conte para nós' : home.lesson ? 'Você já contou. Muito bem!' : 'Esperando a aula'}
          onClick={() => onGo('learned')} disabled={!home.lesson} glow={lessonOpen} />
      </div>

      {/* O mascote fica sozinho embaixo, chamando a atenção (pula enquanto o Desafio de hoje não foi feito). */}
      <div className={`flex shrink-0 justify-center ${quizPending ? 'game-bounce' : ''}`}>
        <LiveMascot bare size={4.5} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} />
      </div>
        </div>
      ) : (
        <>
      <div className="relative flex flex-col items-center text-center">
        <LiveMascot bare size={7} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} />
        <h1 className="mt-1 font-[family-name:var(--font-game-title)] text-3xl leading-tight tracking-wide">Olá, {home.firstName}!</h1>
        <p className="text-game-ink-dim">{MASCOT_NAME} está com você!</p>
      </div>

      <div className="space-y-3 pb-1">
        <JourneyButton testId="home-day" tone="blue" img="/jornada/dia.png" title="Dia" hint="Veja o que tem para hoje" onClick={() => onGo('day')} className="h-24" />
        <JourneyButton testId="home-learned" tone="orange" img="/jornada/aprendi.png" title="O que aprendi"
          hint={lessonOpen ? 'Novo! Conte o que você aprendeu' : home.lesson ? 'Você já contou. Muito bem!' : 'Esperando o professor registrar a aula'}
          onClick={() => onGo('learned')} disabled={!home.lesson} glow={lessonOpen} className="h-24" />
        <JourneyButton testId="home-daily" tone="purple" img="/jornada/desafio.png" title="Desafio"
          hint={!home.quiz.available ? 'Ainda não tem perguntas' : quizPending ? 'Jogue e ganhe fichas!' : 'Feito hoje. Volte amanhã!'}
          onClick={() => onGo('quests')} glow={quizPending} className="h-28" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile testId="home-games" icon={<GamepadIcon />} title="Jogos" onClick={() => onGo('games')} />
        <Tile testId="home-auction" icon={<GavelIcon />} title="Leilão" onClick={() => onGo('auction')} />
        <div className="col-span-2"><JourneyButton testId="home-live" tone="green" img="/jornada/quiz.png" title="Quiz ao vivo" hint="Entre com o PIN do professor" onClick={() => onGo('live')} live className="h-24" /></div>
      </div>
        </>
      )}

      <ChestCard refreshKey={home.points + home.level} onOpened={onRefresh} />

      {!home.profileCompleted && (
        <button type="button" onClick={() => setProfileOpen(true)} data-testid="home-profile-open"
          className="w-full rounded-full border-2 border-dashed border-game-line px-4 py-3 text-center font-semibold text-game-ink-dim focus-visible:outline-3 focus-visible:outline-white">
          Complete seu cadastro e ganhe 20 pontos
        </button>
      )}
      {profileOpen && <ProfileSheet home={home} onClose={() => setProfileOpen(false)} onNotice={onNotice} onError={onError} onRefresh={onRefresh} />}
    </div>
  );
}
