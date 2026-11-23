import { NextResponse } from 'next/server';
import { clearSessionCookie, dropSessionCache, getSession } from '@/lib/auth';

export async function POST() {
  const session = await getSession().catch(() => null);
  if (session) dropSessionCache(session.id);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
