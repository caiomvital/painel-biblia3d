'use client';

import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/*
 * O navegador avisa "este app é instalável" (beforeinstallprompt) UMA vez, logo que a página abre. Quem só começa a
 * ouvir depois (ex.: o cartão do Perfil do aluno) perderia o aviso. Por isso o aviso é capturado na abertura do site
 * (capturePWAInstallEvents, chamada pelo ServiceWorkerRegister do layout) e guardado aqui até alguém precisar.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let captured = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function capturePWAInstallEvents() {
  if (captured || typeof window === 'undefined') return;
  captured = true;
  installed = isStandalone();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
  notify();
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function usePWAInstall() {
  // Garante a captura mesmo se o hook for usado antes do layout registrar (idempotente).
  if (typeof window !== 'undefined') capturePWAInstallEvents();
  const isInstallable = useSyncExternalStore(subscribe, () => !!deferredPrompt, () => false);
  const isInstalled = useSyncExternalStore(subscribe, () => installed, () => false);
  const isIOS = useSyncExternalStore(subscribe, () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()), () => false);

  const install = async () => {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      installed = true;
      deferredPrompt = null;
      notify();
      return true;
    }
    return false;
  };

  return { isInstallable, isInstalled, isIOS, install };
}
