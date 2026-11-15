import { expect, test } from "bun:test";
import { gameNavigationRisk } from "@/lib/game-risk";

test("detecta location, meta refresh e links externos", () => {
  expect(gameNavigationRisk("<script>location.href='http://x.com'</script>")).toBe(true);
  expect(gameNavigationRisk("<script>window.location = 'a'</script>")).toBe(true);
  expect(gameNavigationRisk('<meta http-equiv="refresh" content="0;url=http://x">')).toBe(true);
  expect(gameNavigationRisk('<a href="https://x.com">oi</a>')).toBe(true);
});
test("jogo simples não dispara", () => {
  expect(gameNavigationRisk("<!doctype html><h1>Oi</h1><script>let n=1;document.title='x'</script>")).toBe(false);
});
