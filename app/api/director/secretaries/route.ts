import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSecretary } from "@/lib/secretary-service";
import { trackedChange } from "@/lib/panel-events";
import { publicError } from "@/lib/operational-log";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR") return NextResponse.json({ error: "Acesso restrito à diretoria." }, { status: 403 });
  const secretaries = await prisma.user.findMany({ where: { role: "SECRETARIA" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ secretaries });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR") return NextResponse.json({ error: "Acesso restrito à diretoria." }, { status: 403 });
  try {
    const body = await req.json();
    const secretary = await trackedChange(session, "Conta da secretaria criada", "", body.reason, () => createSecretary(body));
    return NextResponse.json({ secretary });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Não foi possível criar a conta da secretaria.", "director.secretaries.failed") }, { status: 400 });
  }
}
