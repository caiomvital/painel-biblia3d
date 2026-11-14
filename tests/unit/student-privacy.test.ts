import { describe, expect, mock, test } from 'bun:test';
import { positionInClass } from '../../lib/class-ranking';

// ---- Prisma falso: só o que getStudentDashboard consulta ----
const ME = { id: 'st_me', currentXp: 450, level: 2, coinBalance: 10, registrationNumber: 'R1' };
const CLASSMATES = [
  { id: 'st_a', currentXp: 900, user: { name: 'Colega Alfabeto Silva' } },
  { id: 'st_me', currentXp: 450, user: { name: 'Eu Mesmo' } },
  { id: 'st_b', currentXp: 100, user: { name: 'Colega Beta Souza' } },
];
const klass = {
  id: 'cl_1', name: 'Turma Teste', code: 'T1', daysOfWeek: 'SAB', scheduleTime: '08:00',
  course: { id: 'co_1', name: 'Curso', modules: [] },
  teacher: { user: { name: 'Professor Teste' } },
  lessons: [],
};
const fake = {
  user: { findUnique: async () => ({ id: 'u_me', role: 'ALUNO', name: 'Eu Mesmo', student: ME }) },
  enrollment: {
    findFirst: async () => ({ class: klass }),
    // se alguém pedir `include: { user }`, os nomes dos colegas voltam (o que não pode vazar)
    findMany: async (args: { include?: unknown; select?: unknown }) =>
      CLASSMATES.map((s) => ({ student: args.select ? { id: s.id, currentXp: s.currentXp } : s })),
  },
};
const stub = new Proxy(fake as Record<string, unknown>, {
  get(target, prop: string) {
    if (prop in target) return target[prop];
    return new Proxy({}, {
      get: (_t, method: string) => async () => (method === 'findMany' ? [] : method === 'count' ? 0 : null),
    });
  },
});
mock.module('@/lib/prisma', () => ({ prisma: stub }));

describe('posição na turma', () => {
  test('calcula posição e total sem nomes', () => {
    const r = positionInClass([{ id: 'a', currentXp: 10 }, { id: 'b', currentXp: 30 }, { id: 'c', currentXp: 20 }], 'c');
    expect(r).toEqual({ position: 2, total: 3 });
  });
  test('aluno fora da lista cai em 1º com o total da turma', () => {
    expect(positionInClass([{ id: 'a', currentXp: 5 }], 'x')).toEqual({ position: 1, total: 1 });
  });
});

describe('privacidade do painel do aluno', () => {
  test('GET /api/student/dashboard não devolve nomes de outros alunos', async () => {
    const { getStudentDashboard } = await import('../../lib/academic-service');
    const dashboard = await getStudentDashboard('u_me');
    const json = JSON.stringify(dashboard);

    expect(json).not.toContain('Colega Alfabeto Silva');
    expect(json).not.toContain('Colega Beta Souza');
    expect(json).not.toContain('st_a'); // nem ids de colegas
    expect(json).not.toContain('st_b');
    expect(Object.keys(dashboard)).not.toContain('ranking');

    // só a posição do próprio aluno e o total
    expect(dashboard.student?.rankingPosition).toBe(2);
    expect(dashboard.student?.totalInClass).toBe(3);
  });
});
