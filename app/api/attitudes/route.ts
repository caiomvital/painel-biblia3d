import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { publicError } from '@/lib/operational-log';
import { attitudeHistory, attitudeSetup, classStudents, recordAttitudes } from '@/lib/attitude-service';

async function actor() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'PROFESSOR' && session.role !== 'DIRETOR') {
    return { error: NextResponse.json({ error: 'Acesso restrito a professores e diretores.' }, { status: 403 }) };
  }
  return { actor: { id: session.id, role: session.role } };
}

function fail(error: any, fallback: string) {
  const status = error?.statusCode === 403 ? 403 : 400;
  return NextResponse.json({ error: error?.message || fallback }, { status });
}

export async function GET(req: NextRequest) {
  const a = await actor();
  if ('error' in a) return a.error;
  const q = req.nextUrl.searchParams;
  try {
    const view = q.get('view') ?? 'setup';
    if (view === 'students') return NextResponse.json({ students: await classStudents(a.actor, q.get('classId')) });
    if (view === 'history') return NextResponse.json({ items: await attitudeHistory(a.actor, { classId: q.get('classId'), studentId: q.get('studentId') }) });
    return NextResponse.json(await attitudeSetup(a.actor));
  } catch (error: any) {
    if (error?.statusCode) return fail(error, 'Não foi possível carregar.');
    return NextResponse.json({ error: publicError(error, 'Erro ao carregar atitudes.', 'attitudes.get.failed') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const a = await actor();
  if ('error' in a) return a.error;
  try {
    const b = await req.json();
    return NextResponse.json(await recordAttitudes(a.actor, b));
  } catch (error: any) {
    return fail(error, 'Não foi possível registrar.');
  }
}
