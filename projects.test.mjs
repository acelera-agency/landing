import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexHtml = await readFile(new URL("./index.html", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("./assets/i18n.js", import.meta.url), "utf8");
const projectsSection = indexHtml.match(
  /<section id="proyectos"[\s\S]*?<section id="proceso"/,
)?.[0];
const capabilitiesSection = indexHtml.match(
  /<section id="construimos"[\s\S]*?<section id="proyectos"/,
)?.[0];

const projectCard = (slug) => projectsSection?.match(
  new RegExp(`<article[^>]*data-project="${slug}"[\\s\\S]*?<\\/article>`),
)?.[0];

test("features four Acelera projects with equal card treatment", () => {
  assert.ok(projectsSection, "The projects section should exist");

  const projects = ["rely", "lain", "faro", "lemon"];
  let previousIndex = -1;
  for (const project of projects) {
    const index = projectsSection.indexOf(`data-project="${project}"`);
    assert.ok(index > previousIndex, `${project} should appear in the agreed order`);
    previousIndex = index;
    assert.match(projectCard(project), /class="project-card /);
  }

  assert.doesNotMatch(projectsSection, />Vueltito</);
  assert.doesNotMatch(projectsSection, />MUSA</);
  assert.match(indexHtml, /@media \(min-width: 768px\)[\s\S]*?\.projects-mosaic\s*\{[^}]*grid-template-columns:\s*repeat\(2,/);
});

test("attributes each project to its verified lead", () => {
  const expectedLeads = {
    rely: "Liderado por Franco Ferreira",
    lain: "Liderado por Mauro Proto",
    faro: "Liderado por Ignacio Estevo",
    lemon: "Liderado por Franco Ferreira",
  };

  for (const [project, leader] of Object.entries(expectedLeads)) {
    assert.match(projectCard(project), new RegExp(leader));
  }
  assert.match(projectCard("lemon"), /Proyecto para Lemon/);
  assert.doesNotMatch(projectsSection, /proyecto personal/i);
});

test("links every public project to a real destination", () => {
  const links = {
    rely: "https://rely.business",
    lain: "https://lainagent.com",
    faro: "https://faro-argentina.vercel.app",
    lemon: "https://github.com/frxnnk/lemon-display",
  };

  for (const [project, url] of Object.entries(links)) {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(projectCard(project), new RegExp(`href="${escapedUrl}\\/?"[\\s\\S]*?target="_blank"[\\s\\S]*?rel="noopener noreferrer"`));
  }
});

test("provides optimized looping video with poster fallbacks for every project", () => {
  for (const project of ["rely", "lain", "faro", "lemon"]) {
    const card = projectCard(project);
    assert.match(card, /<video[^>]*data-project-video[^>]*autoplay[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="metadata"/);
    assert.match(card, new RegExp(`poster="assets/proyectos/${project}-poster\\.webp"`));
    assert.match(card, new RegExp(`<source src="assets/proyectos/${project}-demo\\.webm" type="video/webm">`));
    assert.match(card, new RegExp(`<source src="assets/proyectos/${project}-demo\\.mp4" type="video/mp4">`));
  }
  assert.match(indexHtml, /\.project-card \.project-media\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
});

test("maps all capability pills to one of the four featured cases", () => {
  assert.ok(capabilitiesSection, "The capabilities section should exist");
  const mappings = [...capabilitiesSection.matchAll(/class="capability-tab"[^>]*data-case="(rely|lain|faro|lemon)"/g)]
    .map((match) => match[1]);

  assert.equal(mappings.length, 12);
  assert.deepEqual(mappings, [
    "rely", "lain", "lemon", "lain", "faro", "faro",
    "rely", "lain", "lemon", "lain", "rely", "rely",
  ]);
  assert.match(capabilitiesSection, /data-capability-video/);
  assert.match(capabilitiesSection, /data-capability-project/);
});

test("renders the capability case as a compact media overlay", () => {
  assert.match(capabilitiesSection, /class="capability-preview__overlay"/);
  assert.match(capabilitiesSection, /data-capability-project/);
  assert.match(capabilitiesSection, /data-capability-copy/);
  assert.doesNotMatch(capabilitiesSection, /class="capability-preview__body"/);
});

test("controls project playback by viewport, motion preference and data saver", () => {
  assert.match(indexHtml, /new IntersectionObserver/);
  assert.match(indexHtml, /prefers-reduced-motion:\s*reduce/);
  assert.match(indexHtml, /navigator\.connection\?\.saveData/);
  assert.match(indexHtml, /video\.pause\(\)/);
});

test("ships a reusable, side-effect-safe demo capture pipeline", async () => {
  const captureSource = await readFile(
    new URL("./scripts/capture-project-demos.mjs", import.meta.url),
    "utf8",
  ).catch(() => "");
  assert.match(captureSource, /rely[\s\S]*lain[\s\S]*faro[\s\S]*lemon/);
  assert.match(captureSource, /FFMPEG_PATH|ffmpeg-static/);
  assert.match(captureSource, /960/);
  assert.doesNotMatch(captureSource, /click\([^\n]*(flash|submit|send)/i);
});

test("captures each product from a deliberate wider viewport", async () => {
  const captureSource = await readFile(
    new URL("./scripts/capture-project-demos.mjs", import.meta.url),
    "utf8",
  );
  for (const contract of [
    /slug: "rely"[\s\S]*?captureSize: \{ width: 1440, height: 810 \}/,
    /slug: "lain"[\s\S]*?captureSize: \{ width: 1360, height: 765 \}/,
    /slug: "faro"[\s\S]*?captureSize: \{ width: 1200, height: 675 \}/,
    /slug: "lemon"[\s\S]*?captureSize: \{ width: 1440, height: 810 \}/,
  ]) {
    assert.match(captureSource, contract);
  }
});

test("masks private network details in the Lemon demo", async () => {
  const captureSource = await readFile(
    new URL("./scripts/capture-project-demos.mjs", import.meta.url),
    "utf8",
  );
  assert.match(captureSource, /maskPrivateNetworkDetails/);
  assert.match(captureSource, /192\\\.168/);
  assert.match(captureSource, /filter\s*=\s*"blur/);
  assert.match(captureSource, /element\.value\s*=\s*"Red local"/);
});

test("provides English copy for the four-project story", () => {
  for (const translation of [
    "Software already solving",
    "real problems.",
    "Led by Franco Ferreira",
    "Led by Mauro Proto",
    "Led by Ignacio Estevo",
    "A project for Lemon",
    "Connected hardware",
  ]) {
    assert.match(i18nSource, new RegExp(translation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("translates each project's case-specific capability copy", () => {
  for (const translation of [
    "In Rely, an internal platform connects",
    "Lain turned a product idea into",
    "Faro turns scattered public information into",
    "Lemon Box integrates firmware",
  ]) {
    assert.match(i18nSource, new RegExp(translation));
  }
  assert.match(i18nSource, /"data-case-copy"/);
});
