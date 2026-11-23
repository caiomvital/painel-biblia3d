'use client';

import { useSyncExternalStore } from 'react';
import type { SoundName } from '@/lib/game-sound';
import { Button } from './Button';
import { SoundOffIcon, SoundOnIcon } from './icons';
import { playSound, readEnabled, setSound, subscribe } from './sound-store';

interface GameSoundValue {
  enabled: boolean;
  toggle: () => void;
  play: (name: SoundName) => void;
}

const value = {
  toggle: () => setSound(!readEnabled()),
  play: (name: SoundName) => playSound(name),
};

export function useGameSound(): GameSoundValue {
  const on = useSyncExternalStore(subscribe, readEnabled, () => false);
  return { enabled: on, ...value };
}

/** Botão de ligar/mutar o som. O estado aparece no ícone e no rótulo (não só na cor). */
export function SoundToggle({ className }: { className?: string }) {
  const { enabled, toggle } = useGameSound();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Desligar som' : 'Ligar som'}
      title={enabled ? 'Som ligado' : 'Som desligado'}
      className={className}
    >
      {enabled ? <SoundOnIcon /> : <SoundOffIcon />}
    </Button>
  );
}
