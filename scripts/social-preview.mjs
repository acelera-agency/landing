export const SOCIAL_IMAGE = 'https://www.acelera.agency/assets/acelera-social-20261010.png';
export const SOCIAL_TITLE = 'Acelera — Software a medida e IA con sentido';
export const SOCIAL_DESCRIPTION = 'Diseñamos y desarrollamos software para necesidades específicas. Del problema concreto a una solución en producción.';
export const SOCIAL_ALT = 'Acelera. IA con sentido, donde el negocio lo pide. Manos humana y ASCII con una estrella parcialmente naranja.';

export function socialMetadata(html, home = false) {
  const generic = html.includes('/assets/og-image.png') || html.includes(SOCIAL_IMAGE);
  if (generic) {
    html = html.replaceAll('https://www.acelera.agency/assets/og-image.png', SOCIAL_IMAGE);
    for (const [key, value] of [['og:image:type','image/png'],['og:image:width','1200'],['og:image:height','630'],['og:image:alt',SOCIAL_ALT],['twitter:image:alt',SOCIAL_ALT]]) {
      const attribute = key.startsWith('og:') ? 'property' : 'name';
      const tag = `<meta ${attribute}="${key}" content="${value}"/>`;
      const pattern = new RegExp(`<meta\\b[^>]*\\b(?:name|property)="${key}"[^>]*>`);
      if (pattern.test(html)) html = html.replace(pattern, tag);
      else html = html.replace('</head>', `${tag}\n</head>`);
    }
  }
  if (home) {
    for (const [key, value] of [['og:title',SOCIAL_TITLE],['twitter:title',SOCIAL_TITLE],['og:description',SOCIAL_DESCRIPTION],['twitter:description',SOCIAL_DESCRIPTION]]) {
      const attribute = key.startsWith('og:') ? 'property' : 'name';
      html = html.replace(new RegExp(`<meta\\b[^>]*\\b(?:name|property)="${key}"[^>]*>`), `<meta ${attribute}="${key}" content="${value}"/>`);
    }
  }
  return html;
}
