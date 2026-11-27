'use client';

import React from 'react';

/**
 * Rodapé discreto do painel do aluno. Parece só um carimbo da escola, mas esconde um easter egg:
 * ao tocar, abre a comemoração do nível atual (ver LevelCelebration em StudentView).
 */
export function EasterFooter({ onOpen }: { onOpen: () => void }) {
  return (
    <footer className="pt-6 text-center">
      <button
        type="button"
        onClick={onOpen}
        data-testid="easter-footer"
        className="rounded-full px-3 py-2 text-xs font-semibold text-game-ink-dim/70 hover:text-game-ink-dim focus-visible:outline-2 focus-visible:outline-white"
      >
        Bíblia 3D · Fuctura Tecnologia
      </button>
    </footer>
  );
}
