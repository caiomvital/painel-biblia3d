import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { awardTap } from '@/lib/kids-service';

/** Pontos por toque em botão. O servidor decide: intervalo de 20 s e teto diário valem aqui, não no celular. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'ALUNO' || !session.studentId) return NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 });
  try {
    return NextResponse.json(await awardTap(session.studentId));
  } catch (error) {
    console.error('kids.tap.failed', error);
    return NextResponse.json({ awarded: false }, { status: 200 });
  }
}
