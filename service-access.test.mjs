import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { publicRoutes, retiredServiceRoutes } from './scripts/public-routes.mjs';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');

test('service rows are informational content without mouse or keyboard navigation', async () => {
  for (const file of ['index.html', 'en/index.html', 'redisenio/index.html']) {
    const html = await read(file);
    const section = html.match(/<section[^>]*id="servicios"[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, file);
    const rows = [...section.matchAll(/<article class="service-row"[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(rows.length, 4, file);
    for (const row of rows) {
      assert.doesNotMatch(row[0], /<(?:a|button)\b|\b(?:href|tabindex|onclick|role)=|↗/, file);
      assert.match(row[1], /<h3>.+<\/h3>/);
      assert.match(row[1], /<p>/);
    }
  }
  assert.doesNotMatch(await read('redisenio/styles.css'), /\.service-row:(?:hover|focus-visible)/);
});

test('retired service pages are absent from all deployable language and prototype paths', async () => {
  for (const prefix of ['', 'en/', 'redisenio/']) {
    for (const route of retiredServiceRoutes) {
      const file = `${prefix}${route}.html`;
      await assert.rejects(access(new URL(file, import.meta.url)), { code: 'ENOENT' }, file);
    }
  }
});

test('navigation, metadata and discovery files never advertise retired service URLs', async () => {
  const files = publicRoutes.flatMap(route => ['', 'en/', 'redisenio/'].map(prefix => `${prefix}${route}.html`));
  files.push('sitemap.xml', 'llms.txt');
  for (const file of files) {
    const html = await read(file);
    for (const route of retiredServiceRoutes) assert.ok(!html.includes(`/${route}`), `${file}: ${route}`);
    if (file.endsWith('.html')) {
      assert.equal((html.match(/<span class="footer-service">/g) || []).length, 4, file);
    }
  }
  assert.equal((await read('sitemap.xml')).match(/<loc>/g).length, 4);
});
