export type ExerciseOption = { id: string; text: string };
export type ExerciseInput = {
  classId: string; lessonId: string; title: string; question: string; explanation?: string; options: ExerciseOption[];
  correctOption: string; correctXp: number; correctCoins: number; attemptXp: number; attemptCoins: number;
};
export type ExerciseGroupItem = { classId: string; className: string; lessonId: string | null; lessonTitle: string | null };

export function validateExerciseInput(input: ExerciseInput) {
  if (!input || typeof input !== "object") throw Object.assign(new Error("Dados do exercício inválidos."), { statusCode: 400 });
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const question = typeof input.question === "string" ? input.question.trim() : "";
  const explanation = typeof input.explanation === "string" ? input.explanation.trim() : "";
  const options = input.options;
  if (typeof input.classId !== "string" || !input.classId || typeof input.lessonId !== "string" || !input.lessonId || title.length < 2 || title.length > 120 || question.length < 5 || question.length > 2000)
    throw Object.assign(new Error("Informe a aula, o título e uma pergunta válida."), { statusCode: 400 });
  if (!Array.isArray(options) || options.length < 2 || options.length > 6 || options.some(o => !o || typeof o.id !== "string" || !o.id || typeof o.text !== "string" || !o.text.trim() || o.text.trim().length > 300) || new Set(options.map(o => o.id)).size !== options.length)
    throw Object.assign(new Error("Cadastre de 2 a 6 alternativas válidas."), { statusCode: 400 });
  if (!options.some(o => o.id === input.correctOption)) throw Object.assign(new Error("Selecione a alternativa correta."), { statusCode: 400 });
  if (explanation.length > 1200) throw Object.assign(new Error("A explicação pode ter no máximo 1.200 caracteres."), { statusCode: 400 });
  for (const value of [input.correctXp, input.correctCoins, input.attemptXp, input.attemptCoins])
    if (!Number.isInteger(value) || value < 0 || value > 10000) throw Object.assign(new Error("As recompensas devem ser números inteiros entre 0 e 10.000."), { statusCode: 400 });
  if (input.correctXp <= input.attemptXp || input.correctCoins <= input.attemptCoins)
    throw Object.assign(new Error("A recompensa por acerto deve ser maior que a recompensa por tentativa, em XP e Coins."), { statusCode: 400 });
  return { ...input, title, question, explanation, options: options.map(o => ({ id: o.id, text: o.text.trim() })) };
}

export function groupExercisesByLesson<T extends ExerciseGroupItem>(items: T[]) {
  const groups = new Map<string, { key: string; label: string; items: T[] }>();
  for (const item of items) {
    const key = `${item.classId}:${item.lessonId || "sem-aula"}`;
    const group = groups.get(key) ?? { key, label: `${item.className}${item.lessonTitle ? ` · ${item.lessonTitle}` : " · Aula não disponível"}`, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function assertExerciseEditable(answerCount: number) {
  if (answerCount > 0) throw Object.assign(new Error("Esta questão já recebeu respostas e não pode mais ser alterada."), { statusCode: 409 });
}
