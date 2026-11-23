import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  verifySessionToken,
  sessionCookieOptions,
  type SessionUser,
} from "./session-token";
import { operationalLog } from "./operational-log";
export { createSessionToken, verifySessionToken } from "./session-token";
export type { Role, SessionUser } from "./session-token";
const COOKIE_NAME = "biblia3d_session";
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
const SESSION_CACHE_MS = process.env.NODE_ENV === 'test' ? 0 : Number(process.env.SESSION_CACHE_MS ?? 15000);
const sessionCache = new Map<string, { at: number; row: SessionRow }>();

function loadSessionUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      sessionVersion: true,
      mustChangePassword: true,
      student: { select: { id: true, accessPending: true, profileCompleted: true } },
      teacher: { select: { id: true } },
      director: { select: { id: true } },
      registration: { select: { status: true } },
    },
  });
}
type SessionRow = NonNullable<Awaited<ReturnType<typeof loadSessionUser>>>;

function readSessionCache(id: string): SessionRow | null {
  const hit = sessionCache.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > SESSION_CACHE_MS) { sessionCache.delete(id); return null; }
  return hit.row;
}
/** Só guarda usuário com acesso normal (sem senha padrão, sem cadastro pendente), para nunca atrasar uma liberação. */
function writeSessionCache(row: SessionRow) {
  if (SESSION_CACHE_MS <= 0) return;
  if (row.mustChangePassword || row.student?.accessPending || (row.registration && row.registration.status !== 'APPROVED')) { sessionCache.delete(row.id); return; }
  if (sessionCache.size > 5000) sessionCache.clear();
  sessionCache.set(row.id, { at: Date.now(), row });
}
/** Esquece a leitura guardada (logout e mudanças de acesso). */
export function dropSessionCache(id: string) { sessionCache.delete(id); }

/**
 * Sessão válida do usuário logado. Aluno com a senha padrão (mustChangePassword) NÃO recebe sessão:
 * todas as rotas protegidas respondem 401 até ele criar a senha nova. Só /api/auth/me e a troca de
 * senha pedem `allowPasswordPending` para poder atendê-lo. O mesmo vale para o cadastro novo ainda não liberado
 * pela equipe (Student.accessPending): só /api/auth/me e o preenchimento do cadastro pedem `allowAccessPending`.
 */
export async function getSession(options: { allowPasswordPending?: boolean; allowAccessPending?: boolean } = {}): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  try {
    // O banco fica longe do servidor (cada consulta custa ~0,6 s): rotas comuns reaproveitam a leitura do usuário por poucos segundos.
    // Quem pede allowPasswordPending/allowAccessPending (troca de senha, cadastro) sempre lê do banco, e qualquer divergência com o token também.
    const useCache = !options.allowPasswordPending && !options.allowAccessPending;
    const cached = useCache ? readSessionCache(session.id) : null;
    let user: SessionRow | null = cached && cached.role === session.role && cached.sessionVersion === (session.sessionVersion ?? 0) ? cached : null;
    if (!user) {
      user = await loadSessionUser(session.id);
      if (user) writeSessionCache(user);
    }
    if (!user || user.role !== session.role || user.sessionVersion !== (session.sessionVersion ?? 0)) return null;
    if (user.registration && user.registration.status !== "APPROVED") return null;
    const pending = user.role === "ALUNO" && user.mustChangePassword;
    if (pending && !options.allowPasswordPending) return null;
    const accessPending = user.role === "ALUNO" && user.student?.accessPending === true;
    if (accessPending && !options.allowAccessPending) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
      ...(options.allowPasswordPending ? { mustChangePassword: pending } : {}),
      ...(options.allowAccessPending ? { accessPending, profileCompleted: user.student?.profileCompleted === true } : {}),
      studentId: user.student?.id,
      teacherId: user.teacher?.id,
      directorId: user.director?.id,
    };
  } catch (error) {
    operationalLog("auth.session.database_unavailable", error);
    return null;
  }
}
export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, sessionCookieOptions());
}
export async function clearSessionCookie() {
  (await cookies()).set(COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}
