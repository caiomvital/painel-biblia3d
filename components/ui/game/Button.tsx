import React from 'react';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
type Size = 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Ícone à esquerda do texto. Mantenha o rótulo com no máximo duas palavras. */
  icon?: React.ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-game-primary text-game-ink-on-light border-game-primary-deep',
  secondary: 'bg-game-secondary text-white border-game-secondary-deep',
  success: 'bg-game-success text-game-ink-on-light border-game-success-deep',
  danger: 'bg-game-danger text-white border-game-danger-deep',
  ghost: 'bg-game-surface-2 text-game-ink border-game-line',
};

// alvo de toque mínimo de 3rem (48px no tamanho de texto padrão; cresce com o seletor de texto)
const SIZE: Record<Size, string> = {
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-7 text-lg',
  icon: 'size-12 p-0',
};

/** Botão grande, arredondado e com relevo. O rótulo é o que comunica; a cor só reforça. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        'inline-flex select-none items-center justify-center gap-2 rounded-game border-b-4 font-[family-name:var(--font-game-body)] font-semibold leading-none',
        'transition-transform active:translate-y-0.5 active:border-b-2 motion-reduce:transition-none motion-reduce:active:translate-y-0',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
