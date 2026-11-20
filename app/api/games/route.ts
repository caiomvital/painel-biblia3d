import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { maskGameAuthorForStudent } from '@/lib/privacy-mask';
import { gameHtmlAllowedHere } from '@/lib/probe-guard';

const MAX_GAME_HTML = 200_000;

async function assertCanRequestPublic(studentId: string) {
  const pending = await prisma.game.count({ where: { authorStudentId: studentId, isPublic: true, status: 'PENDING' } });
  if (pending >= 3) throw new Error('Você já tem 3 jogos esperando revisão. Aguarde a aprovação!');
}

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

/**
 * A criança envia um jogo (HTML em um arquivo só). Sem "Tornar público" ele é só dela. Com "Tornar público" fica
 * pendente até a equipe aprovar; só então os colegas veem.
 */
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
    const isPublic = b.isPublic === true;
    if (isPublic) await assertCanRequestPublic(session.studentId);
    const game = await prisma.game.create({
      data: { title, description, html, authorName: session.name, authorStudentId: session.studentId, isPublic, status: isPublic ? 'PENDING' : 'APPROVED' },
    });
    return NextResponse.json({ id: game.id, isPublic });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível enviar.' }, { status: 400 });
  }
}

/** O autor muda a visibilidade do próprio jogo: pedir para tornar público (vai para revisão) ou voltar a deixar só dele. */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'ALUNO' || !session.studentId) return NextResponse.json({ error: 'Apenas alunos mudam seus jogos.' }, { status: 403 });
  try {
    const b = await req.json();
    const game = await prisma.game.findUnique({ where: { id: String(b.id) } });
    if (!game || game.authorStudentId !== session.studentId) throw new Error('Jogo não encontrado.');
    if (typeof b.isPublic !== 'boolean') throw new Error('Escolha público ou só meu.');
    if (b.isPublic) {
      if (game.isPublic && game.status !== 'REJECTED') return NextResponse.json({ ok: true });
      await assertCanRequestPublic(session.studentId);
      await prisma.game.update({ where: { id: game.id }, data: { isPublic: true, status: 'PENDING' } });
    } else {
      await prisma.game.update({ where: { id: game.id }, data: { isPublic: false, status: 'APPROVED' } });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}
