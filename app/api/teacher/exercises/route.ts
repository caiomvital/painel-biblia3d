import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { publicError } from "@/lib/operational-log";
import { trackedChange } from "@/lib/panel-events";
import { createClassExercise, listTeacherExercises, publishClassExercise, setClassExerciseArchived, updateClassExercise } from "@/lib/class-exercises";
import type { ExerciseInput } from "@/lib/class-exercise-rules";

async function auth() {
  const session = await getSession();
  if (!session) return { response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  if (session.role !== "PROFESSOR") return { response: NextResponse.json({ error: "Acesso restrito ao corpo docente." }, { status: 403 }) };
  return { session };
}

export async function GET(request: NextRequest) {
  const result = await auth();
  if ("response" in result) return result.response;
  try {
    const classId = request.nextUrl.searchParams.get("classId") || undefined;
    return NextResponse.json({ exercises: await listTeacherExercises(result.session.id, classId) });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Erro ao carregar exercícios.", "teacher.exercises.failed") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const result = await auth();
  if ("response" in result) return result.response;
  try {
    const body = await request.json() as ExerciseInput;
    const exercise = await trackedChange(result.session, "Exercício criado", body.classId, undefined, () => createClassExercise(result.session.id, body));
    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 400;
    return NextResponse.json({ error: publicError(error, "Erro ao criar exercício.", "teacher.exercises.failed") }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const result = await auth();
  if ("response" in result) return result.response;
  try {
    const body = await request.json();
    if (typeof body?.id !== "string" || !body.id || !["publish", "update", "archive", "restore"].includes(body?.action))
      return NextResponse.json({ error: "Ação ou exercício inválido." }, { status: 400 });
    if (body.action === "publish") {
      const exercise = await trackedChange(result.session, "Exercício publicado", body.id, undefined, () => publishClassExercise(result.session.id, body.id));
      return NextResponse.json({ exercise });
    }
    if (body.action === "archive" || body.action === "restore") {
      const archived = body.action === "archive";
      const exercise = await trackedChange(result.session, archived ? "Exercício arquivado" : "Exercício restaurado", body.id, undefined, () => setClassExerciseArchived(result.session.id, body.id, archived));
      return NextResponse.json({ exercise });
    }
    const exercise = await trackedChange(result.session, "Exercício atualizado", body.id, undefined, () => updateClassExercise(result.session.id, body.id, body as ExerciseInput));
    return NextResponse.json({ exercise });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 400;
    return NextResponse.json({ error: publicError(error, "Erro ao atualizar exercício.", "teacher.exercises.failed") }, { status });
  }
}
