import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { publicError } from '@/lib/operational-log';
import { closedChests, openChest } from '@/lib/chest-service';

async function student() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'ALUNO' || !session.studentId) return { error: NextResponse.json({ error: 'Acesso restrito a alunos.' }, { status: 403 }) };
  return { studentId: session.studentId };
}

/** Só os baús fechados do próprio aluno. Nada de chances, de outros alunos ou do catálogo completo. */
export async function GET() {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    return NextResponse.json({ chests: await closedChests(s.studentId) });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, 'Erro ao carregar seus baús.', 'kids.chests.failed') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const s = await student();
  if ('error' in s) return s.error;
  try {
    const b = await req.json();
    return NextResponse.json(await openChest(s.studentId, b?.chestId));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível abrir o baú.' }, { status: 400 });
  }
}
