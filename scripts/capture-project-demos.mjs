import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "assets", "proyectos");
const scratchDir = resolve(root, "output", "project-demos");
const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
const loopDurationSeconds = 7;
const seamDurationSeconds = 0.3;
const onlySlug = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : null;

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function waitForReadyContent(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 15_000 });
}

async function optionalClick(page, labels, { exact = true, settle = 900 } = {}) {
  for (const label of labels) {
    const candidates = [
      page.getByRole("button", { name: label, exact }).first(),
      page.getByRole("tab", { name: label, exact }).first(),
      page.getByText(label, { exact }).first(),
    ];
    for (const target of candidates) {
      if (await target.isVisible().catch(() => false)) {
        await target.click();
        await wait(settle);
        return true;
      }
    }
  }
  return false;
}

async function clickRequired(page, labels, options) {
  if (await optionalClick(page, labels, options)) return;
  throw new Error(`Required control not found: ${labels.join(" / ")}`);
}

async function fillWithoutSending(page, value) {
  const candidates = [
    page.locator("textarea:visible").first(),
    page.locator('[contenteditable="true"]:visible').first(),
    page.locator('input[type="text"]:visible').first(),
  ];
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.fill(value);
      return;
    }
  }
}

async function clearComposer(page) {
  await fillWithoutSending(page, "");
}

async function maskPrivateNetworkDetails(page) {
  await page.locator("body *").evaluateAll((elements) => {
    const privateIp = /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2}\b/;
    for (const element of elements) {
      const value = "value" in element ? element.value : "";
      const ownText = element.childElementCount === 0 ? element.textContent || "" : "";
      if (privateIp.test(value) || privateIp.test(ownText)) {
        if (privateIp.test(value)) element.value = "Red local";
        if (privateIp.test(ownText)) element.textContent = "Dato local";
        element.style.filter = "blur(2px)";
        element.setAttribute("aria-label", "Dato de red privada oculto");
      }
    }
  });
}

const projects = [
  {
    slug: "rely",
    captureSize: { width: 1440, height: 810 },
    url: "https://www.rely.business/#plataforma",
    readyText: "La plataforma te muestra",
    async prepare(page) {
      const platformHeading = page.getByText("La plataforma te muestra", { exact: false }).first();
      await platformHeading.evaluate((element) => element.scrollIntoView({ block: "center" }));
      await page.evaluate(() => window.scrollBy(0, -150));
      await clickRequired(page, ["Formulario", "Form"], { settle: 1100 });
    },
    async perform(page) {
      await clickRequired(page, ["Dashboard"], { settle: 1200 });
      await clickRequired(page, ["Documentos", "Documents"], { settle: 1200 });
      await clickRequired(page, ["Impuestos", "Taxes"], { settle: 1200 });
    },
    async returnToStart(page) {
      await clickRequired(page, ["Formulario", "Form"], { settle: 1100 });
    },
  },
  {
    slug: "lain",
    captureSize: { width: 1360, height: 765 },
    url: "https://www.lainagent.com/",
    readyText: "Crear sitio web",
    async perform(page) {
      await clickRequired(page, ["Crear sitio web", "Create website"], { settle: 850 });
      await fillWithoutSending(page, "Diseñá una vista clara para seguir el avance de un proyecto");
      await wait(1700);
    },
    async returnToStart(page) {
      await clearComposer(page);
      await clickRequired(page, ["Crear sitio web", "Create website"], { settle: 1100 });
    },
  },
  {
    slug: "faro",
    captureSize: { width: 1200, height: 675 },
    url: "https://faro-argentina.vercel.app/pais/AR?mode=explorer&preset=selected",
    readyText: "Casos para presentar",
    async prepare(page) {
      await page.mouse.wheel(0, 460);
      await wait(900);
    },
    async perform(page) {
      await clickRequired(page, ["Ruta Nacional 3 Patagonia", "RUTA NACIONAL N° 3"], {
        exact: false,
        settle: 2200,
      });
    },
    async returnToStart(page) {
      await clickRequired(page, ["Volver al listado"], { settle: 1600 });
    },
  },
  {
    slug: "lemon",
    captureSize: { width: 1440, height: 810 },
    url: process.env.LEMON_STUDIO_URL || "http://127.0.0.1:8765",
    readyText: "Lemon Box",
    async prepare(page) {
      await maskPrivateNetworkDetails(page);
      await clickRequired(page, ["Frente", "Front"], { settle: 800 });
    },
    async perform(page) {
      await clickRequired(page, ["Detalle", "Detail"], { settle: 1200 });
      await clickRequired(page, ["Costado", "Side"], { settle: 1200 });
      await maskPrivateNetworkDetails(page);
    },
    async returnToStart(page) {
      await clickRequired(page, ["Frente", "Front"], { settle: 1200 });
      await maskPrivateNetworkDetails(page);
    },
  },
];

