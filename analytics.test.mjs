import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { publicRoutes } from "./scripts/public-routes.mjs";
const publicPages = publicRoutes.flatMap(route => [route + ".html", "en/" + route + ".html"]);

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("installs the consent-first PostHog integration on every public page", async () => {
  for (const page of publicPages) {
    const html = await read(page);
    assert.match(html, /\/assets\/analytics\.css\?v=20261012-language-1/, `${page} should load analytics styles`);
    assert.match(html, /\/assets\/analytics\.js\?v=20261012-language-1/, `${page} should load analytics code`);
    assert.match(html, /data-analytics-preferences/, `${page} should expose analytics preferences`);
  }
});

test("keeps PostHog disabled before consent and masks contact fields in replay", async () => {
  const [analytics, homepage] = await Promise.all([read("assets/analytics.js"), read("redisenio/scheduler.js")]);

  assert.match(analytics, /readConsent\(\) !== CONSENT_GRANTED/);
  assert.match(analytics, /maskAllInputs:\s*true/);
  assert.match(analytics, /data-ph-no-autocapture/);
  assert.match(homepage, /form\.setAttribute\("data-ph-no-autocapture", ""\)/);
  assert.doesNotMatch(analytics, /formData|\.value\s*[,}]/);
});

test("keeps the consent banner brief, labelled and aligned with the privacy policy", async () => {
  const [analytics, privacy, i18n] = await Promise.all([read("assets/analytics.js"), read("privacidad.html"), read("assets/i18n.js")]);

  assert.match(analytics, /setAttribute\("aria-label", t\("Preferencias de analítica"\)\)/);
  assert.match(analytics, /aria-describedby", "analytics-consent-description"/);
  assert.match(analytics, /"\/privacidad#tecnologias"/);
  assert.match(analytics, /"\/en\/privacidad#tecnologias"/);
  const description = "Usamos PostHog para mejorar el sitio, solo si lo aceptás.";
  assert.ok(analytics.includes(description));
  assert.ok(description.length <= 80, "The banner copy should stay to one short sentence");
  // La política cita los botones por su nombre: si cambian, hay que actualizarla.
  for (const label of ["Solo necesarias", "Aceptar analítica"]) {
    assert.ok(analytics.includes(`t("${label}")`));
    assert.match(privacy.replace(/\s+/g, " "), new RegExp(`“${label}”`));
    assert.match(i18n, new RegExp(`"${label}":`));
  }
});

test("tracks the landing funnel with stable snake-case events and no lead payload", async () => {
  const [analytics, app] = await Promise.all([read("assets/analytics.js"), read("assets/app.js")]);
  const expectedEvents = [
    "section_viewed",
    "scroll_depth_reached",
    "contact_cta_clicked",
    "contact_form_started",
    "contact_form_submitted",
    "contact_form_failed",
    "language_changed",
    "frontend_error"
  ];

  for (const eventName of expectedEvents) {
    assert.match(`${analytics}\n${app}`, new RegExp(`\\"${eventName}\\"`), `${eventName} should be captured`);
  }

  assert.doesNotMatch(app, /AceleraAnalytics\?\.capture\([^)]*formPayload/s);
});

test("documents PostHog, session replay, consent storage and international processing", async () => {
  const privacy = await read("privacidad.html");

  assert.match(privacy, /Vigente desde el 11 de agosto de 2026/);
  assert.match(privacy, /<h3>PostHog<\/h3>/);
  assert.match(privacy, /Grabación de sesión opcional/);
  assert.match(privacy, /acelera-analytics-consent/);
  assert.match(privacy, /Vercel, Resend, PostHog, Google/);
});
