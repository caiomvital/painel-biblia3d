import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gameHtmlAllowedHere } from '@/lib/probe-guard';
import { scanGameHtml, scanMessage } from '@/lib/game-scan';

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
    const game = await prisma.game.create({ data: { title, description, html, authorName: session.name, isPublic: true, status: 'APPROVED' } });
    return NextResponse.json({ id: game.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível enviar.' }, { status: 400 });
  }
}
