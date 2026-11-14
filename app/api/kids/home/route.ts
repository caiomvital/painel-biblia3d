import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getKidsHome } from '@/lib/kids-service';
import { publicError } from '@/lib/operational-log';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'ALUNO' || !session.studentId) return NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 });
  try {
    return NextResponse.json(await getKidsHome(session.studentId));
  } catch (error) {
    return NextResponse.json({ error: publicError(error, 'Erro ao carregar seu painel.', 'kids.home.failed') }, { status: 500 });
  }
}
