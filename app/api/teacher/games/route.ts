import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gameHtmlAllowedHere } from '@/lib/probe-guard';
import { scanGameHtml, scanMessage } from '@/lib/game-scan';
import { teacherStudentIds } from '@/lib/teacher-games';

const MAX_HTML = 200_000;

/**
 * O professor envia um jogo (arquivo HTML), que o aluno mandou por fora (e-mail ou WhatsApp), e escolhe o aluno autor
 * (opcional, só entre os alunos das turmas dele). Ele aprova na hora, então já fica disponível para todos os alunos.
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
    const studentId = typeof b.studentId === 'string' && b.studentId ? b.studentId : null;
    let authorName = session.name;
    if (studentId) {
      if (!(await teacherStudentIds(session.id)).includes(studentId)) throw new Error('Esse aluno não é de nenhuma das suas turmas.');
      const st = await prisma.student.findUnique({ where: { id: studentId }, select: { user: { select: { name: true } } } });
      if (!st) throw new Error('Aluno não encontrado.');
      authorName = st.user.name;
    }
    const game = await prisma.game.create({
      data: { title, description, html, authorName, authorStudentId: studentId, authorUserId: session.id, isPublic: true, status: 'APPROVED' },
    });
    return NextResponse.json({ id: game.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível enviar.' }, { status: 400 });
  }
}

async function teacher() {
  const s = await getSession();
  return s && s.role === 'PROFESSOR' ? s : null;
}

/** ?mine=1: os jogos que o próprio professor publicou. ?students=1: alunos das turmas dele (para escolher o autor). */
export async function GET(req: NextRequest) {
  const t = await teacher();
  if (!t) return NextResponse.json({ error: 'Acesso restrito ao corpo docente.' }, { status: 403 });
  if (req.nextUrl.searchParams.get('students') === '1') {
    const ids = await teacherStudentIds(t.id);
    const rows = await prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, user: { select: { name: true } } } });
    const students = rows.map((r) => ({ id: r.id, name: r.user.name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return NextResponse.json({ students });
  }
  if (req.nextUrl.searchParams.get('mine') === '1') {
    const own = await prisma.game.findMany({
      where: { authorUserId: t.id }, orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, plays: true, createdAt: true, authorStudentId: true, authorName: true },
    });
    return NextResponse.json({ games: own.map(({ authorStudentId, authorName, ...g }) => ({ ...g, authorName: authorStudentId ? authorName : null, createdAt: g.createdAt.toISOString() })) });
  }
  return NextResponse.json({ error: 'Informe o que listar.' }, { status: 400 });
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
