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

test('the technology section omits the anatomy illustration and keeps initial HTML lightweight', async () => {
  for (const file of ['index.html', 'en/index.html']) {
    const html = await read(file);
    assert.ok(Buffer.byteLength(html) < 50000, 'The initial HTML must stay lightweight');
    assert.doesNotMatch(html, /data-anatomy-card|data-anatomy-preview|\/redisenio\/anatomy\//);
    const techSection = html.match(/<section[^>]*id="tecnologia"[\s\S]*?<\/section>/)?.[0];
    assert.ok(techSection);
    assert.equal((techSection.match(/class="tech-card"/g) || []).length, 6);
  }
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
