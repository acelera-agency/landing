import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { publicRoutes } from "./scripts/public-routes.mjs";

const root = new URL("./", import.meta.url);
const canonicalOrigin = "https://www.acelera.agency";
const casePages = [
  {
    file: "casos/faro.html",
    route: "/casos/faro",
    title: "Caso Faro: plataforma de datos públicos | Acelera",
    description:
      "Cómo integrantes de Acelera y colaboradores construyeron Faro: datos públicos convertidos en expedientes verificables, con fuentes y trazabilidad.",
    h1: "Faro: de datos dispersos a expedientes verificables",
  },
];
const indexablePages = casePages;

test("shares the current brand image with truthful dimensions and consistent social copy", async () => {
  const home = await read("index.html");
  const asset = await readFile(new URL("assets/acelera-social-20261010.png", root));
  assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const dimensions = [asset.readUInt32BE(16), asset.readUInt32BE(20)];
  assert.deepEqual(dimensions, [1200, 630]);
  for (const key of ["title", "description", "image"]) {
    const og = home.match(new RegExp(`<meta property="og:${key}" content="([^"]+)"`))?.[1];
    const twitter = home.match(new RegExp(`<meta name="twitter:${key}" content="([^"]+)"`))?.[1];
    assert.ok(og);
    assert.equal(twitter, og);
  }
  for (const file of ['index.html', 'en/index.html']) {
    const html = await read(file);
    assert.match(html, /https:\/\/www\.acelera\.agency\/assets\/acelera-social-20261010\.png/);
    assert.doesNotMatch(html, /\/assets\/og-image\.png/);
    assert.match(html, /property="og:image:width" content="1200"/);
    assert.match(html, /property="og:image:height" content="630"/);
    assert.match(html, /property="og:image:alt" content="[^\"]+"/);
  }
});

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("publishes crawl controls and only canonical indexable URLs", async () => {
  const robots = await read("robots.txt");
  const sitemap = await read("sitemap.xml");

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${canonicalOrigin.replaceAll(".", "\\.")}\/sitemap\\.xml$`, "m"));
  assert.match(sitemap, new RegExp(`<loc>${canonicalOrigin.replaceAll(".", "\\.")}\/</loc>`));
  for (const page of indexablePages) {
    assert.match(sitemap, new RegExp(`<loc>${canonicalOrigin.replaceAll(".", "\\.")}${page.route}</loc>`));
  }
  assert.equal((sitemap.match(/<loc>/g) || []).length, (indexablePages.length + 1) * 2);
  assert.equal((sitemap.match(/<lastmod>2026-10-12<\/lastmod>/g) || []).length, (indexablePages.length + 1) * 2);
  assert.doesNotMatch(sitemap, /privacidad|terminos|landing-prueba|tracking-demo/);
});

test("keeps canonical metadata aligned with the final www host", async () => {
  const home = await read("index.html");
  const privacy = await read("privacidad.html");
  const terms = await read("terminos.html");

  assert.match(home, /<html lang="es-AR"/);
  assert.match(home, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/"/);
  assert.match(home, /<meta property="og:url" content="https:\/\/www\.acelera\.agency\/"/);
  assert.match(home, /<meta property="og:image:width" content="1200"/);
  assert.match(home, /<meta property="og:image:height" content="630"/);
  assert.match(privacy, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/privacidad"/);
  assert.match(terms, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/terminos"/);

  for (const html of [home, privacy, terms]) {
    assert.doesNotMatch(html, /href="\/(?:privacidad|terminos)\.html"/);
  }
});

test("keeps every public page free of phone contact data", async () => {
  const publicPages = [
    "index.html",
    "privacidad.html",
    "terminos.html",
    ...indexablePages.map(({ file }) => file),
  ];

  for (const page of publicPages) {
    const html = await read(page);
    assert.doesNotMatch(
      html,
      /(?:href="tel:|wa\.me\/|["']telephone["']\s*:|\+54\s*(?:9\s*)?11\s*\d{4})/i,
      `${page} should not expose a phone contact`,
    );
  }
});

test("positions the homepage clearly and keeps footer contact data out of Google snippets", async () => {
  const home = await read("index.html");
  const title = "Acelera Agency | Software a medida e IA para empresas";
  const description =
    "Acelera Agency desarrolla software a medida, plataformas internas y soluciones con IA para empresas. Del problema concreto a producción.";

  assert.match(home, new RegExp(`<title>${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
  assert.match(
    home,
    new RegExp(
      `<meta name="description"\\s+content="${description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
    ),
  );
  assert.match(home, /<meta property="og:title" content="Acelera — Software a medida e IA con sentido"/);
  assert.match(home, /"name": "Acelera Agency \| Software a medida e IA para empresas"/);
  assert.match(home, /<div class="footer-brand" data-nosnippet>/);

  const i18n = await read("assets/i18n.js");
  assert.match(i18n, /"Acelera Agency \| Software a medida e IA para empresas"/);
  assert.match(i18n, /"Acelera Agency \| Custom software and AI for companies"/);
  assert.doesNotMatch(i18n, /document\.title\s*=[\s\S]*?"Acelera \| IA con sentido, donde el negocio lo pide"/);
});


test("publishes Faro as a source-backed case with transparent attribution", async () => {
  const [page] = casePages;
  const home = await read("index.html");
  const html = await read(page.file);
  const canonicalUrl = `${canonicalOrigin}${page.route}`;
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

  assert.match(home, /href="\/casos\/faro"/);
  assert.match(html, /<html lang="es-AR"/);
  assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonicalUrl.replaceAll(".", "\\.")}"`));
  assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
  assert.match(
    html,
    new RegExp(
      `<meta name="description"\\s+content="${page.description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
    ),
  );
  assert.equal(h1Matches.length, 1);
  assert.equal(h1Matches[0][1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(), page.h1);
  assert.match(html, /No es un caso de cliente\./);
  assert.match(html, /7\.935 registros/);
  assert.match(html, /9\.634 receipts/);
  assert.match(html, /180 expedientes/);
  assert.match(html, /Ganador del track Transparencia y Corrupción/);
  assert.match(html, /https:\/\/github\.com\/NachoEstevo\/Faro-Argentina/);
  assert.match(html, /https:\/\/es\.linkedin\.com\/posts\/ai-playgrounds-tech_hack-activity-7465177592455835648-2Asl/);
  assert.ok(jsonLdMatch);

  const graph = JSON.parse(jsonLdMatch[1])["@graph"];
  const organization = graph.find((node) => node["@type"] === "Organization");
  const article = graph.find((node) => node["@type"] === "Article");
  const project = graph.find((node) => node["@type"] === "CreativeWork");
  const webpage = graph.find((node) => node["@type"] === "WebPage");
  const breadcrumbs = graph.find((node) => node["@type"] === "BreadcrumbList");

  assert.equal(organization["@id"], `${canonicalOrigin}/#organization`);
  assert.equal(article.url, canonicalUrl);
  assert.equal(article.publisher["@id"], organization["@id"]);
  assert.equal(article.about["@id"], project["@id"]);
  assert.equal(project.name, "Faro");
  assert.equal(project.contributor.length, 4);
  assert.ok(project.sameAs.includes("https://github.com/NachoEstevo/Faro-Argentina"));
  assert.equal(webpage.url, canonicalUrl);
  assert.equal(webpage.mainEntity["@id"], article["@id"]);
  assert.equal(breadcrumbs.itemListElement.at(-1).item, canonicalUrl);
});

test("publishes a concise machine-readable guide without inventing a second content surface", async () => {
  const llms = await read("llms.txt");

  assert.match(llms, /^# Acelera Agency$/m);
  assert.match(llms, /consultora argentina de desarrollo de software a medida e inteligencia artificial aplicada/);
  assert.match(llms, /aplicaciones, plataformas internas, integraciones y agentes de IA/);
  assert.match(llms, /https:\/\/www\.linkedin\.com\/company\/acelera-agency/);
  assert.match(llms, /https:\/\/github\.com\/acelera-agency/);

  assert.ok(llms.includes(`${canonicalOrigin}/#servicios`));
  assert.match(llms, new RegExp(`${canonicalOrigin.replaceAll(".", "\\.")}/casos/faro`));
});


test("uses direct language instead of diagnosis and generic work-with phrasing", async () => {
  const publicFiles = [
    "index.html",
    "assets/i18n.js",
  ];

  for (const file of publicFiles) {
    const content = await read(file);
    assert.doesNotMatch(content, /diagn[oó]stico/i, `${file} should avoid diagnosis wording`);
    assert.doesNotMatch(content, /trabajamos con/i, `${file} should avoid generic work-with wording`);
  }

  const home = await read("index.html");
  assert.match(home, /<h3>Entender<\/h3>/);
  assert.match(home.replace(/\s+/g," "), /La arquitectura depende del producto, las integraciones y el equipo que va a mantenerlo\./);
});

test("keeps repetitive footer copy out of result snippets", async () => {
  for (const route of publicRoutes) {
    const html = await read(route + ".html");
    assert.match(
      html,
      /<footer class="site-footer">[\s\S]*?<div class="footer-brand" data-nosnippet>/,
      `${route} should exclude its generic footer brand copy from snippets`,
    );
  }
});

test("exposes a linked organization, services and projects JSON-LD graph without changing visible copy", async () => {
  const home = await read("index.html");
  const match = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

  assert.ok(match, "missing JSON-LD block");
  const data = JSON.parse(match[1]);
  const graph = data["@graph"];
  const organizationId = `${canonicalOrigin}/#organization`;
  const websiteId = `${canonicalOrigin}/#website`;
  const webpageId = `${canonicalOrigin}/#webpage`;
  const servicesId = `${canonicalOrigin}/#services`;
  const projectsId = `${canonicalOrigin}/#projects`;
  const nodesById = new Map(graph.map((item) => [item["@id"], item]));
  const organization = nodesById.get(organizationId);
  const website = nodesById.get(websiteId);
  const webpage = nodesById.get(webpageId);
  const services = nodesById.get(servicesId);
  const projects = nodesById.get(projectsId);

  assert.equal(nodesById.size, graph.length, "every graph node must have a unique @id");
  for (const id of nodesById.keys()) {
    assert.match(id, /^https:\/\/www\.acelera\.agency\/#/);
  }

  assert.equal(organization.name, "Acelera");
  assert.equal(organization.alternateName, "Acelera Agency");
  assert.equal(
    organization.description,
    "Diseñamos y desarrollamos software para necesidades específicas. Empezamos por un problema concreto y lo llevamos hasta una solución en producción.",
  );
  assert.equal(organization.url, `${canonicalOrigin}/`);
  assert.equal(organization.email, "contacto@acelera.agency");
  assert.equal(organization.areaServed.name, "Argentina");
  assert.ok(organization.sameAs.includes("https://www.linkedin.com/company/acelera-agency"));
  assert.ok(organization.sameAs.includes("https://github.com/acelera-agency"));
  assert.ok(organization.knowsAbout.includes("Desarrollo de software a medida"));
  assert.ok(organization.knowsAbout.includes("Plataformas internas"));
  assert.ok(organization.knowsAbout.includes("Agentes IA"));
  assert.ok(organization.knowsAbout.includes("Consultoría de inteligencia artificial"));
  assert.equal(organization.hasOfferCatalog["@id"], servicesId);

  assert.equal(organization.founder.length, 3);
  for (const founderReference of organization.founder) {
    const founder = nodesById.get(founderReference["@id"]);
    assert.equal(founder["@type"], "Person");
    assert.equal(founder.worksFor["@id"], organizationId);
    assert.match(founder.sameAs, /^https:\/\/www\.linkedin\.com\/in\//);
  }

  assert.equal(website.name, "Acelera");
  assert.equal(website.alternateName, "Acelera Agency");
  assert.equal(website.url, `${canonicalOrigin}/`);
  assert.equal(website.publisher["@id"], organizationId);
  assert.equal(webpage.isPartOf["@id"], websiteId);
  assert.equal(webpage.about["@id"], organizationId);
  assert.equal(webpage.mainEntity["@id"], organizationId);

  assert.equal(services["@type"], "OfferCatalog");
  assert.equal(services.itemListElement.length, 4);
  for (const offer of services.itemListElement) {
    assert.equal(offer["@type"], "Offer");
    const service = nodesById.get(offer.itemOffered["@id"]);
    assert.equal(service["@type"], "Service");
    assert.equal(service.provider["@id"], organizationId);
    assert.equal(service.areaServed.name, "Argentina");
  }

  assert.equal(projects["@type"], "ItemList");
  assert.equal(projects.numberOfItems, 6);
  assert.deepEqual(
    projects.itemListElement.map((entry) => entry.position),
    [1, 2, 3, 4, 5, 6],
  );
  assert.deepEqual(
    projects.itemListElement.map((entry) => nodesById.get(entry.item["@id"]).name),
    ["Atrae", "Rely", "Lemon Box", "Lain", "Harness", "Faro"],
  );
  for (const entry of projects.itemListElement) {
    const project = nodesById.get(entry.item["@id"]);
    assert.equal(project["@type"], "CreativeWork");
    assert.equal(project.creator, undefined);
  }
  const faro = nodesById.get(`${canonicalOrigin}/#project-faro`);
  assert.equal(faro.url, `${canonicalOrigin}/casos/faro`);
  assert.ok(faro.sameAs.includes("https://faro-argentina.vercel.app"));
  assert.ok(faro.sameAs.includes("https://github.com/NachoEstevo/Faro-Argentina"));

  const homeWithoutStructuredData = home.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    "",
  );
  const descriptions = [
    organization.description,
    ...services.itemListElement
      .map((offer) => nodesById.get(offer.itemOffered["@id"]).description)
      .filter(Boolean),
    ...projects.itemListElement.map((entry) => nodesById.get(entry.item["@id"]).description),
  ];

  for (const description of descriptions) {
    assert.ok(
      homeWithoutStructuredData.replace(/\s+/g, " ").includes(description),
      `structured description is not present in visible or interactive page content: ${description}`,
    );
  }
});

test("keeps non-public previews and browser artifacts out of Vercel deployments", async () => {
  const ignore = await read(".vercelignore");

  for (const path of ["output/", ".playwright-cli/", "docs/", "landing-prueba/", "tracking-demo.html", "*.bak"]) {
    assert.match(ignore, new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }
});

test("does not hide the hero heading and preloads local Geist fonts",async()=>{
  const html=await read("index.html"); const css=await read("redisenio/styles.css");
  const h1=html.match(/<h1\b[^>]*>/)?.[0]; assert.ok(h1); assert.doesNotMatch(h1,/opacity-0|reveal-pending/);
  assert.match(html,/geist-medium\.woff2/); assert.match(css,/font-family: Geist/); assert.match(css,/font-display: swap/);
  assert.doesNotMatch(html,/fonts\.googleapis\.com/);
});
