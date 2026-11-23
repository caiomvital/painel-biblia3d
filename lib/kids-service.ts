// Serviço do painel infantil: pontos, desafios (dia e semana), checklist da aula, cadastro e ranking.
import { prisma } from '@/lib/prisma';
import { parseLook } from '@/lib/mascot-look';
import { quizBreakdown } from './quiz-points';
import { POINTS_PER_LESSON_TOPIC } from './lesson-points';

export const QUIZ_SIZE = 5;
export const POINTS_PROFILE = 20;
export { POINTS_PER_LESSON_TOPIC };

export type QuizKindName = 'daily' | 'weekly';

/** Dia no horário de Recife/Brasília (UTC-3), formato YYYY-MM-DD. */
export function brazilDay(date = new Date()): string {
  return new Date(date.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Segunda-feira da semana atual (Brasil), para identificar o desafio da semana. */
export function brazilWeekKey(date = new Date()): string {
  const d = new Date(brazilDay(date) + 'T12:00:00Z');
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return 'W' + d.toISOString().slice(0, 10);
}

function seededShuffle<T>(items: T[], seedText: string): T[] {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Concede pontos (e moedas 1:1, como o acesso diário) de forma idempotente. */
export async function awardPoints(
  studentId: string,
  amount: number,
  description: string,
  originReference: string,
  type: 'LOGIN' | 'ATTENDANCE' | 'ACTIVITY' | 'MANUAL' = 'ACTIVITY',
  /** Fichas a creditar. Padrão: iguais ao XP (comportamento de sempre). 0 = só XP. */
  options: { coins?: number } = {},
): Promise<boolean> {
  if (amount <= 0) return false;
  const coins = options.coins ?? amount;
  try {
    return await prisma.$transaction(async (tx) => {
      const exists = await tx.pointTransaction.findUnique({
        where: { studentId_originReference: { studentId, originReference } },
      });
      if (exists) return false;
      await tx.pointTransaction.create({ data: { studentId, amount, type, description, originReference } });
      if (coins > 0) {
        await tx.coinTransaction.create({
          data: { studentId, amount: coins, type: 'EARNED', description, originReference },
        });
      }
      const student = await tx.student.update({
        where: { id: studentId },
        data: { currentXp: { increment: amount }, coinBalance: { increment: coins } },
      });
      const level = Math.floor(student.currentXp / 300) + 1;
      if (level !== student.level) await tx.student.update({ where: { id: studentId }, data: { level } });
      return true;
    });
  } catch (error: any) {
    if (error?.code === 'P2002' || String(error?.message).includes('Unique constraint')) return false;
    throw error;
  }
}

async function rankOf(xp: number, where: Record<string, unknown>) {
  const [ahead, total] = await Promise.all([
    prisma.student.count({ where: { ...where, currentXp: { gt: xp } } }),
    prisma.student.count({ where }),
  ]);
  return { position: ahead + 1, total };
}

async function activeClassId(studentId: string): Promise<string | null> {
  const e = await prisma.enrollment.findFirst({ where: { studentId, status: 'ACTIVE' }, orderBy: { enrolledAt: 'asc' }, select: { classId: true } });
  return e?.classId ?? null;
}

async function lessonForStudent(studentId: string, classId: string | null) {
  if (!classId) return null;
  const since = brazilDay(new Date(Date.now() - 14 * 86400 * 1000));
  const report = await prisma.lessonReport.findFirst({
    where: { classId, day: { gte: since } },
    orderBy: { day: 'desc' },
    include: { checks: { where: { studentId } } },
  });
  if (!report) return null;
  const check = report.checks[0];
  return {
    reportId: report.id, day: report.day, topics: report.topics,
    done: !!check, checked: check?.checked ?? [], pointsAwarded: check?.pointsAwarded ?? 0,
  };
}

async function quizSummary(studentId: string, kind: QuizKindName, classId: string | null) {
  const key = kind === 'daily' ? brazilDay() : brazilWeekKey();
  const [available, qd] = await Promise.all([
    prisma.quizQuestion.count({
      where: kind === 'daily' ? { status: 'APPROVED', kind: 'DAILY' } : { status: 'APPROVED', kind: 'WEEKLY', classId: classId ?? '__none__' },
    }),
    prisma.quizDay.findUnique({ where: { studentId_day: { studentId, day: key } } }),
  ]);
  return { available: available > 0 || !!qd, completedToday: !!qd?.completedAt, scoreToday: qd?.score ?? null };
}

export async function getKidsHome(studentId: string) {
  // O banco fica longe (cada ida e volta custa ~0,6 s): o que não depende do aluno ou da turma já sai junto com a leitura do aluno.
  const early = Promise.all([
    prisma.teacherRating.findUnique({ where: { studentId_week: { studentId, week: brazilWeekKey() } } }),
    prisma.appSetting.findUnique({ where: { key: 'googleReviewUrl' } }),
    prisma.prize.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
    quizSummary(studentId, 'daily', null), // o desafio do dia não depende da turma
    prisma.coinReservation.aggregate({ where: { studentId, status: 'ACTIVE' }, _sum: { amount: true } }),
  ]);
  early.catch(() => {}); // se o aluno não existir, não deixa essa promessa solta virar erro não tratado
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      enrollments: { where: { status: 'ACTIVE' }, include: { class: { select: { id: true, name: true, teacher: { select: { user: { select: { name: true } } } } } } } },
    },
  });
  if (!student) throw new Error('Aluno não encontrado.');
  const classInfo = student.enrollments[0]?.class ?? null;
  const classId = classInfo?.id ?? null;
  const teacherInfo = classInfo;
  const [weekly, lesson, academy, turma] = await Promise.all([
    quizSummary(studentId, 'weekly', classId),
    lessonForStudent(studentId, classId),
    rankOf(student.currentXp, {}),
    classInfo
      ? rankOf(student.currentXp, { enrollments: { some: { classId: classInfo.id, status: 'ACTIVE' } } })
      : Promise.resolve(null),
  ]);
  const [myRating, reviewSetting, prize, daily, reserved] = await early;
  const reservedCoins = reserved._sum.amount ?? 0;
  return {
    name: student.user.name,
    firstName: student.user.name.split(' ')[0],
    mascotLook: parseLook(student.mascotLook),
    points: student.currentXp,
    level: student.level,
    // saldo de fichas (campo novo, aditivo): total, reservado em lances ativos e disponível para gastar
    coins: {
      balance: student.coinBalance,
      reserved: reservedCoins,
      available: Math.max(0, student.coinBalance - reservedCoins),
    },
    profileCompleted: student.profileCompleted,
    guardianName: student.guardianName,
    birthDate: student.birthDate ? student.birthDate.toISOString().slice(0, 10) : null,
    className: classInfo?.name ?? null,
    prize: prize ? { title: prize.title, description: prize.description, pointsGoal: prize.pointsGoal } : null,
    rankTurma: turma,
    rankAcademia: academy,
    quiz: daily,
    weekly,
    lesson,
    rating: teacherInfo?.teacher
      ? { teacherName: teacherInfo.teacher.user.name, done: !!myRating, score: myRating?.score ?? null }
      : null,
    googleReviewUrl: reviewSetting?.value ?? null,
  };
}

