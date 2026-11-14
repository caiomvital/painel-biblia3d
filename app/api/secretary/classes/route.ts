import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSecretaryClass } from "@/lib/secretary-service";
import { trackedChange } from "@/lib/panel-events";
import { publicError } from "@/lib/operational-log";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "SECRETARIA") return NextResponse.json({ error: "Acesso restrito à secretaria." }, { status: 403 });
  try {
    const body = await req.json();
    const { name, code, courseId, teacherId, daysOfWeek, scheduleTime, durationMinutes, lessonsPerWeek, startDate } = body;
    if (!name || !code || !courseId || !daysOfWeek || !scheduleTime || !startDate)
      return NextResponse.json({ error: "Informe nome, código, curso, dias, horário e data inicial." }, { status: 400 });
    const created = await trackedChange(session, "Turma criada pela secretaria", "", body.reason, () => createSecretaryClass({ name, code, courseId, teacherId: teacherId || null, daysOfWeek, scheduleTime, durationMinutes: Number(durationMinutes), lessonsPerWeek: Number(lessonsPerWeek), startDate, endDate: null }));
    return NextResponse.json({ class: created });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Não foi possível criar a turma.", "secretary.classes.failed") }, { status: 400 });
  }
}
