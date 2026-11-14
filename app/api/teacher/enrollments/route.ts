import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { trackedChange } from "@/lib/panel-events";
import { publicError } from "@/lib/operational-log";
import {
  availableStudentsForTeacher,
  dropEnrollmentByTeacher,
  enrollStudentByTeacher,
} from "@/lib/teacher-enrollments";

async function teacherSession() {
  const session = await getSession();
  if (!session) return { response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  if (session.role !== "PROFESSOR") return { response: NextResponse.json({ error: "Acesso restrito ao corpo docente." }, { status: 403 }) };
  return { session };
}

export async function GET(request: NextRequest) {
  const auth = await teacherSession();
  if ("response" in auth) return auth.response;
  const classId = request.nextUrl.searchParams.get("classId")?.trim();
  if (!classId) return NextResponse.json({ error: "Informe a turma." }, { status: 400 });
  try {
    const students = await availableStudentsForTeacher(auth.session.id, classId);
    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Erro ao listar alunos disponíveis.", "teacher.enrollments.failed") }, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await teacherSession();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    if (typeof body?.studentId !== "string" || typeof body?.classId !== "string" || !body.studentId.trim() || !body.classId.trim()) {
      return NextResponse.json({ error: "Aluno e turma são obrigatórios." }, { status: 400 });
    }
    const enrollment = await trackedChange(auth.session, "Matrícula criada pelo professor", body.studentId, body.reason, () => enrollStudentByTeacher(auth.session.id, body.studentId, body.classId));
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 400;
    return NextResponse.json({ error: publicError(error, "Erro ao matricular aluno.", "teacher.enrollments.failed") }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await teacherSession();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    if (typeof body?.id !== "string" || !body.id.trim()) return NextResponse.json({ error: "Matrícula inválida." }, { status: 400 });
    const enrollment = await trackedChange(auth.session, "Matrícula encerrada pelo professor", body.id, body.reason, () => dropEnrollmentByTeacher(auth.session.id, body.id));
    return NextResponse.json({ enrollment });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 400;
    return NextResponse.json({ error: publicError(error, "Erro ao remover aluno da turma.", "teacher.enrollments.failed") }, { status });
  }
}
