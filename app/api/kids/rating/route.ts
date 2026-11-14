import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { submitTeacherRating } from '@/lib/kids-service';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'ALUNO' || !session.studentId) return NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 });
  try {
    return NextResponse.json(await submitTeacherRating(session.studentId, await req.json()));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível enviar.' }, { status: 400 });
  }
}
