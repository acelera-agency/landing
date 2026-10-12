import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicRoutes, removeRetiredPages } from './public-routes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://www.acelera.agency';
export const routes = publicRoutes;
const catalog = JSON.parse(await readFile(resolve(root, 'scripts/locales/en.json'), 'utf8'));
const normalize = value => value.replace(/\s+/g, ' ').trim();
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, code) => code[0] === '#' ? String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1))) : ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[code.toLowerCase()]);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function translate(value) {
  const key = normalize(decode(value));
  if (!key || !/[a-záéíóúñ]/i.test(key)) return value;
  if (!Object.hasOwn(catalog, key)) throw new Error(`Missing English translation: ${key}`);
  return value.match(/^\s*/)[0] + escape(catalog[key]) + value.match(/\s*$/)[0];
}
const pathFor = (route, english = false) => `${english ? '/en/' : '/'}${route === 'index' ? '' : route}`;
function localizedHref(href) {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const [pathname, suffix = ''] = href.split(/(?=[?#])/s, 2);
  const route = pathname.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '') || 'index';
  return routes.includes(route) ? pathFor(route, true) + suffix : href;
}
function structured(data) {
  if (Array.isArray(data)) return data.map(structured);
  if (!data || typeof data !== 'object') return data;
  const next = Object.fromEntries(Object.entries(data).map(([key, value]) => {
    if (typeof value !== 'string') return [key, structured(value)];
    if (['name', 'description', 'text', 'headline', 'alternativeHeadline', 'jobTitle', 'serviceType'].includes(key)) {
      const normalized = normalize(value);
      if (!Object.hasOwn(catalog, normalized)) throw new Error(`Missing schema translation: ${normalized}`);
      return [key, catalog[normalized]];
    }
    if (key === 'inLanguage') return [key, 'en'];
    if (value.startsWith(origin) && ['url', '@id', 'item'].includes(key)) {
      // Organization and people retain their shared identities in both languages.
      if (['Organization', 'Person', 'WebSite'].includes(data['@type'])) return [key, value];
      const tail = value.slice(origin.length);
      if (tail === '/#website' || /\/#(?:organization|ignacio-estevo|mauro-proto|franco-ferreira)$/.test(tail)) return [key, value];
      return [key, origin + localizedHref(tail)];
    }
    return [key, value];
  }));
  if (next['@type'] === 'WebPage') next.inLanguage = 'en';
  if (next['@type'] === 'WebSite') next.inLanguage = ['es-AR', 'en'];
  return next;
}
function translateHTML(html) {
  return html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>|[^<]+/g, token => {
    if (token.startsWith('<!--') || token.startsWith('<style')) return token;
    if (token.startsWith('<script')) {
      if (!/type="application\/ld\+json"/.test(token)) return token;
      const contents = token.match(/>([\s\S]*)<\/script>/)[1];
      return token.replace(contents, () => '\n' + JSON.stringify(structured(JSON.parse(contents)), null, 2).replaceAll('<', '\\u003c') + '\n');
    }
    if (!token.startsWith('<')) return translate(token);
    token = token.replace(/\b(aria-label|alt|title|placeholder|data-title|data-kicker|data-copy|data-delivery|data-case-copy)=(['"])(.*?)\2/g, (match, key, quote, value) => `${key}=${quote}${translate(value)}${quote}`);
    if (/^<meta\b/.test(token) && /(?:name|property)="(?:description|(?:og|twitter):(?:title|description|image:alt))"/.test(token)) token = token.replace(/content=(['"])(.*?)\1/, (_, quote, value) => `content=${quote}${translate(value)}${quote}`);
    return token.replace(/\bhref="([^\"]+)"/g, (_, href) => `href="${localizedHref(href)}"`);
  });
}
const alternates = route => `<link rel="alternate" hreflang="es-AR" href="${origin}${pathFor(route)}"/>\n<link rel="alternate" hreflang="en" href="${origin}${pathFor(route, true)}"/>\n<link rel="alternate" hreflang="x-default" href="${origin}${pathFor(route)}"/>`;
function switcher(html, href, english = false) {
  return html.replace(/<a\b[^>]*data-language-switch[^>]*>[\s\S]*?<\/a>/, `<a class="language-switch" data-language-switch data-language-option="${english ? 'es' : 'en'}" href="${href}" hreflang="${english ? 'es-AR' : 'en'}" lang="${english ? 'es' : 'en'}" aria-label="${english ? 'Ver esta página en español' : 'View this page in English'}"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7"/><ellipse cx="10" cy="10" rx="3" ry="7"/><path d="M3 10h14"/></svg><span>${english ? 'ES' : 'EN'}</span></a>`);
}
export async function buildLocales() {
  await removeRetiredPages();
  const ui = JSON.parse(await readFile(resolve(root, 'scripts/locales/ui-en.json'), 'utf8'));
  await writeFile(resolve(root, 'assets/locale.js'), `// Generated by scripts/build-locales.mjs. Translated HTML works without JavaScript.\n(() => {\n  'use strict';\n  const language = document.documentElement.lang.startsWith('en') ? 'en' : 'es';\n  const english = ${JSON.stringify(ui, null, 2)};\n  const t = value => language === 'en' ? (english[value] ?? value) : value;\n  window.AceleraLocale = { language, t };\n  const control = document.querySelector('[data-language-switch]');\n  if (!control) return;\n  const path = control.getAttribute('href');\n  const sync = () => { control.href = path + location.search + location.hash; };\n  sync();\n  addEventListener('hashchange', sync);\n  control.addEventListener('click', () => { try { localStorage.setItem('acelera-language', control.dataset.languageOption); } catch {} });\n})();\n`);
  for (const route of routes) {
    let spanish = await readFile(resolve(root, route + '.html'), 'utf8');
    spanish = spanish.replace(/<link rel="alternate" hreflang="(?:es-AR|en|x-default)"[^>]*>\n?/g, '');
    spanish = switcher(spanish, pathFor(route, true));
    let english = translateHTML(spanish);
    english = english.replace(/<html lang="es-AR"/, '<html lang="en"');
    english = english.replace(/(rel="canonical" href=")[^"]+/, `$1${origin}${pathFor(route, true)}`);
    english = english.replace(/(<meta property="og:url" content=")[^"]+/, `$1${origin}${pathFor(route, true)}`);
    english = english.replace(/(<meta property="og:locale" content=")[^"]+/, '$1en_US');
    english = switcher(english, pathFor(route), true);
    english = english.replace('</head>', alternates(route) + '\n</head>');
    spanish = spanish.replace('</head>', alternates(route) + '\n</head>');
    await mkdir(resolve(root, 'en', route.includes('/') ? route.slice(0, route.lastIndexOf('/')) : ''), {recursive:true});
    await writeFile(resolve(root, 'en', route + '.html'), english);
    await writeFile(resolve(root, route + '.html'), spanish);
  }
  const indexable = routes.filter(route => !['privacidad', 'terminos'].includes(route));
  const urls = indexable.flatMap(route => [pathFor(route), pathFor(route, true)]);
  await writeFile(resolve(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(path => `  <url>\n    <loc>${origin}${path}</loc>\n    <lastmod>2026-10-12</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`);
  console.log(`Built ${routes.length} English pages with reciprocal language links.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await buildLocales();
