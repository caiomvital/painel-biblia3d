import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseBirthDate } from '@/lib/kids-service';
import { DEFAULT_KID_PASSWORD, directorResetData } from '@/lib/password-rules';

async function director() {
  const s = await getSession();
  return s && s.role === 'DIRETOR' ? s : null;
}
const digits = (v: string) => v.replace(/\D/g, '');

export async function GET() {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  const rows = await prisma.student.findMany({
    where: { guardianPhone: { not: null } },
    include: { user: { select: { name: true } }, enrollments: { where: { status: 'ACTIVE' }, include: { class: { select: { name: true } } } } },
    orderBy: { user: { name: 'asc' } },
  });
  return NextResponse.json({
    students: rows.map((s) => ({
      id: s.id, name: s.user.name, guardianName: s.guardianName, guardianPhone: s.guardianPhone,
      birthDate: s.birthDate ? s.birthDate.toISOString().slice(0, 10) : null,
      points: s.currentXp, profileCompleted: s.profileCompleted,
      className: s.enrollments[0]?.class.name ?? null,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await director();
  if (!session) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  try {
    const b = await req.json();
    const student = await prisma.student.findUnique({ where: { id: String(b.id) } });
    if (!student) return NextResponse.json({ error: 'Aluno não encontrado.' }, { status: 404 });
    const data: Record<string, unknown> = {};
    if (typeof b.guardianPhone === 'string') {
      const phone = digits(b.guardianPhone);
      if (!/^\d{10,11}$/.test(phone)) return NextResponse.json({ error: 'Telefone inválido. Use DDD + número, ex.: 81995474295.' }, { status: 400 });
      data.guardianPhone = phone;
    }
    if (typeof b.guardianName === 'string') data.guardianName = b.guardianName.trim().slice(0, 120) || null;
    if (typeof b.birthDate === 'string' && b.birthDate) {
      const d = parseBirthDate(b.birthDate);
      if (!d) return NextResponse.json({ error: 'Data de nascimento inválida.' }, { status: 400 });
      data.birthDate = d;
    }
    if (Object.keys(data).length) await prisma.student.update({ where: { id: student.id }, data });
    if (typeof b.name === 'string' && b.name.trim().length >= 2) {
      await prisma.user.update({ where: { id: student.userId }, data: { name: b.name.trim().slice(0, 120) } });
    }
    if (b.resetPassword === true) {
      await prisma.user.update({
        where: { id: student.userId },
        data: directorResetData(await hashPassword(DEFAULT_KID_PASSWORD)),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}
