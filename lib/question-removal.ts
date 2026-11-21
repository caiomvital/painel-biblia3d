// Remoção segura de perguntas do banco (só no servidor).
import { prisma } from '@/lib/prisma';

/**
 * Remove uma pergunta do banco sem quebrar o histórico: se algum aluno já recebeu a pergunta (ou está com ela hoje),
 * ela fica arquivada (status REJECTED, nunca mais sorteada); se nunca foi usada, é apagada de vez.
 */
export async function removeQuestion(id: string): Promise<'deleted' | 'archived'> {
  const used = await prisma.quizDay.count({ where: { questionIds: { has: id } } });
  if (used > 0) {
    await prisma.quizQuestion.update({ where: { id }, data: { status: 'REJECTED' } });
    return 'archived';
  }
  await prisma.quizQuestion.delete({ where: { id } });
  return 'deleted';
}
