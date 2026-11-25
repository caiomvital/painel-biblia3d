import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateOwnClassSchedule } from '@/lib/teacher-classes';

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'PROFESSOR') return NextResponse.json({ error: 'Acesso restrito ao professor.' }, { status: 403 });
  try {
    return NextResponse.json(await updateOwnClassSchedule(session.id, await req.json()));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}
