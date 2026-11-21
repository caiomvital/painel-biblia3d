'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BookIcon, Button, GamepadIcon, GavelIcon, LiveMascot, MASCOT_NAME, MoreIcon, SunIcon, TargetIcon, TrophyIcon } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import { AuctionCorner } from './AuctionCorner';
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

function Tile({ icon, title, onClick, testId }: { icon: React.ReactNode; title: string; onClick: () => void; testId: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-3 text-game-ink transition-transform active:translate-y-0.5 active:border-b-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none">
      <span className="text-5xl text-game-primary">{icon}</span>
      <span className="font-[family-name:var(--font-game-title)] text-2xl tracking-wide">{title}</span>
    </button>
  );
}

/** Botão grande da grade da tela inicial: ícone em cima, nome e uma dica curta. */
function GridButton({ icon, title, hint, onClick, disabled, highlight, testId }: {
  icon: React.ReactNode; title: string; hint: string; onClick: () => void; disabled?: boolean; highlight?: boolean; testId: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testId}
      className={`flex min-h-36 flex-col items-center justify-center gap-1 rounded-game-lg border-4 border-b-[7px] p-3 text-center font-[family-name:var(--font-game-body)] transition-transform active:translate-y-0.5 active:border-b-4 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none [@media(max-height:760px)]:min-h-28 ${
        highlight ? 'border-game-primary-deep bg-game-primary text-game-ink-on-light' : 'border-game-line bg-game-surface text-game-ink'}`}>
      <span className={`text-5xl ${highlight ? '' : 'text-game-primary'}`}>{icon}</span>
      <span className="font-[family-name:var(--font-game-title)] text-2xl leading-tight tracking-wide">{title}</span>
      <span className={`text-sm leading-tight ${highlight ? 'text-game-ink-on-light/80' : 'text-game-ink-dim'}`}>{hint}</span>
    </button>
  );
}

/** No app instalado (PWA) a tela inicial usa a grade; no navegador comum, a versão em lista. */
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
export function HomeScreen({ home, celebrate, unread, onGo, onOpenNotices, onNotice, onError, onRefresh }: {
  home: KidsHomeData; celebrate: boolean; unread: number; onGo: (v: View) => void; onOpenNotices: () => void;
  onNotice: (m: string) => void; onError: (m: string) => void; onRefresh: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const quizPending = home.quiz.available && !home.quiz.completedToday;
  const lessonOpen = !!home.lesson && !home.lesson.done;
  const pwa = useStandalone();

  return (
    <div className="space-y-4">
      {pwa ? (
        <>
      <div className="relative grid grid-cols-2 items-center gap-3">
        <div className="flex min-w-0 flex-col items-center text-center">
          <LiveMascot size={5.5} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} />
          <h1 className="font-[family-name:var(--font-game-title)] text-2xl leading-tight tracking-wide">Olá, {home.firstName}!</h1>
        </div>
        <AuctionCorner onOpen={() => onGo('auction')} />
        <button type="button" onClick={() => setMenu(true)} aria-label="Meus dados e mais" data-testid="home-menu"
          className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-full border-b-4 border-game-line bg-game-surface-2 text-xl text-game-ink focus-visible:outline-3 focus-visible:outline-white">
          <MoreIcon />
          {unread ? <span className="absolute -right-1 -top-1 size-4 rounded-full bg-game-danger" aria-hidden /> : null}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-5">
        <GridButton testId="home-day" icon={<SunIcon />} title="Dia" hint="O que tem para hoje" onClick={() => onGo('day')} />
        <GridButton testId="home-learned" icon={<BookIcon />} title="O que aprendi"
          hint={lessonOpen ? 'Novo! Conte para nós' : home.lesson ? 'Você já contou. Muito bem!' : 'Esperando a aula'}
          onClick={() => onGo('learned')} disabled={!home.lesson} highlight={lessonOpen} />
        <GridButton testId="home-daily" icon={<TargetIcon />} title="Desafio"
          hint={!home.quiz.available ? 'Ainda não tem perguntas' : quizPending ? 'Jogue e ganhe moedas!' : 'Feito hoje. Volte amanhã!'}
          onClick={() => onGo('quests')} highlight={quizPending} />
        <GridButton testId="home-live" icon={<TrophyIcon />} title="Quiz ao vivo" hint="Entre com o PIN" onClick={() => onGo('live')} />
      </div>
        </>
      ) : (
        <>
      <div className="relative flex flex-col items-center text-center">
        <button type="button" onClick={() => setMenu(true)} aria-label="Meus dados e mais" data-testid="home-menu"
          className="absolute right-0 top-0 flex size-12 items-center justify-center rounded-full border-b-4 border-game-line bg-game-surface-2 text-2xl text-game-ink focus-visible:outline-3 focus-visible:outline-white">
          <MoreIcon />
          {unread ? <span className="absolute -right-1 -top-1 size-4 rounded-full bg-game-danger" aria-hidden /> : null}
        </button>
        <LiveMascot size={7} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} />
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

      <div className="grid grid-cols-2 gap-3">
        <Tile testId="home-games" icon={<GamepadIcon />} title="Jogos" onClick={() => onGo('games')} />
        <Tile testId="home-auction" icon={<GavelIcon />} title="Leilão" onClick={() => onGo('auction')} />
        <div className="col-span-2"><BigAction testId="home-live" icon={<TrophyIcon />} title="Quiz ao vivo" hint="Entre com o PIN do professor" onClick={() => onGo('live')} /></div>
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
      {menu && <MyDataSheet home={home} unread={unread} onGo={onGo} onOpenNotices={onOpenNotices} onClose={() => setMenu(false)} />}
    </div>
  );
}
