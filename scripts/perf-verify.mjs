// Verificación post-fix: carga liviana, canvas pausado fuera de vista,
// Calendly diferido, header y animaciones funcionando.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const responses = [];
page.on("response", async (res) => {
  const body = await res.body().catch(() => null);
  responses.push({ url: res.url(), bytes: body ? body.length : 0 });
});

function rendererCpu() {
  const out = execSync(
    "ps -Ao pcpu,command | grep 'chromium_headless_shell' | grep -- '--type=renderer' | grep -v grep || true"
  ).toString();
  return out.trim().split("\n").filter(Boolean)
    .reduce((a, l) => a + parseFloat(l.trim().split(/\s+/)[0].replace(",", ".")), 0);
}

async function cpuAvg(seconds) {
  const r = [];
  for (let i = 0; i < seconds; i++) {
    await page.waitForTimeout(1000);
    r.push(rendererCpu());
  }
  return r.reduce((a, b) => a + b, 0) / r.length;
}

await page.goto("http://127.0.0.1:4173/", { waitUntil: "load" });
await page.waitForTimeout(4000);

const loadBytes = responses.reduce((a, r) => a + r.bytes, 0);
const calendlyAtLoad = responses.filter((r) => /calendly|stripe|recaptcha|segment|sprig/i.test(r.url));
console.log(`1) Carga inicial: ${(loadBytes / 1024).toFixed(0)} KB en ${responses.length} requests`);
console.log(`   Requests Calendly/Stripe/trackers al cargar: ${calendlyAtLoad.length} ${calendlyAtLoad.length === 0 ? "✅" : "❌ " + calendlyAtLoad[0].url}`);

// 2) Canvas activo con hero visible
const cpuTop = await cpuAvg(5);
console.log(`2) CPU con hero visible (canvas animando): ${cpuTop.toFixed(0)}%`);

// 3) Scroll a #equipo: canvas fuera de vista → CPU debe bajar
await page.evaluate(() => document.getElementById("equipo").scrollIntoView({ behavior: "instant" }));
await page.waitForTimeout(1500);
const cpuMid = await cpuAvg(5);
console.log(`3) CPU con canvas fuera de vista: ${cpuMid.toFixed(0)}% ${cpuMid < cpuTop ? "✅ (bajó)" : "⚠️"}`);

// 4) Header en tono correcto sobre sección oscura
await page.evaluate(() => document.getElementById("manifesto").scrollIntoView({ behavior: "instant" }));
await page.waitForTimeout(600);
const toneDark = await page.evaluate(() => document.getElementById("site-header").getAttribute("data-nav-tone"));
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(600);
const toneLight = await page.evaluate(() => document.getElementById("site-header").getAttribute("data-nav-tone"));
console.log(`4) Tono header: manifesto="${toneDark}" (esp. dark) ${toneDark === "dark" ? "✅" : "❌"}, top="${toneLight}" (esp. light) ${toneLight === "light" ? "✅" : "❌"}`);

// 5) Calendly se carga al acercarse a #contacto
const before = responses.length;
await page.evaluate(() => document.getElementById("contacto").scrollIntoView({ behavior: "instant" }));
await page.waitForTimeout(6000);
const calendlyAfter = responses.slice(before).filter((r) => r.url.includes("calendly"));
const iframeCount = await page.evaluate(() => document.querySelectorAll("#calendly-embed iframe").length);
console.log(`5) Calendly diferido: ${calendlyAfter.length} requests tras scroll, iframe presente: ${iframeCount > 0 ? "✅" : "❌"}`);

// 6) Reveal: elementos gsap-reveal visibles tras scrollear
const revealed = await page.evaluate(() => {
  const els = [...document.querySelectorAll("#equipo .gsap-reveal")];
  return els.filter((el) => parseFloat(getComputedStyle(el).opacity) > 0.9).length + "/" + els.length;
});
console.log(`6) Reveals en #equipo con opacidad 1: ${revealed}`);

// 7) Canvas dibujó contenido (hero visible al inicio)
await page.waitForTimeout(400);
const canvasHasInk = await page.evaluate(() => {
  const c = document.getElementById("hero-3d-canvas");
  if (!c) return false;
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 400) if (d[i] > 0) return true;
  return false;
});
console.log(`7) Canvas del hero con contenido dibujado: ${canvasHasInk ? "✅" : "❌"}`);

await page.screenshot({ path: "/tmp/landing-hero-after.png" });
await browser.close();
