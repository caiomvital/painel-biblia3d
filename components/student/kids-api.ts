export type Rank = { position: number; total: number };
export type QuizSummary = { available: boolean; completedToday: boolean; scoreToday: number | null };
export type KidsHomeData = {
  firstName: string;
  points: number;
  level: number;
  coins: { balance: number; reserved: number; available: number };
  profileCompleted: boolean;
  guardianName: string | null;
  birthDate: string | null;
  className: string | null;
  prize: { title: string; description: string | null; pointsGoal: number } | null;
  rankTurma: Rank | null;
  rankAcademia: Rank;
  quiz: QuizSummary;
  weekly: QuizSummary;
  lesson: { reportId: string; day: string; topics: string[]; done: boolean; checked: number[]; pointsAwarded: number } | null;
  rating: { teacherName: string; done: boolean; score: number | null } | null;
  googleReviewUrl: string | null;
};

/** Chamada JSON às APIs /api/kids/*. Lança Error com a mensagem do servidor. */
export async function kidsCall(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Algo deu errado. Tente de novo.');
  return json;
}
