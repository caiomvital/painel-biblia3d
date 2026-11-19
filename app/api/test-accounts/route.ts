import { NextResponse } from 'next/server';
import { TEST_ACCOUNTS, testAccountsEnabled } from '@/lib/test-accounts';

export const dynamic = 'force-dynamic';

/** Lista as contas de teste só no modo demonstração (TEST_ACCOUNTS_PANEL=1); fora dele, 404. */
export async function GET() {
  if (!testAccountsEnabled()) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ accounts: TEST_ACCOUNTS });
}
