// Serviço do professor no painel infantil: registro da aula, perguntas da turma e pontos.
import { prisma } from '@/lib/prisma';
import { brazilDay } from '@/lib/kids-service';
import { parseQuestion } from '@/lib/question-bank';
import { removeQuestion } from '@/lib/question-removal';

export const TEACHER_POINTS_REPORT = 1;
export const TEACHER_POINTS_QUESTION = 10;

function addDaysTo(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function teacherOf(userId: string) {
  const t = await prisma.teacher.findUnique({ where: { userId } });
  if (!t) throw new Error('Cadastro de professor não encontrado.');
  return t;
}

async function awardTeacher(teacherId: string, amount: number, description: string, originReference: string) {
  try {
    await prisma.teacherPoint.create({ data: { teacherId, amount, description, originReference } });
    return true;
  } catch (error: any) {
    if (error?.code === 'P2002') return false;
    throw error;
  }
}

async function ownClass(teacherId: string, classId: unknown) {
  if (typeof classId !== 'string') throw new Error('Escolha a turma.');
  const cls = await prisma.class.findFirst({ where: { id: classId, teacherId } });
  if (!cls) throw new Error('Essa turma não está atribuída a você.');
  return cls;
}

export async function getTeacherKids(userId: string) {
  const teacher = await teacherOf(userId);
  const [classes, sums, reports, questions] = await Promise.all([
    prisma.class.findMany({ where: { teacherId: teacher.id }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.teacherPoint.groupBy({ by: ['teacherId'], _sum: { amount: true } }),
    prisma.lessonReport.findMany({
      where: { teacherId: teacher.id }, orderBy: { day: 'desc' }, take: 10,
      include: { class: { select: { name: true } }, _count: { select: { checks: true } } },
    }),
    prisma.quizQuestion.findMany({ where: { teacherId: teacher.id }, orderBy: { createdAt: 'desc' }, take: 300 }),
  ]);
  const [ratingAgg, ratingList] = await Promise.all([
    prisma.teacherRating.aggregate({ where: { teacherId: teacher.id }, _avg: { score: true }, _count: true }),
    prisma.teacherRating.findMany({ where: { teacherId: teacher.id, comment: { not: null } }, orderBy: { createdAt: 'desc' }, take: 10, select: { score: true, comment: true, week: true } }),
  ]);
  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  const mine = sums.find((s) => s.teacherId === teacher.id)?._sum.amount ?? 0;
  const ahead = sums.filter((s) => (s._sum.amount ?? 0) > mine).length;
  const totalTeachers = await prisma.teacher.count();
  return {
    classes,
    points: mine,
    rank: { position: ahead + 1, total: totalTeachers },
    today: brazilDay(),
    rules: { report: TEACHER_POINTS_REPORT, question: TEACHER_POINTS_QUESTION },
    rating: {
      average: ratingAgg._avg.score === null ? null : Math.round(ratingAgg._avg.score * 10) / 10,
      count: ratingAgg._count,
      comments: ratingList.map((r) => ({ score: r.score, comment: r.comment as string })),
    },
    reports: reports.map((r) => ({ id: r.id, className: r.class.name, day: r.day, topics: r.topics, answered: r._count.checks })),
    questions: questions.map((q) => ({
      id: q.id, text: q.text, options: q.options, correctIndex: q.correctIndex, status: q.status, topic: q.topic, classId: q.classId,
      className: q.classId ? classNames.get(q.classId) ?? null : null,
    })),
  };
}

export async function saveLessonReport(userId: string, input: { classId?: unknown; day?: unknown; topics?: unknown }) {
  const teacher = await teacherOf(userId);
  const cls = await ownClass(teacher.id, input.classId);
  const day = typeof input.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.day) ? input.day : brazilDay();
  // pode cadastrar com antecedência (até 21 dias): as crianças só veem a aula a partir da data
  if (day > addDaysTo(brazilDay(), 21)) throw new Error('A data da aula está longe demais (máximo de 21 dias à frente).');
  const lines = (Array.isArray(input.topics) ? input.topics : String(input.topics ?? '').split('\n'))
    .map((t) => String(t).trim().replace(/\s+/g, ' ')).filter(Boolean);
  if (lines.length < 1 || lines.length > 10) throw new Error('Informe de 1 a 10 tópicos, um por linha.');
  if (lines.some((t) => t.length > 120)) throw new Error('Cada tópico pode ter no máximo 120 caracteres.');
  const existing = await prisma.lessonReport.findUnique({ where: { classId_day: { classId: cls.id, day } } });
  if (existing && existing.teacherId !== teacher.id) throw new Error('Esta aula já foi registrada por outro professor.');
  if (existing && (await prisma.lessonCheck.count({ where: { reportId: existing.id } })) > 0) {
    throw new Error('Os alunos já responderam esta aula; não dá mais para alterar os tópicos.');
  }
  const report = existing
    ? await prisma.lessonReport.update({ where: { id: existing.id }, data: { topics: lines } })
    : await prisma.lessonReport.create({ data: { classId: cls.id, teacherId: teacher.id, day, topics: lines } });
  const awarded = await awardTeacher(teacher.id, TEACHER_POINTS_REPORT, `Aula registrada (${cls.name}, ${day})`, `REPORT_${report.id}`);
  return { reportId: report.id, awarded: awarded ? TEACHER_POINTS_REPORT : 0 };
}

export async function saveTeacherQuestion(userId: string, b: Record<string, unknown>) {
  const teacher = await teacherOf(userId);
  const cls = await ownClass(teacher.id, b.classId);
  const data = parseQuestion(b);
  const q = await prisma.quizQuestion.create({
    data: { ...data, status: 'PENDING', source: 'TEACHER', kind: 'WEEKLY', classId: cls.id, teacherId: teacher.id, createdById: userId },
  });
  await awardTeacher(teacher.id, TEACHER_POINTS_QUESTION, `Pergunta cadastrada (${cls.name})`, `QUESTION_${q.id}`);
  return { id: q.id, awarded: TEACHER_POINTS_QUESTION };
}

/** Edita uma pergunta própria. Volta para a revisão da direção (a versão aprovada já foi vista pelos alunos). */
export async function updateTeacherQuestion(userId: string, b: Record<string, unknown>) {
  const teacher = await teacherOf(userId);
  const q = await prisma.quizQuestion.findFirst({ where: { id: String(b.id ?? ''), teacherId: teacher.id } });
  if (!q) throw new Error('Pergunta não encontrada.');
  const cls = await ownClass(teacher.id, b.classId ?? q.classId);
  await prisma.quizQuestion.update({ where: { id: q.id }, data: { ...parseQuestion(b), classId: cls.id, status: 'PENDING' } });
  return { id: q.id, backToReview: q.status === 'APPROVED' };
}

/** Remove uma pergunta própria, em qualquer status. Se já foi usada em desafios, fica arquivada em vez de apagada. */
export async function deleteTeacherQuestion(userId: string, id: string) {
  const teacher = await teacherOf(userId);
  const q = await prisma.quizQuestion.findFirst({ where: { id, teacherId: teacher.id } });
  if (!q) throw new Error('Pergunta não encontrada.');
  return removeQuestion(id);
}
