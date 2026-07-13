// Mide fluidez del scroll a través de la sección de la cita del fundador.
// Uso: node scripts/perf-quote.mjs [--throttle=x]
import { chromium } from "playwright";

const throttle = Number((process.argv.find((a) => a.startsWith("--throttle=")) || "--throttle=4").split("=")[1]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
if (process.argv.includes("--block-calendly")) {
  await page.route(/calendly|stripe|recaptcha/, (r) => r.abort());
}
await page.goto("http://127.0.0.1:4173/", { waitUntil: "load" });
await page.waitForTimeout(2000);

// Posicionar la sección justo debajo del viewport (antes del trigger "top 75%")
await page.evaluate(() => {
  const el = document.getElementById("section-founder-quote");
  const top = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: top - window.innerHeight, behavior: "instant" });
});
await page.waitForTimeout(800);

const cdp = await page.context().newCDPSession(page);
// Profiler + throttle juntos ahogan el renderer: perfilar solo a 1x.
const useProfiler = throttle === 1;
if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
if (useProfiler) {
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
}

await page.evaluate(() => {
  window.__frames = [];
  window.__fpsStop = false;
  let last = performance.now();
  (function tick(now) {
    if (window.__fpsStop) return;
    window.__frames.push({ d: now - last, y: window.scrollY });
    last = now;
    requestAnimationFrame(tick);
  })(last);
});
if (useProfiler) await cdp.send("Profiler.start");

// Atravesar la sección lentamente (~2 viewports de recorrido).
// scrollBy dentro de la página: mouse.wheel + throttle de CPU se cuelga
// esperando el ack de input del renderer.
await page.evaluate(() => new Promise((resolve) => {
  let i = 0;
  const id = setInterval(() => {
    window.scrollBy(0, 40);
    if (++i >= 45) { clearInterval(id); resolve(); }
  }, 90);
}));

const profileResult = useProfiler ? await cdp.send("Profiler.stop") : null;
const rawFrames = await page.evaluate(() => { window.__fpsStop = true; return window.__frames; });
const frames = rawFrames.map((f) => f.d);

// Mapa de secciones para ubicar cada frame lento
const sections = await page.evaluate(() =>
  [...document.querySelectorAll("section[id], footer[id]")].map((s) => ({
    id: s.id,
    top: s.getBoundingClientRect().top + window.scrollY,
    bottom: s.getBoundingClientRect().bottom + window.scrollY
  }))
);
const locate = (y) => {
  const vy = y + 450; // centro del viewport
  const s = sections.find((s) => vy >= s.top && vy < s.bottom);
  return s ? s.id : `y=${Math.round(y)}`;
};

const janky = frames.filter((f) => f > 33.4);
const avg = frames.reduce((a, b) => a + b, 0) / (frames.length || 1);
console.log(`Throttle ${throttle}x — frames: ${frames.length}, promedio ${avg.toFixed(1)} ms (${(1000 / avg).toFixed(0)} fps), >33ms: ${janky.length} (${(janky.length * 100 / frames.length).toFixed(1)}%), peor: ${Math.max(...frames).toFixed(0)} ms`);
console.log("Frames lentos (ms @ sección):");
rawFrames.filter((f) => f.d > 33.4).forEach((f, i) =>
  console.log(`  #${i} ${f.d.toFixed(0)} ms @ ${locate(f.y)} (scrollY=${Math.round(f.y)})`));

if (profileResult) {
  const { profile } = profileResult;
  const nodesById = new Map(profile.nodes.map((n) => [n.id, n]));
  const selfTime = new Map();
  const deltas = profile.timeDeltas || [];
  profile.samples?.forEach((id, i) => {
    const node = nodesById.get(id);
    if (!node) return;
    const cf = node.callFrame;
    let src = cf.url ? cf.url.replace("http://127.0.0.1:4173", "") : "";
    if (src.startsWith("https://")) src = new URL(cf.url).hostname;
    const key = `${cf.functionName || "(anónimo)"} @ ${src}:${cf.lineNumber + 1}`;
    selfTime.set(key, (selfTime.get(key) || 0) + (deltas[i] ?? 250));
  });
  console.log("Top funciones (self-time):");
  [...selfTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([k, us]) => console.log(`  ${(us / 1000).toFixed(1).padStart(7)} ms  ${k}`));
}

// El widget debe cargarse igual, en la pausa post-scroll
await page.waitForTimeout(5000);
const iframes = await page.evaluate(() => document.querySelectorAll("#calendly-embed iframe").length);
console.log(`Calendly cargado tras la pausa: ${iframes > 0 ? "✅" : "❌ (0 iframes)"}`);

await page.screenshot({ path: "/tmp/quote-mid-scroll.png" });
await browser.close();
