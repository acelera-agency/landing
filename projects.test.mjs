import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexHtml = await readFile(new URL("./index.html", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("./assets/i18n.js", import.meta.url), "utf8");
const projectsSection = indexHtml.match(
  /<section id="proyectos"[\s\S]*?<section id="proceso"/,
)?.[0];

test("features the three Acelera flagship projects in the agreed order", () => {
  assert.ok(projectsSection, "The projects section should exist");

  const relyIndex = projectsSection.indexOf(">Rely<");
  const lainIndex = projectsSection.indexOf(">Lain Canvas<");
  const faroIndex = projectsSection.indexOf(">Faro<");

  assert.ok(relyIndex >= 0, "Rely should be featured");
  assert.ok(lainIndex > relyIndex, "Lain Canvas should follow Rely");
  assert.ok(faroIndex > lainIndex, "Faro should follow Lain Canvas");
  assert.doesNotMatch(projectsSection, />Vueltito</);
  assert.doesNotMatch(projectsSection, />MUSA</);
});

test("attributes leadership without presenting projects as personal work", () => {
  for (const leader of [
    "Liderado por Franco Ferreira",
    "Liderado por Ignacio Estevo",
    "Liderado por Mauro Proto",
  ]) {
    assert.match(projectsSection, new RegExp(leader));
  }

  assert.doesNotMatch(projectsSection, /proyecto personal/i);
});

test("links public projects safely and leaves Lain without a fake destination", () => {
  assert.match(
    projectsSection,
    /href="https:\/\/rely\.business\/?"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"/,
  );
  assert.match(
    projectsSection,
    /href="https:\/\/faro-argentina\.vercel\.app\/?"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"/,
  );

  const lainCard = projectsSection.match(
    /<article[^>]*data-project="lain"[\s\S]*?<\/article>/,
  )?.[0];
  assert.ok(lainCard, "Lain should have its own project card");
  assert.doesNotMatch(lainCard, /href=/);
});

test("provides English copy for the new project story", () => {
  for (const translation of [
    "Software already solving",
    "real problems.",
    "Led by Franco Ferreira",
    "Led by Ignacio Estevo",
    "Led by Mauro Proto",
    "AI workspace",
  ]) {
    assert.match(i18nSource, new RegExp(translation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
