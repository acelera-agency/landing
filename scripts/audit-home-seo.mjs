import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { publicRoutes, retiredServiceRoutes } from './public-routes.mjs';

// Read-only HTTP audit. No forms, calendar bookings, analytics consent changes,
// credentials, or private console APIs are involved.
const base = new URL(process.argv[2] || 'http://127.0.0.1:4173/');
const output = process.argv[3];
const canonical = 'https://www.acelera.agency';
const result = { base: base.origin, checkedAt: new Date().toISOString(), pages: [], retired: [], resources: [], crawlers: [] };
const get = async (path, headers) => {
  const response = await fetch(new URL(path, base), {headers, signal: AbortSignal.timeout(20000)});
  return {status:response.status, body:await response.text(), type:response.headers.get('content-type')};
};
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([,key,value]) => [key,value]));
const resources = new Set();
for (const route of publicRoutes) {
  for (const english of [false, true]) {
    const path = `${english ? '/en/' : '/'}${route === 'index' ? '' : route}`;
    const {status,body} = await get(path);
    assert.equal(status,200,path);
    const head = body.slice(0,body.indexOf('</head>'));
    const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/g)].map(([tag])=>attrs(tag));
    const canonicalTags = tags.filter(tag=>tag.rel==='canonical');
    assert.equal(canonicalTags.length,1,path);
    assert.equal(canonicalTags[0].href,canonical+path,path);
    assert.match(body,english ? /<html lang="en"/ : /<html lang="es-AR"/);
    assert.equal((body.match(/<h1\b/g)||[]).length,1,path);
    const ids = [...body.matchAll(/\bid="([^"]+)"/g)].map(([,id])=>id);
    assert.equal(ids.length,new Set(ids).size,`${path}: duplicate DOM IDs`);
    for (const [,href] of body.matchAll(/\bhref="#([^"]+)"/g)) {
      if (href === 'preferencias-analitica') continue; // Real JS dialog trigger.
      assert.ok(ids.includes(href),`${path}: missing anchor #${href}`);
    }
    assert.ok(tags.some(tag=>tag.name==='description'&&tag.content?.length>60),path);
    const robots=tags.find(tag=>tag.name==='robots')?.content;
    assert.match(robots, ['privacidad','terminos'].includes(route) ? /^noindex, follow/ : /^index, follow/);
    for (const retired of retiredServiceRoutes) assert.ok(!body.includes('/'+retired),path);
    for (const [tag] of body.matchAll(/<(?:img|script|link)\b[^>]*>/g)) {
      const a=attrs(tag);
      if (tag.startsWith('<img')) {
        assert.ok(Object.hasOwn(a,'alt'),`${path}: image without alt`);
        assert.ok(Number(a.width)>0&&Number(a.height)>0,`${path}: image without dimensions`);
      }
      const url = a.src || (a.rel==='stylesheet'||a.rel==='preload'||a.rel==='icon' ? a.href : '');
      if (url?.startsWith('/')) resources.add(url);
    }
    if (route==='index') {
      assert.ok(Buffer.byteLength(body)<52000,`${path}: initial HTML unexpectedly large`);
      assert.equal((body.match(/class="service-row"/g)||[]).length,4);
      assert.doesNotMatch(body,/<a class="service-row"/);
      const graph=JSON.parse(body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
      for (const node of graph) {
        for (const key of ['image','logo']) {
          const url=typeof node[key]==='string'?node[key]:node[key]?.url;
          if (url?.startsWith(canonical+'/')) resources.add(new URL(url).pathname);
        }
      }
    }
    result.pages.push({path,status,canonical:canonicalTags[0].href,robots,bytes:Buffer.byteLength(body)});
  }
}
await Promise.all([...resources].map(async path=>{
  const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,path);
  result.resources.push({path,status:response.status,type:response.headers.get('content-type')});
  await response.arrayBuffer();
}));
await Promise.all(retiredServiceRoutes.flatMap(route=>['','en/','redisenio/'].flatMap(prefix=>['','.html','/'].map(suffix=>prefix+route+suffix))).map(async path=>{
  const {status}=await get('/'+path);assert.equal(status,404,path);result.retired.push({path:'/'+path,status});
}));
for (const crawler of ['Googlebot','bingbot','OAI-SearchBot','PerplexityBot','Claude-SearchBot']) {
  const page=await get('/',{'User-Agent':crawler});
  const robots=await get('/robots.txt',{'User-Agent':crawler});
  assert.equal(page.status,200,crawler);assert.equal(robots.status,200,crawler);
  assert.match(page.body,/<h1 id="hero-title">/);
  assert.match(robots.body,/User-agent: \*/);
  assert.doesNotMatch(robots.body,/Disallow:\s*\/\s*$/m);
  result.crawlers.push({userAgent:crawler,home:page.status,robots:robots.status});
}
result.crawlerLimitation='Requests use the audit machine, not authenticated provider IPs. This does not prove a provider has crawled or indexed the page.';
const sitemap=await get('/sitemap.xml');
assert.equal(sitemap.status,200);assert.equal((sitemap.body.match(/<loc>/g)||[]).length,4);
for (const [,url] of sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  assert.equal((await get(new URL(url).pathname)).status,200,url);
}
if (output) { await mkdir(new URL('../output/seo-geo-20261015/',import.meta.url),{recursive:true}); await writeFile(output,JSON.stringify(result,null,2)+'\n'); }
console.log(JSON.stringify({pages:result.pages.length,resources:result.resources.length,retiredVariants:result.retired.length,crawlerUserAgents:result.crawlers.length,sitemapURLs:4,status:'passed'}));
