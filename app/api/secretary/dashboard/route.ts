import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSecretaryDashboard } from "@/lib/secretary-service";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "SECRETARIA") return NextResponse.json({ error: "Acesso restrito à secretaria." }, { status: 403 });
  return NextResponse.json(await getSecretaryDashboard());
}
