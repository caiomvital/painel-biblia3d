export type GameItem = { id: string; title: string; description: string | null; authorName: string; plays: number };
export type MyGame = { id: string; title: string; description: string | null; status: string; isPublic: boolean; plays: number };

/** Chamada JSON às APIs /api/games. Lança Error com a mensagem do servidor. */
export async function gamesCall(url: string, method?: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Algo deu errado.');
  return json;
}
