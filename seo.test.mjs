import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const canonicalOrigin = "https://www.acelera.agency";

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("publishes crawl controls and only canonical indexable URLs", async () => {
  const robots = await read("robots.txt");
  const sitemap = await read("sitemap.xml");

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${canonicalOrigin.replaceAll(".", "\\.")}\/sitemap\\.xml$`, "m"));
  assert.match(sitemap, new RegExp(`<loc>${canonicalOrigin.replaceAll(".", "\\.")}\/</loc>`));
  assert.doesNotMatch(sitemap, /privacidad|terminos|landing-prueba|tracking-demo/);
});

test("keeps canonical metadata aligned with the final www host", async () => {
  const home = await read("index.html");
  const privacy = await read("privacidad.html");
  const terms = await read("terminos.html");

  assert.match(home, /<html lang="es-AR"/);
  assert.match(home, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/"/);
  assert.match(home, /<meta property="og:url" content="https:\/\/www\.acelera\.agency\/"/);
  assert.match(home, /<meta property="og:image:width" content="1432"/);
  assert.match(home, /<meta property="og:image:height" content="891"/);
  assert.match(privacy, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/privacidad"/);
  assert.match(terms, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/terminos"/);

  for (const html of [home, privacy, terms]) {
    assert.doesNotMatch(html, /href="\/(?:privacidad|terminos)\.html"/);
  }
});

test("exposes valid WebSite and Organization JSON-LD without changing page copy", async () => {
  const home = await read("index.html");
  const match = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

  assert.ok(match, "missing JSON-LD block");
  const data = JSON.parse(match[1]);
  const graph = data["@graph"];
  const organization = graph.find((item) => item["@type"] === "Organization");
  const website = graph.find((item) => item["@type"] === "WebSite");

  assert.equal(organization.name, "Acelera");
  assert.equal(organization.url, `${canonicalOrigin}/`);
  assert.equal(organization.email, "contacto@acelera.agency");
  assert.equal(website.name, "Acelera");
  assert.equal(website.url, `${canonicalOrigin}/`);
});

test("keeps non-public previews out of Vercel deployments", async () => {
  const ignore = await read(".vercelignore");

  for (const path of ["output/", "docs/", "landing-prueba/", "tracking-demo.html", "*.bak"]) {
    assert.match(ignore, new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }
});

test("does not defer the largest hero heading behind an entrance animation", async () => {
  const home = await read("index.html");
  const i18n = await read("assets/i18n.js");
  const h1 = home.match(/<h1\b[^>]*>/)?.[0];

  assert.ok(h1, "missing H1");
  assert.doesNotMatch(h1, /gsap-hero-text|opacity-0/);
  assert.match(home, /<h1\b[\s\S]*?accent-reveal--static[\s\S]*?<\/h1>/);
  assert.match(home, /querySelectorAll\("\.accent-reveal:not\(\.accent-reveal--static\)"\)/);
  assert.match(home, /rel="preload" as="font"/);
  assert.match(home, /font-display: optional/);
  assert.match(home, /assets\/fonts\/fraunces-latin-600\.woff2/);
  assert.match(i18n, /let activeLanguage = "es"/);
  assert.match(i18n, /if \(next !== activeLanguage\)/);
  assert.match(i18n, /next === "en" \? "en" : "es-AR"/);
});
