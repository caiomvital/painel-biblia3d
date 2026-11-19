import { compare, hash } from 'bcryptjs';
import { prisma } from './prisma';
import { isThemeUnlocked, themeById } from './game-themes';
import { passwordChangeInput, preferencesInput, readPreferences } from './panel-preferences';
import type { SessionUser } from './session-token';
import { MSG, firstPasswordProblem } from './password-rules';

export async function getAccount(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, preferences: true } });
  return { name: user.name, email: user.email, preferences: readPreferences(user.preferences) };
}
export async function savePreferences(userId: string, value: unknown) {
  const preferences = preferencesInput(value);
  // Tema desbloqueável só vale para quem já chegou no nível (o cliente não é confiável).
  const theme = themeById(preferences.theme);
  if (theme.group === 'desbloqueavel') {
    const student = await prisma.student.findUnique({ where: { userId }, select: { currentXp: true } });
    const level = Math.floor((student?.currentXp ?? 0) / 300) + 1;
    if (!isThemeUnlocked(theme, level)) throw Object.assign(new Error(`Esse tema abre no nível ${theme.unlockLevel}.`), { statusCode: 403 });
  }
  await prisma.user.update({ where: { id: userId }, data: { preferences } });
  return preferences;
}
export async function changePassword(session: SessionUser, value: unknown) {
  const input = passwordChangeInput(value);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { passwordHash: true, sessionVersion: true } });
  if (user.sessionVersion !== (session.sessionVersion ?? 0) || !await compare(input.currentPassword, user.passwordHash))
    throw Object.assign(new Error('Senha atual incorreta ou sessão expirada.'), { statusCode: 400 });
  const passwordHash = await hash(input.newPassword, 10);
  return prisma.$transaction(async tx => {
    // Compare-and-swap prevents two changes authenticated with the same old password.
    const updated = await tx.user.updateMany({ where: { id: session.id, passwordHash: user.passwordHash, sessionVersion: user.sessionVersion }, data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } } });
    if (updated.count !== 1) throw Object.assign(new Error('Senha alterada em outra sessão. Entre novamente.'), { statusCode: 409 });
    await tx.auditLog.create({ data: { actorId: session.id, actorName: session.name, action: 'Senha alterada', entityId: session.id, summary: 'Senha alterada pelo titular; sessões anteriores encerradas.' } });
    return { ...session, sessionVersion: user.sessionVersion + 1 };
  });
}

/**
 * Primeiro acesso do aluno: troca a senha padrão por uma nova, sem pedir a antiga (ele acabou de entrar com ela).
 * Só funciona enquanto a conta exige a troca; limpa a flag e encerra as outras sessões.
 */
export async function setFirstPassword(session: SessionUser, newPassword: unknown) {
  const bad = (message: string, statusCode = 400) => Object.assign(new Error(message), { statusCode });
  if (typeof newPassword !== 'string') throw bad('Escreva a senha nova.');
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { email: true, role: true, passwordHash: true, sessionVersion: true, mustChangePassword: true, student: { select: { guardianPhone: true } } },
  });
  if (user.role !== 'ALUNO' || !user.mustChangePassword) throw bad('Sua senha já foi criada.', 409);
  if (user.sessionVersion !== (session.sessionVersion ?? 0)) throw bad('Sua sessão acabou. Entre de novo.', 409);
  const problem = firstPasswordProblem(newPassword, { phone: user.student?.guardianPhone, login: user.email });
  if (problem) throw bad(problem);
  if (await compare(newPassword, user.passwordHash)) throw bad(MSG.same);
  const passwordHash = await hash(newPassword, 10);
  return prisma.$transaction(async tx => {
    const updated = await tx.user.updateMany({
      where: { id: session.id, passwordHash: user.passwordHash, sessionVersion: user.sessionVersion, mustChangePassword: true },
      data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
    });
    if (updated.count !== 1) throw bad('Sua senha já foi criada.', 409);
    await tx.auditLog.create({ data: { actorId: session.id, actorName: session.name, action: 'Senha criada no primeiro acesso', entityId: session.id, summary: 'Aluno trocou a senha padrão no primeiro acesso.' } });
    const { mustChangePassword: _omit, ...rest } = session;
    void _omit;
    return { ...rest, sessionVersion: user.sessionVersion + 1 };
  });
}
