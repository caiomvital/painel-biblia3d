import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gameHtmlAllowedHere } from '@/lib/probe-guard';
import { injectGameShim } from '@/lib/game-shim';

// Serve o jogo isolado: sem acesso à sessão do site e sem acesso à rede.
const GAME_CSP =
  "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; " +
  "frame-ancestors 'self'";


/** Página de erro amigável (mesmo isolamento do jogo, sem script). Aparece dentro do iframe. */
function errorPage(message: string, status: number) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
    `<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#15123a;color:#f6f4ff;font:600 20px/1.4 system-ui,sans-serif;text-align:center;padding:24px">` +
    `<p>${message}</p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': GAME_CSP, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' },
  });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorPage('Entre no painel para jogar.', 401);
  const { id } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { id } });
  const canSee = game && ((game.status === 'APPROVED' && game.isPublic) || session.role === 'DIRETOR' ||
    (session.role === 'ALUNO' && session.studentId && game.authorStudentId === session.studentId));
  if (!game || !canSee) return errorPage('Este jogo não está disponível agora.', 404);
  // Jogos de sonda (testes de segurança) nunca são servidos fora do ambiente de teste local.
  if (!gameHtmlAllowedHere(game.html)) return errorPage('Este jogo não está disponível agora.', 404);
  if (game.status === 'APPROVED' && game.isPublic && session.role === 'ALUNO' && game.authorStudentId !== session.studentId) {
    prisma.game.update({ where: { id }, data: { plays: { increment: 1 } } }).catch(() => undefined);
  }
  // Aviso amigável injetado antes do código do jogo (desligável em lib/game-shim.ts).
  return new NextResponse(injectGameShim(game.html), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': GAME_CSP,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
