'use client';

import React, { useEffect, useRef } from 'react';
import { Button, TrophyIcon, BellIcon, CalendarIcon, SoundOffIcon, SoundOnIcon, useGameSound } from '@/components/ui/game';
import { useUserPreferences } from '@/components/layout/UserPreferences';
import { textSizes } from '@/lib/panel-preferences';
import { setDaviGuide, useDaviGuide } from '../guide/useDaviGuide';
import type { KidsHomeData } from '../kids-api';
import type { View } from './views';

const ord = (n: number) => `${n}º`;
const SIZE_LABEL: Record<(typeof textSizes)[number], string> = { normal: 'Normal', large: 'Grande', larger: 'Enorme' };

/** Menu de três pontinhos: os dados do aluno e os atalhos que saíram da tela inicial. */
export function MyDataSheet({ home, unread, onGo, onOpenNotices, onOpenAccount, onLogout, onClose }: {
  home: KidsHomeData; unread: number; onGo: (v: View) => void; onOpenNotices: () => void; onOpenAccount: () => void; onLogout?: () => void; onClose: () => void;
}) {
  const { enabled, toggle } = useGameSound();
  const { preferences, ready, saving, save } = useUserPreferences();
  const daviOn = useDaviGuide();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  const go = (v: View) => { onClose(); onGo(v); };
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-game-line py-2 last:border-0"><dt className="text-game-ink-dim">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>
  );
  return (
    <dialog ref={ref} aria-label="Menu" onCancel={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} data-testid="my-data-sheet"
      className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-game-lg border-2 border-b-4 border-game-line bg-game-surface p-0 text-game-ink shadow-2xl backdrop:bg-black/70">
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-game-title)] text-2xl tracking-wide">Menu</h2>
          <Button variant="ghost" onClick={onClose} autoFocus>Fechar</Button>
        </div>
        <Button variant="ghost" className="mt-4 w-full" onClick={() => go('profile')} data-testid="sheet-profile">Perfil</Button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="ghost" className="flex-col gap-1 py-2" onClick={() => go('events')} data-testid="sheet-events"><CalendarIcon />Eventos</Button>
          <Button variant="ghost" className="flex-col gap-1 py-2" onClick={() => go('ranking')}><TrophyIcon />Ranking</Button>
          <Button variant="ghost" className="relative flex-col gap-1 py-2" onClick={() => { onClose(); onOpenNotices(); }}><BellIcon />Avisos{unread ? <span className="absolute right-1 top-1 min-w-5 rounded-full bg-game-danger px-1 text-xs font-bold leading-5 text-white">{unread > 9 ? '9+' : unread}</span> : null}</Button>
        </div>
        {/* Tudo o que é configuração fica aqui, nos três pontinhos. */}
        <section aria-label="Ajustes" className="mt-4 space-y-3 border-t-2 border-game-line pt-3" data-testid="sheet-settings">
          <h3 className="font-[family-name:var(--font-game-title)] text-xl tracking-wide">Ajustes</h3>
          <Button variant="ghost" className="w-full" aria-pressed={enabled} onClick={toggle} icon={enabled ? <SoundOnIcon /> : <SoundOffIcon />}>
            {enabled ? 'Som ligado' : 'Som desligado'}
          </Button>
          <div role="group" aria-label="Tamanho do texto">
            <p className="mb-2 font-semibold">Tamanho do texto</p>
            <div className="flex flex-wrap gap-2">
              {textSizes.map((size) => (
                <Button key={size} variant={preferences.textSize === size ? 'primary' : 'ghost'} aria-pressed={preferences.textSize === size}
                  disabled={!ready || saving} onClick={() => void save({ ...preferences, textSize: size }).catch(() => undefined)}>
                  {SIZE_LABEL[size]}
                </Button>
              ))}
            </div>
          </div>
          <Button variant="ghost" className="w-full" aria-pressed={daviOn} onClick={() => setDaviGuide(!daviOn)} data-testid="profile-davi">
            {daviOn ? 'Davi ligado' : 'Davi desligado'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => go('themes')} data-testid="profile-themes">Escolher tema</Button>
          <Button variant="ghost" className="w-full" onClick={() => { onClose(); onOpenAccount(); }}>Minha conta</Button>
        </section>
        <h3 className="mt-4 border-t-2 border-game-line pt-3 font-[family-name:var(--font-game-title)] text-xl tracking-wide">Meus dados</h3>
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
        {onLogout && <Button variant="danger" className="mt-4 w-full" onClick={() => { onClose(); onLogout(); }} data-testid="sheet-logout">Sair</Button>}
      </div>
    </dialog>
  );
}
