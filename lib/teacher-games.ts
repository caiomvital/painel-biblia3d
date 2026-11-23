import { prisma } from '@/lib/prisma';

/** Ids dos alunos matriculados nas turmas do professor (quem ele pode revisar). */
export async function teacherStudentIds(userId: string): Promise<string[]> {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) return [];
  const rows = await prisma.enrollment.findMany({ where: { class: { teacherId: teacher.id } }, select: { studentId: true } });
  return Array.from(new Set(rows.map((r) => r.studentId)));
}