function runFfmpeg(args) {
  const result = spawnSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`FFmpeg failed: ${result.stderr || result.error?.message || "unknown error"}`);
  }
}

function buildFormats(slug, rawVideo, clipStartSeconds) {
  const clipStart = Math.max(0, clipStartSeconds).toFixed(3);
  const seamStart = loopDurationSeconds - seamDurationSeconds;
  const loopFilter = [
    "[0:v]scale=960:540:force_original_aspect_ratio=increase,crop=960:540,fps=24,split=3[headsrc][midsrc][tailsrc]",
    `[headsrc]trim=start=0:end=${seamDurationSeconds},setpts=PTS-STARTPTS[head]`,
    `[midsrc]trim=start=${seamDurationSeconds}:end=${seamStart},setpts=PTS-STARTPTS[mid]`,
    `[tailsrc]trim=start=${seamStart}:end=${loopDurationSeconds},setpts=PTS-STARTPTS[tail]`,
    `[tail][head]xfade=transition=fade:duration=${seamDurationSeconds}:offset=0[seam]`,
    "[seam][mid]concat=n=2:v=1:a=0[out]",
  ].join(";");
  const inputArgs = [
    "-ss", clipStart,
    "-i", rawVideo,
    "-t", String(loopDurationSeconds),
    "-filter_complex", loopFilter,
    "-map", "[out]",
    "-an",
  ];
  const mp4Path = resolve(outputDir, `${slug}-demo.mp4`);
  runFfmpeg([...inputArgs, "-c:v", "libx264", "-preset", "medium", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Path]);
  runFfmpeg([...inputArgs, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", resolve(outputDir, `${slug}-demo.webm`)]);
  runFfmpeg(["-i", mp4Path, "-frames:v", "1", "-quality", "78", resolve(outputDir, `${slug}-poster.webp`)]);
}

async function capture(project) {
  const videoDir = resolve(scratchDir, project.slug);
  await rm(videoDir, { recursive: true, force: true });
  await mkdir(videoDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: project.captureSize,
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: project.captureSize },
    reducedMotion: "no-preference",
  });
  const recordingStartedAt = Date.now();
  const page = await context.newPage();
  const video = page.video();

  try {
    await page.goto(project.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
    await waitForReadyContent(page, project.readyText);
    await project.prepare?.(page);
    await wait(250);
    const clipStartSeconds = (Date.now() - recordingStartedAt) / 1000;
    const clipStartedAt = Date.now();
    await project.perform(page);
    await project.returnToStart(page);
    const remainingMilliseconds = loopDurationSeconds * 1000 - (Date.now() - clipStartedAt) + 250;
    if (remainingMilliseconds > 0) await wait(remainingMilliseconds);
    await context.close();
    const rawVideo = await video.path();
    buildFormats(project.slug, rawVideo, clipStartSeconds);
  } finally {
    await browser.close();
  }
}

await mkdir(outputDir, { recursive: true });
await mkdir(scratchDir, { recursive: true });
const selectedProjects = onlySlug ? projects.filter(({ slug }) => slug === onlySlug) : projects;
if (!selectedProjects.length) throw new Error(`Unknown project: ${onlySlug}`);

for (const project of selectedProjects) {
  process.stdout.write(`Capturing ${project.slug}... `);
  await capture(project);
  process.stdout.write("done\n");
}
