'use client';

import React from 'react';
import { CoinIcon, LiveMascot, MASCOT_NAME, StarIcon, XPBar } from '@/components/ui/game';
import { levelProgress } from '@/lib/level';
import type { KidsHomeData } from '../kids-api';
import { ChestSquare, type ChestControl } from '../chests/ChestCard';
import { AuctionCorner } from './AuctionCorner';
import { JourneyButton } from './JourneyButton';
import type { View } from './views';

const ord = (n: number) => `${n}º`;

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-24 flex-col items-center rounded-game border-2 border-game-line bg-game-bg/60 px-3 py-2 text-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-game-ink-dim">{label}</span>
      <span className="flex items-center gap-1.5 font-[family-name:var(--font-game-title)] text-2xl">{icon}{value}</span>
    </div>
  );
}

/** Tela inicial do computador: um painel com a jornada em destaque e os blocos de apoio ao lado. */
export function HomeDashboard({ home, celebrate, onGo, chest, children }: {
  home: KidsHomeData; celebrate: boolean; onGo: (v: View) => void; chest?: ChestControl; children?: React.ReactNode;
}) {
  const lp = levelProgress(home.points);
  const quizPending = home.quiz.available && !home.quiz.completedToday;
  const lessonOpen = !!home.lesson && !home.lesson.done;
  const goal = home.prize?.pointsGoal ?? 0;
  const reserved = home.coins.reserved;
  return (
    <div className="mx-auto max-w-6xl" data-testid="home-dashboard">
      <div className="min-w-0 space-y-5">
        {/* Boas-vindas: o Lofi, o nível e os números; o baú é só um detalhe no canto. */}
        <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[2rem] border-2 border-game-primary bg-gradient-to-br from-[#34507a] via-[#243a5c] to-[#17253d] px-6 py-4 shadow-xl">
          <div className={quizPending ? 'game-bounce' : ''}><LiveMascot bare size={6} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} /></div>
          <div className="min-w-56 flex-1">
            <h1 className="font-[family-name:var(--font-game-title)] text-3xl leading-tight tracking-wide">Olá, {home.firstName}!</h1>
            <div className="mt-2 max-w-sm">
              <div className="mb-1 flex justify-between text-sm font-semibold"><span>Nível {lp.level}</span><span className="text-game-ink-dim">Faltam {lp.xpToNext} XP para o nível {lp.level + 1}</span></div>
              <XPBar value={lp.xpIntoLevel} max={lp.xpForLevel} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Stat icon={<StarIcon className="text-game-primary" />} label="Pontos" value={home.points} />
            <Stat icon={null} label="Na turma" value={home.rankTurma ? `${ord(home.rankTurma.position)} de ${home.rankTurma.total}` : '—'} />
            <Stat icon={null} label="Na escola" value={`${ord(home.rankAcademia.position)} de ${home.rankAcademia.total}`} />
            {chest && <ChestSquare ctl={chest} />}
          </div>
        </section>

        {/* O que mais importa agora: o Desafio e o Leilão, lado a lado, logo abaixo do "Olá". */}
        <div className="grid grid-cols-2 gap-5">
          <JourneyButton grid testId="home-daily" tone="teal" img="/jornada/desafio.png" title="Desafio"
            hint={!home.quiz.available ? 'Ainda não tem perguntas' : quizPending ? 'Jogue e ganhe fichas!' : 'Feito hoje. Volte amanhã!'}
            onClick={() => onGo('quests')} glow={quizPending} className="min-h-[22rem]" />
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-h-72 flex-1"><AuctionCorner onOpen={() => onGo('auction')} /></div>
            <div data-testid="home-fichas" className="flex items-center justify-between gap-3 rounded-[1.5rem] border-2 border-[#c9a24a] bg-[#2a2210] px-4 py-3 shadow-[0_4px_0_#6b5322]">
              <span className="flex items-center gap-2 font-[family-name:var(--font-game-title)] text-3xl text-game-coin"><CoinIcon /> {home.coins.available}</span>
              <span className="text-right text-sm font-semibold leading-tight text-game-ink-dim">fichas para dar lances{reserved > 0 ? <><br />({reserved} em lances ativos)</> : null}</span>
            </div>
          </div>
        </div>

        <JourneyButton grid testId="home-learned" tone="orange" img="/jornada/aprendi.png" title="O que aprendi"
          hint={!home.lesson ? 'Esperando o professor registrar a aula' : `Hoje na aula: ${home.lesson.topics.slice(0, 3).join(' · ')}${lessonOpen ? '. Conte para nós!' : ''}`}
          onClick={() => onGo('learned')} disabled={!home.lesson} glow={lessonOpen} className="h-44 w-full" />

        {/* Adicionais */}
        <div className="grid grid-cols-3 gap-5">
          <JourneyButton grid testId="home-live" tone="green" img="/jornada/quiz.png" title="Quiz ao vivo" hint="Entre com o PIN do professor"
            onClick={() => onGo('live')} className="h-40" />
          <JourneyButton grid testId="home-games" tone="blue" emoji="🎮" title="Jogos" hint="Jogue e crie o seu"
            onClick={() => onGo('games')} className="h-40" />
          {home.prize && goal > 0 ? (
            <JourneyButton grid testId="home-prize" tone="rose" emoji="🎁" title={home.prize.title}
              hint={home.points >= goal ? 'Meta alcançada!' : `Faltam ${goal - home.points} pontos (${Math.min(home.points, goal)}/${goal})`}
              onClick={() => onGo('ranking')} className="h-40" />
          ) : (
            <JourneyButton grid testId="home-ranking" tone="rose" emoji="🏆" title="Ranking" hint="Veja sua posição"
              onClick={() => onGo('ranking')} className="h-40" />
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
