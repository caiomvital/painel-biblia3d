import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enrollStudentsInClassByStaff } from "@/lib/academic-service";
import { trackedChange } from "@/lib/panel-events";
import { publicError } from "@/lib/operational-log";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR" && session.role !== "SECRETARIA") return NextResponse.json({ error: "Acesso restrito à direção e secretaria." }, { status: 403 });
  try {
    const body = await req.json();
    const result = await trackedChange(session, "Matrículas em lote realizadas", body.classId, body.reason, () => enrollStudentsInClassByStaff(body.studentIds, body.classId));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Não foi possível matricular os alunos.", "staff.enrollments.bulk.failed") }, { status: (error as { statusCode?: number }).statusCode || 400 });
  }
}
