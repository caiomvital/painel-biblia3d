import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { publicError } from '@/lib/operational-log';
import { deleteTeacherQuestion, getTeacherKids, saveLessonReport, saveTeacherQuestion, updateTeacherQuestion } from '@/lib/teacher-kids-service';

async function teacher() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'PROFESSOR') return { error: NextResponse.json({ error: 'Acesso restrito ao corpo docente.' }, { status: 403 }) };
  return { id: session.id };
}

export async function GET() {
  const t = await teacher();
  if ('error' in t) return t.error;
  try {
    return NextResponse.json(await getTeacherKids(t.id));
  } catch (error) {
    return NextResponse.json({ error: publicError(error, 'Erro ao carregar seus dados.', 'teacher.kids.failed') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const t = await teacher();
  if ('error' in t) return t.error;
  try {
    const b = await req.json();
    if (b.action === 'report') return NextResponse.json(await saveLessonReport(t.id, b));
    if (b.action === 'question') return NextResponse.json(await saveTeacherQuestion(t.id, b));
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const t = await teacher();
  if ('error' in t) return t.error;
  try {
    const result = await deleteTeacherQuestion(t.id, req.nextUrl.searchParams.get('id') ?? '');
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível apagar.' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const t = await teacher();
  if ('error' in t) return t.error;
  try {
    return NextResponse.json(await updateTeacherQuestion(t.id, await req.json()));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}
