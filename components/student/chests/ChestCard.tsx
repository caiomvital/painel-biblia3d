'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Card, CoinIcon } from '@/components/ui/game';
import { kidsCall } from '../kids-api';
import { ChestOpening } from './ChestOpening';

type Chest = { id: string; label: string; source: string };

/** Baús conquistados e ainda fechados. Não aparece quando não há nenhum. */
export function ChestCard({ refreshKey, onOpened }: { refreshKey: number; onOpened: () => void }) {
  const [chests, setChests] = useState<Chest[]>([]);
  const [opening, setOpening] = useState<Chest | null>(null);

  const load = useCallback(async () => {
    try { setChests((await kidsCall('/api/kids/chests')).chests); } catch { /* o cartão é opcional */ }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load, refreshKey]);

  if (chests.length === 0 && !opening) return null;
  const first = chests[0];
  return (
    <>
      {first && (
        <Card title="Baú conquistado!" tone="highlight" data-testid="home-chest">
          <p className="text-game-ink-dim">
            {chests.length === 1 ? 'Você tem 1 baú para abrir.' : `Você tem ${chests.length} baús para abrir.`} Dentro tem um item para o Lofi!
          </p>
          <Button className="mt-3" icon={<CoinIcon />} onClick={() => setOpening(first)}>Abrir baú</Button>
        </Card>
      )}
      {/* no body: a tela cheia fica acima da barra de abas, sem depender de onde o cartão está */}
      {opening && createPortal(
        <ChestOpening chestId={opening.id} label={opening.label}
          onClose={(opened) => { setOpening(null); if (opened) onOpened(); void load(); }} />,
        document.body,
      )}
    </>
  );
}
