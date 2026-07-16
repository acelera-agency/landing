import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.ACELERA_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });

async function inspectViewport(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  const failedLocalRequests = [];
  const badLocalResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(baseUrl)) {
      failedLocalRequests.push({ url: request.url(), error: request.failure()?.errorText || "unknown" });
    }
  });
  page.on("response", (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) {
      badLocalResponses.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto(`${baseUrl}/#proyectos`, { waitUntil: "networkidle" });
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tops: [...document.querySelectorAll(".project-card")].map((card) => Math.round(card.getBoundingClientRect().top)),
    widths: [...document.querySelectorAll(".project-card")].map((card) => Math.round(card.getBoundingClientRect().width)),
    previewDisplay: getComputedStyle(document.querySelector(".capability-preview")).display,
  }));

  assert.equal(layout.overflow, 0, `${width}px should not overflow horizontally`);
  assert.equal(layout.tops.length, 4, `${width}px should render four project cards`);
  if (width >= 768) {
    assert.equal(layout.tops[0], layout.tops[1], `${width}px should use two columns`);
    assert.equal(layout.tops[2], layout.tops[3], `${width}px should use two columns`);
  } else {
    assert.equal(new Set(layout.tops).size, 4, `${width}px should stack cards`);
  }

  if (width >= 1200) {
    await page.locator('.capability-tab[data-case="rely"]').filter({ hasText: "Plataformas internas" }).hover();
    const preview = await page.evaluate(() => {
      const element = document.querySelector(".capability-preview");
      const video = document.querySelector("[data-capability-video]");
      const previewRect = element.getBoundingClientRect();
      const overlapCount = [...document.querySelectorAll(".capability-tab")].filter((pill) => {
        const pillRect = pill.getBoundingClientRect();
        return previewRect.left < pillRect.right && previewRect.right > pillRect.left
          && previewRect.top < pillRect.bottom && previewRect.bottom > pillRect.top;
      }).length;
      return {
        visible: element.classList.contains("is-visible") && element.getAttribute("aria-hidden") === "false",
        project: document.querySelector("[data-capability-project]").textContent,
        caseStudy: video.dataset.activeCase,
        overlapCount,
      };
    });
    assert.deepEqual(preview, { visible: true, project: "Rely", caseStudy: "rely", overlapCount: 0 });

    await page.getByRole("button", { name: "EN", exact: true }).click();
    const englishCopy = await page.evaluate(() => ({
      lead: document.querySelector('[data-project="lain"] .project-lead').textContent.trim(),
      caseCopy: document.querySelector("[data-capability-copy]").textContent.trim(),
      lemonMeta: document.querySelector('[data-project="lemon"] .project-meta').textContent.trim(),
    }));
    assert.equal(englishCopy.lead, "Led by Mauro Proto");
    assert.match(englishCopy.caseCopy, /^In Rely, an internal platform connects/);
    assert.equal(englishCopy.lemonMeta, "A project for Lemon · Connected hardware");
  }

  assert.deepEqual(errors, [], `${width}px should have no console errors`);
  assert.deepEqual(badLocalResponses, [], `${width}px should have no failing local responses`);
  assert.deepEqual(
    failedLocalRequests.filter(({ error }) => error !== "net::ERR_ABORTED"),
    [],
    `${width}px should have no unexpected local request failures`,
  );
  await page.close();
  return layout;
}

try {
  const results = {
    desktop: await inspectViewport(1440, 1000),
    tablet: await inspectViewport(1024, 900),
    mobile: await inspectViewport(390, 844),
  };
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  await browser.close();
}
