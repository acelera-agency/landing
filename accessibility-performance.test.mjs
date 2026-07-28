import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rootUrl = new URL("./", import.meta.url);
const indexHtml = await readFile(new URL("index.html", rootUrl), "utf8");
const appSource = await readFile(new URL("assets/app.js", rootUrl), "utf8");
const serviceCss = await readFile(new URL("assets/service-pages.css", rootUrl), "utf8");
const legalCss = await readFile(new URL("assets/legal.css", rootUrl), "utf8");
const faroHtml = await readFile(new URL("casos/faro.html", rootUrl), "utf8");

const secondaryPages = [
  "desarrollo-software-a-medida.html",
  "plataformas-internas.html",
  "agentes-ia-empresas.html",
  "consultoria-ia-empresas.html",
  "casos/faro.html",
  "privacidad.html",
  "terminos.html",
];

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

test("loads optional Google Fonts without blocking first paint", async () => {
  for (const page of secondaryPages) {
    const html = await readFile(new URL(page, rootUrl), "utf8");
    assert.match(
      html,
      /<link[^>]*rel="preload"[^>]*as="style"[^>]*fonts\.googleapis\.com\/css2[^>]*onload="this\.onload=null;this\.rel='stylesheet'"/,
      `${page} should load Google Fonts after the critical render`,
    );
    assert.match(
      html,
      /<noscript>[\s\S]*?<link[^>]*rel="stylesheet"[^>]*fonts\.googleapis\.com\/css2[\s\S]*?<\/noscript>/,
      `${page} should keep a no-JavaScript font fallback`,
    );
  }
});

test("keeps small text contrast at or above WCAG AA", () => {
  const serviceAccent = cssVariable(serviceCss, "accent-strong");
  const serviceQuiet = cssVariable(serviceCss, "quiet");
  const servicePaper = cssVariable(serviceCss, "paper");
  const serviceMutedPaper = cssVariable(serviceCss, "paper-muted");
  const legalAccent = cssVariable(legalCss, "accent");
  const legalQuiet = cssVariable(legalCss, "quiet");
  const legalPaper = cssVariable(legalCss, "paper");

  assert.ok(contrast(serviceAccent, serviceMutedPaper) >= 4.5);
  assert.ok(contrast(serviceQuiet, serviceMutedPaper) >= 4.5);
  assert.ok(contrast("#fffaf5", serviceAccent) >= 4.5);
  assert.ok(contrast(legalAccent, legalPaper) >= 4.5);
  assert.ok(contrast(legalQuiet, legalPaper) >= 4.5);
  assert.ok(contrast("#a64f2d", servicePaper) >= 4.5);
  assert.ok(contrast("#646a73", servicePaper) >= 4.5);
  assert.ok(contrast("#686f7d", servicePaper) >= 4.5);
  assert.ok(contrast("#c96a43", "#0b0f14") >= 4.5);
  assert.ok(contrast("#d4cfc1", "#0b0f14") >= 4.5);
});

test("uses a continuous heading order and names the team social links", () => {
  const teamSection = indexHtml.match(
    /<section id="equipo"[\s\S]*?<section id="faqs"/,
  )?.[0];

  assert.ok(teamSection);
  assert.equal((teamSection.match(/<h3\b/g) ?? []).length, 3);
  assert.doesNotMatch(teamSection, /<h4\b/);
  for (const name of ["Ignacio Estevo", "Mauro Proto", "Franco Ferreira"]) {
    assert.match(teamSection, new RegExp(`aria-label="LinkedIn de ${name}"`));
  }
  assert.match(indexHtml, /<div id="footer-watermark" aria-hidden="true"/);
  assert.match(indexHtml, /#footer-watermark::before\s*\{[^}]*content:\s*"Acelera"/);
});

test("keeps offscreen media lazy and serves responsive modern images", () => {
  assert.doesNotMatch(appSource, /warmDeferredImages|image\.loading\s*=\s*"eager"/);
  assert.match(indexHtml, /acelera-wordmark-184\.webp 184w, assets\/acelera-wordmark-256\.webp 256w/);
  assert.match(indexHtml, /estevo_profile-320\.webp 320w/);
  assert.match(indexHtml, /mauro_profile-320\.webp 320w/);
  assert.match(indexHtml, /franco_profile-320\.webp 320w/);
  assert.match(faroHtml, /faro-hero-720\.webp 720w, \/assets\/proyectos\/faro-hero-1080\.webp 1080w, \/assets\/proyectos\/faro-hero\.webp 1400w/);
  assert.match(faroHtml, /faro-mapa-720\.webp 720w, \/assets\/proyectos\/faro-mapa-1080\.webp 1080w, \/assets\/proyectos\/faro-mapa-1440\.webp 1440w/);
  assert.match(faroHtml, /faro-expediente-720\.webp 720w, \/assets\/proyectos\/faro-expediente-1080\.webp 1080w, \/assets\/proyectos\/faro-expediente-1440\.webp 1440w/);
});
