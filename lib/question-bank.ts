// Banco de perguntas do painel infantil: regras puras (validação e filtro), usadas no servidor e na tela.

export interface QuestionInput { text: string; options: string[]; correctIndex: number; topic: string | null }

/** Valida e limpa uma pergunta: texto, 4 respostas diferentes e a certa marcada. */
export function parseQuestion(b: Record<string, unknown>): QuestionInput {
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const options = Array.isArray(b.options) ? b.options.map((o) => String(o ?? '').trim()) : [];
  const correctIndex = Number(b.correctIndex);
  if (text.length < 5 || text.length > 300) throw new Error('A pergunta precisa ter entre 5 e 300 caracteres.');
  if (options.length !== 4 || options.some((o) => !o || o.length > 150)) throw new Error('Informe exatamente 4 respostas.');
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) throw new Error('As 4 respostas precisam ser diferentes.');
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) throw new Error('Marque qual resposta é a certa.');
  return { text, options, correctIndex, topic: typeof b.topic === 'string' ? b.topic.trim().slice(0, 60) || null : null };
}

export interface QuestionFilter { search?: string; topic?: string; classId?: string; status?: string }
interface Filterable { text: string; options: string[]; topic?: string | null; classId?: string | null; status: string }

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtro da tela do banco (busca sem acento nem maiúsculas, por texto, respostas e tema). */
export function matchesQuestion(q: Filterable, f: QuestionFilter): boolean {
  if (f.status && f.status !== 'ALL' && q.status !== f.status) return false;
  if (f.topic && (q.topic ?? '') !== f.topic) return false;
  if (f.classId && (q.classId ?? '') !== f.classId) return false;
  const term = norm(f.search ?? '').trim();
  if (!term) return true;
  return norm([q.text, q.topic ?? '', ...q.options].join(' ')).includes(term);
}
