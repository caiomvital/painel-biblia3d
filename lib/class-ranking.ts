/**
 * Posição do aluno na turma por XP (pura, sem nomes).
 *
 * Existe de propósito para que o painel do aluno nunca monte uma lista de colegas:
 * só entram aqui id e XP, e só sai a posição e o total.
 */
export function positionInClass(
  students: ReadonlyArray<{ id: string; currentXp: number }>,
  studentId: string,
): { position: number; total: number } {
  const sorted = [...students].sort((a, b) => b.currentXp - a.currentXp);
  const index = sorted.findIndex((s) => s.id === studentId);
  return { position: index >= 0 ? index + 1 : 1, total: students.length };
}
