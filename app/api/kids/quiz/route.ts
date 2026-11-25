import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkQuizAnswer, getQuiz, submitQuiz, type QuizKindName } from '@/lib/kids-service';
import { publicError } from '@/lib/operational-log';

async function student() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'ALUNO' || !session.studentId) return { error: NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 }) };
  return { id: session.studentId };
}
const kindOf = (v: unknown): QuizKindName => (v === 'weekly' ? 'weekly' : 'daily');

export async function GET(req: NextRequest) {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    return NextResponse.json(await getQuiz(s.id, kindOf(req.nextUrl.searchParams.get('kind'))));
  } catch (error) {
    return NextResponse.json({ error: publicError(error, 'Erro ao carregar o desafio.', 'kids.quiz.failed') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    const body = await req.json();
    if (body?.check === true) return NextResponse.json(await checkQuizAnswer(s.id, kindOf(body?.kind), body?.index, body?.choice));
    return NextResponse.json(await submitQuiz(s.id, kindOf(body?.kind)));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível enviar.' }, { status: 400 });
  }
}
