// Atitudes (professor/diretor) e o aviso para o aluno. O servidor decide valores, limites e permissões.
import { prisma } from '@/lib/prisma';
import { awardPoints, brazilDay } from '@/lib/kids-service';
import { ATTITUDES, LIMITS, attitudeByCode, checkAttitudeLimits, cleanNote, isValidAttitudeId } from '@/lib/attitudes';

export interface Actor {
  id: string; // userId
  role: string;
}

function forbidden(message: string) {
  return Object.assign(new Error(message), { statusCode: 403 });
}

/** Turmas que o usuário pode usar: professor = as suas; diretor = todas as ativas. */
export async function classesFor(actor: Actor) {
  if (actor.role === 'DIRETOR') {
    return prisma.class.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }
  if (actor.role !== 'PROFESSOR') throw forbidden('Acesso restrito a professores e diretores.');
  const t = await prisma.teacher.findUnique({ where: { userId: actor.id } });
  if (!t) throw forbidden('Cadastro de professor não encontrado.');
  return prisma.class.findMany({ where: { teacherId: t.id }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

async function allowedClass(actor: Actor, classId: unknown) {
  if (typeof classId !== 'string') throw new Error('Escolha a turma.');
  const cls = (await classesFor(actor)).find((c) => c.id === classId);
  if (!cls) throw forbidden('Essa turma não está disponível para você.');
  return cls;
}

export async function attitudeSetup(actor: Actor) {
  return {
    classes: await classesFor(actor),
    catalog: ATTITUDES.map((a) => ({ code: a.code, label: a.label, kind: a.kind, xp: a.xp, coins: a.coins })),
    limits: { positivePerStudentPerDay: LIMITS.positivePerStudentPerDay, perActorPerDay: LIMITS.perActorPerDay },
  };
}

export async function classStudents(actor: Actor, classId: unknown) {
  await allowedClass(actor, classId);
  const rows = await prisma.enrollment.findMany({
    where: { classId: classId as string, status: 'ACTIVE' },
    select: { student: { select: { id: true, user: { select: { name: true } } } } },
  });
  return rows.map((r) => ({ id: r.student.id, name: r.student.user.name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export type StudentResult = {
  studentId: string;
  status: 'OK' | 'DUPLICATE' | 'LIMIT' | 'NOT_IN_CLASS';
  message?: string;
};

/**
 * Registra a atitude para um ou vários alunos. `batchId` vem do aparelho (um por toque):
 * o id de cada registro é batchId+aluno, então repetir o mesmo toque nunca duplica pontos.
 */
export async function recordAttitudes(
  actor: Actor,
  input: { classId: unknown; studentIds: unknown; code: unknown; batchId: unknown; note?: unknown },
): Promise<{ results: StudentResult[] }> {
  const def = attitudeByCode(input.code);
  if (!def) throw new Error('Atitude inválida.');
  if (!isValidAttitudeId(input.batchId)) throw new Error('Pedido inválido. Tente de novo.');
  if (!Array.isArray(input.studentIds) || input.studentIds.length === 0) throw new Error('Escolha pelo menos um aluno.');
  const studentIds = Array.from(new Set(input.studentIds.filter((s): s is string => typeof s === 'string')));
  if (studentIds.length === 0 || studentIds.length > LIMITS.maxStudentsPerRequest) {
    throw new Error(`Escolha de 1 a ${LIMITS.maxStudentsPerRequest} alunos.`);
  }
  const cls = await allowedClass(actor, input.classId);
  const note = def.kind === 'ATTENTION' ? cleanNote(input.note) : null; // anotação só existe no ponto de atenção
  const teacher = actor.role === 'PROFESSOR' ? await prisma.teacher.findUnique({ where: { userId: actor.id }, select: { id: true } }) : null;
  const enrolled = new Set(
    (await prisma.enrollment.findMany({ where: { classId: cls.id, status: 'ACTIVE', studentId: { in: studentIds } }, select: { studentId: true } }))
      .map((e) => e.studentId),
  );
  const day = brazilDay();
  const results: StudentResult[] = [];

  for (const studentId of studentIds) {
    if (!enrolled.has(studentId)) {
      results.push({ studentId, status: 'NOT_IN_CLASS', message: 'Este aluno não está nesta turma.' });
      continue;
    }
    const id = `${input.batchId}_${studentId}`;
    const existing = await prisma.attitude.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      const [positiveToday, actorToday] = await Promise.all([
        prisma.attitude.count({ where: { studentId, day, kind: 'POSITIVE' } }),
        prisma.attitude.count({ where: { actorUserId: actor.id, day } }),
      ]);
      const limit = checkAttitudeLimits(def.kind, positiveToday, actorToday);
      if (!limit.ok) {
        results.push({ studentId, status: 'LIMIT', message: limit.message });
        if (limit.reason === 'ACTOR_DAY') break; // acabou a cota do dia: o resto também não passa
        continue;
      }
      try {
        await prisma.attitude.create({
          data: {
            id, kind: def.kind, code: def.code, studentId, classId: cls.id, teacherId: teacher?.id ?? null,
            actorUserId: actor.id, xp: def.xp, coins: def.coins, note, day,
          },
        });
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error; // outro toque idêntico chegou antes: segue como repetido
      }
    }
    // idempotente por originReference: refazer após uma falha no meio do caminho completa o crédito sem duplicar
    if (def.kind === 'POSITIVE') {
      await awardPoints(studentId, def.xp, `Atitude: ${def.label}`, `ATT_${id}`, 'ACTIVITY', { coins: def.coins });
    }
    results.push({ studentId, status: existing ? 'DUPLICATE' : 'OK' });
  }
  return { results };
}

export async function attitudeHistory(actor: Actor, filter: { classId?: unknown; studentId?: unknown }) {
  const classes = await classesFor(actor);
  const allowed = classes.map((c) => c.id);
  let classIds = allowed;
  if (typeof filter.classId === 'string' && filter.classId) {
    if (!allowed.includes(filter.classId)) throw forbidden('Essa turma não está disponível para você.');
    classIds = [filter.classId];
  }
  const rows = await prisma.attitude.findMany({
    where: { classId: { in: classIds }, ...(typeof filter.studentId === 'string' && filter.studentId ? { studentId: filter.studentId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, kind: true, code: true, xp: true, coins: true, note: true, createdAt: true, actorUserId: true,
      student: { select: { user: { select: { name: true } } } }, class: { select: { name: true } },
    },
  });
  const actors = await prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.actorUserId))] } }, select: { id: true, name: true } });
  const actorName = new Map(actors.map((a) => [a.id, a.name]));
  return rows.map((r) => ({
    id: r.id, kind: r.kind, label: attitudeByCode(r.code)?.label ?? r.code, xp: r.xp, coins: r.coins, note: r.note,
    createdAt: r.createdAt.toISOString(), studentName: r.student.user.name, className: r.class.name,
    by: actorName.get(r.actorUserId) ?? '',
  }));
}

/** Para o ALUNO: só o total dos ganhos positivos que ainda não viu. Nunca quem deu, nem pontos de atenção. */
export async function pendingAttitudeRewards(studentId: string) {
  const rows = await prisma.attitude.findMany({
    where: { studentId, kind: 'POSITIVE', seenAt: null },
    select: { xp: true, coins: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (rows.length === 0) return { count: 0, xp: 0, coins: 0, upTo: null as string | null };
  return {
    count: rows.length,
    xp: rows.reduce((s, r) => s + r.xp, 0),
    coins: rows.reduce((s, r) => s + r.coins, 0),
    upTo: rows[rows.length - 1].createdAt.toISOString(),
  };
}

export async function markAttitudesSeen(studentId: string, upTo: unknown) {
  const limit = typeof upTo === 'string' ? new Date(upTo) : null;
  if (!limit || Number.isNaN(limit.getTime())) throw new Error('Pedido inválido.');
  const r = await prisma.attitude.updateMany({
    where: { studentId, kind: 'POSITIVE', seenAt: null, createdAt: { lte: limit } },
    data: { seenAt: new Date() },
  });
  return { marked: r.count };
}
