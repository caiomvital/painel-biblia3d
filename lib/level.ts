/**
 * Regra única de nível/XP do painel infantil (função pura, sem dependências).
 *
 * Espelha a regra já usada no servidor: nível = floor(pontos / 300) + 1.
 * Centralizar as outras ocorrências do "/ 300" no servidor fica para outra rodada.
 */
export const XP_PER_LEVEL = 300;

export interface LevelProgress {
  /** Nível atual (começa em 1). */
  level: number;
  /** Pontos já acumulados dentro do nível atual (0 até XP_PER_LEVEL - 1). */
  xpIntoLevel: number;
  /** Pontos que faltam para o próximo nível (1 até XP_PER_LEVEL). */
  xpToNext: number;
  /** Tamanho de cada nível em pontos. */
  xpForLevel: number;
  /** Fração preenchida da barra, de 0 a 1 (nunca chega a 1). */
  ratio: number;
}

function safeXp(xp: unknown): number {
  const n = typeof xp === 'number' ? xp : Number(xp);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function levelFromXp(xp: unknown): number {
  return Math.floor(safeXp(xp) / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: unknown): LevelProgress {
  const total = safeXp(xp);
  const xpIntoLevel = total % XP_PER_LEVEL;
  return {
    level: Math.floor(total / XP_PER_LEVEL) + 1,
    xpIntoLevel,
    xpToNext: XP_PER_LEVEL - xpIntoLevel,
    xpForLevel: XP_PER_LEVEL,
    ratio: xpIntoLevel / XP_PER_LEVEL,
  };
}
