import { rm } from 'node:fs/promises';

export const publicRoutes = ['index', 'casos/faro', 'privacidad', 'terminos'];
// Change only when the corresponding public content changes, never on every
// build: sitemap lastmod must describe a real update rather than build time.
export const indexableLastModified = { index: '2026-10-15', 'casos/faro': '2026-10-12' };
export const retiredServiceRoutes = [
  'desarrollo-software-a-medida',
  'plataformas-internas',
  'agentes-ia-empresas',
  'consultoria-ia-empresas',
];

// Remove old generated pages when rebuilding an existing checkout. The original
// content remains in the Git history and the excluded pre-redesign archive.
export async function removeRetiredPages(prefixes = ['', 'en/', 'redisenio/']) {
  for (const prefix of prefixes) {
    for (const route of retiredServiceRoutes) {
      await rm(new URL(`../${prefix}${route}.html`, import.meta.url), { force: true });
    }
  }
}
