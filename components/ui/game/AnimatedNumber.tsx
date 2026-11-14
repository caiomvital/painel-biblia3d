'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/** Número que "conta" até o novo valor. Com movimento reduzido, troca direto. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduce || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.7,
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => {
        from.current = value;
      },
    });
    return () => {
      from.current = value;
      controls.stop();
    };
  }, [value, reduce]);

  return <span className={className}>{shown.toLocaleString('pt-BR')}</span>;
}
