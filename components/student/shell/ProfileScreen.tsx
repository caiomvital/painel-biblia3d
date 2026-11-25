'use client';

import React from 'react';
import { Button, Card, MASCOT_NAME, Mascot } from '@/components/ui/game';
import type { KidsHomeData } from '../kids-api';
import type { View } from './views';
import { InstallAppCard } from './InstallAppCard';

export function ProfileScreen({ home, onGo, onLogout }: { home: KidsHomeData; onGo: (v: View) => void; onLogout?: () => void }) {

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

      <InstallAppCard />

      {onLogout && <Button variant="danger" onClick={onLogout}>Sair</Button>}

    </div>
  );
}
