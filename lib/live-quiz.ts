/**
 * Regras do quiz ao vivo (funções puras, sem banco).
 * Pontos só valem no placar da sala: não geram XP nem fichas.
 */
export const LIVE_MIN_QUESTIONS = 3;
export const LIVE_MAX_QUESTIONS = 20;
export const LIVE_SECONDS_MIN = 10;
export const LIVE_SECONDS_MAX = 60;
export const LIVE_SECONDS_DEFAULT = 20;
export const LIVE_MAX_POINTS = 1000;
export const LIVE_TEAM_NAME_MAX = 30;

/** PIN de 6 dígitos (sem zero à esquerda para não se perder ao digitar). `rand` devolve [0, 1). */
export function generatePin(rand: () => number): string {
  return String(100000 + Math.floor(rand() * 900000));
}

export const isPin = (v: unknown): v is string => typeof v === 'string' && /^\d{6}$/.test(v);

/** Acertou: de 1000 (instante) a 500 (no último segundo). Errou ou fora do tempo: 0. */
export function livePoints(correct: boolean, elapsedMs: number, limitMs: number): number {
  if (!correct || elapsedMs < 0 || elapsedMs > limitMs || limitMs <= 0) return 0;
  return Math.round(LIVE_MAX_POINTS * (1 - elapsedMs / limitMs / 2));
}

export type LiveStatus = 'LOBBY' | 'QUESTION' | 'REVEAL' | 'FINISHED';
export type LivePhase = 'LOBBY' | 'OPEN' | 'CLOSED' | 'FINISHED';

/** A pergunta está aberta enquanto o estado é QUESTION e o tempo não acabou; passou do tempo = fechada (mostra o resultado). */
export function livePhase(status: LiveStatus, startedAt: Date | null, seconds: number, now: Date): LivePhase {
  if (status === 'LOBBY') return 'LOBBY';
  if (status === 'FINISHED') return 'FINISHED';
  if (status === 'REVEAL') return 'CLOSED';
  if (!startedAt) return 'CLOSED';
  return now.getTime() - startedAt.getTime() < seconds * 1000 ? 'OPEN' : 'CLOSED';
}

export const secondsLeft = (startedAt: Date, seconds: number, now: Date) =>
  Math.max(0, Math.ceil((seconds * 1000 - (now.getTime() - startedAt.getTime())) / 1000));

export function cleanTeamName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  if (!name) throw new Error('Dê um nome para a equipe.');
  if (name.length > LIVE_TEAM_NAME_MAX) throw new Error(`O nome da equipe pode ter até ${LIVE_TEAM_NAME_MAX} letras.`);
  return name;
}

export interface TeamRow { id: string; name: string; memberCount: number; points: number; answeredNow: number; correctCount: number; rank: number }

/**
 * Ranking por equipe: pontos da equipe = média dos pontos dos integrantes (equipe maior não leva vantagem).
 * Solo é uma equipe de uma pessoa. Empate divide a mesma posição.
 */
export function rankTeams(
  teams: ReadonlyArray<{ id: string; name: string }>,
  players: ReadonlyArray<{ id: string; teamId: string | null }>,
  answers: ReadonlyArray<{ playerId: string; points: number; correct: boolean; questionIndex: number }>,
  currentIndex: number,
): TeamRow[] {
  const teamOf = new Map(players.map((p) => [p.id, p.teamId]));
  const rows = teams.map((t) => {
    const members = players.filter((p) => p.teamId === t.id);
    const mine = answers.filter((a) => teamOf.get(a.playerId) === t.id);
    const total = mine.reduce((s, a) => s + a.points, 0);
    return {
      id: t.id, name: t.name, memberCount: members.length,
      points: members.length ? Math.round(total / members.length) : 0,
      answeredNow: mine.filter((a) => a.questionIndex === currentIndex).length,
      correctCount: mine.filter((a) => a.correct).length,
      rank: 0,
    };
  }).filter((r) => r.memberCount > 0);
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'pt-BR'));
  rows.forEach((r, i) => { r.rank = i > 0 && r.points === rows[i - 1].points ? rows[i - 1].rank : i + 1; });
  return rows;
}
