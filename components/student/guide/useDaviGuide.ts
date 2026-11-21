'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'b3d-davi-guia';
const EVENT = 'b3d-davi-guia-change';

/** O aluno pode silenciar o Davi. A escolha fica só neste aparelho. */
function read(): boolean {
  try { return window.localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}

export function setDaviGuide(on: boolean) {
  try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* sem armazenamento: vale só até recarregar */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useDaviGuide(): boolean {
  return useSyncExternalStore(subscribe, read, () => true);
}
