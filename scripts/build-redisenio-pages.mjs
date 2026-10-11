import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { socialMetadata } from './social-preview.mjs';

// Rebuild only the alternative proposal. Source pages are never modified.
// Header/footer are read at build time so the proposal has one navigation source.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = "20261011-release-18";
const pages = [
  { route: "desarrollo-software-a-medida", label: "Software a medida", kind: "service" },
  { route: "plataformas-internas", label: "Plataformas internas", kind: "service" },
  { route: "agentes-ia-empresas", label: "Agentes de IA", kind: "service" },
  { route: "consultoria-ia-empresas", label: "Consultoría de IA", kind: "service" },
  { route: "casos/faro", label: "Faro", kind: "case" },
  { route: "privacidad", label: "Privacidad", kind: "legal" },
  { route: "terminos", label: "Términos", kind: "legal" },
];

const home = await readFile(path.join(root, "redisenio/index.html"), "utf8");
const homeIds = new Set([...home.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const routeSet = new Set(pages.map(({ route }) => `/${route}`));

function requireMatch(html, expression, context) {
  const result = html.match(expression);
  if (!result) throw new Error(`No se encontró ${context}.`);
  return result;
}

function homeAnchor(hash) {
  const name = hash.replace(/^#/, "");
  if (name === "preferencias-analitica") return `#${name}`;
  const aliases = { construimos: "servicios", proceso: "servicios" };
  const resolved = homeIds.has(name) ? name : (aliases[name] || name);
  return `/redisenio/#${resolved}`;
}

function mapLinks(html, sharedNavigation = false) {
  return html.replace(/\bhref=(['"])(.*?)\1/g, (original, quote, href) => {
    let next = href;
    if (href === "/" || href === "/index.html") next = "/redisenio/";
    else if (href.startsWith("/#")) next = homeAnchor(href.slice(1));
    else if (sharedNavigation && href.startsWith("#")) next = homeAnchor(href);
    else {
      const [pathname, suffix = ""] = href.split(/(?=[?#])/s, 2);
      const cleanPath = pathname.replace(/\.html$/, "").replace(/\/$/, "");
      if (routeSet.has(cleanPath)) next = `/redisenio${cleanPath}${suffix}`;
    }
    return `href=${quote}${next}${quote}`;
  });
}

function sourceMetadata(source, route) {
  // Keep the published entity identities and verified copy. The proposal stays
  // noindex and does not acquire its own canonical URL until it is promoted.
  const social = [...source.matchAll(/<meta\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /\b(?:name|property)\s*=\s*(["'])(?:og:|twitter:)[^"']*\1/i.test(tag));
  const structured = [...source.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)]
    .map(([, contents]) => {
      let data;
      try {
        data = JSON.parse(contents);
      } catch (error) {
        throw new Error(`JSON-LD inválido en ${route}: ${error.message}`);
      }
      const json = JSON.stringify(data).replace(/</g, "\\u003c");
      return `<script type="application/ld+json">${json}</script>`;
    });
  return [...social, ...structured].join("\n    ");
}

const header = mapLinks(requireMatch(home, /<header\b[^>]*class="site-header"[^>]*>[\s\S]*?<\/header>/, "la cabecera de la propuesta")[0], true);
const footer = mapLinks(requireMatch(home, /<footer\b[^>]*class="site-footer"[^>]*>[\s\S]*?<\/footer>/, "el pie de la propuesta")[0], true);

for (const page of pages) {
  const source = await readFile(path.join(root, "docs/archive/pre-redesign", `${page.route}.html`), "utf8");
  const title = requireMatch(source, /<title>([\s\S]*?)<\/title>/, `el título de ${page.route}`)[1];
  const description = requireMatch(source, /<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/, `la descripción de ${page.route}`)[1];
  const metadata = sourceMetadata(source, page.route);
  const sourceContent = requireMatch(source, /<main\b[^>]*>([\s\S]*?)<\/main>/, `el contenido de ${page.route}`)[1];
  const content = mapLinks(sourceContent);
  const html = `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#fdfdfd" />
    <meta name="color-scheme" content="light" />
    ${metadata}
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preload" href="/redisenio/assets/geist-medium.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/redisenio/assets/geist-regular.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/assets/analytics.css?v=20260811-1" />
    <link rel="stylesheet" href="/redisenio/styles.css?v=${version}" />
    <link rel="stylesheet" href="/redisenio/pages.css?v=${version}" />
    <script src="/assets/analytics.js?v=20260811-1" defer></script>
    <script src="/assets/app.js?v=20260806-3" defer></script>
    <script src="/redisenio/site.js?v=20261011-hover-19" defer></script>
  </head>
  <body class="proposal-subpage" data-variant="framer-redisenio">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    ${header}
    <main class="page-content page-content--${page.kind}" id="contenido">
      <nav class="page-breadcrumb" aria-label="Ruta de navegación">
        <a href="/redisenio/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">${page.label}</span>
      </nav>
      ${content}
    </main>
    ${footer}
  </body>
</html>
`;
  const target = path.join(root, "redisenio", `${page.route}.html`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, socialMetadata(html).replace(/[\t ]+$/gm, ''));
  console.log(`Generada /redisenio/${page.route}`);
}
