import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { maskGameAuthorForStudent } from '@/lib/privacy-mask';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const studentId = session.role === 'ALUNO' ? session.studentId : undefined;
  // Públicos = o autor pediu e a equipe aprovou. O jogo do próprio aluno aparece em "mine", nunca aqui.
  const games = await prisma.game.findMany({
    where: { status: 'APPROVED', isPublic: true, ...(studentId ? { OR: [{ authorStudentId: null }, { authorStudentId: { not: studentId } }] } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, description: true, authorName: true, authorStudentId: true, plays: true },
  });
  let mine: { id: string; title: string; description: string | null; status: string; isPublic: boolean; plays: number }[] = [];
  if (studentId) {
    mine = await prisma.game.findMany({
      where: { authorStudentId: studentId },
      orderBy: { createdAt: 'desc' }, select: { id: true, title: true, description: true, status: true, isPublic: true, plays: true },
    });
  }
  // Para alunos: autor só pelo primeiro nome. Equipe vê o nome completo.
  const visible = session.role === 'ALUNO'
    ? games.map(maskGameAuthorForStudent)
    : games.map(({ authorStudentId: _omit, ...rest }) => rest);
  return NextResponse.json({ games: visible, mine });
}

const ONLY_TEACHER = 'Os jogos são colocados no ar pelo professor. Mande o seu jogo para ele por e-mail ou WhatsApp.';

/** O aluno não envia jogo pelo sistema: manda ao professor (e-mail ou WhatsApp), que publica com o nome do aluno. */
export async function POST() {
  return NextResponse.json({ error: ONLY_TEACHER }, { status: 403 });
}
export async function PATCH() {
  return NextResponse.json({ error: ONLY_TEACHER }, { status: 403 });
}
