import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { publicError } from '@/lib/operational-log';
import { answerLiveQuiz, joinLiveQuiz, studentLiveQuizId, studentLiveState } from '@/lib/live-quiz-service';

async function student() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'ALUNO' || !session.studentId) return { error: NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 }) };
  return { studentId: session.studentId };
}

/** Sem `id`: em qual sala o aluno está (ou null). Com `id`: estado da sala para ele. */
export async function GET(req: NextRequest) {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (id) return NextResponse.json(await studentLiveState(s.studentId, id));
    return NextResponse.json({ id: await studentLiveQuizId(s.studentId) });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao carregar o quiz ao vivo.', 'kids.live.failed') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    const b = await req.json();
    if (b.action === 'join') return NextResponse.json(await joinLiveQuiz(s.studentId, b.pin));
    if (b.action === 'answer') return NextResponse.json(await answerLiveQuiz(s.studentId, b.id, b.choice));
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível concluir.' }, { status: 400 });
  }
}
