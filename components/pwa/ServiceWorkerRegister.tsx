'use client';

import { useEffect } from 'react';
import { capturePWAInstallEvents } from './usePWAInstall';

export function ServiceWorkerRegister() {
  useEffect(() => {
    capturePWAInstallEvents(); // guarda o aviso "app instalável" para o botão do aluno, que só aparece no Perfil
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Bíblia 3D Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('Bíblia 3D Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
