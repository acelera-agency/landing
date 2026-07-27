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
      const maximumOverviewTop = compactProjectsView ? window.innerHeight * 0.35 : 120;
      const maximumCardRatio = compactProjectsView ? 0.65 : 0.55;
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
    const maximumOverviewTop = compactProjectsView ? height * 0.35 : 120;
    const maximumCardRatio = compactProjectsView ? 0.65 : 0.55;
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
      const mediaRect = card.querySelector(".project-media").getBoundingClientRect();
      return {
        project: card.dataset.project,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        mediaRatio: Number((mediaRect.width / mediaRect.height).toFixed(2)),
      };
    }),
    viewport: (() => {
      const element = document.querySelector(".projects-carousel__viewport");
      const rect = element.getBoundingClientRect();
      return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    })(),
    previewDisplay: getComputedStyle(document.querySelector(".capability-preview")).display,
  }));

  assert.equal(layout.overflow, 0, `${width}px should not overflow horizontally`);
  assert.equal(layout.cards.length, 5, `${width}px should render five project cards`);
  assert.equal(new Set(layout.cards.map(({ top }) => top)).size, 1, `${width}px should render one horizontal rail`);
  const mediaRatios = Object.fromEntries(layout.cards.map(({ project, mediaRatio }) => [project, mediaRatio]));
  assert.deepEqual(
    mediaRatios,
    { rely: 1.78, lain: 1.78, harness: 1.78, faro: 2.21, lemon: 2.21 },
    `${width}px should use the source-appropriate format for every project`,
  );
  const visibleCards = layout.cards.filter(({ left, right }) => left >= layout.viewport.left - 1 && right <= layout.viewport.right + 1);
  const expectedVisibleCards = width >= 768 ? 2 : 1;
  assert.equal(visibleCards.length, expectedVisibleCards, `${width}px should show ${expectedVisibleCards} project card(s)`);

  const statusBefore = await page.evaluate(() => ({
    previousDisabled: document.querySelector("[data-projects-prev]").disabled,
    nextDisabled: document.querySelector("[data-projects-next]").disabled,
  }));
  assert.deepEqual(statusBefore, { previousDisabled: true, nextDisabled: false });

  await page.locator("[data-projects-next]").click();
  await page.waitForFunction(() => document.querySelector(".projects-carousel__viewport").scrollLeft > 0);
  assert.ok(await projectsViewport.evaluate((element) => element.scrollLeft > 0), `${width}px next should move the rail`);
  if (width >= 768) {
    await page.waitForTimeout(1000);
    const harnessPlayback = await page.evaluate(() => {
      const video = document.querySelector('[data-project="harness"] [data-project-video]');
      return {
        currentTime: video.currentTime,
        errorCode: video.error?.code ?? null,
        paused: video.paused,
        readyState: video.readyState,
        posterHidden: video.closest(".project-media").classList.contains("is-video-ready"),
      };
    });
    assert.equal(harnessPlayback.errorCode, null, `${width}px Harness video should decode without errors`);
    assert.equal(harnessPlayback.paused, false, `${width}px Harness video should be playing when visible`);
    assert.ok(harnessPlayback.currentTime >= 0.25, `${width}px Harness video should advance beyond its poster`);
    assert.ok(harnessPlayback.readyState >= 2, `${width}px Harness video should have playable frame data`);
    assert.equal(harnessPlayback.posterHidden, true, `${width}px Harness poster should hide once playback advances`);
  }
  await projectsViewport.focus();
  const firstStep = await projectsViewport.evaluate((element) => element.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction((previousScroll) => document.querySelector(".projects-carousel__viewport").scrollLeft > previousScroll, firstStep);
  await page.keyboard.press("Home");
  await page.waitForFunction(() => document.querySelector(".projects-carousel__viewport").scrollLeft < 2);

  await page.waitForFunction((expectedPlaying) => (
    [...document.querySelectorAll("[data-project-video]")].filter((video) => !video.paused).length === expectedPlaying
  ), expectedVisibleCards);
  const playback = await page.evaluate(() => [...document.querySelectorAll("[data-project-video]")].map((video) => ({
    project: video.closest("[data-project]").dataset.project,
    paused: video.paused,
  })));
  assert.deepEqual(playback.filter(({ paused }) => !paused).map(({ project }) => project), width >= 768 ? ["rely", "lain"] : ["rely"]);

  if (width === 1440) {
    for (const project of ["rely", "lain", "harness", "faro", "lemon"]) {
      await page.locator(`[data-project="${project}"]`).evaluate((card) => {
        card.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
      });
      await page.waitForFunction((slug) => {
        const video = document.querySelector(`[data-project="${slug}"] [data-project-video]`);
        return video
          && video.error === null
          && !video.paused
          && video.currentTime >= 0.25
          && video.readyState >= 2
          && video.closest(".project-media").classList.contains("is-video-ready");
      }, project, { timeout: 10_000 });
    }
    await projectsViewport.evaluate((element) => element.scrollTo({ left: 0, behavior: "auto" }));
    await page.waitForFunction(() => document.querySelector(".projects-carousel__viewport").scrollLeft < 2);
  }

  if (width >= 1200) {
    await page.locator('.capability-tab[data-case="harness"]').filter({ hasText: "Plataformas internas" }).hover();
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
        caseStudy: poster.dataset.activeCase,
        videoCount: element.querySelectorAll("video").length,
        overlapCount,
      };
    });
    assert.deepEqual(
      { visible: preview.visible, caseStudy: preview.caseStudy, videoCount: preview.videoCount },
      { visible: true, caseStudy: "harness", videoCount: 1 },
    );
    assert.ok(
      preview.overlapCount >= 1 && preview.overlapCount <= 4,
      `${width}px should keep the Harness preview layered behind a controlled number of capability pills`,
    );

    await page.getByRole("button", { name: "EN", exact: true }).click();
    const englishCopy = await page.evaluate(() => ({
      projectLinks: [...document.querySelectorAll(".project-link__label")].map((element) => element.textContent.trim()),
      harnessMeta: document.querySelector('[data-project="harness"] .project-meta').textContent.trim(),
      lemonMeta: document.querySelector('[data-project="lemon"] .project-meta').textContent.trim(),
      carouselLabel: document.querySelector(".projects-carousel__viewport").getAttribute("aria-label"),
      previousLabel: document.querySelector("[data-projects-prev]").getAttribute("aria-label"),
      nextLabel: document.querySelector("[data-projects-next]").getAttribute("aria-label"),
    }));
    assert.deepEqual(englishCopy.projectLinks, ["View Rely", "View Lain", "Video demo", "View Faro", "View project"]);
    assert.equal(englishCopy.harnessMeta, "Internal platform · AI agent management");
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
