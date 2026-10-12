import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { routes, translate } from './scripts/build-locales.mjs';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const origin = 'https://www.acelera.agency';

test('English content, accessibility labels and metadata are available before JavaScript runs', async () => {
  const html = await read('en/index.html');
  assert.match(html, /<html lang="en"/);
  assert.match(html, /<h1 id="hero-title">Purposeful AI, where business needs it\.<\/h1>/);
  assert.match(html, /AI agents|Agents and applied AI/);
  assert.match(html, /How does the work begin\?/);
  assert.match(html, /Book a meeting/);
  assert.doesNotMatch(html, /Experiencia del equipo|¿Todos los proyectos necesitan IA\?|Ingeniería de software/);
  assert.match(await read('index.html'), /<h1 id="hero-title">IA con sentido, donde el negocio lo pide\.<\/h1>/);
  assert.doesNotMatch(await read('index.html'), /Experiencia del equipo/);
  assert.throws(() => translate('Nuevo contenido sin traducción'), /Missing English translation/);
});

test('every English route has reciprocal language links and navigation stays in its language', async () => {
  for (const route of routes) {
    const path = route === 'index' ? '/' : `/${route}`;
    const enPath = route === 'index' ? '/en/' : `/en/${route}`;
    const es = await read(`${route}.html`), en = await read(`en/${route}.html`);
    assert.ok(es.includes(`data-language-option="en" href="${enPath}"`));
    assert.ok(en.includes(`data-language-option="es" href="${path}"`));
    for (const html of [es, en]) {
      assert.ok(html.includes(`hreflang="es-AR" href="${origin}${path}"`));
      assert.ok(html.includes(`hreflang="en" href="${origin}${enPath}"`));
    }
    assert.ok(en.includes(`rel="canonical" href="${origin}${enPath}"`));
    if (es.includes('property="og:url"')) assert.ok(en.includes(`property="og:url" content="${origin}${enPath}"`));
    const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(ids(en), ids(es), 'Section hashes remain stable across languages');
    for (const [, href] of en.matchAll(/\bhref="(\/[^"#?]*)/g)) {
      if (href.startsWith('/assets/') || href.startsWith('/redisenio/') || href === '/favicon.svg') continue;
      assert.ok(href === path || href.startsWith('/en/'), `${route}: ${href}`);
      await access(new URL(`.${href === '/' || href === '/en/' ? href+'index.html' : href+'.html'}`, import.meta.url));
    }
    const structured = en.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (structured) assert.doesNotMatch(JSON.stringify(JSON.parse(structured[1])), /"inLanguage":"es-AR"/);
    if (['privacidad', 'terminos'].includes(route)) assert.match(en, /noindex, follow/);
  }
});

test('language navigation preserves the current section and can operate without storage', async () => {
  const source = await read('assets/locale.js');
  let listener, currentHref;
  const control = { getAttribute: () => '/en/', dataset: {languageOption:'en'}, set href(value) {currentHref=value;}, addEventListener: (_, fn) => {listener=fn;} };
  const context = { document: { documentElement: {lang:'es-AR'}, querySelector: () => control }, window: {}, location: {search:'',hash:'#contacto'}, addEventListener: () => {}, localStorage: {setItem() {throw new Error('blocked');}} };
  vm.runInNewContext(source, context);
  assert.equal(currentHref, '/en/#contacto');
  assert.doesNotThrow(listener);
  context.document.documentElement.lang = 'en';
  vm.runInNewContext(source, context);
  assert.equal(context.window.AceleraLocale.t('Confirmar reunión'), 'Confirm meeting');
  assert.equal(context.window.AceleraLocale.t('Ese horario se acaba de ocupar. Elegí otro, por favor.'), 'That time was just booked. Please choose another.');
  assert.equal(context.window.AceleraLocale.t('Aplicación actualizada'), 'Application updated');
});
