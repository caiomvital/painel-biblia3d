/**
 * Efeitos sonoros gerados com a Web Audio API (nenhum arquivo de áudio).
 * Desligado por padrão: só toca depois que a criança liga o som.
 */
export type SoundName = 'tap' | 'coin' | 'success' | 'levelUp' | 'sino' | 'fanfarra';

/** Notas de cada efeito: [frequência em Hz, duração em segundos, atraso em segundos]. */
const SOUNDS: Record<SoundName, Array<[number, number, number]>> = {
  tap: [[520, 0.06, 0]],
  coin: [[988, 0.07, 0], [1319, 0.18, 0.07]],
  success: [[523, 0.1, 0], [659, 0.1, 0.1], [784, 0.2, 0.2]],
  levelUp: [[523, 0.1, 0], [659, 0.1, 0.1], [784, 0.1, 0.2], [1047, 0.3, 0.3]],
  sino: [[1319, 0.3, 0], [1760, 0.3, 0.16], [2093, 0.5, 0.32]],
  fanfarra: [[523, 0.1, 0], [523, 0.1, 0.12], [523, 0.1, 0.24], [698, 0.32, 0.36], [587, 0.1, 0.72], [784, 0.5, 0.84]],
};

export const SOUND_STORAGE_KEY = 'biblia3d:sound';

export function readSoundPreference(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeSoundPreference(on: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* sem armazenamento: a preferência vale só nesta visita */
  }
}

type AudioContextCtor = typeof AudioContext;

export interface SoundEngine {
  play(name: SoundName): void;
  setEnabled(on: boolean): void;
  isEnabled(): boolean;
}

/** Cria o motor de som. O AudioContext só nasce no primeiro play (precisa de gesto do usuário). */
export function createSoundEngine(initialEnabled = false): SoundEngine {
  let enabled = initialEnabled;
  let ctx: AudioContext | null = null;

  function getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (ctx) return ctx;
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  return {
    isEnabled: () => enabled,
    setEnabled(on) {
      enabled = on;
    },
    play(name) {
      if (!enabled) return;
      const audio = getContext();
      if (!audio) return;
      if (audio.state === 'suspended') void audio.resume().catch(() => undefined);
      const start = audio.currentTime;
      for (const [freq, duration, delay] of SOUNDS[name]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t0 = start + delay;
        // volume baixo e envelope curto para não assustar nem estalar
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(gain).connect(audio.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
      }
    },
  };
}
