'use client';

import React, { useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Controla o "ver senha" de fora (ex.: dois campos juntos). Sem isso, cada campo cuida do seu. */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
};

/** Campo de senha com o olhinho para ver/esconder o que foi digitado. */
export function PasswordInput({ visible, onVisibleChange, className = '', ...rest }: Props) {
  const [own, setOwn] = useState(false);
  const shown = visible ?? own;
  const toggle = () => { setOwn(!shown); onVisibleChange?.(!shown); };
  // a margem de cima vai para o conjunto, para o olhinho ficar centralizado no campo
  const hasMargin = /(^|\s)mt-1(\s|$)/.test(className);
  const inputClass = className.replace(/(^|\s)mt-1(?=\s|$)/, ' ');
  return (
    <span className={`relative block ${hasMargin ? 'mt-1' : ''}`}>
      <input {...rest} type={shown ? 'text' : 'password'} className={`${inputClass} pr-12`} />
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); toggle(); }}
        aria-label={shown ? 'Esconder a senha' : 'Mostrar a senha'}
        aria-pressed={shown}
        data-testid="password-eye"
        className="absolute inset-y-0 right-1 my-auto flex size-10 items-center justify-center rounded-full opacity-70 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1"
      >
        {shown ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.5 10.5 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10 10 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12A3 3 0 1 1 9.88 9.88" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
