'use client';

import React, { useState } from 'react';
import { PanelDialog } from '@/components/layout/PanelDialog';
import { AccountSettings } from '@/components/layout/AccountSettings';
import { useUserPreferences } from '@/components/layout/UserPreferences';
import { textSizes } from '@/lib/panel-preferences';
import { Button, Card, MASCOT_NAME, Mascot, SoundOffIcon, SoundOnIcon, useGameSound } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import type { View } from './views';
import { InstallAppCard } from './InstallAppCard';
import { setDaviGuide, useDaviGuide } from '../guide/useDaviGuide';

const SIZE_LABEL: Record<(typeof textSizes)[number], string> = { normal: 'Normal', large: 'Grande', larger: 'Enorme' };

export function ProfileScreen({ home, onGo, onLogout }: { home: KidsHomeData; onGo: (v: View) => void; onLogout?: () => void }) {
  const { enabled, toggle } = useGameSound();
  const { preferences, ready, saving, save } = useUserPreferences();
  const [account, setAccount] = useState(false);
  const daviOn = useDaviGuide();

  return (
    <div className="space-y-4" data-testid="profile-screen">
      <div className="flex flex-col items-center text-center">
        <Mascot size={7.5} />
        <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide">{home.firstName}</h1>
        <p className="flex max-w-full items-baseline justify-center gap-1 text-game-ink-dim">
            {home.className && <span className="min-w-0 truncate" title={home.className}>{home.className}</span>}
            <span className="shrink-0">{home.className ? '· ' : ''}Nível {home.level}</span>
          </p>
      </div>

      <Card title={`Meu ${MASCOT_NAME}`}>
        <p className="text-game-ink-dim">Troque a cor, o acessório, o fundo e a moldura com os itens que você ganhou.</p>
        <Button className="mt-3" onClick={() => onGo('wardrobe')} data-testid="profile-wardrobe">Personalizar e ver coleção</Button>
      </Card>

      <Card title="Meu tema">
        <p className="text-game-ink-dim">Mude o visual do painel inteiro: cores, cenário, efeitos e som ao subir de nível.</p>
        <Button className="mt-3" onClick={() => onGo('themes')} data-testid="profile-themes">Escolher tema</Button>
      </Card>

      <InstallAppCard />

      <Card title="Ajustes">
        <div className="space-y-4">
          <Button variant="ghost" aria-pressed={enabled} onClick={toggle} icon={enabled ? <SoundOnIcon /> : <SoundOffIcon />}>
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
          <Button variant="ghost" aria-pressed={daviOn} onClick={() => setDaviGuide(!daviOn)} data-testid="profile-davi">
            {daviOn ? 'Davi ligado' : 'Davi desligado'}
          </Button>
          <Button variant="ghost" onClick={() => setAccount(true)}>Minha conta</Button>
        </div>
      </Card>

      {onLogout && <Button variant="danger" onClick={onLogout}>Sair</Button>}

      {account && <PanelDialog title="Minha conta" onClose={() => setAccount(false)}><AccountSettings hideColor /></PanelDialog>}
    </div>
  );
}
