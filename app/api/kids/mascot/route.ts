import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { publicError } from '@/lib/operational-log';
import { getCollection, saveLook } from '@/lib/collection-service';

async function student() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'ALUNO' || !session.studentId) return { error: NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 }) };
  return { studentId: session.studentId };
}

/** Coleção do próprio aluno: o que ele tem (com nome) e silhuetas do que falta (sem nome, código nem raridade). */
export async function GET() {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    return NextResponse.json(await getCollection(s.studentId));
  } catch (error) {
    return NextResponse.json({ error: publicError(error, 'Erro ao carregar sua coleção.', 'kids.mascot.failed') }, { status: 500 });
  }
}

/** Equipa itens no Lofi. O servidor só aceita o que está no inventário e no encaixe certo. */
export async function PUT(req: NextRequest) {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    const b = await req.json();
    return NextResponse.json(await saveLook(s.studentId, b?.look));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}
