import { prisma } from '@/lib/prisma';

/** Horário de Recife não tem horário de verão: "2026-12-05T19:30" vira o instante certo (UTC-3). */
export function parseRecifeDateTime(value: unknown): Date {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) throw new Error('Informe a data e a hora do evento.');
  const date = new Date(`${text}:00-03:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Data ou hora inválida.');
  return date;
}

/** Valida e limpa os campos de um evento. */
export function cleanEventInput(b: any) {
  const title = String(b.title ?? '').trim();
  if (title.length < 3 || title.length > 80) throw new Error('Dê um nome ao evento (de 3 a 80 letras).');
  const description = typeof b.description === 'string' ? b.description.trim().slice(0, 300) || null : null;
  const location = typeof b.location === 'string' ? b.location.trim().slice(0, 80) || null : null;
  const startsAt = parseRecifeDateTime(b.startsAt);
  if (startsAt.getTime() < Date.now() - 24 * 3600 * 1000) throw new Error('A data do evento já passou.');
  const classId = typeof b.classId === 'string' && b.classId ? b.classId : null;
  return { title, description, location, startsAt, classId };
}

/** Turmas ativas em que o aluno está matriculado. */
export async function studentClassIds(studentId: string): Promise<string[]> {
  const rows = await prisma.enrollment.findMany({ where: { studentId, status: 'ACTIVE' }, select: { classId: true } });
  return rows.map((r) => r.classId);
}
