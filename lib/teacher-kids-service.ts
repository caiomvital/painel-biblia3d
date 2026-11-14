// Serviço do professor no painel infantil: registro da aula, perguntas da turma e pontos.
import { prisma } from '@/lib/prisma';
import { brazilDay } from '@/lib/kids-service';

export const TEACHER_POINTS_REPORT = 1;
export const TEACHER_POINTS_QUESTION = 10;

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
    prisma.quizQuestion.findMany({ where: { teacherId: teacher.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
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
      id: q.id, text: q.text, options: q.options, correctIndex: q.correctIndex, status: q.status,
      className: q.classId ? classNames.get(q.classId) ?? null : null,
    })),
  };
}

export async function saveLessonReport(userId: string, input: { classId?: unknown; day?: unknown; topics?: unknown }) {
  const teacher = await teacherOf(userId);
  const cls = await ownClass(teacher.id, input.classId);
  const day = typeof input.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.day) ? input.day : brazilDay();
  if (day > brazilDay()) throw new Error('A data da aula não pode estar no futuro.');
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
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const options = Array.isArray(b.options) ? b.options.map((o) => String(o ?? '').trim()) : [];
  const correctIndex = Number(b.correctIndex);
  if (text.length < 5 || text.length > 300) throw new Error('A pergunta precisa ter entre 5 e 300 caracteres.');
  if (options.length !== 4 || options.some((o) => !o || o.length > 150)) throw new Error('Informe exatamente 4 respostas.');
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) throw new Error('As 4 respostas precisam ser diferentes.');
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) throw new Error('Marque qual resposta é a certa.');
  const q = await prisma.quizQuestion.create({
    data: {
      text, options, correctIndex, topic: typeof b.topic === 'string' ? b.topic.trim().slice(0, 60) || null : null,
      status: 'PENDING', source: 'TEACHER', kind: 'WEEKLY', classId: cls.id, teacherId: teacher.id, createdById: userId,
    },
  });
  await awardTeacher(teacher.id, TEACHER_POINTS_QUESTION, `Pergunta cadastrada (${cls.name})`, `QUESTION_${q.id}`);
  return { id: q.id, awarded: TEACHER_POINTS_QUESTION };
}

export async function deleteTeacherQuestion(userId: string, id: string) {
  const teacher = await teacherOf(userId);
  const q = await prisma.quizQuestion.findFirst({ where: { id, teacherId: teacher.id } });
  if (!q) throw new Error('Pergunta não encontrada.');
  if (q.status !== 'PENDING') throw new Error('Só dá para apagar perguntas que ainda não foram revisadas.');
  await prisma.quizQuestion.delete({ where: { id } });
}
