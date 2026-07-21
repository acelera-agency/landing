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
});

test("renders project cases in an accessible carousel", () => {
  assert.match(projectsSection, /data-projects-carousel/);
  assert.match(projectsSection, /class="projects-carousel__viewport"[^>]*tabindex="0"[^>]*aria-label="Proyectos destacados"/);
  assert.match(projectsSection, /id="projects-carousel-track"[^>]*class="projects-mosaic/);
  assert.match(projectsSection, /data-projects-prev[^>]*aria-controls="projects-carousel-track"[^>]*disabled/);
  assert.match(projectsSection, /data-projects-next[^>]*aria-controls="projects-carousel-track"/);
  assert.match(projectsSection, /data-projects-current[^>]*>01</);
  assert.match(projectsSection, /data-projects-total[^>]*>04</);
});

test("shows one project on mobile, two on desktop and supports manual navigation", () => {
  assert.match(indexHtml, /\.projects-carousel__viewport\s*\{[^}]*overflow-x:\s*auto[^}]*scroll-snap-type:\s*x mandatory/);
  assert.match(indexHtml, /\.project-card\s*\{[^}]*flex:\s*0 0 100%[^}]*scroll-snap-align:\s*start/);
  assert.match(indexHtml, /@media \(min-width: 768px\)[\s\S]*?\.project-card\s*\{[^}]*flex-basis:\s*calc\(\(100% - var\(--projects-gap\)\) \/ 2\)/);
  assert.match(indexHtml, /const projectsCarousel = document\.querySelector\("\[data-projects-carousel\]"\)/);
  assert.match(indexHtml, /projectsViewport\.scrollBy\(\{ left: direction \* projectsStep\(\), behavior \}\)/);
  assert.match(indexHtml, /event\.key === "ArrowLeft"/);
  assert.match(indexHtml, /event\.key === "ArrowRight"/);
  assert.match(indexHtml, /data-projects-current/);
});

test("lands on the project overview and cards when navigating to the projects section", () => {
  assert.match(projectsSection, /class="projects-heading__title/);
  assert.match(projectsSection, /class="projects-heading__copy/);
  assert.match(indexHtml, /const projectAnchorLinks = document\.querySelectorAll\('a\[href="#proyectos"\]'\)/);
  assert.match(indexHtml, /const projectAnchorTarget = document\.querySelector\("\.projects-heading"\)/);
  assert.match(indexHtml, /const alignProjectsAnchor = \(behavior = "auto"\)/);
  assert.match(indexHtml, /const compactProjectsView = window\.innerWidth >= 1200 && window\.innerHeight <= 760/);
  assert.match(indexHtml, /const anchorOffset = compactProjectsView \? 8 : window\.innerWidth >= 768 \? 96 : 76/);
  assert.match(indexHtml, /@media \(min-width: 1200px\) and \(max-height: 760px\)[\s\S]*?\.projects-heading__copy\s*\{[^}]*font-size:\s*1rem/);
  assert.match(indexHtml, /window\.scrollTo\(\{ top: targetTop, behavior \}\)/);
  assert.match(indexHtml, /window\.history\.pushState\(null, "", "#proyectos"\)/);
  assert.match(indexHtml, /window\.location\.hash !== "#proyectos"/);
  assert.match(indexHtml, /window\.addEventListener\("hashchange", syncProjectsAnchor\)/);
});

test("keeps project cards under the Acelera brand without personal credits", () => {
  for (const project of ["rely", "lain", "faro", "lemon"]) {
    assert.match(projectCard(project), /class="project-footer"/);
    assert.match(projectCard(project), /class="project-link__label"/);
  }

  assert.doesNotMatch(projectsSection, /project-lead|Liderado por/i);
  assert.doesNotMatch(i18nSource, /Led by /);
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

test("keeps a poster layer visible until every project video is ready", () => {
  for (const project of ["rely", "lain", "faro", "lemon"]) {
    const card = projectCard(project);
    assert.match(card, new RegExp(`<img[^>]*data-project-poster[^>]*src="assets/proyectos/${project}-poster\\.webp"[^>]*alt=""`));
    assert.match(card, /<video[^>]*data-project-video[^>]*autoplay[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="metadata"/);
    assert.match(card, new RegExp(`poster="assets/proyectos/${project}-poster\\.webp"`));
    assert.match(card, new RegExp(`<source src="assets/proyectos/${project}-demo\\.webm" type="video/webm">`));
    assert.match(card, new RegExp(`<source src="assets/proyectos/${project}-demo\\.mp4" type="video/mp4">`));
  }
  assert.match(indexHtml, /\.project-card \.project-media\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(indexHtml, /\.project-media\.is-video-ready \.project-media__poster\s*\{[^}]*opacity:\s*0/);
  assert.match(indexHtml, /video\.currentTime\s*>=\s*0\.25/);
  assert.match(indexHtml, /media\?\.classList\.add\("is-video-ready"\)/);
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
  assert.match(capabilitiesSection, /data-capability-poster/);
  assert.match(capabilitiesSection, /data-capability-project/);
});

test("renders the capability case as a static image with only its project title", () => {
  assert.match(capabilitiesSection, /class="capability-preview__overlay"/);
  assert.match(capabilitiesSection, /<img[^>]*data-capability-poster/);
  assert.match(capabilitiesSection, /data-capability-project/);
  assert.doesNotMatch(capabilitiesSection, /data-capability-video/);
  assert.doesNotMatch(capabilitiesSection, /data-capability-copy/);
  assert.doesNotMatch(capabilitiesSection, /data-capability-kicker/);
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

test("starts each capture from real product content and derives a matching poster", async () => {
  const captureSource = await readFile(
    new URL("./scripts/capture-project-demos.mjs", import.meta.url),
    "utf8",
  );

  for (const readyText of [
    "La plataforma te muestra",
    "Crear sitio web",
    "Casos para presentar",
    "Lemon Box",
  ]) {
    assert.match(captureSource, new RegExp(`readyText: ".*${readyText}`));
  }
  assert.match(captureSource, /await waitForReadyContent\(page, project\.readyText\)/);
  assert.match(captureSource, /const clipStartSeconds = \(Date\.now\(\) - recordingStartedAt\) \/ 1000/);
  assert.match(captureSource, /buildFormats\(project\.slug, rawVideo, clipStartSeconds\)/);
  assert.doesNotMatch(captureSource, /posterPng|page\.screenshot\(\{ path:/);
});

test("records every project as a closed loop with a blended seam", async () => {
  const captureSource = await readFile(
    new URL("./scripts/capture-project-demos.mjs", import.meta.url),
    "utf8",
  );

  for (const project of ["rely", "lain", "faro", "lemon"]) {
    assert.match(
      captureSource,
      new RegExp(`slug: "${project}"[\\s\\S]*?async returnToStart\\(page\\)`),
      `${project} should explicitly return to its starting state`,
    );
  }
  assert.match(captureSource, /const loopDurationSeconds = 7/);
  assert.match(captureSource, /const seamDurationSeconds = 0\.3/);
  assert.match(captureSource, /await project\.returnToStart\(page\)/);
  assert.match(captureSource, /xfade=transition=fade/);
  assert.match(captureSource, /concat=n=2:v=1:a=0/);
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
    "View Rely",
    "View Lain",
    "View Faro",
    "View project",
    "A project for Lemon",
    "Connected hardware",
    "Featured projects",
    "Previous project",
    "Next project",
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
