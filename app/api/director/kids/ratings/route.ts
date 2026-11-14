import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function director() {
  const s = await getSession();
  return s && s.role === 'DIRETOR' ? s : null;
}

export async function GET() {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  const [byTeacher, teachers, recent, setting] = await Promise.all([
    prisma.teacherRating.groupBy({ by: ['teacherId'], _avg: { score: true }, _count: true }),
    prisma.teacher.findMany({ select: { id: true, user: { select: { name: true } } } }),
    prisma.teacherRating.findMany({
      orderBy: { createdAt: 'desc' }, take: 30,
      include: { student: { select: { user: { select: { name: true } } } }, teacher: { select: { user: { select: { name: true } } } } },
    }),
    prisma.appSetting.findUnique({ where: { key: 'googleReviewUrl' } }),
  ]);
  const names = new Map(teachers.map((t) => [t.id, t.user.name]));
  return NextResponse.json({
    googleReviewUrl: setting?.value ?? '',
    teachers: byTeacher.map((t) => ({
      name: names.get(t.teacherId) ?? '—', count: t._count,
      average: t._avg.score === null ? null : Math.round(t._avg.score * 10) / 10,
    })),
    recent: recent.map((r) => ({
      id: r.id, student: r.student.user.name, teacher: r.teacher.user.name, score: r.score,
      enjoying: r.enjoying, comment: r.comment, createdAt: r.createdAt,
    })),
  });
}

export async function PUT(req: NextRequest) {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  try {
    const b = await req.json();
    const raw = typeof b.googleReviewUrl === 'string' ? b.googleReviewUrl.trim() : '';
    if (!raw) {
      await prisma.appSetting.deleteMany({ where: { key: 'googleReviewUrl' } });
      return NextResponse.json({ ok: true });
    }
    let url: URL;
    try { url = new URL(raw); } catch { throw new Error('Cole o link completo, começando com https://'); }
    const host = url.hostname.toLowerCase();
    const allowed = ['google.com', 'g.page', 'goo.gl', 'maps.app.goo.gl', 'g.co'];
    if (url.protocol !== 'https:' || !allowed.some((a) => host === a || host.endsWith('.' + a))) {
      throw new Error('O link precisa ser de avaliação do Google (google.com, g.page ou maps.app.goo.gl).');
    }
    await prisma.appSetting.upsert({
      where: { key: 'googleReviewUrl' }, update: { value: url.toString() }, create: { key: 'googleReviewUrl', value: url.toString() },
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}
