import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const text = html => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const url = "https://bot.acelera.agency/";
const countries = ["México", "Guatemala", "El Salvador", "Honduras", "Costa Rica", "Panamá", "República Dominicana"];

test("botmaker page has one h1, canonical metadata and service + FAQ structured data", async () => {
  const html = await read("botmaker.html");
  assert.match(html, /<html lang="es-MX"/);
  assert.match(html, /<meta property="og:locale" content="es_MX">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<title>[^<]*Botmaker[^<]*\| Acelera<\/title>/);
  assert.match(html, /<meta name="description" content="México, Centroamérica y República Dominicana: [^"]{34,134}"/);
  assert.match(html, /<meta property="og:description" content="Para empresas de México, Centroamérica y República Dominicana: /);
  assert.match(html, new RegExp(`<link rel="canonical" href="${url.replaceAll(".", "\\.")}"/>`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${url.replaceAll(".", "\\.")}">`));
  assert.match(html, /<meta name="robots" content="index, follow/);

  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  const service = graph.find(node => node["@type"] === "Service");
  assert.equal(service.provider["@id"], "https://www.acelera.agency/#organization");
  assert.equal(service.url, url);
  assert.deepEqual(service.areaServed.map(place => place.name), countries);
  assert.equal(graph.find(node => node["@type"] === "WebPage").inLanguage, "es-MX");

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
  for (const id of ["para-quien", "ejemplos", "plataforma", "integraciones", "forma-de-trabajo", "acelera-y-botmaker", "clientes", "preguntas", "contacto"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`), `${id} is linked from the page index`);
  }
  // Plain-HTML ideal customer profile for the lead engine and cold-mail visitors:
  // region, size, the four sectors and the signals that make a company a fit.
  for (const country of countries) assert.ok(body.includes(country), country);
  for (const signal of ["20 a 500 personas", "Educación privada", "Universidades, preparatorias, colegios e institutos", "Salud privada", "Clínicas, hospitales privados, consultorios dentales", "Inmobiliarias y desarrolladoras", "Agencias automotrices y concesionarias", "admisiones", "citas", "prueba de manejo", "refacciones", "HubSpot", "Salesforce", "Zoho", "Kommo", "Meta", "Google", "sucursales, planteles o campus"]) {
    assert.ok(body.toLowerCase().includes(signal.toLowerCase()), signal);
  }
  // The region is stated early for the lead engine: above the h1, in the hero lead and in the
  // intros of the sections that describe who it is for, who pays what and how to get in touch.
  const hero = text(html.match(/<section class="bm-hero"[\s\S]*?<\/section>/)[0]);
  assert.match(text(html.match(/<p class="bm-kicker">[\s\S]*?<\/p>\s*<h1/)[0]), /^Para empresas de México, Centroamérica y República Dominicana/);
  assert.match(text(html.match(/<p class="bm-hero__lead">[\s\S]*?<\/p>/)[0]), /^Trabajamos con empresas de México, Centroamérica y República Dominicana/);
  assert.doesNotMatch(text(html.match(/<h1\b[\s\S]*?<\/h1>/)[0]), /México|Centroamérica/);
  assert.ok(body.slice(0, Math.floor(body.length / 3)).match(/México|Centroamérica/g).length >= 3);
  for (const id of ["para-quien", "acelera-y-botmaker", "contacto"]) {
    assert.match(text(html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`))[0]), /México|Centroamérica/, id);
  }
  // The South Cone is not a target market: Argentina only appears in the FAQ about the region,
  // as where the team works from. The consent says "en otros países" instead of naming it.
  assert.equal(body.match(/Argentina/g).length, 1);
  for (const phrase of ["Nuestro equipo está en Argentina y trabaja de forma remota", "procesarlos en otros países"]) assert.ok(body.includes(phrase), phrase);
  assert.doesNotMatch(hero, /Argentina/);
  assert.doesNotMatch(html.match(/<section[^>]*id="para-quien"[\s\S]*?<\/section>/)[0], /Argentina/);
  assert.doesNotMatch(body, /Buenos Aires|Tokko|Cono Sur|Latinoamérica y Argentina/);
  // Each example says what the assistant does, what the team gets and when a person continues.
  const examples = [...html.matchAll(/<article class="bm-example">([\s\S]*?)<\/article>/g)];
  assert.ok(examples.length >= 6);
  for (const [example] of examples) {
    for (const label of ["Qué hace el asistente", "Qué recibe el equipo", "Cuándo sigue una persona"]) assert.ok(example.includes(label));
  }
  for (const cost of ["Implementación de Acelera", "Licencia de Botmaker", "Consumo de los canales"]) assert.ok(body.includes(cost));
  assert.match(body, /WhatsApp/);
  assert.match(body, /Meta define la tarifa de los mensajes de WhatsApp para cada país/);
});

test("botmaker copy speaks to Mexico with tú: no voseo or Rioplatense vocabulary in the page's own content", async () => {
  const html = await read("botmaker.html");
  // The shared header and footer are compared with the rest of the site in another test.
  const own = html.replace(/<header class="site-header">[\s\S]*?<\/header>|<footer class="site-footer">[\s\S]*?<\/footer>/g, "");
  const voseo = /(?<!\p{L})(contanos|querés|podés|tenés|escribinos|sabés|necesitás|elegí|mirá|contá|describí|reservá|preferís|usás|agendá|consultá|sumá|revisá|probá|volvé|completá|ingresá|vos)(?!\p{L})/giu;
  assert.deepEqual(own.match(voseo) || [], []);
  // Rioplatense vocabulary; "asesor de ventas en turno" is the Mexican sense of the word.
  assert.deepEqual(text(own).match(/(?<!\p{L})(acá|turnos?|presupuestos? de|abono)(?!\p{L})/giu) || [], ["turno"]);
  assert.match(own, /Cuéntanos qué necesitas/);
});

test("botmaker page avoids forbidden claims, pricing and invented contact channels", async () => {
  const html = await read("botmaker.html");
  assert.doesNotMatch(html, /innovaci[oó]n|disrupci[oó]n|transformaci[oó]n digital|vanguardia|llave en mano|[uú]ltima generaci[oó]n/i);
  assert.doesNotMatch(html, /certificad|testimonio/i);
  // The partner claim lives in three editable places: <title> (reused as the WebPage name),
  // the hero badge and one FAQ question (mirrored in the FAQPage JSON-LD).
  const partner = [...html.matchAll(/[^<>"]*partner[^<>"]*/gi)].map(([match]) => match.trim());
  assert.deepEqual(partner, [
    "Botmaker en México y Centroamérica · Partner oficial | Acelera",
    "Botmaker en México y Centroamérica · Partner oficial | Acelera",
    "¿Acelera es partner oficial de Botmaker?",
    "Partner oficial de Botmaker",
    "¿Acelera es partner oficial de Botmaker?",
  ]);
  assert.doesNotMatch(html.match(/<meta property="og:title"[^>]*>/)[0], /partner/i);
  assert.doesNotMatch(html, /(?:USD|U\$S|ARS|\$)\s?\d/);
  assert.doesNotMatch(html, /wa\.me|tel:|calendly/i);
  assert.match(html, /mailto:contacto@acelera\.agency/);
});

test("botmaker contact keeps the lead gateway and uses the outreach Google agenda", async () => {
  const html = await read("botmaker.html");
  assert.match(html, /<body class="bm-page" data-variant="botmaker-mx">/);
  const form = html.match(/<form\b[^>]*data-lead-form[\s\S]*?<\/form>/)?.[0];
  assert.ok(form);
  assert.match(form, /data-ph-no-autocapture/);
  for (const name of ["nombre", "email", "empresa", "proceso", "privacy_consent"]) assert.match(form, new RegExp(`name="${name}"`));
  assert.match(form, /name="privacy_consent" type="checkbox" value="accepted" required/);
  assert.match(form, /data-feedback role="status" aria-live="polite"/);
  assert.match(html, /\/assets\/app\.js\?v=/);
  const calendarLinks = [...html.matchAll(/<a\b[^>]*href="(https:\/\/calendar\.app\.google\/[^\"]+)"[^>]*>/g)];
  assert.deepEqual(calendarLinks.map(([, href]) => href), ["https://calendar.app.google/Ci3pYTwmLT6q3LMQ8"]);
  assert.match(calendarLinks[0][0], /target="_blank"/);
  assert.match(calendarLinks[0][0], /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /data-scheduler|data-calendly-link|\/redisenio\/scheduler\.(?:js|css)/);
});

test("botmaker shares the site footer and its header points to this page's sections", async () => {
  const [page, faro] = await Promise.all([read("botmaker.html"), read("casos/faro.html")]);
  const part = (html, tag) => html.match(new RegExp(`<${tag} class="site-${tag}">[\\s\\S]*?</${tag}>`))[0]
    .replace(/<a class="language-switch"[\s\S]*?<\/a>/, "").replace(/\r/g, "");
  // Served from bot.acelera.agency, so links back to the main site are absolute.
  const pageFooter = part(page, "footer").replaceAll('href="https://www.acelera.agency/', 'href="/').replaceAll('href="https://bot.acelera.agency/"', 'href="/botmaker"');
  assert.equal(pageFooter, part(faro, "footer"));
  const header = part(page, "header");
  // "Contacto" leads to this page's form, not to the home scheduler.
  assert.match(header, /<a class="bracket-link" href="#contacto">Contacto<\/a>/);
  assert.doesNotMatch(header, /href="\/#contacto"/);
  assert.match(header, /class="brand" href="\/"/);
  for (const [, id] of header.matchAll(/href="#([a-z-]+)"/g)) assert.match(page, new RegExp(`<section[^>]*id="${id}"`), id);
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
    vm.runInNewContext(source, { document: { documentElement: { lang: "es-MX" }, querySelector: () => control }, window: {}, location: { search: "?utm_source=mail", hash: "#integraciones" }, addEventListener() {} });
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

test("Botmaker clients and cases are labelled as Botmaker's and link to the official source", async () => {
  const html = await read("botmaker.html");
  const section = html.match(/<section[^>]*id="clientes"[\s\S]*?<\/section>/)[0];
  assert.match(text(section), /usos de Botmaker[\s\S]*No son proyectos de Acelera/);
  // Only references close to the target sectors: no financial institutions or a wall of car makers.
  assert.doesNotMatch(section, /Viacerta|Volkswagen/);
  const cases = [...section.matchAll(/<article>([\s\S]*?)<\/article>/g)].map(([card]) => card);
  assert.ok(cases.length >= 2);
  for (const card of cases) {
    assert.match(card, /\[ CASO DE BOTMAKER/);
    assert.match(card, /href="https:\/\/botmaker\.com\/es\/nuestros-clientes\/[a-z0-9-]+\/" target="_blank" rel="noopener noreferrer"/);
  }
});

test("botmaker images are local, sized and lazy below the fold; the video loads on demand", async () => {
  const html = await read("botmaker.html");
  const main = html.match(/<main\b[\s\S]*<\/main>/)[0];
  const heroEnd = main.indexOf("</section>");
  for (const [tag] of main.matchAll(/<img\b[^>]*>/g)) {
    assert.match(tag, /src="\/assets\//, tag);
    assert.match(tag, /width="\d+" height="\d+"/, tag);
    if (main.indexOf(tag) > heroEnd) assert.match(tag, /loading="lazy"/, tag);
  }
  assert.doesNotMatch(main, /<iframe/);
  assert.match(main, /data-video-facade data-vimeo-id="\d+"[\s\S]*?href="https:\/\/vimeo\.com\/\d+"/);
});

test("shared scheduler, consent and form messages switch to tú only on es-MX pages", async () => {
  const [source, app, scheduler] = await Promise.all([read("assets/locale.js"), read("assets/app.js"), read("redisenio/scheduler.js")]);
  const localeFor = lang => {
    const context = { document: { documentElement: { lang }, querySelector: () => null }, window: {}, location: { search: "", hash: "" }, addEventListener() {} };
    vm.runInNewContext(source, context);
    return context.window.AceleraLocale;
  };
  const mx = localeFor("es-MX"), ar = localeFor("es-AR");
  assert.equal(mx.language, "es");
  assert.equal(mx.t("Elegí un día"), "Elige un día");
  assert.equal(mx.t("Revisá el nombre y el mail."), "Revisa el nombre y el correo.");
  assert.equal(mx.t("Usamos PostHog para mejorar el sitio, solo si lo aceptás."), "Usamos PostHog para mejorar el sitio, solo si lo aceptas.");
  assert.equal(mx.t("No pudimos enviar el formulario. Escribinos a contacto@acelera.agency."), "No pudimos enviar el formulario. Escríbenos a contacto@acelera.agency.");
  assert.equal(mx.t("El formulario todavia no esta configurado."), "El formulario todavía no está configurado.");
  assert.equal(ar.t("Elegí un día"), "Elegí un día");
  // Gateway messages go through t() so the page language decides how they read.
  assert.ok(app.includes(': t(payload.error || "No pudimos enviar el formulario.")'));
  assert.ok(app.includes(': t(payload.message || "Recibimos tu consulta. Te respondemos pronto.")'));
  assert.ok(scheduler.includes('lang === "es-MX" ? "es-MX" : "es-AR"'));
});

test("bot.acelera.agency serves the botmaker page at its root and leaves other hosts alone", async () => {
  const { default: middleware, config } = await import("./middleware.js");
  assert.equal(config.matcher, "/");
  const rewrite = middleware(new Request("https://bot.acelera.agency/?utm_source=explee"));
  assert.equal(rewrite.headers.get("x-middleware-rewrite"), "https://bot.acelera.agency/botmaker?utm_source=explee");
  assert.equal(middleware(new Request("https://www.acelera.agency/")), undefined);
  const vercel = JSON.parse(await read("vercel.json"));
  assert.deepEqual(vercel.redirects.find(r => r.source === "/botmaker")?.destination, "/");
});
