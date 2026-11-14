import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function director() {
  const s = await getSession();
  return s && s.role === 'DIRETOR' ? s : null;
}

export async function GET() {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  const prize = await prisma.prize.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ prize });
}

export async function PUT(req: NextRequest) {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  try {
    const b = await req.json();
    const title = String(b.title ?? '').trim();
    const pointsGoal = Number(b.pointsGoal);
    if (title.length < 3 || title.length > 120) throw new Error('Informe o nome do prêmio.');
    if (!Number.isInteger(pointsGoal) || pointsGoal < 1 || pointsGoal > 1000000) throw new Error('Informe a meta de pontos.');
    const description = typeof b.description === 'string' ? b.description.trim().slice(0, 300) || null : null;
    await prisma.prize.updateMany({ where: { active: true }, data: { active: false } });
    const prize = await prisma.prize.create({ data: { title, description, pointsGoal } });
    return NextResponse.json({ prize });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}
