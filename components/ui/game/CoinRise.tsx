import React from 'react';
import { CoinIcon } from './icons';

/** Moedinhas que sobem e somem (efeito de pontuar). Posicione dentro de um elemento `relative`. Some com movimento reduzido. */
export function CoinRise({ count = 5, delay = 0 }: { count?: number; delay?: number }) {
  return (
    <span aria-hidden="true" data-testid="coin-rise" className="pointer-events-none absolute inset-y-0 right-3 w-16 motion-reduce:hidden">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="absolute bottom-1 text-game-coin" style={{ left: `${i * 11}px`, opacity: 0, animation: `b3d-rise 1.1s ${delay + i * 0.09}s ease-out forwards` }}>
          <CoinIcon width="1.15em" height="1.15em" />
        </span>
      ))}
    </span>
  );
}
