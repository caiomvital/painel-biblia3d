export type StudentTab = 'kids' | 'games' | 'overview' | 'auction' | 'lessons' | 'exercises' | 'ranking' | 'badges' | 'curriculum';

export type StudentDashboardData = any; // formato de GET /api/student/dashboard (inalterado)

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  } catch {
    return dateStr;
  }
}
