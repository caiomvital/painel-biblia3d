// Quiz ao vivo: o servidor é a autoridade (tempo, resposta certa, pontos). O cliente só consulta e responde.
import { randomInt } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import {
  LIVE_MAX_QUESTIONS, LIVE_MIN_QUESTIONS, LIVE_SECONDS_DEFAULT, LIVE_SECONDS_MAX, LIVE_SECONDS_MIN,
  cleanTeamName, generatePin, isPin, livePhase, livePoints, rankTeams, secondsLeft, type LiveStatus,
} from '@/lib/live-quiz';

const rand = () => randomInt(0, 1_000_000) / 1_000_000;
const ACTIVE: LiveStatus[] = ['LOBBY', 'QUESTION', 'REVEAL'];

async function teacherOf(userId: string) {
  const t = await prisma.teacher.findUnique({ where: { userId } });
  if (!t) throw new Error('Cadastro de professor não encontrado.');
  return t;
}

async function ownQuiz(userId: string, quizId: unknown) {
  const teacher = await teacherOf(userId);
  const quiz = await prisma.liveQuiz.findFirst({ where: { id: String(quizId ?? ''), teacherId: teacher.id } });
  if (!quiz) throw new Error('Sala não encontrada.');
  return quiz;
}

/** Perguntas que o professor pode usar: as dele (exceto recusadas) e as aprovadas pela direção. */
export async function livePickableQuestions(userId: string) {
  const teacher = await teacherOf(userId);
  const rows = await prisma.quizQuestion.findMany({
    where: { OR: [{ teacherId: teacher.id, status: { not: 'REJECTED' } }, { status: 'APPROVED' }] },
    orderBy: { createdAt: 'desc' }, take: 400,
    select: { id: true, text: true, topic: true, status: true, teacherId: true },
  });
  return rows.map((q) => ({ id: q.id, text: q.text, topic: q.topic, mine: q.teacherId === teacher.id }));
}

export async function createLiveQuiz(userId: string, b: Record<string, unknown>) {
  const teacher = await teacherOf(userId);
  const ids = Array.isArray(b.questionIds) ? [...new Set(b.questionIds.filter((x): x is string => typeof x === 'string'))] : [];
  if (ids.length < LIVE_MIN_QUESTIONS || ids.length > LIVE_MAX_QUESTIONS) {
    throw new Error(`Escolha de ${LIVE_MIN_QUESTIONS} a ${LIVE_MAX_QUESTIONS} perguntas.`);
  }
  const seconds = Math.round(Number(b.seconds ?? LIVE_SECONDS_DEFAULT));
  if (!Number.isFinite(seconds) || seconds < LIVE_SECONDS_MIN || seconds > LIVE_SECONDS_MAX) {
    throw new Error(`O tempo por pergunta vai de ${LIVE_SECONDS_MIN} a ${LIVE_SECONDS_MAX} segundos.`);
  }
  const found = await prisma.quizQuestion.findMany({
    where: { id: { in: ids }, OR: [{ teacherId: teacher.id, status: { not: 'REJECTED' } }, { status: 'APPROVED' }] },
    select: { id: true },
  });
  if (found.length !== ids.length) throw new Error('Alguma pergunta escolhida não está disponível.');
  // um professor só tem uma sala aberta: a anterior é encerrada
  await prisma.liveQuiz.updateMany({ where: { teacherId: teacher.id, status: { in: ACTIVE } }, data: { status: 'FINISHED', finishedAt: new Date() } });
  for (let attempt = 0; attempt < 8; attempt++) {
    const pin = generatePin(rand);
    if (await prisma.liveQuiz.findFirst({ where: { pin, status: { in: ACTIVE } }, select: { id: true } })) continue;
    const quiz = await prisma.liveQuiz.create({ data: { pin, teacherId: teacher.id, questionIds: ids, secondsPerQuestion: seconds } });
    return { id: quiz.id, pin: quiz.pin };
  }
  throw new Error('Não foi possível gerar o PIN. Tente de novo.');
}

