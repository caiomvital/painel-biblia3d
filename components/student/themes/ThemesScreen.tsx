'use client';
import React from 'react';
import { Button, Card, useGameSound } from '@/components/ui/game';
import { useUserPreferences } from '@/components/layout/UserPreferences';
import { ACHIEVEMENT_SOUNDS, LEVEL_EFFECTS, THEMES, isThemeUnlocked, type ThemeDef } from '@/lib/game-themes';
import { COSMETICS } from '@/lib/cosmetics';
import type { KidsHomeData } from '../kids-api';
import { ThemeScene } from './scenes';

const SECTIONS: { title: string; hint: string; match: (t: ThemeDef) => boolean }[] = [
  { title: 'Temas livres', hint: 'Escolha à vontade.', match: (t) => t.group === 'livre' || t.group === 'lofi' },
  { title: 'Temas bíblicos', hint: 'Histórias da Bíblia no seu painel.', match: (t) => t.group === 'biblico' },
  { title: 'Temas para desbloquear', hint: 'Suba de nível para abrir.', match: (t) => t.group === 'desbloqueavel' },
];

export function ThemesScreen({ home, onBack, onPreviewEffect }: { home: KidsHomeData; onBack: () => void; onPreviewEffect: () => void }) {
  const { preferences, ready, saving, save, error } = useUserPreferences();
  const { play } = useGameSound();
  const apply = (patch: Partial<typeof preferences>) => void save({ ...preferences, ...patch }).catch(() => undefined);

  return (
    <div className="space-y-4" data-testid="themes-screen">
      <Button variant="ghost" onClick={onBack}>← Voltar</Button>
      <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">Meu tema</h1>
      {error && <div role="alert" className="rounded-game border-2 border-game-danger bg-game-surface p-3 font-semibold">{error}</div>}

      {SECTIONS.map((section) => (
        <Card key={section.title} title={section.title}>
          <p className="mb-3 text-game-ink-dim">{section.hint}</p>
          <ul className="grid grid-cols-2 gap-3">
            {THEMES.filter(section.match).map((t) => {
              const unlocked = isThemeUnlocked(t, home.level);
              const active = preferences.theme === t.id;
              return (
                <li key={t.id}>
                  <button type="button" disabled={!ready || saving || !unlocked} aria-pressed={active} data-testid={`theme-${t.id}`}
                    onClick={() => apply({ theme: t.id })}
                    className={`flex w-full flex-col gap-2 rounded-game border-2 p-2 text-left transition-transform active:scale-[0.98] ${active ? 'border-game-primary' : 'border-game-line'} ${unlocked ? '' : 'opacity-60'}`}>
                    <span className="relative block aspect-video overflow-hidden rounded-xl border border-game-line" aria-hidden>
                      <ThemeScene id={t.id} tint={COSMETICS.find((c) => c.code === home.mascotLook.color)?.tint} className="absolute inset-0 h-full w-full" />
                      {!unlocked && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-3xl">🔒</span>}
                    </span>
                    <span className="font-semibold leading-tight">{t.name}</span>
                    <span className="text-sm leading-tight text-game-ink-dim">
                      {unlocked ? (active ? '✔ Em uso' : t.blurb) : `🔒 Abre no nível ${t.unlockLevel} (você está no ${home.level})`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      <Card title="Ao subir de nível">
        <div role="group" aria-label="Efeito ao subir de nível" className="flex flex-wrap gap-2">
          {LEVEL_EFFECTS.map((e) => (
            <Button key={e.id} variant={preferences.levelEffect === e.id ? 'primary' : 'ghost'} aria-pressed={preferences.levelEffect === e.id}
              disabled={!ready || saving} onClick={() => apply({ levelEffect: e.id })}>{e.emoji} {e.name}</Button>
          ))}
        </div>
        <div role="group" aria-label="Som da conquista" className="mt-4 flex flex-wrap gap-2">
          {ACHIEVEMENT_SOUNDS.map((s) => (
            <Button key={s.id} variant={preferences.achievementSound === s.id ? 'primary' : 'ghost'} aria-pressed={preferences.achievementSound === s.id}
              disabled={!ready || saving} onClick={() => { apply({ achievementSound: s.id }); play(s.id === 'classico' ? 'levelUp' : s.id === 'sino' ? 'sino' : 'fanfarra'); }}>🔔 {s.name}</Button>
          ))}
        </div>
        <Button className="mt-4" variant="secondary" onClick={onPreviewEffect}>Ver o efeito agora</Button>
      </Card>
    </div>
  );
}
