import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { removeQuestion } from '@/lib/question-removal';

async function director() {
  const s = await getSession();
  return s && s.role === 'DIRETOR' ? s : null;
}
function clean(b: any) {
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const options = Array.isArray(b.options) ? b.options.map((o: unknown) => String(o ?? '').trim()) : [];
  const correctIndex = Number(b.correctIndex);
  if (text.length < 5 || text.length > 300) throw new Error('A pergunta precisa ter entre 5 e 300 caracteres.');
  if (options.length !== 4 || options.some((o: string) => !o || o.length > 150)) throw new Error('Informe exatamente 4 respostas.');
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) throw new Error('Marque qual resposta é a certa.');
  return { text, options, correctIndex, topic: typeof b.topic === 'string' ? b.topic.trim().slice(0, 60) || null : null };
}

export async function GET() {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  const questions = await prisma.quizQuestion.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'asc' }] });
  const classes = await prisma.class.findMany({ select: { id: true, name: true } });
  const names = new Map(classes.map((c) => [c.id, c.name]));
  return NextResponse.json({
    questions: questions.map((q) => ({ ...q, className: q.classId ? names.get(q.classId) ?? null : null })),
  });
}

export async function POST(req: NextRequest) {
  const session = await director();
  if (!session) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  try {
    const b = await req.json();
    if (b.action === 'approveAll') {
      const r = await prisma.quizQuestion.updateMany({ where: { status: 'PENDING' }, data: { status: 'APPROVED' } });
      return NextResponse.json({ approved: r.count });
    }
    const q = await prisma.quizQuestion.create({ data: { ...clean(b), status: 'APPROVED', source: 'DIRECTOR', createdById: session.id } });
    return NextResponse.json({ question: q });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  try {
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(b.status)) data.status = b.status;
    if (b.text !== undefined) Object.assign(data, clean(b));
    const q = await prisma.quizQuestion.update({ where: { id: String(b.id) }, data });
    return NextResponse.json({ question: q });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível salvar.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await director())) return NextResponse.json({ error: 'Acesso restrito à direção.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe a pergunta.' }, { status: 400 });
  const result = await removeQuestion(id).catch(() => null);
  return NextResponse.json({ ok: true, result });
}
