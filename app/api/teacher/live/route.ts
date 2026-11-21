import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { publicError } from '@/lib/operational-log';
import { createLiveQuiz, currentLiveQuizId, livePickableQuestions, teacherLiveAction, teacherLiveState } from '@/lib/live-quiz-service';

async function teacher() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'PROFESSOR') return { error: NextResponse.json({ error: 'Acesso restrito ao corpo docente.' }, { status: 403 }) };
  return { id: session.id };
}

/** Sem `id`: sala aberta (se houver) e perguntas disponíveis. Com `id`: estado ao vivo da sala. */
export async function GET(req: NextRequest) {
  const t = await teacher();
  if ('error' in t) return t.error;
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (id) return NextResponse.json(await teacherLiveState(t.id, id));
    const [currentId, questions] = await Promise.all([currentLiveQuizId(t.id), livePickableQuestions(t.id)]);
    return NextResponse.json({ currentId, questions });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao carregar o quiz ao vivo.', 'teacher.live.failed') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const t = await teacher();
  if ('error' in t) return t.error;
  try {
    const b = await req.json();
    if (b.action === 'create') return NextResponse.json(await createLiveQuiz(t.id, b));
    return NextResponse.json(await teacherLiveAction(t.id, b.id, b.action, b));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível concluir.' }, { status: 400 });
  }
}
