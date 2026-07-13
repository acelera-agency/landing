// Perfilado de rendimiento: carga + scroll.
// Uso: node scripts/perf-profile.mjs [--no-canvas] [--warmup=ms] [--throttle=x]
import { chromium } from "playwright";

const noCanvas = process.argv.includes("--no-canvas");
const warmupMs = Number((process.argv.find((a) => a.startsWith("--warmup=")) || "--warmup=2500").split("=")[1]);
const throttle = Number((process.argv.find((a) => a.startsWith("--throttle=")) || "--throttle=1").split("=")[1]);
const url = "http://127.0.0.1:4173/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// --- Red: registrar todas las respuestas con su tamaño ---
const responses = [];
page.on("response", async (res) => {
  try {
    const body = await res.body().catch(() => null);
    responses.push({
      url: res.url(),
      status: res.status(),
      bytes: body ? body.length : 0,
      type: res.request().resourceType()
    });
  } catch {}
});

if (noCanvas) {
  // A/B: eliminar el canvas del hero antes de que corra su script
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("hero-3d-canvas")?.remove();
    }, { capture: true });
  });
}

// Long tasks observer
await page.addInitScript(() => {
  window.__longTasks = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__longTasks.push({ start: e.startTime, dur: e.duration });
  }).observe({ entryTypes: ["longtask"] });
});

const t0 = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 30000 });
const loadMs = Date.now() - t0;
await page.waitForTimeout(warmupMs); // dejar que Calendly/fuentes/GSAP se asienten (y que el canvas "envejezca")

const netAtLoad = responses.slice();

// --- Perfil de CPU durante el scroll ---
const cdp = await page.context().newCDPSession(page);
if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 250 });

// Medidor de FPS: deltas entre ticks de rAF durante el scroll
await page.evaluate(() => {
  window.__longTasks.length = 0;
  window.__scrollStart = performance.now();
  window.__frames = [];
  let last = performance.now();
  window.__fpsStop = false;
  (function tick(now) {
    if (window.__fpsStop) return;
    window.__frames.push(now - last);
    last = now;
    requestAnimationFrame(tick);
  })(last);
});
await cdp.send("Profiler.start");

// Scroll suave: rueda del mouse, 120px por tick, por toda la página (~9s)
const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
const ticks = Math.ceil(pageHeight / 120);
await page.mouse.move(720, 450);
for (let i = 0; i < ticks; i++) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(Math.max(16, Math.floor(8000 / ticks)));
}
await page.waitForTimeout(500);

const { profile } = await cdp.send("Profiler.stop");
const longTasks = await page.evaluate(() => window.__longTasks);
const scrollWindowMs = await page.evaluate(() => performance.now() - window.__scrollStart);
const frames = await page.evaluate(() => { window.__fpsStop = true; return window.__frames; });

// --- Agregar self-time por función ---
const nodesById = new Map(profile.nodes.map((n) => [n.id, n]));
const selfTime = new Map(); // key -> µs
const interval = 250; // µs por muestra (aprox: usar timeDeltas reales)
const deltas = profile.timeDeltas || [];
profile.samples?.forEach((id, i) => {
  const node = nodesById.get(id);
  if (!node) return;
  const cf = node.callFrame;
  let name = cf.functionName || "(anónimo)";
  let src = cf.url ? cf.url.replace("http://127.0.0.1:4173", "") : "";
  if (src.startsWith("https://")) src = new URL(cf.url).hostname + new URL(cf.url).pathname.slice(0, 40);
  const key = `${name} @ ${src}:${cf.lineNumber + 1}`;
  selfTime.set(key, (selfTime.get(key) || 0) + (deltas[i] ?? interval));
});

const totalUs = [...selfTime.values()].reduce((a, b) => a + b, 0);
const top = [...selfTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

console.log(`\n=== MODO: ${noCanvas ? "SIN canvas hero" : "normal"} ===`);
console.log(`Carga (evento load): ${loadMs} ms`);
console.log(`\n--- Red durante la carga (${netAtLoad.length} requests) ---`);
const byHost = {};
for (const r of netAtLoad) {
  const host = new URL(r.url).hostname;
  byHost[host] = (byHost[host] || 0) + r.bytes;
}
Object.entries(byHost).sort((a, b) => b[1] - a[1]).forEach(([h, b]) =>
  console.log(`  ${(b / 1024).toFixed(0).padStart(6)} KB  ${h}`));
console.log("  Top recursos:");
netAtLoad.sort((a, b) => b.bytes - a.bytes).slice(0, 12).forEach((r) =>
  console.log(`  ${(r.bytes / 1024).toFixed(0).padStart(6)} KB  ${r.type.padEnd(10)} ${r.url.slice(0, 110)}`));

console.log(`\n--- Scroll (${(scrollWindowMs / 1000).toFixed(1)} s, throttle ${throttle}x, warmup ${warmupMs} ms) ---`);
const janky = frames.filter((f) => f > 33.4);
const avg = frames.reduce((a, b) => a + b, 0) / (frames.length || 1);
console.log(`Frames: ${frames.length}, promedio ${avg.toFixed(1)} ms (${(1000 / avg).toFixed(0)} fps), frames >33ms: ${janky.length} (${(janky.length * 100 / (frames.length || 1)).toFixed(1)}%), peor: ${Math.max(0, ...frames).toFixed(0)} ms`);
const ltTotal = longTasks.reduce((a, t) => a + t.dur, 0);
console.log(`Long tasks (>50ms): ${longTasks.length}, total bloqueado: ${ltTotal.toFixed(0)} ms`);
console.log(`CPU total muestreada en main thread: ${(totalUs / 1000).toFixed(0)} ms (${(totalUs / 10 / scrollWindowMs).toFixed(1)}% del tiempo de scroll)`);
console.log("\nTop funciones por self-time durante el scroll:");
top.forEach(([k, us]) => console.log(`  ${(us / 1000).toFixed(1).padStart(8)} ms  ${k}`));

await browser.close();
