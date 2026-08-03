import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const releaseToken = "v=20260728-1";

test("mutable assets are revalidated instead of cached as immutable", async () => {
  const config = JSON.parse(await readFile(new URL("./vercel.json", import.meta.url), "utf8"));
  const assetRule = config.headers.find((rule) => rule.source === "/assets/(.*)");
  const cacheHeader = assetRule?.headers.find((header) => header.key === "Cache-Control");

  assert.equal(cacheHeader?.value, "public, max-age=0, must-revalidate");
});

test("critical CSS and JavaScript assets use a release cache key", async () => {
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

  for (const asset of ["tailwind.css", "lucide-sprite.js", "i18n.js"]) {
    assert.match(html, new RegExp(`assets/${asset.replace(".", "\\.")}\\?${releaseToken}`));
  }
  assert.match(html, /assets\/app\.js\?v=20260803-2/);
});

test("draws a fading mouse trail in the hero and footer without a fixed cursor shape", async () => {
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("./assets/app.js", import.meta.url), "utf8");

  assert.equal((html.match(/data-cursor-trail-zone/g) || []).length, 2);
  assert.equal((html.match(/data-cursor-trail(?:\s|>)/g) || []).length, 2);
  assert.equal((html.match(/<canvas class="cursor-trail"/g) || []).length, 2);
  assert.doesNotMatch(html, /cursor-aura|data-cursor-aura/);
  assert.doesNotMatch(html, /cursor-trail[^}]*filter:\s*blur/s);
  assert.match(script, /function initCursorTrails\(\)/);
  assert.match(script, /TRAIL_LIFETIME\s*=\s*680/);
  assert.match(script, /getCoalescedEvents/);
  assert.match(script, /quadraticCurveTo/);
  assert.match(script, /devicePixelRatio/);
  assert.match(script, /performance\.now\(\)/);
  assert.match(script, /requestAnimationFrame\(render\)/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(script, /initCursorAuras|data-cursor-aura/);
});

test("legal pages invalidate their shared stylesheet", async () => {
  for (const page of ["privacidad.html", "terminos.html"]) {
    const html = await readFile(new URL(`./${page}`, import.meta.url), "utf8");
    assert.match(html, new RegExp(`assets/legal\\.css\\?${releaseToken}`));
  }
});

test("service and case pages invalidate their shared stylesheet", async () => {
  for (const page of [
    "desarrollo-software-a-medida.html",
    "plataformas-internas.html",
    "agentes-ia-empresas.html",
    "consultoria-ia-empresas.html",
    "casos/faro.html",
  ]) {
    const html = await readFile(new URL(`./${page}`, import.meta.url), "utf8");
    assert.match(html, new RegExp(`assets/service-pages\\.css\\?${releaseToken}`));
  }
});

test("the public forms use the managed lead gateway", async () => {
  const script = await readFile(new URL("./assets/app.js", import.meta.url), "utf8");

  assert.match(script, /formEndpoint: "https:\/\/acelera-lead-gateway\.vercel\.app\/api\/lead"/);
});

test("keeps the hero canvas safe while responsive layouts collapse it", async () => {
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

  assert.match(html, /if \(w <= 0 \|\| h <= 0\) \{[\s\S]*?return false;/);
  assert.match(html, /if \(resize\(\)\) draw\(\);/);
  assert.match(html, /connectorCanvas\.width <= 0 \|\| connectorCanvas\.height <= 0\) return;/);
});
