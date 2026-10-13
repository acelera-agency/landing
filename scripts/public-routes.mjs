import { rm } from 'node:fs/promises';

export const publicRoutes = ['index', 'casos/faro', 'privacidad', 'terminos'];
// Pages published only in Spanish. They are maintained by hand (no redesign
// source and no English build) but are listed in the sitemap and discovery files.
export const spanishOnlyRoutes = ['botmaker'];
export const spanishOnlyLastmod = '2026-10-13';
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
