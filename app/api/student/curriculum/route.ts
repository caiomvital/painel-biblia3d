import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { operationalLog, publicError } from "@/lib/operational-log";
import {
  CURRICULUM_MAX_BYTES,
  curriculumObjectKey,
  deleteCurriculumObject,
  safeCurriculumFileName,
  uploadCurriculum,
} from "@/lib/curriculum-storage";

const MAX_MULTIPART_BYTES = CURRICULUM_MAX_BYTES + 64 * 1024;

function forbidden() {
  return NextResponse.json({ error: "Acesso restrito ao aluno titular." }, { status: 403 });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "ALUNO" || !session.studentId) return forbidden();
  try {
    const curriculum = await prisma.curriculum.findUnique({
      where: { userId: session.id },
      select: { id: true, fileName: true, sizeBytes: true, uploadedAt: true, updatedAt: true },
    });
    return NextResponse.json({ curriculum });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Erro ao consultar seu currículo.", "curriculum.student.read_failed") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "ALUNO" || !session.studentId) return forbidden();
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json({ error: "O arquivo deve ter no máximo 5 MB." }, { status: 413 });
  }

  let file: File;
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) return NextResponse.json({ error: "Selecione um arquivo PDF." }, { status: 400 });
    file = candidate;
  } catch {
    return NextResponse.json({ error: "Envie um arquivo PDF válido." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Envie um arquivo com extensão PDF." }, { status: 400 });
  }
  if (file.size < 8 || file.size > CURRICULUM_MAX_BYTES) {
    return NextResponse.json({ error: "O arquivo deve ter até 5 MB e não pode estar vazio." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder("ascii").decode(bytes.slice(0, Math.min(bytes.length, 1024))).includes("%PDF-")) {
    return NextResponse.json({ error: "O conteúdo do arquivo não parece ser um PDF válido." }, { status: 400 });
  }

  const objectKey = curriculumObjectKey(session.id);
  try {
    await uploadCurriculum(objectKey, bytes);
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 502;
    return NextResponse.json({ error: status < 500 ? (error as Error).message : publicError(error, "Não foi possível enviar o currículo.", "curriculum.student.upload_failed") }, { status });
  }

  let previousKey: string | null = null;
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const previous = await tx.curriculum.findUnique({ where: { userId: session.id } });
      previousKey = previous?.objectKey ?? null;
      let curriculum;
      if (previous) {
        const updated = await tx.curriculum.updateMany({
          where: { userId: session.id, updatedAt: previous.updatedAt },
          data: { objectKey, fileName: safeCurriculumFileName(file.name), sizeBytes: file.size },
        });
        if (!updated.count) throw Object.assign(new Error("Outro envio foi concluído ao mesmo tempo. Atualize a tela e tente novamente."), { statusCode: 409 });
        curriculum = await tx.curriculum.findUniqueOrThrow({ where: { userId: session.id }, select: { id: true, fileName: true, sizeBytes: true, uploadedAt: true, updatedAt: true } });
      } else {
        curriculum = await tx.curriculum.create({
          data: { userId: session.id, objectKey, fileName: safeCurriculumFileName(file.name), sizeBytes: file.size },
          select: { id: true, fileName: true, sizeBytes: true, uploadedAt: true, updatedAt: true },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: session.id,
          actorName: session.name,
          action: previous ? "Currículo substituído" : "Currículo enviado",
          entityId: curriculum.id,
          summary: previous ? "Aluno substituiu o próprio currículo PDF." : "Aluno enviou currículo PDF.",
        },
      });
      return curriculum;
    });

    if (previousKey) {
      try { await deleteCurriculumObject(previousKey); }
      catch (error) { operationalLog("curriculum.storage.old_object_cleanup_failed", error); }
    }
    return NextResponse.json({ curriculum: saved }, { status: 200 });
  } catch (error) {
    try { await deleteCurriculumObject(objectKey); }
    catch (cleanupError) { operationalLog("curriculum.storage.upload_compensation_failed", cleanupError); }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json({ error: status < 500 ? (error as Error).message : publicError(error, "Não foi possível salvar o currículo.", "curriculum.student.save_failed") }, { status });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "ALUNO" || !session.studentId) return forbidden();
  try {
    const curriculum = await prisma.curriculum.findUnique({ where: { userId: session.id } });
    if (!curriculum) return NextResponse.json({ error: "Currículo não encontrado." }, { status: 404 });
    const deleted = await prisma.$transaction(async (tx) => {
      const result = await tx.curriculum.deleteMany({ where: { id: curriculum.id, updatedAt: curriculum.updatedAt } });
      if (!result.count) throw Object.assign(new Error("O currículo foi alterado em outra solicitação. Atualize a tela."), { statusCode: 409 });
      await tx.auditLog.create({
        data: { actorId: session.id, actorName: session.name, action: "Currículo removido", entityId: curriculum.id, summary: "Aluno removeu o próprio currículo PDF." },
      });
      return result.count;
    });
    try { await deleteCurriculumObject(curriculum.objectKey); }
    catch (error) { operationalLog("curriculum.storage.delete_cleanup_failed", error); }
    return NextResponse.json({ deleted: deleted === 1 });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json({ error: status < 500 ? (error as Error).message : publicError(error, "Não foi possível remover o currículo.", "curriculum.student.delete_failed") }, { status });
  }
}
