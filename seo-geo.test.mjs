import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');
const origin = 'https://www.acelera.agency';
const graphOf = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];

test('homepage metadata and entity graph describe each language and visible services consistently', async () => {
  for (const [file, prefix, alternate] of [['index.html', '/', 'en_US'], ['en/index.html', '/en/', 'es_AR']]) {
    const html = await read(file);
    const graph = graphOf(html);
    const byType = type => graph.find(node => node['@type'] === type);
    assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes(`rel="canonical" href="${origin}${prefix}"`));
    assert.ok(html.includes(`property="og:locale:alternate" content="${alternate}"`));
    assert.deepEqual(byType('WebSite').inLanguage, ['es-AR', 'en']);
    assert.equal(byType('WebPage').url, origin + prefix);
    assert.equal(byType('Organization').address, undefined, 'Do not invent a physical office');
    const logo = byType('Organization').logo;
    assert.ok(logo.width >= 112 && logo.height >= 112);
    await access(new URL('.' + new URL(logo.url).pathname, import.meta.url));
    for (const service of graph.filter(node => node['@type'] === 'Service')) {
      const url = new URL(service.url);
      assert.equal(url.origin + url.pathname, origin + prefix);
      assert.ok(html.includes(`id="${url.hash.slice(1)}"`));
      assert.ok(html.includes(`<h3>${service.name}</h3>`));
      assert.ok(html.replace(/\s+/g, ' ').includes(service.description));
      assert.equal(service.serviceType, service.name);
    }
    for (const person of graph.filter(node => node['@type'] === 'Person')) {
      assert.ok(html.includes(new URL(person.image).pathname));
      await access(new URL('.' + new URL(person.image).pathname, import.meta.url));
    }
    for (const part of byType('WebPage').hasPart) assert.ok(html.includes(`id="${new URL(part['@id']).hash.slice(1)}"`));
    assert.doesNotMatch(html, /"@type":\s*"(?:AggregateRating|Review)"/, 'Do not invent reviews or ratings');
  }
});

test('the optional illustration is localized and does not burden the initial HTML', async () => {
  for (const [file, svg] of [['index.html','figure.svg'], ['en/index.html','figure.en.svg']]) {
    const html = await read(file);
    assert.ok(Buffer.byteLength(html) < 50000, 'The full illustration must not be embedded in the document');
    assert.doesNotMatch(html, /data-anatomy-part=|src="\/redisenio\/anatomy\/live\.js/);
    assert.match(html, /<img[^>]*data-anatomy-preview[^>]*loading="lazy"[^>]*alt="[^"]+"/);
    assert.ok(html.includes(`/redisenio/anatomy/${svg}?`));
    assert.match(html, /data-anatomy-motion hidden/);
    const asset = await read('redisenio/anatomy/' + svg);
    assert.match(asset, /viewBox="0 0 600 390"/);
    assert.match(asset, /data-flow-path="ai"/);
    assert.match(asset, /data-flow-path="direct"/);
  }
  assert.match(await read('redisenio/anatomy/figure.en.svg'), /Connected software/);
  assert.match(await read('redisenio/anatomy/figure.svg'), /Software conectado/);
});

test('offscreen decoration does not start animation requests and network failure preserves its fallback', async () => {
  const source = await read('redisenio/anatomy/loader.js');
  let intersect, requests = 0, replacements = 0;
  const preview = {src: origin + '/redisenio/anatomy/figure.svg'};
  const stage = {querySelector: () => preview, replaceChildren: () => replacements++};
  const card = {querySelector: () => stage};
  class Observer { constructor(callback) {intersect = callback;} observe() {} }
  const context = {document:{querySelector:() => card}, window:{IntersectionObserver:Observer}, IntersectionObserver:Observer, fetch:async()=>{requests++; return {ok:false};}};
  vm.runInNewContext(source, context);
  assert.equal(requests,0);
  intersect([{isIntersecting:false}]);
  assert.equal(requests,0);
  intersect([{isIntersecting:true}]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests,1);
  assert.equal(replacements,0);
  intersect([{isIntersecting:true}]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests,2, 'A later intersection can retry a failed request');
});
