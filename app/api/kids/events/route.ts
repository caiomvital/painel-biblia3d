import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { studentClassIds } from '@/lib/school-events';

/** Eventos da escola toda e da turma do aluno: os próximos e os últimos que já passaram. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'ALUNO' || !session.studentId) return NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 });
  const classIds = await studentClassIds(session.studentId);
  const where = { OR: [{ classId: null }, { classId: { in: classIds } }] };
  const now = new Date();
  const since = new Date(now.getTime() - 3 * 3600 * 1000); // um evento fica "agora" por 3 horas
  const [upcoming, past] = await Promise.all([
    prisma.schoolEvent.findMany({ where: { AND: [where, { startsAt: { gte: since } }] }, orderBy: { startsAt: 'asc' }, take: 30, include: { class: { select: { name: true } } } }),
    prisma.schoolEvent.findMany({ where: { AND: [where, { startsAt: { lt: since } }] }, orderBy: { startsAt: 'desc' }, take: 5, include: { class: { select: { name: true } } } }),
  ]);
  const shape = (e: (typeof upcoming)[number]) => ({
    id: e.id, title: e.title, description: e.description, location: e.location, startsAt: e.startsAt.toISOString(), className: e.class?.name ?? null,
  });
  return NextResponse.json({ upcoming: upcoming.map(shape), past: past.map(shape) });
}
