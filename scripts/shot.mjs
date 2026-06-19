import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:4173/";
const out = process.argv[3] || "/tmp/shot.png";
const selector = process.argv[4] || null;
const width = Number(process.argv[5] || 1440);
const fullPage = process.argv[6] === "full";
const clickSelector = process.argv[7] || null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

// Force reveal state so we see the real design, not mid-animation
await page.addStyleTag({
  content: ".gsap-reveal, .sector-card { opacity: 1 !important; transform: none !important; }"
});
await page.waitForTimeout(400);

if (clickSelector) {
  for (const sel of clickSelector.split("|")) {
    await page.click(sel.trim());
    await page.waitForTimeout(500);
  }
}

if (selector) {
  const el = await page.$(selector);
  if (el) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await el.screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: false });
  }
} else {
  await page.screenshot({ path: out, fullPage });
}

await browser.close();
console.log("saved", out);
