import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { markAttitudesSeen, pendingAttitudeRewards } from '@/lib/attitude-service';

async function student() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'ALUNO' || !session.studentId) return { error: NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 }) };
  return { studentId: session.studentId };
}

/** O aluno só recebe totais dele. Nada de quem registrou, de colegas ou de pontos de atenção. */
export async function GET() {
  const s = await student();
  if ('error' in s) return s.error;
  return NextResponse.json(await pendingAttitudeRewards(s.studentId));
}

export async function POST(req: NextRequest) {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    const b = await req.json();
    return NextResponse.json(await markAttitudesSeen(s.studentId, b?.upTo));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível concluir.' }, { status: 400 });
  }
}
