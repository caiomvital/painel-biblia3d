'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui/game';
import { usePWAInstall } from '@/components/pwa/usePWAInstall';

/** "Instalar o app" para o aluno: no Android/computador abre o aviso do navegador; no iPhone mostra o passo a passo. */
export function InstallAppCard() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [guide, setGuide] = useState(false);
  if (isInstalled || (!isInstallable && !isIOS)) return null;

  return (
    <Card title="Instalar o app" data-testid="install-app">
      <p className="text-game-ink-dim">Coloque o Bíblia 3D na tela inicial do celular e abra com um toque, como um aplicativo.</p>
      {isInstallable ? (
        <Button className="mt-3" onClick={() => void install()} data-testid="install-app-button">Instalar agora</Button>
      ) : (
        <>
          <Button className="mt-3" variant="secondary" aria-expanded={guide} onClick={() => setGuide((v) => !v)}>Como instalar</Button>
          {guide && (
            <ol className="mt-3 list-decimal space-y-1 pl-6">
              <li>Toque no botão <strong>Compartilhar</strong> do Safari.</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
            </ol>
          )}
        </>
      )}
    </Card>
  );
}
