import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createLessonByStaff } from "@/lib/academic-service";
import { trackedChange } from "@/lib/panel-events";
import { publicError } from "@/lib/operational-log";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR" && session.role !== "PROFESSOR") return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  try {
    const body = await req.json();
    const lesson = await trackedChange(session, "Aula cadastrada", body.classId, body.reason, () => createLessonByStaff(session.id, session.role, body));
    return NextResponse.json({ lesson });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Não foi possível cadastrar a aula.", "lessons.create.failed") }, { status: (error as { statusCode?: number }).statusCode || 400 });
  }
}
