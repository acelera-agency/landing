import { rm } from 'node:fs/promises';

export const publicRoutes = ['index', 'casos/faro', 'privacidad', 'terminos'];
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
