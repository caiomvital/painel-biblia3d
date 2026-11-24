import type { Page } from "@playwright/test";

/** Professor e direção veem um tour de boas-vindas (janela modal) no primeiro acesso: os testes o dispensam para poder clicar no painel. */
export async function dismissTour(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Tour do painel" });
  try {
    await dialog.waitFor({ state: "visible", timeout: 5000 });
    await dialog.getByRole("button", { name: "Pular" }).click();
    await dialog.waitFor({ state: "hidden", timeout: 5000 });
  } catch {
    /* sem tour (por exemplo, aluno) */
  }
}
