import { prisma } from "./prisma";

async function assignedTeacherClass(userId: string, classId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
  if (!teacher) throw Object.assign(new Error("Perfil de professor não encontrado."), { statusCode: 403 });
  const studentClass = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, teacherId: true, status: true } });
  if (!studentClass) throw Object.assign(new Error("Turma não encontrada."), { statusCode: 404 });
  if (studentClass.teacherId !== teacher.id) throw Object.assign(new Error("Você só pode gerenciar alunos das suas turmas."), { statusCode: 403 });
  if (studentClass.status === "FINISHED") throw Object.assign(new Error("Não é possível alterar matrículas de uma turma encerrada."), { statusCode: 409 });
  return studentClass;
}

export async function availableStudentsForTeacher(userId: string, classId: string) {
  await assignedTeacherClass(userId, classId);
  return prisma.student.findMany({
    where: {
      enrollments: {
        none: {
          OR: [
            { status: "ACTIVE" },
            { classId, status: "COMPLETED" },
          ],
        },
      },
    },
    select: { id: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  }).then((students) => students.map((student) => ({
    id: student.id,
    name: student.user.name,
  })));
}

export async function enrollStudentByTeacher(userId: string, studentId: string, classId: string) {
  return prisma.$transaction(async (tx) => {
    const teacher = await tx.teacher.findUnique({ where: { userId }, select: { id: true } });
    const studentClass = teacher && await tx.class.findUnique({ where: { id: classId }, select: { id: true, teacherId: true, status: true } });
    if (!teacher) throw Object.assign(new Error("Perfil de professor não encontrado."), { statusCode: 403 });
    if (!studentClass) throw Object.assign(new Error("Turma não encontrada."), { statusCode: 404 });
    if (studentClass.teacherId !== teacher.id) throw Object.assign(new Error("Você só pode gerenciar alunos das suas turmas."), { statusCode: 403 });
    if (studentClass.status === "FINISHED") throw Object.assign(new Error("Não é possível alterar matrículas de uma turma encerrada."), { statusCode: 409 });
    const student = await tx.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) throw Object.assign(new Error("Aluno não encontrado."), { statusCode: 404 });

    const activeEnrollment = await tx.enrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      select: { id: true, classId: true },
    });
    if (activeEnrollment) {
      throw Object.assign(new Error(activeEnrollment.classId === classId
        ? "Este aluno já está matriculado nesta turma."
        : "Este aluno já tem matrícula ativa em outra turma. A direção deve ajustar a matrícula."), { statusCode: 409 });
    }

    const existing = await tx.enrollment.findUnique({ where: { studentId_classId: { studentId, classId } } });
    if (existing?.status === "COMPLETED") {
      throw Object.assign(new Error("A matrícula desta turma já foi concluída. A direção pode revisar a situação."), { statusCode: 409 });
    }
    if (existing) {
      return tx.enrollment.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
    }
    return tx.enrollment.create({ data: { studentId, classId, status: "ACTIVE" } });
  });
}

export async function dropEnrollmentByTeacher(userId: string, enrollmentId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
  if (!teacher) throw Object.assign(new Error("Perfil de professor não encontrado."), { statusCode: 403 });
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { class: { select: { teacherId: true, status: true } } },
  });
  if (!enrollment) throw Object.assign(new Error("Matrícula não encontrada."), { statusCode: 404 });
  if (enrollment.class.teacherId !== teacher.id) throw Object.assign(new Error("Você só pode remover alunos das suas turmas."), { statusCode: 403 });
  if (enrollment.class.status === "FINISHED") throw Object.assign(new Error("Não é possível alterar matrículas de uma turma encerrada."), { statusCode: 409 });
  if (enrollment.status === "COMPLETED") throw Object.assign(new Error("A matrícula concluída deve ser ajustada pela direção."), { statusCode: 409 });
  if (enrollment.status === "DROPPED") return enrollment;
  return prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "DROPPED" } });
}
