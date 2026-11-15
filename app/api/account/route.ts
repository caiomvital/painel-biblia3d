import { NextResponse } from 'next/server';
import { getSession, createSessionToken, setSessionCookie } from '@/lib/auth';
import { getAccount, savePreferences, changePassword, setFirstPassword } from '@/lib/account-service';
import { takeLoginAttempt } from '@/lib/login-limiter';
import { publicError } from '@/lib/operational-log';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  try { return NextResponse.json(await getAccount(session.id)); }
  catch (error) { return NextResponse.json({ error: publicError(error, 'Erro ao carregar sua conta.', 'account.read.failed') }, { status: 500 }); }
}
export async function PUT(request: Request) {
  // Aluno com a senha padrão só pode fazer UMA coisa aqui: criar a senha nova (FIRST_PASSWORD).
  const session = await getSession({ allowPasswordPending: true });
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  try {
    const body = await request.json();
    if (body.action === 'FIRST_PASSWORD') {
      if (!session.mustChangePassword) return NextResponse.json({ error: 'Sua senha já foi criada.' }, { status: 409 });
      if (!takeLoginAttempt(`password-change:${session.id}`)) return NextResponse.json({ error: 'Muitas tentativas. Espere um pouco e tente de novo.' }, { status: 429, headers: { 'Retry-After': '600' } });
      const updated = await setFirstPassword(session, body.newPassword);
      await setSessionCookie(await createSessionToken(updated));
      return NextResponse.json({ ok: true, message: 'Senha criada!' });
    }
    if (session.mustChangePassword) return NextResponse.json({ error: 'Crie sua senha nova primeiro.', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 });
    if (body.action === 'PASSWORD') {
      if (!takeLoginAttempt(`password-change:${session.id}`)) return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429, headers: { 'Retry-After': '600' } });
      const updated = await changePassword(session, body);
      await setSessionCookie(await createSessionToken(updated));
      return NextResponse.json({ message: 'Senha alterada. As outras sessões foram encerradas.' });
    }
    if (body.action !== 'PREFERENCES') return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    return NextResponse.json({ preferences: await savePreferences(session.id, body.preferences) });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? (error instanceof SyntaxError ? 400 : 500);
    return NextResponse.json({ error: status < 500 ? (error as Error).message : publicError(error, 'Erro ao salvar sua conta.', 'account.update.failed') }, { status });
  }
}
