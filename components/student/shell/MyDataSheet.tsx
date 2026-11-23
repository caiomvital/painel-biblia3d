'use client';

import React, { useEffect, useRef } from 'react';
import { Button, TrophyIcon, BellIcon } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import type { View } from './views';

const ord = (n: number) => `${n}º`;

/** Menu de três pontinhos: os dados do aluno e os atalhos que saíram da tela inicial. */
export function MyDataSheet({ home, unread, onGo, onOpenNotices, onLogout, onClose }: {
  home: KidsHomeData; unread: number; onGo: (v: View) => void; onOpenNotices: () => void; onLogout?: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  const go = (v: View) => { onClose(); onGo(v); };
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-game-line py-2 last:border-0"><dt className="text-game-ink-dim">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>
  );
  return (
    <dialog ref={ref} aria-label="Meus dados" onCancel={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} data-testid="my-data-sheet"
      className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-0 text-game-ink shadow-2xl backdrop:bg-black/70">
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-game-title)] text-2xl tracking-wide">Meus dados</h2>
          <Button variant="ghost" onClick={onClose} autoFocus>Fechar</Button>
        </div>
        <dl>
          {row('Nome', home.firstName)}
          {row('Turma', home.className ?? 'Sem turma')}
          {row('Nível', home.level)}
          {row('Pontos', home.points)}
          {row('Fichas', home.coins.available)}
          {row('Na turma', home.rankTurma ? `${ord(home.rankTurma.position)} de ${home.rankTurma.total}` : '—')}
          {row('Na escola', `${ord(home.rankAcademia.position)} de ${home.rankAcademia.total}`)}
          {home.guardianName && row('Responsável', home.guardianName)}
        </dl>
        <Button variant="ghost" className="mt-4 w-full" onClick={() => go('profile')} data-testid="sheet-profile">Perfil e ajustes</Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="ghost" className="flex-col gap-1 py-2" onClick={() => go('ranking')}><TrophyIcon />Ranking</Button>
          <Button variant="ghost" className="relative flex-col gap-1 py-2" onClick={() => { onClose(); onOpenNotices(); }}><BellIcon />Avisos{unread ? <span className="absolute right-1 top-1 min-w-5 rounded-full bg-game-danger px-1 text-xs font-bold leading-5 text-white">{unread > 9 ? '9+' : unread}</span> : null}</Button>
        </div>
        {onLogout && <Button variant="danger" className="mt-4 w-full" onClick={() => { onClose(); onLogout(); }} data-testid="sheet-logout">Sair</Button>}
      </div>
    </dialog>
  );
}
