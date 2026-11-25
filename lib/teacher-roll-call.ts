// Chamada do professor: marca quem veio à aula. Reaproveita a presença oficial (Attendance), com o mesmo XP/fichas/sequência.
import { prisma } from '@/lib/prisma';
import { brazilDay } from '@/lib/kids-service';
import { confirmTeacherAttendance } from '@/lib/academic-service';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function ownClass(userId: string, classId: unknown) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new Error('Cadastro de professor não encontrado.');
  if (typeof classId !== 'string') throw new Error('Escolha a turma.');
  const cls = await prisma.class.findFirst({ where: { id: classId, teacherId: teacher.id } });
  if (!cls) throw new Error('Essa turma não está atribuída a você.');
  return cls;
}

function checkDay(day: unknown): string {
  const d = typeof day === 'string' && DAY.test(day) ? day : brazilDay();
  if (d > brazilDay()) throw new Error('A chamada não pode ser de um dia futuro.');
  return d;
}

/** Lista os alunos ativos da turma e quem já está com presença confirmada nesse dia. */
export async function getRollCall(userId: string, classId: unknown, dayIn: unknown) {
  const cls = await ownClass(userId, classId);
  const day = checkDay(dayIn);
  const [enrollments, lesson] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classId: cls.id, status: 'ACTIVE' },
      select: { student: { select: { id: true, user: { select: { name: true } } } } },
    }),
    prisma.lesson.findFirst({ where: { classId: cls.id, date: { gte: new Date(`${day}T00:00:00Z`), lt: new Date(`${day}T23:59:59Z`) } }, include: { attendances: { select: { studentId: true, status: true } } } }),
  ]);
  const status = new Map((lesson?.attendances ?? []).map((a) => [a.studentId, a.status]));
  const students = enrollments
    .map((e) => ({ id: e.student.id, name: e.student.user.name, status: status.get(e.student.id) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { classId: cls.id, day, students };
}

/** Salva a chamada: quem está em `presentIds` fica PRESENTE (e ganha os pontos de presença uma vez); os outros ficam FALTOU. */
export async function saveRollCall(userId: string, input: { classId?: unknown; day?: unknown; presentIds?: unknown }) {
  const cls = await ownClass(userId, input.classId);
  const day = checkDay(input.day);
  if (!Array.isArray(input.presentIds) || !input.presentIds.every((x) => typeof x === 'string')) throw new Error('Lista de presentes inválida.');
  const present = new Set(input.presentIds as string[]);
  const enrolled = await prisma.enrollment.findMany({ where: { classId: cls.id, status: 'ACTIVE' }, select: { studentId: true } });
  const ids = new Set(enrolled.map((e) => e.studentId));
  if ([...present].some((id) => !ids.has(id))) throw new Error('Há aluno que não é desta turma.');

  const date = new Date(`${day}T12:00:00Z`);
  let lesson = await prisma.lesson.findFirst({ where: { classId: cls.id, date: { gte: new Date(`${day}T00:00:00Z`), lt: new Date(`${day}T23:59:59Z`) } } });
  if (!lesson) {
    const n = await prisma.lesson.count({ where: { classId: cls.id } });
    lesson = await prisma.lesson.create({
      data: {
        classId: cls.id, teacherId: cls.teacherId, lessonNumber: n + 1, title: `Aula de ${day.split('-').reverse().join('/')}`,
        date, scheduleTime: cls.scheduleTime, plannedContent: 'Chamada registrada pelo professor.', status: 'COMPLETED',
      },
    });
  }
  const lessonId = lesson.id;
  let presents = 0; let absents = 0;
  for (const studentId of ids) {
    const row = await prisma.attendance.findUnique({ where: { lessonId_studentId: { lessonId, studentId } } });
    if (present.has(studentId)) {
      presents++;
      if (row?.status === 'PRESENT') continue; // já confirmada: não repete os pontos
      const rec = row
        ? await prisma.attendance.update({ where: { id: row.id }, data: { status: 'PENDING', rejectionReason: null } })
        : await prisma.attendance.create({ data: { lessonId, studentId, status: 'PENDING' } });
      await confirmTeacherAttendance(rec.id, userId);
    } else if (row?.status !== 'PRESENT') {
      absents++;
      await prisma.attendance.upsert({
        where: { lessonId_studentId: { lessonId, studentId } },
        create: { lessonId, studentId, status: 'ABSENT' },
        update: { status: 'ABSENT' },
      });
    }
  }
  const rule = await prisma.gamificationRule.findUnique({ where: { code: 'XP_ATTENDANCE' } });
  return { lessonId, day, presents, absents, xpPerPresence: rule && rule.isActive ? rule.xpValue : 20 };
}