export const POINTS_RATING = 5;

/** Avaliação semanal do professor (nota 1-10). Vale pontos para a criança, qualquer que seja a nota. */
export async function submitTeacherRating(studentId: string, input: { enjoying?: unknown; score?: unknown; comment?: unknown }) {
  const enjoying = input.enjoying;
  if (enjoying !== 'YES' && enjoying !== 'SO_SO' && enjoying !== 'NO') throw new Error('Conte se você está gostando das aulas.');
  const score = Number(input.score);
  if (!Number.isInteger(score) || score < 1 || score > 10) throw new Error('Escolha uma nota de 1 a 10.');
  const comment = typeof input.comment === 'string' ? input.comment.trim().replace(/\s+/g, ' ').slice(0, 200) || null : null;
  const classId = await activeClassId(studentId);
  const cls = classId ? await prisma.class.findUnique({ where: { id: classId }, select: { teacherId: true } }) : null;
  if (!cls?.teacherId) throw new Error('Sua turma ainda não tem professor para avaliar.');
  const week = brazilWeekKey();
  try {
    await prisma.teacherRating.create({ data: { studentId, teacherId: cls.teacherId, week, enjoying, score, comment } });
  } catch (error: any) {
    if (error?.code === 'P2002') throw new Error('Você já avaliou esta semana. Obrigado!');
    throw error;
  }
  await awardPoints(studentId, POINTS_RATING, `Avaliação do professor (${week})`, `RATING_${studentId}_${week}`);
  return { pointsAwarded: POINTS_RATING };
}

function parseBirthDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v))) { d = +match[1]; m = +match[2]; y = +match[3]; }
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const age = new Date().getUTCFullYear() - y;
  if (age < 3 || age > 100) return null;
  return date;
}
export { parseBirthDate };

