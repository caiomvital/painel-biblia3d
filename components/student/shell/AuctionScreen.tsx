'use client';

import React from 'react';
import { AuctionSection } from '@/components/auction/AuctionSection';
import type { KidsHomeData } from '../kids-api';

/** Leilão (componente existente, sem mudanças) alimentado com o saldo de /api/kids/home. */
export function AuctionScreen({ home, onRefresh }: { home: KidsHomeData; onRefresh: () => void }) {
  return (
    <AuctionSection
      userRole="ALUNO"
      userName={home.firstName}
      userBalance={home.coins.available}
      coinBalance={home.coins.balance}
      reservedCoins={home.coins.reserved}
      availableCoins={home.coins.available}
      onBidSuccess={() => onRefresh()}
    />
  );
}
