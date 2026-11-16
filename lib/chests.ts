/**
 * Regras dos baús (função pura, sem banco). O SERVIDOR sorteia; o cliente só mostra o resultado.
 *
 * Fontes (um baú por origem, idempotente pela referência):
 *  - subir de nível: um baú por nível novo (nível 2 em diante);
 *  - sequência de dias seguidos no painel (horário de Recife): 3, 7, 14 e 30 dias;
 *  - atitudes positivas: um baú a cada 5 acumuladas.
 * Baú nunca é comprado com fichas.
 *
 * Tabela de chances (documentada): comum 60%, raro 28%, épico 10%, lendário 2%.
 * Item repetido vira bônus de fichas: comum 3, raro 6, épico 12, lendário 25.
 */
import type { RarityName } from './cosmetics';

export const RARITIES: readonly RarityName[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];
export const RARITY_WEIGHTS: Record<RarityName, number> = { COMMON: 60, RARE: 28, EPIC: 10, LEGENDARY: 2 };
export const DUPLICATE_COINS: Record<RarityName, number> = { COMMON: 3, RARE: 6, EPIC: 12, LEGENDARY: 25 };
export const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 30];
export const ATTITUDES_PER_CHEST = 5;

/** `rand` devolve um número em [0, 1). */
export function pickRarity(rand: () => number): RarityName {
  const total = RARITIES.reduce((s, r) => s + RARITY_WEIGHTS[r], 0);
  let roll = rand() * total;
  for (const r of RARITIES) {
    roll -= RARITY_WEIGHTS[r];
    if (roll < 0) return r;
  }
  return 'COMMON';
}

/** Escolhe um item da raridade sorteada; se não houver nenhum, cai para a mais próxima abaixo e depois acima. */
export function pickItem<T extends { rarity: RarityName }>(items: readonly T[], rarity: RarityName, rand: () => number): T | null {
  if (items.length === 0) return null;
  const idx = RARITIES.indexOf(rarity);
  const order = [...RARITIES.slice(0, idx + 1).reverse(), ...RARITIES.slice(idx + 1)];
  for (const r of order) {
    const pool = items.filter((i) => i.rarity === r);
    if (pool.length) return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  }
  return null;
}

// ---- referências (originReference) ----
export const levelChestRef = (level: number) => `CHEST_LEVEL_${level}`;
export const streakChestRef = (milestone: number, startDay: string) => `CHEST_STREAK_${milestone}_${startDay}`;
export const attitudeChestRef = (n: number) => `CHEST_ATT_${n}`;

export function levelChestRefs(level: number): string[] {
  const out: string[] = [];
  for (let l = 2; l <= level; l++) out.push(levelChestRef(l));
  return out;
}

export function attitudeChestRefs(positiveCount: number): string[] {
  const n = Math.floor(Math.max(0, positiveCount) / ATTITUDES_PER_CHEST);
  return Array.from({ length: n }, (_, i) => attitudeChestRef(i + 1));
}

export type ChestSource = 'LEVEL' | 'STREAK' | 'ATTITUDE';

/** Texto e tipo do baú a partir da referência. Não revela nada além do que é do próprio aluno. */
export function describeChest(ref: string): { source: ChestSource; label: string } {
  const level = /^CHEST_LEVEL_(\d+)$/.exec(ref);
  if (level) return { source: 'LEVEL', label: `Baú do nível ${level[1]}` };
  const streak = /^CHEST_STREAK_(\d+)_/.exec(ref);
  if (streak) return { source: 'STREAK', label: `Baú da sequência de ${streak[1]} dias` };
  return { source: 'ATTITUDE', label: 'Baú de boas atitudes' };
}

// ---- sequência de dias ----
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(day: string, n: number): string {
  if (!DAY.test(day)) throw new Error('Dia inválido.');
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface StreakState {
  current: number;
  max: number;
  lastDay: string | null;
}

/** Atualiza a sequência para `today` (dias no horário de Recife, "AAAA-MM-DD"). */
export function nextStreak(prev: StreakState, today: string): StreakState & { changed: boolean } {
  if (prev.lastDay === today) return { ...prev, changed: false };
  const continues = prev.lastDay !== null && prev.lastDay === addDays(today, -1);
  const current = continues ? prev.current + 1 : 1;
  return { current, max: Math.max(prev.max, current), lastDay: today, changed: true };
}

/** Marco atingido exatamente hoje (3, 7, 14 ou 30), senão null. */
export function milestoneHit(current: number): number | null {
  return STREAK_MILESTONES.includes(current) ? current : null;
}

/** Primeiro dia da sequência atual (identifica a "rodada" para um marco não repetir). */
export function streakStartDay(today: string, current: number): string {
  return addDays(today, -(current - 1));
}