export async function saveKidsProfile(studentId: string, input: { birthDate?: unknown; guardianName?: unknown }) {
  const birth = parseBirthDate(input.birthDate);
  const guardian = typeof input.guardianName === 'string' ? input.guardianName.trim().replace(/\s+/g, ' ') : '';
  if (!birth) throw new Error('Informe uma data de nascimento válida.');
  if (guardian.length < 2 || guardian.length > 120) throw new Error('Informe o nome do responsável.');
  await prisma.student.update({
    where: { id: studentId },
    data: { birthDate: birth, guardianName: guardian, profileCompleted: true },
  });
  const awarded = await awardPoints(studentId, POINTS_PROFILE, 'Cadastro completo', `PROFILE_${studentId}`);
  return { awarded: awarded ? POINTS_PROFILE : 0 };
}

async function questionsByIds(ids: string[]) {
  const rows = await prisma.quizQuestion.findMany({ where: { id: { in: ids } } });
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter((q): q is NonNullable<typeof q> => !!q);
}

function review(questions: Awaited<ReturnType<typeof questionsByIds>>, answers: number[]) {
  return questions.map((q, i) => ({
    id: q.id, text: q.text, options: q.options, correctIndex: q.correctIndex, chosen: answers[i] ?? null,
  }));
}

export async function getQuiz(studentId: string, kind: QuizKindName) {
  const key = kind === 'daily' ? brazilDay() : brazilWeekKey();
  let qd = await prisma.quizDay.findUnique({ where: { studentId_day: { studentId, day: key } } });
  if (!qd) {
    const classId = await activeClassId(studentId);
    const pool = await prisma.quizQuestion.findMany({
      where: kind === 'daily' ? { status: 'APPROVED', kind: 'DAILY' } : { status: 'APPROVED', kind: 'WEEKLY', classId: classId ?? '__none__' },
      select: { id: true }, orderBy: { id: 'asc' },
    });
    if (!pool.length) return { available: false as const };
    // mesmo sorteio para todos no mesmo dia/semana (e na mesma turma, no desafio da semana)
    const ids = seededShuffle(pool.map((a) => a.id), `quiz-${kind}-${key}-${kind === 'weekly' ? classId : ''}`).slice(0, QUIZ_SIZE);
    try {
      qd = await prisma.quizDay.create({ data: { studentId, day: key, questionIds: ids } });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      qd = await prisma.quizDay.findUnique({ where: { studentId_day: { studentId, day: key } } });
    }
  }
  if (!qd) return { available: false as const };
  const questions = await questionsByIds(qd.questionIds);
  if (qd.completedAt) {
    return {
      available: true as const, completed: true as const, score: qd.score, total: questions.length,
      pointsAwarded: qd.pointsAwarded, review: review(questions, (qd.answers as number[]) ?? []),
    };
  }
  // Respostas já dadas (e conferidas na hora): a criança retoma de onde parou e não troca uma resposta já vista.
  const stored = storedAnswers(qd.answers, questions.length);
  return {
    available: true as const, completed: false as const, total: questions.length,
    questions: questions.map((q) => ({ id: q.id, text: q.text, options: q.options })),
    checked: questions.flatMap((q, i) => (stored[i] >= 0 ? [{ index: i, chosen: stored[i], correctIndex: q.correctIndex }] : [])),
  };
}

/** Respostas parciais guardadas em QuizDay.answers (-1 = ainda não respondida). */
function storedAnswers(raw: unknown, total: number): number[] {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length: total }, (_, i) => (Number.isInteger(arr[i]) && (arr[i] as number) >= 0 && (arr[i] as number) < 4 ? (arr[i] as number) : -1));
}

/**
 * Confere uma pergunta na hora (certo ou errado) e trava a resposta: depois de vista, não dá para trocar.
 * Só se responde na ordem, uma de cada vez. O desafio é concluído (pontos e fichas) em submitQuiz.
 */
