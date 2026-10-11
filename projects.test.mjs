import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const html = await readFile(new URL("./index.html",import.meta.url),"utf8");
const section=html.match(/<section[^>]*id="proyectos"[\s\S]*?<\/section>/)?.[0];
test("publishes the six approved projects with real destinations",()=>{
  assert.ok(section);
  assert.deepEqual([...section.matchAll(/<h3>(.*?)<\/h3>/g)].map(x=>x[1]),["Atrae","Rely","Lemon Box","Lain","Harness","Faro"]);
  for(const url of ["https://atrae.app","https://rely.business","https://github.com/frxnnk/lemon-display","https://lainagent.com","/casos/faro"]) assert.ok(section.includes(`href="${url}"`));
  assert.match(section,/data-demo="harness"/);
});
test("names project navigation and keeps the demo opt-in",()=>{
  assert.match(section,/aria-controls="project-track" aria-label="Proyectos anteriores"/);
  assert.match(section,/aria-controls="project-track" aria-label="Proyectos siguientes"/);
  assert.match(section,/id="project-track" role="region" tabindex="0"/);
  assert.match(html,/<video[^>]*controls[^>]*preload="none"/);
  assert.doesNotMatch(section,/<video[^>]*autoplay/);
});
test("serves project demos with explicit video MIME types locally", async () => {
  const devServerSource = await readFile(
    new URL("./scripts/dev-server.mjs", import.meta.url),
    "utf8",
  );
  assert.match(devServerSource, /\["\.mp4", "video\/mp4"\]/);
  assert.match(devServerSource, /\["\.webm", "video\/webm"\]/);
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
    /slug: "atrae"[\s\S]*?captureSize: \{ width: 1200, height: 675 \}/,
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
    "Descubrí a tus próximos clientes",
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
