/**
 * Atitudes da Fase 3: catálogo, valores e limites. Tudo aqui é regra do SERVIDOR (o cliente só exibe).
 * Função pura, sem banco: a parte que depende do banco fica em lib/attitude-service.ts.
 * "Ponto de atenção" é só um registro privado do professor: não tira XP, nível, fichas nem itens.
 */
export type AttitudeKindName = 'POSITIVE' | 'ATTENTION';

export interface AttitudeDef {
  code: string;
  label: string;
  kind: AttitudeKindName;
  xp: number;
  coins: number;
}

export const ATTITUDES: readonly AttitudeDef[] = [
  { code: 'HELPED', label: 'Ajudou um colega', kind: 'POSITIVE', xp: 10, coins: 10 },
  { code: 'PARTICIPATED', label: 'Participou', kind: 'POSITIVE', xp: 5, coins: 5 },
  { code: 'CAPRICHOU', label: 'Caprichou', kind: 'POSITIVE', xp: 10, coins: 10 },
  { code: 'BROUGHT_TASK', label: 'Trouxe a tarefa', kind: 'POSITIVE', xp: 5, coins: 5 },
  { code: 'ATTENTION', label: 'Ponto de atenção', kind: 'ATTENTION', xp: 0, coins: 0 },
];

export const LIMITS = {
  /** Atitudes positivas que um aluno pode receber por dia (somando todos os professores). */
  positivePerStudentPerDay: 3,
  /** Registros (positivos + atenção) que um professor/diretor faz por dia. */
  perActorPerDay: 40,
  /** Alunos por registro (vários de uma vez). */
  maxStudentsPerRequest: 40,
  noteMax: 200,
} as const;

export function attitudeByCode(code: unknown): AttitudeDef | null {
  return ATTITUDES.find((a) => a.code === code) ?? null;
}

/** O id vem do aparelho (um por aluno e por toque); só aceitamos um formato seguro. */
export function isValidAttitudeId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(id);
}

export type LimitCheck =
  | { ok: true }
  | { ok: false; reason: 'STUDENT_DAY' | 'ACTOR_DAY'; message: string };

/**
 * @param positiveToday atitudes positivas que o aluno já recebeu hoje
 * @param actorToday registros que o professor já fez hoje
 * @param kind tipo do novo registro
 */
export function checkAttitudeLimits(kind: AttitudeKindName, positiveToday: number, actorToday: number): LimitCheck {
  if (actorToday >= LIMITS.perActorPerDay) {
    return { ok: false, reason: 'ACTOR_DAY', message: `Você já fez ${LIMITS.perActorPerDay} registros hoje. Volte amanhã.` };
  }
  if (kind === 'POSITIVE' && positiveToday >= LIMITS.positivePerStudentPerDay) {
    return {
      ok: false,
      reason: 'STUDENT_DAY',
      message: `Este aluno já recebeu ${LIMITS.positivePerStudentPerDay} atitudes positivas hoje.`,
    };
  }
  return { ok: true };
}

export function cleanNote(note: unknown): string | null {
  if (typeof note !== 'string') return null;
  const t = note.trim().slice(0, LIMITS.noteMax);
  return t || null;
}
