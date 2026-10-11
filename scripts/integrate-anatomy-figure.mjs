import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const homePath = path.join(root, 'redisenio/index.html');
const version = '20261011-release-18';
const svg = (await readFile(path.join(root, 'redisenio/anatomy/figure.svg'), 'utf8')).trim();
const raw = JSON.parse(await readFile(path.join(root, 'redisenio/anatomy/geometry.json'), 'utf8'));
if (raw.version !== 2 || raw.viewBox?.width !== 600 || raw.viewBox?.height !== 390) throw new Error('La figura debe usar el contrato de software v2 y una vista de 600 × 390.');
const contracts = [
  ['la vista SVG', /viewBox=["']0 0 600 390["']/],
  ['la clase raíz', /class=["'][^"']*\banatomy-svg\b/],
  ['el recorrido directo', /data-flow-path=["']direct["']/],
  ['el recorrido de IA', /data-flow-path=["']ai["']/],
  ['la señal', /data-anatomy-signal(?:\s|=|\/?>)/],
  ['el halo', /data-anatomy-signal-halo(?:\s|=|\/?>)/],
  ...['input', 'rules', 'ai', 'output'].map(name => ['el nodo ' + name, new RegExp('data-flow-' + name + '(?:\\s|=|\\/?>)')]),
  ['la rama de IA', /data-ai-only(?:\s|=|\/?>)/],
  ['la rama directa', /data-direct-only(?:\s|=|\/?>)/],
];
for (const [description, pattern] of contracts) if (!pattern.test(svg)) throw new Error('Falta ' + description + ' en la figura de software.');
if ([...svg.matchAll(/data-output-row(?:\s|=|\/?>)/g)].length !== 4) throw new Error('La aplicación debe incluir cuatro filas de resultado.');
const geometry = { version: 2, viewBox: raw.viewBox, solidCount: raw.solidCount };
const figure = [
  '<!-- anatomy-figure:start -->',
  '<figure class="tech-visual anatomy-card" data-anatomy-card data-anatomy-mode="ai" role="group" aria-labelledby="anatomy-title" aria-describedby="anatomy-help">',
  '  <div class="anatomy-card-head"><span aria-hidden="true">Fig. 01</span><span class="anatomy-card-title" id="anatomy-title">Software conectado</span></div>',
  '  <div class="anatomy-stage" data-anatomy-stage>',
  svg,
  '  </div>',
  '  <div class="anatomy-card-foot">',
  '    <span class="anatomy-readout" data-anatomy-readout aria-hidden="true">Aplicación actualizada</span>',
  '  </div>',
  '  <button class="anatomy-motion" data-anatomy-motion type="button" aria-label="Pausar la animación del software" data-paused="false">',
  '    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path data-motion-pause d="M5 4v8m6-8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path data-motion-play d="m6 3 6 5-6 5V3Z" fill="currentColor"/></svg>',
  '  </button>',
  '  <figcaption id="anatomy-help" class="anatomy-sr-only">Una aplicación conecta datos, reglas y una etapa de IA para actualizar un resultado. La animación ilustra el flujo, no mide tiempos de procesamiento.</figcaption>',
  '  <span class="anatomy-sr-only" role="status" aria-live="polite" aria-atomic="true" data-anatomy-status></span>',
  '  <script type="application/json" data-anatomy-geometry>' + JSON.stringify(geometry).replaceAll('<', '\\u003c') + '</script>',
  '</figure>',
  '<!-- anatomy-figure:end -->',
].join('\n');
let home = await readFile(homePath, 'utf8');
if (!home.includes('<!-- anatomy-figure:start -->')) throw new Error('No se encontró el bloque Anatomy de la propuesta.');
home = home.replace(/<!-- anatomy-figure:start -->[\s\S]*?<!-- anatomy-figure:end -->/, () => figure);
if (!home.includes('/redisenio/anatomy/figure.css')) home = home.replace('</head>', '<link rel="stylesheet" href="/redisenio/anatomy/figure.css?v=' + version + '"/>\n</head>');
if (!home.includes('/redisenio/anatomy/live.js')) home = home.replace('</head>', '<script type="module" src="/redisenio/anatomy/live.js?v=' + version + '"></script>\n</head>');
home = home.replace(/\/redisenio\/anatomy\/figure\.css(?:\?[^"'\s>]*)?/g, '/redisenio/anatomy/figure.css?v=' + version);
home = home.replace(/\/redisenio\/anatomy\/live\.js(?:\?[^"'\s>]*)?/g, '/redisenio/anatomy/live.js?v=' + version);
await writeFile(homePath, home);
console.log('Figura Anatomy de software integrada en /redisenio/#tecnologia.');
