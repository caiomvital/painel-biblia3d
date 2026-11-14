import React from 'react';

type Tone = 'default' | 'highlight' | 'success';

const TONE: Record<Tone, string> = {
  default: 'bg-game-surface border-game-line',
  highlight: 'bg-game-surface-2 border-game-primary',
  success: 'bg-game-surface-2 border-game-success',
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  tone?: Tone;
  /** Título curto (use no máximo duas palavras). */
  title?: string;
  as?: 'section' | 'div' | 'article';
}

export function Card({ tone = 'default', title, as: Tag = 'section', className = '', children, ...rest }: CardProps) {
  return (
    <Tag
      className={`rounded-game-lg border-2 border-b-4 p-4 text-game-ink ${TONE[tone]} ${className}`}
      {...rest}
    >
      {title && <h2 className="mb-2 font-[family-name:var(--font-game-title)] text-xl tracking-wide">{title}</h2>}
      {children}
    </Tag>
  );
}
