import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cleanEventInput } from '@/lib/school-events';

async function staff() {
  const s = await getSession();
  return s && (s.role === 'PROFESSOR' || s.role === 'DIRETOR') ? s : null;
}

/** Turmas que a pessoa pode usar num evento: o professor, as dele; a direção, todas as ativas. */
async function allowedClasses(s: { id: string; role: string }) {
  if (s.role === 'DIRETOR') return prisma.class.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const teacher = await prisma.teacher.findUnique({ where: { userId: s.id } });
  if (!teacher) return [];
  return prisma.class.findMany({ where: { teacherId: teacher.id, status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

/** Eventos que o professor ou a direção cadastraram (a direção vê todos; o professor, os das suas turmas e os que criou). */
export async function GET() {
  const s = await staff();
  if (!s) return NextResponse.json({ error: 'Acesso restrito à equipe.' }, { status: 403 });
  const classes = await allowedClasses(s);
  const where = s.role === 'DIRETOR' ? {} : { OR: [{ createdById: s.id }, { classId: { in: classes.map((c) => c.id) } }] };
  const events = await prisma.schoolEvent.findMany({ where, orderBy: { startsAt: 'asc' }, include: { class: { select: { name: true } } } });
  return NextResponse.json({
    classes, canSchoolWide: s.role === 'DIRETOR',
    events: events.map((e) => ({
      id: e.id, title: e.title, description: e.description, location: e.location, startsAt: e.startsAt.toISOString(),
      className: e.class?.name ?? null, createdByName: e.createdByName, mine: e.createdById === s.id,
    })),
  });
}

export async function POST(req: NextRequest) {
  const s = await staff();
  if (!s) return NextResponse.json({ error: 'Acesso restrito à equipe.' }, { status: 403 });
  try {
    const data = cleanEventInput(await req.json());
    const classes = await allowedClasses(s);
    if (data.classId) {
      if (!classes.some((c) => c.id === data.classId)) throw new Error('Essa turma não é sua.');
    } else if (s.role !== 'DIRETOR') {
      throw new Error('Escolha a turma do evento. Só a direção cria eventos para a escola toda.');
    }
    const event = await prisma.schoolEvent.create({ data: { ...data, createdById: s.id, createdByName: s.name } });
    return NextResponse.json({ id: event.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar o evento.' }, { status: 400 });
  }
}

/** O professor apaga só os eventos que criou; a direção apaga qualquer um. */
export async function DELETE(req: NextRequest) {
  const s = await staff();
  if (!s) return NextResponse.json({ error: 'Acesso restrito à equipe.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe o evento.' }, { status: 400 });
  const event = await prisma.schoolEvent.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ ok: true });
  if (s.role !== 'DIRETOR' && event.createdById !== s.id) return NextResponse.json({ error: 'Você só apaga os eventos que criou.' }, { status: 403 });
  await prisma.schoolEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
