import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const text = html => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const url = "https://www.acelera.agency/botmaker";

test("botmaker page has one h1, canonical metadata and service + FAQ structured data", async () => {
  const html = await read("botmaker.html");
  assert.match(html, /<html lang="es-AR"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<title>[^<]*Botmaker[^<]*\| Acelera<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{80,180}"/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${url.replaceAll(".", "\\.")}"/>`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${url.replaceAll(".", "\\.")}">`));
  assert.match(html, /<meta name="robots" content="index, follow/);

  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  const service = graph.find(node => node["@type"] === "Service");
  assert.equal(service.provider["@id"], "https://www.acelera.agency/#organization");
  assert.equal(service.url, url);

  // FAQ answers in JSON-LD must be the visible answers.
  const faq = graph.find(node => node["@type"] === "FAQPage");
  const visible = [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)]
    .map(([, question, answer]) => [text(question), text(answer)]);
  assert.ok(visible.length >= 5);
  assert.deepEqual(faq.mainEntity.map(item => [item.name, item.acceptedAnswer.text]), visible);
});

test("botmaker page explains the offer and ideal customer in plain HTML", async () => {
  const html = await read("botmaker.html");
  const body = text(html.match(/<main\b[\s\S]*<\/main>/)[0]);
  for (const id of ["para-quien", "ejemplos", "integraciones", "forma-de-trabajo", "acelera-y-botmaker", "preguntas", "contacto"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`), `${id} is linked from the page index`);
  }
  // Each example says what the assistant does, what the team gets and when a person continues.
  const examples = [...html.matchAll(/<article class="bm-example">([\s\S]*?)<\/article>/g)];
  assert.ok(examples.length >= 6);
  for (const [example] of examples) {
    for (const label of ["Qué hace el asistente", "Qué recibe el equipo", "Cuándo sigue una persona"]) assert.ok(example.includes(label));
  }
  for (const cost of ["Implementación de Acelera", "Licencia de Botmaker", "Consumo de los canales"]) assert.ok(body.includes(cost));
  assert.match(body, /WhatsApp/);
  assert.match(body, /Argentina/);
});

test("botmaker page avoids forbidden claims, pricing and invented contact channels", async () => {
  const html = await read("botmaker.html");
  assert.doesNotMatch(html, /innovaci[oó]n|disrupci[oó]n|transformaci[oó]n digital|vanguardia|llave en mano|[uú]ltima generaci[oó]n/i);
  assert.doesNotMatch(html, /partner|certificad|testimonio/i);
  assert.doesNotMatch(html, /(?:USD|U\$S|ARS|\$)\s?\d/);
  assert.doesNotMatch(html, /wa\.me|tel:|calendly|calendar\.app\.google/i);
  assert.match(html, /mailto:contacto@acelera\.agency/);
});

test("botmaker lead form reuses the shared gateway and is tagged with its own variant", async () => {
  const html = await read("botmaker.html");
  assert.match(html, /<body class="proposal-subpage" data-variant="botmaker">/);
  const form = html.match(/<form\b[^>]*data-lead-form[\s\S]*?<\/form>/)?.[0];
  assert.ok(form);
  assert.match(form, /data-ph-no-autocapture/);
  for (const name of ["nombre", "email", "empresa", "proceso", "privacy_consent"]) assert.match(form, new RegExp(`name="${name}"`));
  assert.match(form, /name="privacy_consent" type="checkbox" value="accepted" required/);
  assert.match(form, /data-feedback role="status" aria-live="polite"/);
  assert.match(html, /\/assets\/app\.js\?v=/);
});

test("botmaker shares the site header and footer", async () => {
  const [page, faro] = await Promise.all([read("botmaker.html"), read("casos/faro.html")]);
  const part = (html, tag) => html.match(new RegExp(`<${tag} class="site-${tag}">[\\s\\S]*?</${tag}>`))[0]
    .replace(/<a class="language-switch"[\s\S]*?<\/a>/, "").replace(/\r/g, "");
  assert.equal(part(page, "header"), part(faro, "header"));
  assert.equal(part(page, "footer"), part(faro, "footer"));
  // There is no English version yet: the switch leads to the English site instead of a missing page.
  assert.match(page, /data-language-switch[^>]*href="\/en\/"/);
  assert.doesNotMatch(page, /hreflang="en" href="https:\/\/www\.acelera\.agency\/en\/botmaker"/);
});

test("botmaker form cannot submit natively: controls start disabled and app.js enables them", async () => {
  const [html, app] = await Promise.all([read("botmaker.html"), read("assets/app.js")]);
  const form = html.match(/<form\b[^>]*data-lead-form[\s\S]*?<\/form>/)[0];
  assert.match(form, /<form\b[^>]*method="post"/);
  const controls = [...form.matchAll(/<(?:input|textarea|select|button)\b[^>]*>/g)].map(([tag]) => tag);
  assert.ok(controls.length >= 6);
  for (const tag of controls) assert.match(tag, /\bdisabled data-requires-js\b/, tag);
  // Without JavaScript the only way to write is the public mailbox.
  assert.match(form, /<noscript>[\s\S]*href="mailto:contacto@acelera\.agency"[\s\S]*<\/noscript>/);
  assert.match(app, /querySelectorAll\("\[data-requires-js\]"\)[\s\S]*?\.disabled = false/);
});

test("the switch on a Spanish-only page keeps the query but not the section anchor", async () => {
  const [source, html] = await Promise.all([read("assets/locale.js"), read("botmaker.html")]);
  assert.match(html, /data-language-switch data-language-home[^>]*href="\/en\/"/);
  const run = dataset => {
    let href;
    const control = { getAttribute: () => "/en/", dataset, set href(value) { href = value; }, addEventListener() {} };
    vm.runInNewContext(source, { document: { documentElement: { lang: "es-AR" }, querySelector: () => control }, window: {}, location: { search: "?utm_source=mail", hash: "#integraciones" }, addEventListener() {} });
    return href;
  };
  assert.equal(run({ languageOption: "en", languageHome: "" }), "/en/?utm_source=mail");
  assert.equal(run({ languageOption: "en" }), "/en/?utm_source=mail#integraciones");
});

test("the Spanish home links to /botmaker and the English build leaves it out", async () => {
  const [es, source, en] = await Promise.all([read("index.html"), read("redisenio/index.html"), read("en/index.html")]);
  for (const html of [es, source]) assert.match(html, /Caso Faro<\/a><a href="\/botmaker">Implementación de Botmaker<\/a>/);
  // English navigation stays in English and /botmaker has no English version.
  assert.doesNotMatch(en, /href="(?:\/en)?\/botmaker/);
});
