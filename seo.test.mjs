import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const canonicalOrigin = "https://www.acelera.agency";

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
  assert.doesNotMatch(sitemap, /privacidad|terminos|landing-prueba|tracking-demo/);
});

test("keeps canonical metadata aligned with the final www host", async () => {
  const home = await read("index.html");
  const privacy = await read("privacidad.html");
  const terms = await read("terminos.html");

  assert.match(home, /<html lang="es-AR"/);
  assert.match(home, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/"/);
  assert.match(home, /<meta property="og:url" content="https:\/\/www\.acelera\.agency\/"/);
  assert.match(home, /<meta property="og:image:width" content="1432"/);
  assert.match(home, /<meta property="og:image:height" content="891"/);
  assert.match(privacy, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/privacidad"/);
  assert.match(terms, /<link rel="canonical" href="https:\/\/www\.acelera\.agency\/terminos"/);

  for (const html of [home, privacy, terms]) {
    assert.doesNotMatch(html, /href="\/(?:privacidad|terminos)\.html"/);
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
  assert.ok(organization.knowsAbout.includes("Desarrollo de software a medida"));
  assert.ok(organization.knowsAbout.includes("Plataformas internas"));
  assert.ok(organization.knowsAbout.includes("Agentes IA"));
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
  assert.equal(services.itemListElement.length, 6);
  for (const offer of services.itemListElement) {
    assert.equal(offer["@type"], "Offer");
    const service = nodesById.get(offer.itemOffered["@id"]);
    assert.equal(service["@type"], "Service");
    assert.equal(service.provider["@id"], organizationId);
    assert.equal(service.areaServed.name, "Argentina");
  }

  assert.equal(projects["@type"], "ItemList");
  assert.equal(projects.numberOfItems, 5);
  assert.deepEqual(
    projects.itemListElement.map((entry) => entry.position),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    projects.itemListElement.map((entry) => nodesById.get(entry.item["@id"]).name),
    ["Rely", "Lain", "Harness", "Faro", "Lemon Box"],
  );
  for (const entry of projects.itemListElement) {
    const project = nodesById.get(entry.item["@id"]);
    assert.equal(project["@type"], "CreativeWork");
    assert.equal(project.creator["@id"], organizationId);
  }

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
      homeWithoutStructuredData.includes(description),
      `structured description is not present in visible or interactive page content: ${description}`,
    );
  }
});

test("keeps non-public previews out of Vercel deployments", async () => {
  const ignore = await read(".vercelignore");

  for (const path of ["output/", "docs/", "landing-prueba/", "tracking-demo.html", "*.bak"]) {
    assert.match(ignore, new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }
});

test("does not defer the largest hero heading behind an entrance animation", async () => {
  const home = await read("index.html");
  const i18n = await read("assets/i18n.js");
  const h1 = home.match(/<h1\b[^>]*>/)?.[0];

  assert.ok(h1, "missing H1");
  assert.doesNotMatch(h1, /gsap-hero-text|opacity-0/);
  assert.match(home, /<h1\b[\s\S]*?accent-reveal--static[\s\S]*?<\/h1>/);
  assert.match(home, /querySelectorAll\("\.accent-reveal:not\(\.accent-reveal--static\)"\)/);
  assert.match(home, /rel="preload" as="font"/);
  assert.match(home, /font-display: optional/);
  assert.match(home, /assets\/fonts\/fraunces-latin-600\.woff2/);
  assert.match(i18n, /let activeLanguage = "es"/);
  assert.match(i18n, /if \(next !== activeLanguage\)/);
  assert.match(i18n, /next === "en" \? "en" : "es-AR"/);
});
