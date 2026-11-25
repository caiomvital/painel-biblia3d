import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRollCall, saveRollCall } from '@/lib/teacher-roll-call';

async function teacher() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'PROFESSOR') return { error: NextResponse.json({ error: 'Acesso restrito ao professor.' }, { status: 403 }) };
  return { userId: session.id };
}

export async function GET(req: NextRequest) {
  const t = await teacher();
  if ('error' in t) return t.error;
  try {
    const q = req.nextUrl.searchParams;
    return NextResponse.json(await getRollCall(t.userId, q.get('classId'), q.get('day')));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao carregar a chamada.' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const t = await teacher();
  if ('error' in t) return t.error;
  try {
    return NextResponse.json(await saveRollCall(t.userId, await req.json()));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar a chamada.' }, { status: 400 });
  }
}
