import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadCurriculumObject, safeCurriculumFileName } from "@/lib/curriculum-storage";
import { operationalLog, publicError } from "@/lib/operational-log";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR") return NextResponse.json({ error: "Acesso restrito à diretoria." }, { status: 403 });

  try {
    const { id } = await params;
    const curriculum = await prisma.curriculum.findFirst({
      where: { id, user: { role: "ALUNO", student: { isNot: null } } },
      select: { id: true, userId: true, objectKey: true, fileName: true },
    });
    if (!curriculum) return NextResponse.json({ error: "Currículo não encontrado." }, { status: 404 });
    const body = await downloadCurriculumObject(curriculum.objectKey);
    await prisma.auditLog.create({
      data: {
        actorId: session.id,
        actorName: session.name,
        action: "Currículo baixado",
        entityId: curriculum.id,
        summary: `Direção baixou currículo do aluno ${curriculum.userId}.`,
      },
    });
    const fileName = safeCurriculumFileName(curriculum.fileName);
    const fallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
    const encoded = encodeURIComponent(fileName).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    operationalLog("curriculum.director.download_failed", error, { status });
    return NextResponse.json({ error: status < 500 ? (error as Error).message : publicError(error, "Erro ao baixar o currículo.", "curriculum.director.download_failed") }, { status });
  }
}
