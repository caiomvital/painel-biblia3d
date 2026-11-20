import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gameHtmlAllowedHere } from '@/lib/probe-guard';
import { gameNavigationRisk } from '@/lib/game-risk';

const MAX_HTML = 200_000;

async function director() {
  const s = await getSession();
  return s && s.role === 'DIRETOR' ? s : null;
}

export async function GET() {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  const games = await prisma.game.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, title: true, description: true, authorName: true, status: true, isPublic: true, plays: true, html: true },
  });
  return NextResponse.json({ games: games.map(({ html, ...g }) => ({ ...g, navRisk: gameNavigationRisk(html) })) });
}

export async function POST(req: NextRequest) {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  try {
    const b = await req.json();
    const title = String(b.title ?? '').trim();
    const authorName = String(b.authorName ?? '').trim();
    const html = String(b.html ?? '');
    if (title.length < 3 || title.length > 60) throw new Error('Dê um nome ao jogo (de 3 a 60 letras).');
    if (authorName.length < 2 || authorName.length > 80) throw new Error('Informe quem criou o jogo.');
    if (html.length < 20 || html.length > MAX_HTML) throw new Error('Cole o código do jogo (até 200 mil caracteres).');
    if (!gameHtmlAllowedHere(html)) throw new Error('Esse conteúdo não é permitido.');
    const description = typeof b.description === 'string' ? b.description.trim().slice(0, 200) || null : null;
    const game = await prisma.game.create({ data: { title, authorName, description, html, status: 'APPROVED', isPublic: true } });
    return NextResponse.json({ id: game.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  try {
    const b = await req.json();
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(b.status)) throw new Error('Status inválido.');
    await prisma.game.update({ where: { id: String(b.id) }, data: { status: b.status } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe o jogo.' }, { status: 400 });
  await prisma.game.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
