import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "assets", "proyectos");
const scratchDir = resolve(root, "output", "project-demos");
const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
const onlySlug = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : null;

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function optionalClick(page, labels) {
  for (const label of labels) {
    const target = page.getByText(label, { exact: true }).first();
    if (await target.isVisible().catch(() => false)) {
      await target.click();
      await wait(900);
      return true;
    }
  }
  return false;
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

async function maskPrivateNetworkDetails(page) {
  await page.locator("body *").evaluateAll((elements) => {
    const privateIp = /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2}\b/;
    for (const element of elements) {
      const value = "value" in element ? element.value : "";
      const ownText = element.childElementCount === 0 ? element.textContent || "" : "";
      if (privateIp.test(value) || privateIp.test(ownText)) {
        element.style.filter = "blur(7px)";
        element.setAttribute("aria-label", "Dato de red privada oculto");
      }
    }
  });
}

const projects = [
  {
    slug: "rely",
    url: "https://www.rely.business/#plataforma",
    async perform(page) {
      await page.mouse.wheel(0, 420);
      await wait(800);
      await optionalClick(page, ["Documents", "Taxes", "Dashboard"]);
      await optionalClick(page, ["Form", "Documents", "Dashboard"]);
    },
  },
  {
    slug: "lain",
    url: "https://www.lainagent.com/",
    async perform(page) {
      await optionalClick(page, ["Crear sitio web", "Create website"]);
      await fillWithoutSending(page, "Diseñá una vista clara para seguir el avance de un proyecto");
      await wait(1800);
    },
  },
  {
    slug: "faro",
    url: "https://faro-argentina.vercel.app/pais/AR?mode=explorer&preset=selected",
    async perform(page) {
      await page.mouse.wheel(0, 460);
      await wait(900);
      await optionalClick(page, ["Ruta Nacional 3 Patagonia", "Ver expediente", "Explorar"]);
      await wait(1500);
    },
  },
  {
    slug: "lemon",
    url: process.env.LEMON_STUDIO_URL || "http://127.0.0.1:8765",
    async perform(page) {
      await maskPrivateNetworkDetails(page);
      await optionalClick(page, ["Screen", "Pantalla", "Front"]);
      await optionalClick(page, ["Lemon Dollar", "BTC Hero", "Side"]);
      await maskPrivateNetworkDetails(page);
      await wait(1600);
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

function buildFormats(slug, rawVideo, posterPng) {
  const scale = "scale=960:600:force_original_aspect_ratio=increase,crop=960:600,fps=24";
  runFfmpeg(["-ss", "1", "-i", rawVideo, "-t", "8", "-vf", scale, "-an", "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", resolve(outputDir, `${slug}-demo.webm`)]);
  runFfmpeg(["-ss", "1", "-i", rawVideo, "-t", "8", "-vf", scale, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", resolve(outputDir, `${slug}-demo.mp4`)]);
  runFfmpeg(["-i", posterPng, "-vf", "scale=960:600:force_original_aspect_ratio=increase,crop=960:600", "-frames:v", "1", "-quality", "78", resolve(outputDir, `${slug}-poster.webp`)]);
}

async function capture(project) {
  const videoDir = resolve(scratchDir, project.slug);
  await rm(videoDir, { recursive: true, force: true });
  await mkdir(videoDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 960, height: 600 },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: 960, height: 600 } },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const video = page.video();

  try {
    await page.goto(project.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
    await wait(900);
    await project.perform(page);
    await wait(1700);
    const posterPng = resolve(videoDir, `${project.slug}-poster.png`);
    await page.screenshot({ path: posterPng, type: "png" });
    await context.close();
    const rawVideo = await video.path();
    buildFormats(project.slug, rawVideo, posterPng);
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