/** Sala aberta do professor (para retomar ao recarregar a página). */
export async function currentLiveQuizId(userId: string) {
  const teacher = await teacherOf(userId);
  const q = await prisma.liveQuiz.findFirst({ where: { teacherId: teacher.id, status: { in: ACTIVE } }, orderBy: { createdAt: 'desc' }, select: { id: true } });
  return q?.id ?? null;
}

async function questionAt(quiz: { questionIds: string[]; currentIndex: number }) {
  const id = quiz.questionIds[quiz.currentIndex];
  if (!id) return null;
  return prisma.quizQuestion.findUnique({ where: { id }, select: { id: true, text: true, options: true, correctIndex: true } });
}

export async function teacherLiveState(userId: string, quizId: unknown) {
  const quiz = await ownQuiz(userId, quizId);
  const now = new Date();
  const [teams, players, answers, q] = await Promise.all([
    prisma.liveQuizTeam.findMany({ where: { quizId: quiz.id }, orderBy: { id: 'asc' } }),
    prisma.liveQuizPlayer.findMany({ where: { quizId: quiz.id }, orderBy: { joinedAt: 'asc' }, include: { student: { select: { user: { select: { name: true } } } } } }),
    prisma.liveQuizAnswer.findMany({ where: { quizId: quiz.id }, select: { playerId: true, points: true, correct: true, questionIndex: true, choice: true } }),
    questionAt(quiz),
  ]);
  const phase = livePhase(quiz.status, quiz.questionStartedAt, quiz.secondsPerQuestion, now);
  const current = answers.filter((a) => a.questionIndex === quiz.currentIndex);
  return {
    id: quiz.id, pin: quiz.pin, phase, total: quiz.questionIds.length, index: quiz.currentIndex, seconds: quiz.secondsPerQuestion,
    secondsLeft: phase === 'OPEN' && quiz.questionStartedAt ? secondsLeft(quiz.questionStartedAt, quiz.secondsPerQuestion, now) : 0,
    question: q && phase !== 'LOBBY' ? { text: q.text, options: q.options, correctIndex: phase === 'OPEN' ? null : q.correctIndex } : null,
    optionCounts: q ? q.options.map((_, i) => current.filter((a) => a.choice === i).length) : [],
    players: players.map((p) => ({ id: p.id, name: p.student.user.name.split(' ')[0], teamId: p.teamId, answered: current.some((a) => a.playerId === p.id) })),
    teams: teams.map((t) => ({ id: t.id, name: t.name })),
    ranking: rankTeams(teams, players, answers, quiz.currentIndex),
  };
}

type Action = 'setTeams' | 'soloAll' | 'start' | 'close' | 'next' | 'finish';