export async function checkQuizAnswer(studentId: string, kind: QuizKindName, rawIndex: unknown, rawChoice: unknown) {
  const key = kind === 'daily' ? brazilDay() : brazilWeekKey();
  const qd = await prisma.quizDay.findUnique({ where: { studentId_day: { studentId, day: key } } });
  if (!qd) throw new Error('Abra o desafio antes de responder.');
  if (qd.completedAt) throw new Error('Você já respondeu este desafio.');
  const questions = await questionsByIds(qd.questionIds);
  if (!Number.isInteger(rawIndex) || (rawIndex as number) < 0 || (rawIndex as number) >= questions.length) throw new Error('Pergunta inválida.');
  const index = rawIndex as number;
  const q = questions[index];
  const stored = storedAnswers(qd.answers, questions.length);
  if (stored[index] >= 0) return { chosen: stored[index], correct: stored[index] === q.correctIndex, correctIndex: q.correctIndex };
  if (stored.slice(0, index).some((a) => a < 0)) throw new Error('Responda na ordem, uma pergunta de cada vez.');
  if (!Number.isInteger(rawChoice) || (rawChoice as number) < 0 || (rawChoice as number) >= q.options.length) throw new Error('Escolha uma resposta.');
  const choice = rawChoice as number;
  stored[index] = choice;
  const saved = await prisma.quizDay.updateMany({ where: { id: qd.id, completedAt: null, answers: { equals: qd.answers as any } }, data: { answers: stored } });
  if (saved.count === 0) { // outra aba respondeu ao mesmo tempo: devolve o que ficou valendo
    const fresh = await prisma.quizDay.findUnique({ where: { id: qd.id } });
    const now = storedAnswers(fresh?.answers, questions.length)[index];
    if (now >= 0) return { chosen: now, correct: now === q.correctIndex, correctIndex: q.correctIndex };
    throw new Error('Não deu certo. Tente de novo.');
  }
  return { chosen: choice, correct: choice === q.correctIndex, correctIndex: q.correctIndex };
}

export async function submitQuiz(studentId: string, kind: QuizKindName, rawAnswers: unknown) {
  const key = kind === 'daily' ? brazilDay() : brazilWeekKey();
  const qd = await prisma.quizDay.findUnique({ where: { studentId_day: { studentId, day: key } } });
  if (!qd) throw new Error('Abra o desafio antes de responder.');
  if (qd.completedAt) throw new Error(kind === 'daily' ? 'Você já respondeu o desafio de hoje. Volte amanhã!' : 'Você já respondeu o desafio desta semana. Volte na próxima!');
  const questions = await questionsByIds(qd.questionIds);
  if (!Array.isArray(rawAnswers) || rawAnswers.length !== questions.length ||
      !rawAnswers.every((a) => Number.isInteger(a) && a >= 0 && a < 4)) {
    throw new Error('Responda todas as perguntas.');
  }
  // o que a criança já viu corrigido vale como está (travado); o resto vem do envio
  const locked = storedAnswers(qd.answers, questions.length);
  const answers = (rawAnswers as number[]).map((a, i) => (locked[i] >= 0 ? locked[i] : a));
  const score = questions.filter((q, i) => q.correctIndex === answers[i]).length;
  const points = quizBreakdown(questions.map((q, i) => q.correctIndex === answers[i])).total;
  const done = await prisma.quizDay.updateMany({
    where: { id: qd.id, completedAt: null },
    data: { answers, score, pointsAwarded: points, completedAt: new Date() },
  });
  if (done.count === 0) throw new Error('Você já respondeu este desafio.');
  const label = kind === 'daily' ? 'Desafio do dia' : 'Desafio da semana';
  const credited = await awardPoints(studentId, points, `${label} (${key}): ${score}/${questions.length}`, `QUIZ_${studentId}_${key}`);
  // fichas creditadas pelo próprio awardPoints (regra do servidor); aqui só repassamos o valor para a tela
  return { completed: true as const, score, total: questions.length, pointsAwarded: points, coinsAwarded: credited ? points : 0, review: review(questions, answers) };
}

/** Checklist "o que aprendi na aula": 2 pontos por tópico marcado; o que não marcar não altera a pontuação. */
export async function submitLessonCheck(studentId: string, reportId: unknown, rawChecked: unknown) {
  if (typeof reportId !== 'string') throw new Error('Aula inválida.');
  const classId = await activeClassId(studentId);
  const report = await prisma.lessonReport.findUnique({ where: { id: reportId } });
  if (!report || report.classId !== classId) throw new Error('Aula não encontrada.');
  if (!Array.isArray(rawChecked) || !rawChecked.every((n) => Number.isInteger(n) && n >= 0 && n < report.topics.length)) {
    throw new Error('Marcação inválida.');
  }
  const checked = Array.from(new Set(rawChecked as number[])).sort((a, b) => a - b);
  const points = checked.length * POINTS_PER_LESSON_TOPIC;
  try {
    await prisma.lessonCheck.create({ data: { studentId, reportId, checked, pointsAwarded: points } });
  } catch (error: any) {
    if (error?.code === 'P2002') throw new Error('Você já enviou o que aprendeu nesta aula.');
    throw error;
  }
  await awardPoints(studentId, points, `O que aprendi na aula (${report.day})`, `LESSON_${studentId}_${reportId}`);
  return { pointsAwarded: points };
}
