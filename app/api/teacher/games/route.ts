import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gameHtmlAllowedHere } from '@/lib/probe-guard';
import { scanGameHtml, scanMessage } from '@/lib/game-scan';
import { teacherStudentIds } from '@/lib/teacher-games';

const MAX_HTML = 200_000;

/**
 * O professor envia um jogo (arquivo HTML). Ele aprova na hora, então já fica disponível para todos os alunos.
 * Antes de aceitar, o código passa pela varredura automática; se tiver algo suspeito, é recusado com o motivo.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'PROFESSOR') return NextResponse.json({ error: 'Apenas professores enviam jogos por aqui.' }, { status: 403 });
  try {
    const b = await req.json();
    const title = String(b.title ?? '').trim();
    const description = typeof b.description === 'string' ? b.description.trim().slice(0, 200) || null : null;
    const html = String(b.html ?? '');
    if (title.length < 3 || title.length > 60) throw new Error('Dê um nome ao jogo (de 3 a 60 letras).');
    if (html.length < 20) throw new Error('O arquivo do jogo está vazio.');
    if (html.length > MAX_HTML) throw new Error('O jogo é grande demais (máximo de 200 mil caracteres).');
    if (!gameHtmlAllowedHere(html)) throw new Error('Esse conteúdo não é permitido.');
    const scan = scanGameHtml(html);
    if (!scan.ok) throw new Error(scanMessage(scan));
    const game = await prisma.game.create({ data: { title, description, html, authorName: session.name, authorUserId: session.id, isPublic: true, status: 'APPROVED' } });
    return NextResponse.json({ id: game.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível enviar.' }, { status: 400 });
  }
}

async function teacher() {
  const s = await getSession();
  return s && s.role === 'PROFESSOR' ? s : null;
}

/** Jogos que os alunos das turmas do professor pediram para tornar públicos (aguardando, aprovados e rejeitados).
 *  Com ?mine=1: os jogos que o próprio professor enviou. */
export async function GET(req: NextRequest) {
  const t = await teacher();
  if (!t) return NextResponse.json({ error: 'Acesso restrito ao corpo docente.' }, { status: 403 });
  if (req.nextUrl.searchParams.get('mine') === '1') {
    const own = await prisma.game.findMany({
      where: { authorUserId: t.id }, orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, plays: true, createdAt: true },
    });
    return NextResponse.json({ games: own.map((g) => ({ ...g, createdAt: g.createdAt.toISOString() })) });
  }
  const ids = await teacherStudentIds(t.id);
  const games = await prisma.game.findMany({
    where: { authorStudentId: { in: ids }, isPublic: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, title: true, description: true, authorName: true, status: true, plays: true, html: true },
  });
  return NextResponse.json({ games: games.map(({ html, ...g }) => ({ ...g, scanProblems: scanGameHtml(html).problems })) });
}

/** O professor aprova ou rejeita o jogo de um aluno da turma dele. Só aprova se o código passar na varredura. */
export async function PATCH(req: NextRequest) {
  const t = await teacher();
  if (!t) return NextResponse.json({ error: 'Acesso restrito ao corpo docente.' }, { status: 403 });
  try {
    const b = await req.json();
    if (b.status !== 'APPROVED' && b.status !== 'REJECTED') throw new Error('Escolha aprovar ou rejeitar.');
    const game = await prisma.game.findUnique({ where: { id: String(b.id) } });
    const ids = await teacherStudentIds(t.id);
    if (!game || !game.isPublic || !game.authorStudentId || !ids.includes(game.authorStudentId)) throw new Error('Esse jogo não é de um aluno das suas turmas.');
    if (b.status === 'APPROVED') {
      const scan = scanGameHtml(game.html);
      if (!scan.ok) throw new Error(scanMessage(scan));
    }
    await prisma.game.update({ where: { id: game.id }, data: { status: b.status } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}

/** O professor apaga um jogo que ele mesmo enviou. */
export async function DELETE(req: NextRequest) {
  const t = await teacher();
  if (!t) return NextResponse.json({ error: 'Acesso restrito ao corpo docente.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe o jogo.' }, { status: 400 });
  const game = await prisma.game.findUnique({ where: { id }, select: { authorUserId: true } });
  if (!game) return NextResponse.json({ ok: true });
  if (game.authorUserId !== t.id) return NextResponse.json({ error: 'Você só apaga os jogos que você enviou.' }, { status: 403 });
  await prisma.game.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