/** Comandos do professor. Equipes só mudam antes de começar. */
export async function teacherLiveAction(userId: string, quizId: unknown, action: Action, b: Record<string, unknown> = {}) {
  const quiz = await ownQuiz(userId, quizId);
  if (quiz.status === 'FINISHED') throw new Error('Esta sala já foi encerrada.');
  const now = new Date();
  switch (action) {
    case 'soloAll': {
      if (quiz.status !== 'LOBBY') throw new Error('As equipes só mudam antes de começar.');
      const players = await prisma.liveQuizPlayer.findMany({ where: { quizId: quiz.id }, include: { student: { select: { user: { select: { name: true } } } } } });
      if (players.length === 0) throw new Error('Ainda não entrou ninguém.');
      await prisma.$transaction(async (tx) => {
        await tx.liveQuizTeam.deleteMany({ where: { quizId: quiz.id } });
        for (const p of players) {
          const team = await tx.liveQuizTeam.create({ data: { quizId: quiz.id, name: p.student.user.name.split(' ')[0] } });
          await tx.liveQuizPlayer.update({ where: { id: p.id }, data: { teamId: team.id } });
        }
      });
      return { ok: true };
    }
    case 'setTeams': {
      if (quiz.status !== 'LOBBY') throw new Error('As equipes só mudam antes de começar.');
      const list = Array.isArray(b.teams) ? b.teams : [];
      const players = await prisma.liveQuizPlayer.findMany({ where: { quizId: quiz.id }, select: { id: true } });
      const valid = new Set(players.map((p) => p.id));
      const seen = new Set<string>();
      const clean = list.map((t: any) => {
        const ids: string[] = Array.isArray(t?.playerIds) ? t.playerIds.filter((x: unknown): x is string => typeof x === 'string' && valid.has(x)) : [];
        for (const id of ids) { if (seen.has(id)) throw new Error('Um aluno não pode estar em duas equipes.'); seen.add(id); }
        return { name: cleanTeamName(t?.name), ids };
      }).filter((t) => t.ids.length > 0);
      await prisma.$transaction(async (tx) => {
        await tx.liveQuizPlayer.updateMany({ where: { quizId: quiz.id }, data: { teamId: null } });
        await tx.liveQuizTeam.deleteMany({ where: { quizId: quiz.id } });
        for (const t of clean) {
          const team = await tx.liveQuizTeam.create({ data: { quizId: quiz.id, name: t.name } });
          await tx.liveQuizPlayer.updateMany({ where: { id: { in: t.ids }, quizId: quiz.id }, data: { teamId: team.id } });
        }
      });
      return { ok: true };
    }
    case 'start': {
      if (quiz.status !== 'LOBBY') throw new Error('A sala já começou.');
      const unassigned = await prisma.liveQuizPlayer.count({ where: { quizId: quiz.id, teamId: null } });
      const joined = await prisma.liveQuizPlayer.count({ where: { quizId: quiz.id } });
      if (joined === 0) throw new Error('Ainda não entrou ninguém.');
      if (unassigned > 0) throw new Error(`Falta colocar ${unassigned} aluno(s) em uma equipe (ou usar "Todos solo").`);
      await prisma.liveQuiz.update({ where: { id: quiz.id }, data: { status: 'QUESTION', currentIndex: 0, questionStartedAt: now } });
      return { ok: true };
    }
    case 'close': {
      if (quiz.status !== 'QUESTION') throw new Error('Não há pergunta aberta.');
      await prisma.liveQuiz.update({ where: { id: quiz.id }, data: { status: 'REVEAL' } });
      return { ok: true };
    }
    case 'next': {
      if (quiz.status === 'LOBBY') throw new Error('Comece a sala primeiro.');
      if (livePhase(quiz.status, quiz.questionStartedAt, quiz.secondsPerQuestion, now) === 'OPEN') throw new Error('Espere o tempo acabar ou encerre a pergunta.');
      if (quiz.currentIndex + 1 >= quiz.questionIds.length) {
        await prisma.liveQuiz.update({ where: { id: quiz.id }, data: { status: 'FINISHED', finishedAt: now } });
      } else {
        await prisma.liveQuiz.update({ where: { id: quiz.id }, data: { status: 'QUESTION', currentIndex: quiz.currentIndex + 1, questionStartedAt: now } });
      }
      return { ok: true };
    }
    case 'finish': {
      await prisma.liveQuiz.update({ where: { id: quiz.id }, data: { status: 'FINISHED', finishedAt: now } });
      return { ok: true };
    }
    default:
      throw new Error('Ação inválida.');
  }
}

/** O aluno entra pelo PIN (só enquanto a sala está aberta para entrada ou já o tinha). */
export async function joinLiveQuiz(studentId: string, pin: unknown) {
  if (!isPin(pin)) throw new Error('O PIN tem 6 números.');
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { accessPending: true } });
  if (!student || student.accessPending) throw new Error('Seu acesso ainda não foi liberado.');
  const quiz = await prisma.liveQuiz.findFirst({ where: { pin, status: { in: ACTIVE } }, orderBy: { createdAt: 'desc' } });
  if (!quiz) throw new Error('Sala não encontrada. Confira o PIN com o professor.');
  const already = await prisma.liveQuizPlayer.findUnique({ where: { quizId_studentId: { quizId: quiz.id, studentId } } });
  if (!already) {
    if (quiz.status !== 'LOBBY') throw new Error('Essa sala já começou.');
    await prisma.liveQuizPlayer.create({ data: { quizId: quiz.id, studentId } });
  }
  return { id: quiz.id };
}

/** Sala em que o aluno está agora (para retomar ao recarregar). */
export async function studentLiveQuizId(studentId: string) {
  const p = await prisma.liveQuizPlayer.findFirst({
    where: { studentId, quiz: { status: { in: ACTIVE } } }, orderBy: { joinedAt: 'desc' }, select: { quizId: true },
  });
  return p?.quizId ?? null;
}

