'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { levelFromXp } from '@/lib/level';
import { kidsCall, type KidsHomeData } from './kids-api';

export type PointsGain = { id: number; amount: number; leveledUp: boolean; level: number };

/** Carrega GET /api/kids/home e avisa (onGain) quando os pontos sobem depois de uma ação. */
export function useKidsHome(onGain?: (gain: PointsGain) => void) {
  const [home, setHome] = useState<KidsHomeData | null>(null);
  const [error, setError] = useState('');
  const lastPoints = useRef<number | null>(null);
  const gainRef = useRef(onGain);
  useEffect(() => {
    gainRef.current = onGain;
  });

  const reload = useCallback(async () => {
    try {
      const h: KidsHomeData = await kidsCall('/api/kids/home');
      const before = lastPoints.current;
      lastPoints.current = h.points;
      setHome(h);
      setError('');
      if (before !== null && h.points > before) {
        gainRef.current?.({ id: Date.now(), amount: h.points - before, leveledUp: levelFromXp(h.points) > levelFromXp(before), level: levelFromXp(h.points) });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(reload, 0);
    return () => clearTimeout(t);
  }, [reload]);

  return { home, error, reload };
}
