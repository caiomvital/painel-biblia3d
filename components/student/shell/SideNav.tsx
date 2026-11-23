'use client';

import React from 'react';
import { BellIcon, CalendarIcon, GamepadIcon, GavelIcon, HomeIcon, StarIcon, TargetIcon, TrophyIcon, UserIcon } from '@/components/ui/game';
import { playSound } from '@/components/ui/game/sound-store';
import type { View } from './views';

const ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Início', icon: <HomeIcon /> },
  { id: 'quests', label: 'Desafios', icon: <TargetIcon /> },
  { id: 'live', label: 'Quiz ao vivo', icon: <StarIcon /> },
  { id: 'auction', label: 'Leilão', icon: <GavelIcon /> },
  { id: 'games', label: 'Jogos', icon: <GamepadIcon /> },
  { id: 'events', label: 'Eventos', icon: <CalendarIcon /> },
  { id: 'ranking', label: 'Ranking', icon: <TrophyIcon /> },
  { id: 'profile', label: 'Perfil', icon: <UserIcon /> },
];

/** Menu lateral do computador (a barra de baixo é só do celular). */
export function SideNav({ active, onChange, unread, onNotices, onLogout }: {
  active: View; onChange: (v: View) => void; unread: number; onNotices: () => void; onLogout?: () => void;
}) {
  const btn = 'game-press relative flex w-full items-center gap-3 rounded-game px-4 py-3 text-left text-lg font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white';
  return (
    <nav aria-label="Menu principal" data-testid="side-nav"
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-2 border-game-line bg-game-surface px-3 py-4 lg:flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-biblia3d-branca.png" alt="Bíblia 3D" draggable={false} className="mx-auto mb-5 h-10 w-auto" />
      <ul className="space-y-1.5">
        {ITEMS.map((it) => {
          const on = it.id === active;
          return (
            <li key={it.id}>
              <button type="button" aria-current={on ? 'page' : undefined} data-testid={`nav-${it.id}`}
                onClick={() => { playSound('tap'); onChange(it.id); }}
                className={`${btn} ${on ? 'bg-game-primary text-game-ink-on-light shadow-[0_3px_0_var(--color-game-primary-deep)]' : 'text-game-ink hover:bg-game-surface-2'}`}>
                <span className="text-2xl leading-none">{it.icon}</span>{it.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto space-y-1.5 border-t-2 border-game-line pt-3">
        <button type="button" onClick={() => { playSound('tap'); onNotices(); }} className={`${btn} text-game-ink hover:bg-game-surface-2`}>
          <span className="text-2xl leading-none"><BellIcon /></span>Avisos
          {unread ? <span className="ml-auto min-w-6 rounded-full bg-game-danger px-1.5 text-center text-sm font-bold leading-6 text-white">{unread > 9 ? '9+' : unread}</span> : null}
        </button>
        {onLogout && <button type="button" onClick={onLogout} data-testid="nav-logout" className={`${btn} text-game-danger hover:bg-game-surface-2`}>Sair</button>}
      </div>
    </nav>
  );
}