/** O que o aluno vê. Nunca inclui a resposta certa com a pergunta aberta, nem o ranking dos outros. */
export async function studentLiveState(studentId: string, quizId: unknown) {
  const player = await prisma.liveQuizPlayer.findFirst({
    where: { quizId: String(quizId ?? ''), studentId }, include: { team: { select: { name: true } } },
  });
  if (!player) throw new Error('Você não está nesta sala.');
  const quiz = await prisma.liveQuiz.findUniqueOrThrow({ where: { id: player.quizId } });
  const now = new Date();
  const phase = livePhase(quiz.status, quiz.questionStartedAt, quiz.secondsPerQuestion, now);
  const mine = await prisma.liveQuizAnswer.findMany({ where: { playerId: player.id }, select: { questionIndex: true, choice: true, correct: true, points: true } });
  const total = mine.reduce((s, a) => s + a.points, 0);
  const cur = mine.find((a) => a.questionIndex === quiz.currentIndex) ?? null;
  const q = phase === 'OPEN' || phase === 'CLOSED' ? await questionAt(quiz) : null;
  let finalRank: number | null = null;
  if (phase === 'FINISHED' && player.teamId) {
    const [teams, players, answers] = await Promise.all([
      prisma.liveQuizTeam.findMany({ where: { quizId: quiz.id } }),
      prisma.liveQuizPlayer.findMany({ where: { quizId: quiz.id }, select: { id: true, teamId: true } }),
      prisma.liveQuizAnswer.findMany({ where: { quizId: quiz.id }, select: { playerId: true, points: true, correct: true, questionIndex: true } }),
    ]);
    finalRank = rankTeams(teams, players, answers, -1).find((r) => r.id === player.teamId)?.rank ?? null;
  }
  return {
    id: quiz.id, phase, index: quiz.currentIndex, total: quiz.questionIds.length, seconds: quiz.secondsPerQuestion,
    secondsLeft: phase === 'OPEN' && quiz.questionStartedAt ? secondsLeft(quiz.questionStartedAt, quiz.secondsPerQuestion, now) : 0,
    teamName: player.team?.name ?? null,
    question: q ? { text: q.text, options: q.options } : null,
    answered: cur ? { choice: cur.choice } : null,
    // o resultado só aparece depois que a pergunta fecha
    result: phase === 'CLOSED' && q ? { correctIndex: q.correctIndex, correct: cur?.correct ?? false, points: cur?.points ?? 0 } : null,
    myPoints: total, finalRank,
  };
}

export async function answerLiveQuiz(studentId: string, quizId: unknown, choice: unknown) {
  const player = await prisma.liveQuizPlayer.findFirst({ where: { quizId: String(quizId ?? ''), studentId } });
  if (!player) throw new Error('Você não está nesta sala.');
  if (!player.teamId) throw new Error('O professor ainda não colocou você em uma equipe.');
  const quiz = await prisma.liveQuiz.findUniqueOrThrow({ where: { id: player.quizId } });
  const now = new Date();
  if (livePhase(quiz.status, quiz.questionStartedAt, quiz.secondsPerQuestion, now) !== 'OPEN' || !quiz.questionStartedAt) {
    throw new Error('O tempo desta pergunta acabou.');
  }
  const q = await questionAt(quiz);
  if (!q) throw new Error('Pergunta não encontrada.');
  if (typeof choice !== 'number' || !Number.isInteger(choice) || choice < 0 || choice >= q.options.length) throw new Error('Resposta inválida.');
  const elapsedMs = now.getTime() - quiz.questionStartedAt.getTime();
  const correct = choice === q.correctIndex;
  try {
    await prisma.liveQuizAnswer.create({
      data: { quizId: quiz.id, playerId: player.id, questionIndex: quiz.currentIndex, choice, correct, elapsedMs, points: livePoints(correct, elapsedMs, quiz.secondsPerQuestion * 1000) },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') throw new Error('Você já respondeu esta pergunta.');
    throw error;
  }
  return { ok: true }; // não revela se acertou: isso só aparece quando a pergunta fecha
}
