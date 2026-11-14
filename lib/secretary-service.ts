import { prisma } from "./prisma";
import { initialPasswordHash } from "./account-password";
import { createClassByDirector } from "./academic-service";

export async function createSecretary(data: { name: string; email: string; initialPassword?: string }) {
  const name = data.name?.trim();
  const email = data.email?.trim().toLowerCase();
  if (!name || name.length > 120 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Informe nome e e-mail válidos.");
  const passwordHash = await initialPasswordHash(data.initialPassword);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash, role: "SECRETARIA" } });
    await tx.profile.create({ data: { userId: user.id, bio: `Secretaria acadêmica da Bíblia 3D.` } });
    return { id: user.id, name: user.name, email: user.email };
  });
}

export async function getSecretaryDashboard() {
  const [classes, courses, teachers, students] = await Promise.all([
    prisma.class.findMany({ select: { id: true, name: true, code: true, status: true, course: { select: { name: true } }, teacher: { select: { user: { select: { name: true } } } }, daysOfWeek: true, scheduleTime: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } }, orderBy: { code: "asc" } }),
    prisma.course.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.teacher.findMany({ select: { id: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.student.findMany({ where: { enrollments: { none: { status: "ACTIVE" } } }, select: { id: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  return {
    classes: classes.map((c) => ({ id: c.id, name: c.name, code: c.code, status: c.status, courseName: c.course.name, teacherName: c.teacher?.user.name ?? "Sem professor", daysOfWeek: c.daysOfWeek, scheduleTime: c.scheduleTime, enrolledCount: c._count.enrollments })),
    courses,
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.name })),
    students: students.map((s) => ({ id: s.id, name: s.user.name })),
  };
}

export async function createSecretaryClass(data: Parameters<typeof createClassByDirector>[0]) {
  return createClassByDirector(data);
}
