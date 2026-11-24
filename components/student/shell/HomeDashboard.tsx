'use client';

import React from 'react';
import { Card, CoinIcon, GamepadIcon, LiveMascot, MASCOT_NAME, StarIcon, XPBar } from '@/components/ui/game';
import { playSound } from '@/components/ui/game/sound-store';
import { levelProgress } from '@/lib/level';
import type { KidsHomeData } from '../kids-api';
import { AuctionCorner } from './AuctionCorner';
import { JourneyButton } from './JourneyButton';
import type { View } from './views';

const ord = (n: number) => `${n}º`;

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-28 flex-col items-center rounded-game border-2 border-game-line bg-game-bg/60 px-4 py-2 text-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-game-ink-dim">{label}</span>
      <span className="flex items-center gap-1.5 font-[family-name:var(--font-game-title)] text-2xl">{icon}{value}</span>
    </div>
  );
}

/** Tela inicial do computador: um painel com a jornada em destaque e os blocos de apoio ao lado. */
export function HomeDashboard({ home, celebrate, onGo, children }: {
  home: KidsHomeData; celebrate: boolean; onGo: (v: View) => void; children?: React.ReactNode;
}) {
  const lp = levelProgress(home.points);
  const quizPending = home.quiz.available && !home.quiz.completedToday;
  const lessonOpen = !!home.lesson && !home.lesson.done;
  const goal = home.prize?.pointsGoal ?? 0;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]" data-testid="home-dashboard">
      <div className="min-w-0 space-y-5">
        <section className="flex flex-wrap items-center gap-6 rounded-[2rem] border-2 border-game-primary bg-gradient-to-br from-[#4b34b8] via-[#2f2380] to-[#1b1550] p-6 shadow-xl">
          <div className={quizPending ? 'game-bounce' : ''}><LiveMascot bare size={9} cheering={celebrate} label={`${MASCOT_NAME}, o robô`} /></div>
          <div className="min-w-64 flex-1">
            <h1 className="font-[family-name:var(--font-game-title)] text-4xl leading-tight tracking-wide">Olá, {home.firstName}!</h1>
            <p className="mt-1 text-game-ink-dim">
              {quizPending ? `${MASCOT_NAME} está com você! O Desafio de hoje está esperando.` : `${MASCOT_NAME} está com você! O Desafio de hoje já foi feito. Parabéns!`}
            </p>
            <div className="mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-sm font-semibold"><span>Nível {lp.level}</span><span className="text-game-ink-dim">Faltam {lp.xpToNext} pontos para o nível {lp.level + 1}</span></div>
              <XPBar value={lp.xpIntoLevel} max={lp.xpForLevel} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Stat icon={<StarIcon className="text-game-primary" />} label="Pontos" value={home.points} />
            <Stat icon={<CoinIcon className="text-game-coin" />} label="Fichas" value={home.coins.available} />
            <Stat icon={null} label="Na turma" value={home.rankTurma ? ord(home.rankTurma.position) : '—'} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-5">
          <JourneyButton grid testId="home-daily" tone="purple" img="/jornada/desafio.png" title="Desafio"
            hint={!home.quiz.available ? 'Ainda não tem perguntas' : quizPending ? 'Jogue e ganhe fichas!' : 'Feito hoje. Volte amanhã!'}
            onClick={() => onGo('quests')} glow={quizPending} className="h-60" />
          <JourneyButton grid testId="home-live" tone="green" img="/jornada/quiz.png" title="Quiz ao vivo" hint="Entre com o PIN do professor"
            onClick={() => onGo('live')} className="h-60" />
          <JourneyButton grid testId="home-day" tone="blue" img="/jornada/dia.png" title="Dia" hint="O que tem para hoje" onClick={() => onGo('day')} className="h-60" />
          <JourneyButton grid testId="home-learned" tone="orange" img="/jornada/aprendi.png" title="O que aprendi"
            hint={lessonOpen ? 'Novo! Conte para nós' : home.lesson ? 'Você já contou. Muito bem!' : 'Esperando a aula'}
            onClick={() => onGo('learned')} disabled={!home.lesson} glow={lessonOpen} className="h-60" />
        </div>
        {children}
      </div>

      <aside className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
        <Card title="Hoje na aula">
          {home.lesson ? (
            <ul className="space-y-1.5">
              {home.lesson.topics.slice(0, 5).map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-base"><span aria-hidden="true" className={home.lesson!.checked.includes(i) ? 'text-game-success' : 'text-game-ink-dim'}>{home.lesson!.checked.includes(i) ? '✔' : '•'}</span><span>{t}</span></li>
              ))}
            </ul>
          ) : <p className="text-game-ink-dim">O professor ainda não registrou a aula de hoje.</p>}
        </Card>
        <Card title="Minha posição">
          <dl className="space-y-1.5 text-base">
            <div className="flex justify-between"><dt className="text-game-ink-dim">Na turma</dt><dd className="font-semibold">{home.rankTurma ? `${ord(home.rankTurma.position)} de ${home.rankTurma.total}` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-game-ink-dim">Na escola</dt><dd className="font-semibold">{ord(home.rankAcademia.position)} de {home.rankAcademia.total}</dd></div>
            <div className="flex justify-between"><dt className="text-game-ink-dim">Desafio da semana</dt><dd className="font-semibold">{home.weekly.available ? (home.weekly.completedToday ? 'Feito' : 'Esperando você') : 'Sem perguntas'}</dd></div>
          </dl>
        </Card>
        {home.prize && goal > 0 && (
          <Card title="Meta e prêmio" tone="highlight">
            <p className="font-semibold">{home.prize.title}</p>
            {home.prize.description && <p className="text-sm text-game-ink-dim">{home.prize.description}</p>}
            <div className="mt-2"><XPBar value={Math.min(home.points, goal)} max={goal} /></div>
            <p className="mt-1 text-sm text-game-ink-dim">{home.points >= goal ? 'Meta alcançada!' : `Faltam ${goal - home.points} pontos`}</p>
          </Card>
        )}
        <AuctionCorner onOpen={() => onGo('auction')} />
        <button type="button" onClick={() => { playSound('tap'); onGo('games'); }} data-testid="home-games"
          className="game-btn game-press flex min-h-28 flex-col items-center justify-center gap-1 rounded-game-lg border-2 border-game-line bg-game-surface-2 p-3 text-game-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white">
          <span className="text-4xl text-game-primary"><GamepadIcon /></span>
          <span className="font-[family-name:var(--font-game-title)] text-xl tracking-wide">Jogos</span>
          <span className="text-sm text-game-ink-dim">Jogue e crie o seu</span>
        </button>
      </aside>
    </div>
  );
}
