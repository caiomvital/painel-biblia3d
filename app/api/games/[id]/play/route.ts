import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Serve o jogo isolado: sem acesso à sessão do site e sem acesso à rede.
const GAME_CSP =
  "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse('Faça login para jogar.', { status: 401 });
  const { id } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { id } });
  const canSee = game && (game.status === 'APPROVED' || session.role === 'DIRETOR' ||
    (session.role === 'ALUNO' && session.studentId && game.authorStudentId === session.studentId));
  if (!game || !canSee) return new NextResponse('Jogo não encontrado.', { status: 404 });
  if (game.status === 'APPROVED' && session.role === 'ALUNO') {
    prisma.game.update({ where: { id }, data: { plays: { increment: 1 } } }).catch(() => undefined);
  }
  return new NextResponse(game.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': GAME_CSP,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
