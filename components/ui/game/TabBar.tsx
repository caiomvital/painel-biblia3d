import React from 'react';

export interface TabItem {
  id: string;
  /** No máximo duas palavras. */
  label: string;
  icon: React.ReactNode;
  /** Número no canto (ex.: avisos novos). */
  badge?: number;
}

export interface TabBarProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Navegação inferior com poucas abas grandes: ícone grande + rótulo curto. */
export function TabBar({ items, activeId, onChange, className = '' }: TabBarProps) {
  return (
    <nav
      aria-label="Menu principal"
      className={`fixed inset-x-0 bottom-0 z-30 border-t-2 border-game-line bg-game-surface pb-[env(safe-area-inset-bottom)] ${className}`}
    >
      <ul className="mx-auto flex max-w-3xl">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'relative flex min-h-16 w-full flex-col items-center justify-center gap-0.5 px-1 font-[family-name:var(--font-game-body)] text-xs font-semibold',
                  'focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-white',
                  active ? 'text-game-primary' : 'text-game-ink-dim',
                ].join(' ')}
              >
                {/* marca de "aba ativa" que não depende só de cor: barra acima + ícone maior */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-4 top-0 h-1 rounded-b-full ${active ? 'bg-game-primary' : 'bg-transparent'}`}
                />
                <span className={`text-[1.6rem] leading-none ${active ? 'scale-110' : ''}`}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="absolute right-[22%] top-1.5 min-w-5 rounded-full bg-game-danger px-1 text-center text-[0.65rem] font-bold leading-5 text-white">
                    <span className="sr-only">{item.badge} novos</span>
                    <span aria-hidden="true">{item.badge > 9 ? '9+' : item.badge}</span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
