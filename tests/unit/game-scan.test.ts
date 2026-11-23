import { expect, test } from "bun:test";
import { scanGameHtml } from "@/lib/game-scan";

test("jogo simples passa", () => {
  expect(scanGameHtml("<!doctype html><canvas id=c></canvas><script>const x=document.getElementById('c').getContext('2d');let parent=1;requestAnimationFrame(()=>{})</script>").ok).toBe(true);
});
test("location.reload() para reiniciar é permitido", () => {
  expect(scanGameHtml("<button onclick=\"location.reload()\">de novo</button>").ok).toBe(true);
  expect(scanGameHtml("<script>location.href='x'</script>").ok).toBe(false);
});
test("recusa rede, quadros, endereços externos e fuga do quadro", () => {
  for (const bad of [
    "<script>fetch('/x')</script>", "<script>new WebSocket('wss://x')</script>", "<iframe src='a'></iframe>", "<form action=x></form>",
    "<img src='https://x.com/a.png'>", "<script src='a.js'></script>", "<script>top.location='x'</script>", "<script>window.parent.x</script>",
    "<script>eval('1')</script>", "<script>document.cookie</script>", "<meta http-equiv='refresh' content='0;url=a'>", "<div style=\"background:url(http://x/a.png)\"></div>",
    "<script>navigator.sendBeacon('/a')</script>",
  ]) expect(scanGameHtml(bad).ok).toBe(false);
});
