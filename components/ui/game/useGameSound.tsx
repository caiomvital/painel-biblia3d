'use client';

import { useSyncExternalStore } from 'react';
import {
  createSoundEngine,
  readSoundPreference,
  writeSoundPreference,
  type SoundEngine,
  type SoundName,
} from '@/lib/game-sound';
import { Button } from './Button';
import { SoundOffIcon, SoundOnIcon } from './icons';

/*
 * Estado de som fora do React (um único motor por aba), lido com useSyncExternalStore:
 * no servidor e na hidratação vale "desligado"; depois do cliente carregar, vale a preferência salva.
 */
let engine: SoundEngine | null = null;
let enabled: boolean | null = null; // null = ainda não lida do armazenamento
const listeners = new Set<() => void>();

function getEngine(): SoundEngine {
  if (!engine) engine = createSoundEngine(false);
  return engine;
}

function readEnabled(): boolean {
  if (enabled === null) {
    enabled = readSoundPreference();
    getEngine().setEnabled(enabled);
  }
  return enabled;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function setSound(on: boolean) {
  enabled = on;
  getEngine().setEnabled(on);
  writeSoundPreference(on);
  // o clique que liga o som é o gesto que libera o áudio: toca um "toc" de confirmação
  if (on) getEngine().play('tap');
  listeners.forEach((l) => l());
}

interface GameSoundValue {
  enabled: boolean;
  toggle: () => void;
  play: (name: SoundName) => void;
}

const value = {
  toggle: () => setSound(!readEnabled()),
  play: (name: SoundName) => {
    readEnabled();
    getEngine().play(name);
  },
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
