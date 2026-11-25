// O professor ajusta os dias e o horário das próprias turmas (o resto da turma é da direção).
import { prisma } from '@/lib/prisma';

export const WEEK_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateOwnClassSchedule(userId: string, input: { classId?: unknown; daysOfWeek?: unknown; startTime?: unknown; endTime?: unknown }) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new Error('Cadastro de professor não encontrado.');
  if (typeof input.classId !== 'string') throw new Error('Escolha a turma.');
  const cls = await prisma.class.findFirst({ where: { id: input.classId, teacherId: teacher.id } });
  if (!cls) throw new Error('Essa turma não está atribuída a você.');
  const days = Array.isArray(input.daysOfWeek) ? input.daysOfWeek : [input.daysOfWeek];
  if (days.length < 1 || !days.every((d) => (WEEK_DAYS as readonly unknown[]).includes(d))) throw new Error('Escolha o dia da semana.');
  const { startTime, endTime } = input;
  if (typeof startTime !== 'string' || typeof endTime !== 'string' || !TIME.test(startTime) || !TIME.test(endTime)) throw new Error('Informe o horário de início e de fim.');
  if (endTime <= startTime) throw new Error('O fim precisa ser depois do início.');
  const ordered = WEEK_DAYS.filter((d) => days.includes(d));
  const updated = await prisma.class.update({
    where: { id: cls.id },
    data: { daysOfWeek: ordered.join(','), scheduleTime: `${startTime} - ${endTime}` },
    select: { id: true, daysOfWeek: true, scheduleTime: true },
  });
  return updated;
}
