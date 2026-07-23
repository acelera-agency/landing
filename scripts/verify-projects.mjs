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

  const assertProjectsAnchor = async (context) => {
    await page.waitForFunction(() => {
      const overview = document.querySelector(".projects-heading");
      const title = document.querySelector(".projects-heading h2");
      const subtitle = document.querySelector(".projects-heading__copy");
      const firstCard = document.querySelector(".project-card");
      if (!overview || !title || !subtitle || !firstCard) return false;
      const overviewTop = overview.getBoundingClientRect().top;
      const subtitleTop = subtitle.getBoundingClientRect().top;
      const titleBottom = title.getBoundingClientRect().bottom;
      const subtitleBottom = subtitle.getBoundingClientRect().bottom;
      const cardTop = firstCard.getBoundingClientRect().top;
      const compactProjectsView = window.innerWidth >= 1200 && window.innerHeight <= 760;
      const minimumOverviewTop = compactProjectsView ? 0 : 60;
      const maximumOverviewTop = compactProjectsView ? 24 : 120;
      const maximumCardRatio = compactProjectsView ? 0.35 : 0.55;
      return overviewTop >= minimumOverviewTop
        && overviewTop <= maximumOverviewTop
        && subtitleTop >= 0
        && titleBottom < window.innerHeight * 0.5
        && subtitleBottom < window.innerHeight * 0.5
        && cardTop < window.innerHeight * maximumCardRatio;
    });
    await page.waitForTimeout(250);
    const anchorLayout = await page.evaluate(() => ({
      overviewTop: Math.round(document.querySelector(".projects-heading").getBoundingClientRect().top),
      titleBottom: Math.round(document.querySelector(".projects-heading h2").getBoundingClientRect().bottom),
      subtitleTop: Math.round(document.querySelector(".projects-heading__copy").getBoundingClientRect().top),
      subtitleBottom: Math.round(document.querySelector(".projects-heading__copy").getBoundingClientRect().bottom),
      firstCardTop: Math.round(document.querySelector(".project-card").getBoundingClientRect().top),
    }));
    const compactProjectsView = width >= 1200 && height <= 760;
    const minimumOverviewTop = compactProjectsView ? 0 : 60;
    const maximumOverviewTop = compactProjectsView ? 24 : 120;
    const maximumCardRatio = compactProjectsView ? 0.35 : 0.55;
    assert.ok(
      anchorLayout.overviewTop >= minimumOverviewTop && anchorLayout.overviewTop <= maximumOverviewTop,
      `${width}px should keep the projects overview below the fixed navigation after ${context}`,
    );
    assert.ok(anchorLayout.subtitleTop >= 0, `${width}px should not clip the project subtitle after ${context}`);
    assert.ok(anchorLayout.titleBottom < height * 0.5, `${width}px should show the project title after ${context}`);
    assert.ok(anchorLayout.subtitleBottom < height * 0.5, `${width}px should show the project subtitle after ${context}`);
    assert.ok(anchorLayout.firstCardTop < height * maximumCardRatio, `${width}px should also show project cards after ${context}`);
  };

  await page.goto(`${baseUrl}/#proyectos`, { waitUntil: "networkidle" });
  await assertProjectsAnchor("direct navigation");

  const projectsViewport = page.locator(".projects-carousel__viewport");
  await page.waitForTimeout(500);
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cards: [...document.querySelectorAll(".project-card")].map((card) => {
      const rect = card.getBoundingClientRect();
      return { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), width: Math.round(rect.width) };
    }),
    viewport: (() => {
      const element = document.querySelector(".projects-carousel__viewport");
      const rect = element.getBoundingClientRect();
      return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    })(),
    previewDisplay: getComputedStyle(document.querySelector(".capability-preview")).display,
  }));

  assert.equal(layout.overflow, 0, `${width}px should not overflow horizontally`);
  assert.equal(layout.cards.length, 4, `${width}px should render four project cards`);
  assert.equal(new Set(layout.cards.map(({ top }) => top)).size, 1, `${width}px should render one horizontal rail`);
  const visibleCards = layout.cards.filter(({ left, right }) => left >= layout.viewport.left - 1 && right <= layout.viewport.right + 1);
  const expectedVisibleCards = width >= 768 ? 2 : 1;
  assert.equal(visibleCards.length, expectedVisibleCards, `${width}px should show ${expectedVisibleCards} project card(s)`);

  const statusBefore = await page.evaluate(() => ({
    current: document.querySelector("[data-projects-current]").textContent,
    total: document.querySelector("[data-projects-total]").textContent,
    previousDisabled: document.querySelector("[data-projects-prev]").disabled,
    nextDisabled: document.querySelector("[data-projects-next]").disabled,
  }));
  assert.deepEqual(statusBefore, { current: "01", total: "04", previousDisabled: true, nextDisabled: false });

  await page.locator("[data-projects-next]").click();
  await page.waitForFunction(() => document.querySelector("[data-projects-current]").textContent === "02");
  assert.ok(await projectsViewport.evaluate((element) => element.scrollLeft > 0), `${width}px next should move the rail`);
  await projectsViewport.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelector("[data-projects-current]").textContent === "03");
  await page.keyboard.press("Home");
  await page.waitForFunction(() => document.querySelector("[data-projects-current]").textContent === "01");

  await page.waitForFunction((expectedPlaying) => (
    [...document.querySelectorAll("[data-project-video]")].filter((video) => !video.paused).length === expectedPlaying
  ), expectedVisibleCards);
  const playback = await page.evaluate(() => [...document.querySelectorAll("[data-project-video]")].map((video) => ({
    project: video.closest("[data-project]").dataset.project,
    paused: video.paused,
  })));
  assert.deepEqual(playback.filter(({ paused }) => !paused).map(({ project }) => project), width >= 768 ? ["rely", "lain"] : ["rely"]);

  if (width >= 1200) {
    await page.locator('.capability-tab[data-case="rely"]').filter({ hasText: "Plataformas internas" }).hover();
    const preview = await page.evaluate(() => {
      const element = document.querySelector(".capability-preview");
      const poster = document.querySelector("[data-capability-poster]");
      const previewRect = element.getBoundingClientRect();
      const overlapCount = [...document.querySelectorAll(".capability-tab")].filter((pill) => {
        const pillRect = pill.getBoundingClientRect();
        return previewRect.left < pillRect.right && previewRect.right > pillRect.left
          && previewRect.top < pillRect.bottom && previewRect.bottom > pillRect.top;
      }).length;
      return {
        visible: element.classList.contains("is-visible") && element.getAttribute("aria-hidden") === "false",
        project: document.querySelector("[data-capability-project]").textContent,
        caseStudy: poster.dataset.activeCase,
        videoCount: element.querySelectorAll("video").length,
        overlapCount,
      };
    });
    assert.deepEqual(preview, { visible: true, project: "Rely", caseStudy: "rely", videoCount: 0, overlapCount: 0 });

    await page.getByRole("button", { name: "EN", exact: true }).click();
    const englishCopy = await page.evaluate(() => ({
      projectLinks: [...document.querySelectorAll(".project-link__label")].map((element) => element.textContent.trim()),
      caseTitle: document.querySelector("[data-capability-project]").textContent.trim(),
      lemonMeta: document.querySelector('[data-project="lemon"] .project-meta').textContent.trim(),
      carouselLabel: document.querySelector(".projects-carousel__viewport").getAttribute("aria-label"),
      previousLabel: document.querySelector("[data-projects-prev]").getAttribute("aria-label"),
      nextLabel: document.querySelector("[data-projects-next]").getAttribute("aria-label"),
    }));
    assert.deepEqual(englishCopy.projectLinks, ["View Rely", "View Lain", "View Faro", "View project"]);
    assert.equal(englishCopy.caseTitle, "Rely");
    assert.equal(englishCopy.carouselLabel, "Featured projects");
    assert.equal(englishCopy.previousLabel, "Previous project");
    assert.equal(englishCopy.nextLabel, "Next project");
    assert.equal(englishCopy.lemonMeta, "A project for Lemon · Connected hardware");
    await page.goto(`${baseUrl}/#hero-section`, { waitUntil: "networkidle" });
    await page.locator('.section-index__link[href="#proyectos"]').click();
    await page.waitForFunction(() => window.location.hash === "#proyectos");
    await assertProjectsAnchor("clicking the projects link");
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
    shortDesktop: await inspectViewport(1608, 721),
    desktop: await inspectViewport(1440, 1000),
    tablet: await inspectViewport(1024, 900),
    mobile: await inspectViewport(390, 844),
  };
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  await browser.close();
}
