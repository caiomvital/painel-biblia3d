import {
  createSoundEngine,
  readSoundPreference,
  writeSoundPreference,
  type SoundEngine,
  type SoundName,
} from '@/lib/game-sound';

/*
 * Estado de som fora do React (um único motor por aba). No servidor e na hidratação vale "desligado";
 * depois do cliente carregar, vale a preferência salva. Fica separado do hook para que o Button
 * possa tocar o "toc" do clique sem importar o hook (que importa o Button).
 */
let engine: SoundEngine | null = null;
let enabled: boolean | null = null; // null = ainda não lida do armazenamento
const listeners = new Set<() => void>();

function getEngine(): SoundEngine {
  if (!engine) engine = createSoundEngine(false);
  return engine;
}

export function readEnabled(): boolean {
  if (enabled === null) {
    enabled = readSoundPreference();
    getEngine().setEnabled(enabled);
  }
  return enabled;
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setSound(on: boolean) {
  enabled = on;
  getEngine().setEnabled(on);
  writeSoundPreference(on);
  // o clique que liga o som é o gesto que libera o áudio: toca um "toc" de confirmação
  if (on) getEngine().play('tap');
  listeners.forEach((l) => l());
}

export function playSound(name: SoundName) {
  readEnabled();
  getEngine().play(name);
}
