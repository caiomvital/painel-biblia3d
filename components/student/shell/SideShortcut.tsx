import React from 'react';

/** Atalho redondo e grande com rótulo curto embaixo (usado nas laterais da tela inicial). */
export function SideShortcut({ label, icon, onClick, badge }: { label: string; icon: React.ReactNode; onClick: () => void; badge?: number }) {
  return (
    <button type="button" onClick={onClick}
      className="relative flex w-[4.5rem] flex-col items-center gap-1 rounded-game p-1 font-[family-name:var(--font-game-body)] text-xs font-semibold text-game-ink focus-visible:outline-3 focus-visible:outline-white">
      <span className="flex size-14 items-center justify-center rounded-full border-b-4 border-game-line bg-game-surface-2 text-[1.7rem] text-game-primary">{icon}</span>
      <span>{label}</span>
      {badge ? (
        <span className="absolute right-1 top-0 min-w-5 rounded-full bg-game-danger px-1 text-center text-[0.65rem] font-bold leading-5 text-white">
          <span className="sr-only">{badge} novos</span><span aria-hidden="true">{badge > 9 ? '9+' : badge}</span>
        </span>
      ) : null}
    </button>
  );
}
