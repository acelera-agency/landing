import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");
const indexHtml=await read("index.html"); const styles=await read("redisenio/styles.css");
const hexToRgb = (hex) => (
  hex.match(/[a-f\d]{2}/gi).map((component) => Number.parseInt(component, 16))
);

const luminance = (hex) => {
  const [red, green, blue] = hexToRgb(hex).map((component) => {
    const channel = component / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

const cssVariable = (css, name) => (
  css.match(new RegExp(`--${name}:\\s*(#[\\da-f]{6})`, "i"))?.[1]
);


test("keeps primary and muted small text at WCAG AA contrast",()=>{
  for(const foreground of ["#0b0f14","#595959","#a7441d"]) assert.ok(contrast(foreground,"#fdfdfd")>=4.5);
});
test("names team social links and hides the decorative hands",()=>{
  const team=indexHtml.match(/<section[^>]*id="equipo"[\s\S]*?<\/section>/)?.[0]; assert.ok(team);
  assert.equal((team.match(/<h3\b/g)||[]).length,3);
  for(const name of ["Ignacio Estevo","Mauro Proto","Franco Ferreira"]) assert.ok(team.includes(`aria-label="LinkedIn de ${name}"`));
  const hands=[...indexHtml.matchAll(/<div[^>]*data-ascii="[^"]+"[^>]*>/g)]; assert.equal(hands.length,2);
  assert.match(indexHtml,/<div[^>]*aria-hidden="true"[^>]*class="hero-art/); assert.match(hands.at(-1)[0],/aria-hidden="true"/);
});
test("loads fonts locally and keeps optional motion under user preferences",async()=>{
  assert.doesNotMatch(indexHtml,/fonts\.googleapis\.com/);
  assert.match(styles,/@font-face[\s\S]*?font-family: Geist/);
  assert.match(styles,/prefers-reduced-motion: reduce/);
  const script=await read("redisenio/site.js");
  assert.match(script,/prefers-reduced-motion/);
  assert.match(script,/IntersectionObserver/);
  assert.match(script,/revealObserver\.unobserve/);
  assert.doesNotMatch(indexHtml.match(/<h1[^>]*>/)[0],/reveal-pending/);
});
test("defers team and project media and preserves responsive Faro images",async()=>{
  for(const tag of indexHtml.matchAll(/<img[^>]*src="[^" ]*linkedin[^" ]*"[^>]*>/g)) assert.match(tag[0],/loading="lazy"/);
  const faro=await read("casos/faro.html");
  assert.match(faro,/faro-hero-720\.webp 720w/);
  assert.match(faro,/faro-mapa-720\.webp 720w/);
  assert.match(faro,/faro-expediente-720\.webp 720w/);
});
