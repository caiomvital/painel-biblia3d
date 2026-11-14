import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicError } from "@/lib/operational-log";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR") return NextResponse.json({ error: "Acesso restrito à diretoria." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const page = Number(params.get("page") ?? 1);
  if (q.length > 100 || !Number.isSafeInteger(page) || page < 1 || page > 10000) {
    return NextResponse.json({ error: "Filtro inválido." }, { status: 400 });
  }

  try {
    const userSearch: Prisma.UserWhereInput = q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        {
          student: {
            is: { registrationNumber: { contains: q, mode: "insensitive" } },
          },
        },
        {
          student: {
            is: {
              enrollments: {
                some: {
                  status: "ACTIVE",
                  class: { is: { name: { contains: q, mode: "insensitive" } } },
                },
              },
            },
          },
        },
        {
          student: {
            is: {
              enrollments: {
                some: {
                  status: "ACTIVE",
                  class: {
                    is: {
                      course: { is: { name: { contains: q, mode: "insensitive" } } },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    } : {};
    const rows = await prisma.curriculum.findMany({
      where: {
        user: {
          role: "ALUNO",
          student: { isNot: null },
          ...userSearch,
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 25,
      take: 26,
      select: {
        id: true,
        fileName: true,
        sizeBytes: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            student: {
              select: {
                registrationNumber: true,
                enrollments: {
                  where: { status: "ACTIVE" },
                  take: 1,
                  select: { class: { select: { name: true, course: { select: { name: true } } } } },
                },
              },
            },
          },
        },
      },
    });
    const curricula = rows.slice(0, 25).map(({ user, ...curriculum }) => {
      const enrollment = user.student?.enrollments[0];
      return {
        ...curriculum,
        student: {
          id: user.id,
          name: user.name,
          email: user.email,
          registrationNumber: user.student?.registrationNumber ?? null,
          className: enrollment?.class.name ?? null,
          courseName: enrollment?.class.course.name ?? null,
        },
      };
    });
    return NextResponse.json({ curricula, hasMore: rows.length > 25 });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, "Erro ao consultar currículos.", "curriculum.director.list_failed") }, { status: 500 });
  }
}
