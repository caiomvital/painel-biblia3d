'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** Nome do mascote (escolhido pelo Caio em 2026-11-14). */
export const MASCOT_NAME = 'Lofi';

export type MascotPose = 'idle' | 'blink' | 'cheer';

/*
 * Robô original desenhado em SVG (sem imagens externas).
 * Cabeça de cantos redondos em laranja, visor roxo-escuro com olhos azul-céu,
 * orelhas redondas violeta, antena com estrela dourada e um livrinho no peito.
 */
const C = {
  head: '#ff9f43',
  headShade: '#d9731a',
  ear: '#7b5cff',
  visor: '#2b2250',
  eye: '#5ad1ff',
  eyeShine: '#e8f9ff',
  blush: '#ff8fa3',
  body: '#6a4de6',
  bodyShade: '#4a31b8',
  limb: '#5a3fd1',
  gold: '#ffd23f',
  goldShade: '#c99a00',
  mouth: '#ff8fa3',
};

export interface MascotProps {
  pose?: MascotPose;
  /** Largura em rem (a altura acompanha). */
  size?: number;
  className?: string;
  /** Texto para leitores de tela. Vazio = decorativo. */
  label?: string;
}

function Eyes({ pose }: { pose: MascotPose }) {
  if (pose === 'blink') {
    return (
      <g stroke={C.eye} strokeWidth={5} strokeLinecap="round" fill="none">
        <path d="M71 86h18" />
        <path d="M111 86h18" />
      </g>
    );
  }
  if (pose === 'cheer') {
    return (
      <g stroke={C.eye} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M71 90q9-16 18 0" />
        <path d="M111 90q9-16 18 0" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="80" cy="84" rx="9.5" ry="12" fill={C.eye} />
      <ellipse cx="120" cy="84" rx="9.5" ry="12" fill={C.eye} />
      <circle cx="83.5" cy="79.5" r="3.4" fill={C.eyeShine} />
      <circle cx="123.5" cy="79.5" r="3.4" fill={C.eyeShine} />
    </g>
  );
}

/** Robô parado, piscando ou comemorando. Componente só de desenho (sem animação própria). */
export function Mascot({ pose = 'idle', size = 10, className, label = '' }: MascotProps) {
  const cheer = pose === 'cheer';
  const decorative = label === '';
  return (
    <svg
      viewBox="0 0 200 220"
      width={`${size}rem`}
      height={`${size * 1.1}rem`}
      className={className}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      <g transform={cheer ? 'translate(0 -6)' : undefined}>
        {/* antena */}
        <path d="M100 40V22" stroke={C.limb} strokeWidth={5} strokeLinecap="round" />
        <path
          d="m100 4 3.8 7.7 8.5 1.2-6.2 6 1.5 8.4-7.6-4-7.6 4 1.5-8.4-6.2-6 8.5-1.2L100 4Z"
          fill={C.gold}
          stroke={C.goldShade}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* pernas */}
        <rect x="76" y="190" width="20" height="18" rx="8" fill={C.limb} />
        <rect x="104" y="190" width="20" height="18" rx="8" fill={C.limb} />

        {/* braços (atrás do corpo) */}
        {cheer ? (
          <g stroke={C.limb} strokeWidth={14} strokeLinecap="round">
            <path d="M66 150 42 114" />
            <path d="M134 150 158 114" />
          </g>
        ) : (
          <g stroke={C.limb} strokeWidth={14} strokeLinecap="round">
            <path d="M66 150 48 178" />
            <path d="M134 150 152 178" />
          </g>
        )}
        {cheer ? (
          <g fill={C.gold} stroke={C.goldShade} strokeWidth={2}>
            <circle cx="40" cy="110" r="9" />
            <circle cx="160" cy="110" r="9" />
          </g>
        ) : (
          <g fill={C.gold} stroke={C.goldShade} strokeWidth={2}>
            <circle cx="47" cy="180" r="8" />
            <circle cx="153" cy="180" r="8" />
          </g>
        )}

        {/* corpo */}
        <rect x="64" y="134" width="72" height="62" rx="26" fill={C.bodyShade} />
        <rect x="64" y="130" width="72" height="62" rx="26" fill={C.body} />
        {/* livrinho no peito */}
        <circle cx="100" cy="160" r="17" fill={C.gold} stroke={C.goldShade} strokeWidth={2.5} />
        <path d="M100 152v16M88 154c5-2 9-1 12 2 3-3 7-4 12-2v13c-5-2-9-1-12 2-3-3-7-4-12-2v-13Z" fill="none" stroke={C.goldShade} strokeWidth={2.2} strokeLinejoin="round" />

        {/* orelhas */}
        <circle cx="36" cy="84" r="13" fill={C.ear} />
        <circle cx="164" cy="84" r="13" fill={C.ear} />

        {/* cabeça */}
        <rect x="40" y="44" width="120" height="90" rx="38" fill={C.headShade} />
        <rect x="40" y="40" width="120" height="90" rx="38" fill={C.head} />
        {/* visor */}
        <rect x="54" y="56" width="92" height="58" rx="26" fill={C.visor} />

        <Eyes pose={pose} />

        {/* bochechas */}
        <circle cx="66" cy="100" r="5" fill={C.blush} opacity={0.55} />
        <circle cx="134" cy="100" r="5" fill={C.blush} opacity={0.55} />

        {/* boca */}
        {cheer ? (
          <path d="M89 99q11 17 22 0Z" fill={C.mouth} stroke={C.mouth} strokeWidth={2} strokeLinejoin="round" />
        ) : (
          <path d="M91 101q9 7 18 0" stroke={C.mouth} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        )}

        {/* brilhos da comemoração */}
        {cheer && (
          <g fill={C.gold}>
            <path d="m22 36 2.6 5.4 5.4 2.6-5.4 2.6L22 52l-2.6-5.4-5.4-2.6 5.4-2.6L22 36Z" />
            <path d="m178 52 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" />
            <path d="m174 14 1.6 3.4 3.4 1.6-3.4 1.6L174 24l-1.6-3.4-3.4-1.6 3.4-1.6L174 14Z" />
          </g>
        )}
      </g>
    </svg>
  );
}

export interface LiveMascotProps extends Omit<MascotProps, 'pose'> {
  /** Quando true, comemora; quando volta a false, volta a ficar parado. */
  cheering?: boolean;
}

/**
 * Mascote com vida: flutua devagar e pisca de vez em quando.
 * Com movimento reduzido ele fica parado (só troca de pose quando comemora).
 */
export function LiveMascot({ cheering = false, ...props }: LiveMascotProps) {
  const reduce = useReducedMotion();
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduce || cheering) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, 2200 + Math.random() * 2600);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduce, cheering]);

  const pose: MascotPose = cheering ? 'cheer' : blink ? 'blink' : 'idle';

  return (
    <motion.div
      className="inline-block"
      animate={reduce ? undefined : cheering ? { y: [0, -14, 0] } : { y: [0, -6, 0] }}
      transition={reduce ? undefined : cheering ? { duration: 0.5, repeat: 3 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Mascot pose={pose} {...props} />
    </motion.div>
  );
}
