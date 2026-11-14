import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { publicError } from "@/lib/operational-log";
import { trackedChange } from "@/lib/panel-events";
import { answerClassExercise, listStudentExercises } from "@/lib/class-exercises";

async function auth() {
  const session = await getSession();
  if (!session) return { response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  if (session.role !== "ALUNO") return { response: NextResponse.json({ error: "Acesso restrito aos alunos." }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const result = await auth();
  if ("response" in result) return result.response;
  try {
    return NextResponse.json({ exercises: await listStudentExercises(result.session.id) });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Erro ao carregar exercícios.", "student.exercises.failed") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const result = await auth();
  if ("response" in result) return result.response;
  try {
    const body = await request.json();
    if (typeof body?.exerciseId !== "string" || typeof body?.selectedOption !== "string")
      return NextResponse.json({ error: "Exercício e alternativa são obrigatórios." }, { status: 400 });
    const answer = await trackedChange(result.session, "Resposta de exercício registrada", body.exerciseId, undefined, () => answerClassExercise(result.session.id, body.exerciseId, body.selectedOption));
    return NextResponse.json({ answer });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 400;
    return NextResponse.json({ error: publicError(error, "Erro ao registrar resposta.", "student.exercises.failed") }, { status });
  }
}
