import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const releaseToken = "v=20260713-2";

test("mutable assets are revalidated instead of cached as immutable", async () => {
  const config = JSON.parse(await readFile(new URL("./vercel.json", import.meta.url), "utf8"));
  const assetRule = config.headers.find((rule) => rule.source === "/assets/(.*)");
  const cacheHeader = assetRule?.headers.find((header) => header.key === "Cache-Control");

  assert.equal(cacheHeader?.value, "public, max-age=0, must-revalidate");
});

test("critical CSS and JavaScript assets use a release cache key", async () => {
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

  for (const asset of ["tailwind.css", "lucide-sprite.js", "i18n.js", "app.js"]) {
    assert.match(html, new RegExp(`assets/${asset.replace(".", "\\.")}\\?${releaseToken}`));
  }
});

test("legal pages invalidate their shared stylesheet", async () => {
  for (const page of ["privacidad.html", "terminos.html"]) {
    const html = await readFile(new URL(`./${page}`, import.meta.url), "utf8");
    assert.match(html, new RegExp(`assets/legal\\.css\\?${releaseToken}`));
  }
});
