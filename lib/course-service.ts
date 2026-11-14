import { prisma } from "./prisma";

export type NewCourseInput = {
  name: string;
  code: string;
  description?: string;
  workloadHours: number;
};

export function courseInput(value: unknown): NewCourseInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new Error("Informe os dados do curso."), { statusCode: 400 });
  }
  const data = value as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const code = typeof data.code === "string" ? data.code.trim().toUpperCase() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const workloadHours = data.workloadHours === undefined ? 120 : Number(data.workloadHours);
  if (!name || name.length > 120) {
    throw Object.assign(new Error("Informe o nome do curso (até 120 caracteres)."), { statusCode: 400 });
  }
  if (!/^[A-Z0-9][A-Z0-9_-]{1,19}$/.test(code)) {
    throw Object.assign(new Error("Informe um código de 2 a 20 caracteres: letras, números, hífen ou sublinhado."), { statusCode: 400 });
  }
  if (description.length > 2000) {
    throw Object.assign(new Error("A descrição deve ter até 2.000 caracteres."), { statusCode: 400 });
  }
  if (!Number.isSafeInteger(workloadHours) || workloadHours < 1 || workloadHours > 5000) {
    throw Object.assign(new Error("A carga horária deve ser de 1 a 5.000 horas."), { statusCode: 400 });
  }
  return { name, code, description: description || undefined, workloadHours };
}

export async function createCourseByDirector(value: unknown) {
  const input = courseInput(value);
  return prisma.course.create({
    data: input,
    select: { id: true, name: true, code: true, description: true, workloadHours: true },
  });
}
