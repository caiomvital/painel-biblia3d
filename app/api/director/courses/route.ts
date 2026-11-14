import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { trackedChange } from "@/lib/panel-events";
import { publicError } from "@/lib/operational-log";
import { createCourseByDirector } from "@/lib/course-service";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR") return NextResponse.json({ error: "Acesso restrito à diretoria." }, { status: 403 });

  try {
    const body = await request.json();
    const course = await trackedChange(session, "Curso criado", "", body?.reason, () => createCourseByDirector(body));
    return NextResponse.json({ success: true, course }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Erro ao criar curso.", "director.courses.failed") }, { status: 400 });
  }
}
