import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let html = await readFile(path.join(root, 'redisenio/index.html'), 'utf8');
// Render the actual hero and ASCII renderer at social-card dimensions. Keep
// these layout overrides in a local capture page, never in the public landing.
html = html.replace(/<script\b[^>]*src="[^"]+"[^>]*>[\s\S]*?<\/script>/g, tag => tag.includes('/redisenio/site.js') ? tag : '');
html = html.replace('</head>', `<style>
html,body { width:1200px; height:630px; overflow:hidden; scroll-behavior:auto; }
.page-frame,.site-header { width:1200px; max-width:none; }
.site-header { position:relative; height:76px; border-bottom:1px solid #dedede; }
.navigation { height:76px; }
.nav-side,.menu-toggle,.mobile-menu { visibility:hidden; }
.brand img { width:132px; height:auto; }
.hero { height:554px; padding:30px 0 0; }
.hero-copy { gap:17px; }
.hero h1 { font-size:68px; line-height:1.03; max-width:850px; letter-spacing:-.06em; }
.hero-copy > p { max-width:600px; font-size:18px; line-height:1.45; }
.eyebrow,.hero-actions { display:none; }
.hero-art { margin-top:18px; min-height:0; height:292px; align-items:flex-start; }
.hand-left { width:53.5%; padding:0; transform:none; }
.hand-right { padding:62px 0 0; transform:none; }
.hand-left .ascii-art { aspect-ratio:1007/442; }
main > :not(.hero),.site-footer { display:none; }
.share-url { position:absolute; right:38px; top:25px; font:15px/1.5 Geist,Arial,sans-serif; color:#595959; }
</style></head>`);
html = html.replace('</header>', '<span class="share-url">acelera.agency</span></header>');
await mkdir(path.join(root, 'tmp/social-preview'), { recursive:true });
await writeFile(path.join(root, 'tmp/social-preview/index.html'), html);
console.log('Capture at http://127.0.0.1:4173/tmp/social-preview/ with viewport 1200 × 630.');
