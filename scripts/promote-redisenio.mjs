import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://www.acelera.agency';
const version = '20261011-release-18';
const routes = ['index', 'desarrollo-software-a-medida', 'plataformas-internas', 'agentes-ia-empresas', 'consultoria-ia-empresas', 'casos/faro', 'privacidad', 'terminos'];
const read = (file) => readFile(resolve(root, file), 'utf8');
const schema = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const original = await read('docs/archive/pre-redesign/index.html');
const previous = schema(original)['@graph'];
const byId = new Map(previous.map(node => [node['@id'], node]));
const title = original.match(/<title>(.*?)<\/title>/)[1];
const description = original.match(/<meta\s+name="description"\s+content="([^"]+)"/)[1];

function homeSchema(html) {
  const current = schema(html)['@graph'];
  const organization = current.find(node => node['@type'] === 'Organization');
  Object.assign(organization, { ...byId.get(organization['@id']), ...organization });
  const people = current.filter(node => node['@type'] === 'Person').map(node => ({ ...byId.get(node['@id']), ...node }));
  const services = current.filter(node => node['@type'] === 'Service').map(node => ({ ...node, areaServed: { '@type': 'Country', name: 'Argentina' } }));
  const catalog = { '@type': 'OfferCatalog', '@id': `${origin}/#services`, name: 'Qué construimos', itemListElement: services.map(node => ({ '@type': 'Offer', itemOffered: { '@id': node['@id'] } })) };
  organization.hasOfferCatalog = { '@id': catalog['@id'] };
  const list = current.find(node => node['@type'] === 'ItemList');
  const projects = list.itemListElement.map(entry => ({ ...byId.get(entry.item['@id']), ...entry.item }));
  list.itemListElement = list.itemListElement.map(entry => ({ ...entry, item: { '@id': entry.item['@id'] } }));
  const graph = [organization, ...people, catalog, ...services, byId.get(`${origin}/#website`), byId.get(`${origin}/#webpage`), list, ...projects];
  graph.find(node => node['@type'] === 'WebSite').inLanguage = 'es-AR';
  // JSON-LD describes the same visible copy, with whitespace normalized.
  for (const node of graph) if (node.description) node.description = node.description.replace(/\s+/g, ' ').trim();
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c');
}

for (const route of routes) {
  const canonical = `${origin}/${route === 'index' ? '' : route}`;
  let html = await read(`redisenio/${route}.html`);
  const robots = ['privacidad', 'terminos'].includes(route) ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  html = html.replace(/<meta\b(?=[^>]*\bname="robots")[^>]*>/, `<meta name="robots" content="${robots}"/>\n<link rel="canonical" href="${canonical}"/>`);
  // Remap page navigation only. Shared assets remain under /redisenio/.
  html = html.replace(/\bhref="\/redisenio(?:\/(.*?))?"/g, (tag, tail = '') => {
    const [pathname] = tail.split(/[?#]/);
    if (!pathname || routes.includes(pathname)) return `href="/${tail}"`;
    return tag;
  });
  html = html.replace(/<div class="footer-brand">/g, '<div class="footer-brand" data-nosnippet>');
  html = html.replace(/(\/assets\/(?:app\.js|analytics\.js|analytics\.css)|\/redisenio\/(?:scheduler\.css|experience\.js))\?v=[^"\s]+/g, `$1?v=${version}`);
  if (route === 'index') {
    html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    html = html.replace(/<meta\b(?=[^>]*\bname="description")[^>]*>/, `<meta name="description" content="${description}"/>`);
    html = html.replace(/(<meta (?:property|name)="(?:og|twitter):title" content=")[^"]+/, `$1${title}`);
    html = html.replace(/(<meta (?:property|name)="(?:og|twitter):description" content=")[^"]+/, `$1${description}`);
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n${homeSchema(html)}\n</script>`);
  }
  html = html.replace(/<!-- proposal-metadata:(start|end) -->/g, '');
  await writeFile(resolve(root, `${route}.html`), html.replace(/[\t ]+$/gm, ''));
}
console.log(`Promoted ${routes.length} redesigned pages; archive preserved.`);
