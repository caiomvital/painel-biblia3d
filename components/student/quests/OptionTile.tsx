import React from 'react';

/** Opção grande (radio ou checkbox) que cabe bem no dedo. O estado aparece no marcador e na borda. */
export function OptionTile({ type, name, checked, onChange, children }: {
  type: 'radio' | 'checkbox'; name?: string; checked: boolean; onChange: () => void; children: React.ReactNode;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-game border-2 px-4 py-2 text-base font-medium focus-within:outline-3 focus-within:outline-white ${
        checked ? 'border-game-primary bg-game-primary/20 text-game-ink' : 'border-game-line bg-game-surface-2 text-game-ink-dim'
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="size-5 shrink-0 accent-[var(--color-game-primary)]" />
      <span>{children}</span>
    </label>
  );
}
