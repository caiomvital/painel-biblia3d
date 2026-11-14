import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { maskGameAuthorForStudent } from '@/lib/privacy-mask';
import { gameHtmlAllowedHere } from '@/lib/probe-guard';

const MAX_GAME_HTML = 200_000;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const games = await prisma.game.findMany({
    where: { status: 'APPROVED' }, orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, description: true, authorName: true, authorStudentId: true, plays: true },
  });
  let mine: { id: string; title: string; status: string }[] = [];
  if (session.role === 'ALUNO' && session.studentId) {
    mine = await prisma.game.findMany({
      where: { authorStudentId: session.studentId, status: { not: 'APPROVED' } },
      orderBy: { createdAt: 'desc' }, select: { id: true, title: true, status: true },
    });
  }
  // Para alunos: autor só pelo primeiro nome. Equipe vê o nome completo.
  const visible = session.role === 'ALUNO'
    ? games.map(maskGameAuthorForStudent)
    : games.map(({ authorStudentId: _omit, ...rest }) => rest);
  return NextResponse.json({ games: visible, mine });
}

/** A criança envia um jogo (HTML em um arquivo só). Fica pendente até o diretor aprovar. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'ALUNO' || !session.studentId) return NextResponse.json({ error: 'Apenas alunos enviam jogos.' }, { status: 403 });
  try {
    const b = await req.json();
    const title = String(b.title ?? '').trim();
    const description = typeof b.description === 'string' ? b.description.trim().slice(0, 200) || null : null;
    const html = String(b.html ?? '');
    if (title.length < 3 || title.length > 60) throw new Error('Dê um nome ao jogo (de 3 a 60 letras).');
    if (html.length < 20) throw new Error('Cole o código do jogo (HTML).');
    if (html.length > MAX_GAME_HTML) throw new Error('O jogo é grande demais (máximo de 200 mil caracteres).');
    if (!gameHtmlAllowedHere(html)) throw new Error('Esse conteúdo não é permitido.');
    const pending = await prisma.game.count({ where: { authorStudentId: session.studentId, status: 'PENDING' } });
    if (pending >= 3) throw new Error('Você já tem 3 jogos esperando revisão. Aguarde a aprovação!');
    const game = await prisma.game.create({
      data: { title, description, html, authorName: session.name, authorStudentId: session.studentId, status: 'PENDING' },
    });
    return NextResponse.json({ id: game.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível enviar.' }, { status: 400 });
  }
}
