import { SignJWT, jwtVerify } from "jose";
import { authSecret } from "./production-config";
export type Role = "ALUNO" | "PROFESSOR" | "SECRETARIA" | "DIRETOR";
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentId?: string;
  teacherId?: string;
  directorId?: string;
  sessionVersion?: number;
  /** Só preenchido por getSession({ allowPasswordPending: true }). */
  mustChangePassword?: boolean;
  /** Só preenchido por getSession({ allowAccessPending: true }): cadastro novo aguardando a equipe liberar. */
  accessPending?: boolean;
  /** Idem: a criança já preencheu os próprios dados. */
  profileCompleted?: boolean;
}
const issuer = "biblia3d",
  audience = "biblia3d-panel";
export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(authSecret());
}
export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret(), {
      algorithms: ["HS256"],
      issuer,
      audience,
      requiredClaims: ["exp", "iat", "sub"],
    });
    if (
      typeof payload.id !== "string" ||
      !payload.id ||
      payload.sub !== payload.id ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      !["ALUNO", "PROFESSOR", "SECRETARIA", "DIRETOR"].includes(String(payload.role))
    )
      return null;
    for (const key of ["studentId", "teacherId", "directorId"])
      if (payload[key] !== undefined && typeof payload[key] !== "string")
        return null;
    if (payload.sessionVersion !== undefined && (!Number.isSafeInteger(payload.sessionVersion) || Number(payload.sessionVersion) < 0)) return null;
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role as Role,
      studentId: payload.studentId as string | undefined,
      teacherId: payload.teacherId as string | undefined,
      directorId: payload.directorId as string | undefined,
      sessionVersion: (payload.sessionVersion as number | undefined) ?? 0,
    };
  } catch {
    return null;
  }
}
export function sessionCookieOptions(
  production = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
