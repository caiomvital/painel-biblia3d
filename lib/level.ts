/**
 * Regra única de nível/XP do painel infantil (função pura, sem dependências).
 *
 * Curva crescente: os primeiros níveis saem rápido (a criança vê progresso logo) e cada nível
 * seguinte pede mais XP do que o anterior (o degrau cresce 30 XP a cada nível).
 *   nível 1: 0 XP · nível 2: 10 · nível 3: 50 · nível 4: 120 · nível 5: 220 · nível 6: 350 ...
 * XP total para ENTRAR no nível n: (n - 1) * (15n - 20).
 * Inversa (usada também em SQL): n = floor((35 + sqrt(60 * xp + 25)) / 30).
 */
export interface LevelProgress {
  /** Nível atual (começa em 1). */
  level: number;
  /** XP já acumulado dentro do nível atual. */
  xpIntoLevel: number;
  /** XP que falta para o próximo nível (sempre >= 1). */
  xpToNext: number;
  /** Tamanho do nível atual em XP (da entrada nele até a entrada no próximo). */
  xpForLevel: number;
  /** Fração preenchida da barra, de 0 a 1 (nunca chega a 1). */
  ratio: number;
}

/** XP total necessário para entrar no nível `level` (nível 1 = 0). */
export function xpToReachLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return n === 1 ? 0 : (n - 1) * (15 * n - 20);
}

function safeXp(xp: unknown): number {
  const n = typeof xp === 'number' ? xp : Number(xp);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function levelFromXp(xp: unknown): number {
  const total = safeXp(xp);
  let level = Math.max(1, Math.floor((35 + Math.sqrt(60 * total + 25)) / 30));
  // acerta qualquer erro de arredondamento nas bordas
  while (xpToReachLevel(level + 1) <= total) level++;
  while (level > 1 && xpToReachLevel(level) > total) level--;
  return level;
}

export function levelProgress(xp: unknown): LevelProgress {
  const total = safeXp(xp);
  const level = levelFromXp(total);
  const start = xpToReachLevel(level);
  const end = xpToReachLevel(level + 1);
  const xpIntoLevel = total - start;
  return { level, xpIntoLevel, xpToNext: end - total, xpForLevel: end - start, ratio: xpIntoLevel / (end - start) };
}
