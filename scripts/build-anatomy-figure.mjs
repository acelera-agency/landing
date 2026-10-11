/** Acelera · Software conectado. Anatomy kit (MIT), geometry original. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './vendor/anatomy/iso-kit.mjs';
import * as A from './vendor/anatomy/audit.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OUT=resolve(ROOT,'redisenio/anatomy');
mkdirSync(OUT,{recursive:true});
const W=600,H=390;
const BASE={x:-135,y:-62,w:270,d:154,r:10};
const CASE={x:-118,y:-39,w:236,d:10,r:3.2};
const P=k.fitProjection([...k.boxCorners(BASE,0,7),...k.boxCorners(CASE,35,150)],W,H,{pad:22,azimuth:67,elevation:25});
const R=A.recorder(P,{ground:s=>s.name.startsWith('base.foot.')});
const at=p=>k.iso(p,P);
const line=(d,tone='faint',opts={})=>k.lineSvg(d,{tone,...opts});
const dot=(p,r=.5)=>k.dotsSvg([at(p)],{size:r,tone:'mid'});
const items=[];
function slab(name,plan,z,h,style={},inner='') {
 const shape=R.solid(A.slab(plan,z,h,{name,owner:name},8));
 const svg=k.solidSvg(k.slabOf(plan,z,h,P,8,Math.min(.6,h/3,plan.d/3)),{tone:'mid',crease:'faint',...style,inner});
 const item=R.put({name,at:[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],shapes:[shape],svg:`<g data-anatomy-part="${name}">${svg}</g>`});items.push(item);return item;
}
function cyl(name,x,y,r,z,h,style={}) {
 const shape=R.solid(A.cylinder(x,y,r,z,h,{name,owner:name}));
 const item=R.put({name,at:[x,y,z+h/2],shapes:[shape],svg:`<g data-anatomy-part="${name}">${k.solidSvg(k.cylinder(x,y,r,z,h,P,36,.16),{tone:'lo',crease:'faint',...style})}</g>`});items.push(item);return item;
}
function add(item,svg){item.svg+=svg;}
function screw(name,x,y,z,r=1.6){const s=cyl(name,x,y,r,z,.5);add(s,line(k.ring(x,y,r*.52,z+.5,P,6),'mid'));return s;}
function inset(item,plan,z,space=3){add(item,line(k.planOutline(k.insetPlan(plan,space),z,P,8)));}
// Every physical piece is static; the only motion is content on the screen.
for(const [i,[x,y]] of k.corners(BASE,17).entries())cyl(`base.foot.${i}`,x,y,6,0,3,{className:'workstation-rubber'});
const base=slab('base.plate',BASE,3,4,{tone:'lo'},line(k.sideSeam(BASE,4.5,P,8)));
inset(base,BASE,7,4);
for(const [i,[x,y]] of k.corners(BASE,10).entries())screw(`base.screw.${i}`,x,y,7,1.65);
const badge={x:-112,y:76,w:48,d:8,r:1};const label=slab('base.badge',badge,7,.45,{tone:'lo',crease:'none'});
add(label,k.faceTextSvg(k.topMatrix([-88,81.8],7.45,P),'ACELERA',{size:3.7,tone:'mid',anchor:'middle'}));
const foot={x:-36,y:-47,w:72,d:46,r:5};const stand=slab('monitor.foot',foot,7,4,{tone:'lo'});inset(stand,foot,11,3);
const neck={x:-9,y:-37,w:18,d:7,r:1};const stem=slab('monitor.stem',neck,11,20,{tone:'mid'},line(k.sideSeam(neck,18,P,8)));
const collar=slab('monitor.collar',{x:-13,y:-39,w:26,d:11,r:2},31,4,{tone:'mid'});
for(const [i,x] of [-28,28].entries())screw(`monitor.mount.${i}`,x,-8,11,1.4);
const body=slab('monitor.case',CASE,35,115,{tone:'hi'},line(k.sideSeam(CASE,146,P,8)));
// Closed ventilation slots belong to the top surface; no loose seam ends.
for(let i=0;i<15;i++)add(body,line(k.planOutline({x:-43+i*6,y:-36.5,w:3.2,d:2.1,r:1},150,P,4)));
const rear=slab('monitor.back',{x:-111,y:-40.2,w:222,d:1.2,r:.3},42,100,{tone:'lo'});
const glassPlan={x:-105,y:-29,w:210,d:.55,r:.1};
const glass=slab('monitor.glass',glassPlan,40,104,{tone:'lo',className:'workstation-glass'});
const screenPlane=k.sideMatrix([-98,-28.43],141,P,'left');
const flatRect=(x,y,w,h,r=2,cls='screen-panel',extra='')=>`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${extra}/>`;
const txt=(x,y,text,size=6,cls='screen-text')=>`<text x="${x}" y="${y}" font-size="${size}" class="${cls}">${text}</text>`;
const printed=(x,y,w,cls='screen-rule')=>flatRect(x,y,w,1.4,.7,cls);
const rows=[];
for(let i=0;i<4;i++)rows.push(`<g data-output-row="${i}">${flatRect(157,57+i*6.7,4,4,1,'screen-check-bg')}<path class="screen-check" d="M158 ${59+i*6.7}l.8.9 1.3-1.8"/>${printed(164,58.3+i*6.7,20-i%2*5)}</g>`);
const screen=`
<defs><clipPath id="software-screen-clip"><rect width="196" height="100" rx="2"/></clipPath></defs>
<g transform="${screenPlane}"><g clip-path="url(#software-screen-clip)">
${flatRect(0,0,196,100,2,'screen-paper')}
${flatRect(0,0,196,11,0,'screen-toolbar')}
<circle class="screen-dot" cx="6" cy="5.5" r="1.1"/><circle class="screen-dot" cx="10" cy="5.5" r="1.1"/><circle class="screen-dot" cx="14" cy="5.5" r="1.1"/>
${flatRect(49,2.8,98,5.5,1.2,'screen-address')}${txt(77,6.9,'acelera / proyecto',3.8,'screen-meta')}
${txt(8,25,'Tu aplicación',8,'screen-heading')}${printed(8,29,35)}
<g data-direct-only><path class="screen-wire" data-flow-path="direct" data-rules-at=".394" data-output-at=".98" d="M47 65 H151"/></g>
<g data-ai-only opacity="0"><path class="screen-wire" data-flow-path="ai" data-rules-at=".238" data-ai-at=".628" data-output-at=".98" d="M47 65 H121 V31 H146 V65 H151"/></g>
<g data-flow-input>
${flatRect(8,40,39,44,3)}${txt(13,49,'Datos',6.4,'screen-heading')}
${[0,1,2].map(i=>`${flatRect(13,55+i*8,5,5,1,'screen-data-cell')}${printed(21,56+i*8,19-i*3)}${printed(21,58.5+i*8,10)}`).join('')}
<circle class="screen-port" cx="47" cy="65" r="1.3"/></g>
<g data-flow-rules>
${flatRect(71,52,34,26,3)}${txt(77,62,'Reglas',6.3,'screen-heading')}
${[0,1,2].map(i=>`<path class="screen-setting" d="M78 ${67+i*3}H98"/><circle class="screen-setting-knob" cx="${[83,92,87][i]}" cy="${67+i*3}" r="1.4"/>`).join('')}
<circle class="screen-port" cx="71" cy="65" r="1.3"/><circle class="screen-port" cx="105" cy="65" r="1.3"/></g>
<g data-flow-ai data-ai-only opacity="0">
${flatRect(106,17,30,28,3,'screen-ai-panel')}${txt(116.4,29,'IA',8.5,'screen-ai-text')}${txt(110,37.5,'opcional',4.7,'screen-ai-text')}
<circle class="screen-ai-port" cx="121" cy="45" r="1.3"/><circle class="screen-ai-port" cx="136" cy="31" r="1.3"/></g>
<g data-flow-output>
${flatRect(151,45,40,43,3)}${txt(156,53,'Producto',5.7,'screen-heading')}${rows.join('')}
<circle class="screen-port" cx="151" cy="65" r="1.3"/></g>
${txt(9,94,'Sistemas conectados',4.2,'screen-meta')}${txt(156,95,'EN LÍNEA',3.7,'screen-meta')}
<circle class="screen-signal-halo" data-anatomy-signal-halo r="4.4" opacity="0"/><circle class="screen-signal" data-anatomy-signal r="1.9" opacity="0"/>
</g><rect width="196" height="100" rx="2" class="screen-outline"/></g>`;
add(glass,screen);
// Camera and indicator are printed on the metal face, separate from display content.
const face=k.sideMatrix([0,-28.42],0,P,'left');
add(body,`<g transform="${face}"><circle class="camera-ring" cx="0" cy="-147" r="1.05"/><circle class="camera-lens" cx="0" cy="-147" r=".45"/><circle class="power-light" cx="106" cy="-37.5" r=".65"/></g>`);
// Compact keyboard: three ten-key rows plus a normal-width bottom row.
const KB={x:-111,y:17,w:174,d:55,r:4};
for(const [i,[x,y]] of k.corners(KB,7).entries())cyl(`keyboard.foot.${i}`,x,y,2.5,7,1.2,{className:'workstation-rubber'});
const keyboard=slab('keyboard.case',KB,8.2,3.4,{tone:'mid'},line(k.sideSeam(KB,9.5,P,8)));
inset(keyboard,KB,11.6,3.1);
const keyRows=[Array(10).fill(1),Array(10).fill(1),Array(10).fill(1),[1,1,1,4,1,1,1]];
let keyId=0;
keyRows.forEach((widths,row)=>{let x=-104;for(const width of widths){const plan={x:x+.65,y:23+row*10.9,w:16*width-1.3,d:9.1,r:1.15};const h=row===0?2.8:2.4;const key=slab(`keyboard.key.${keyId++}`,plan,11.6,h,{tone:'mid'});inset(key,plan,11.6+h,1.25);if(row===1&&[3,6].includes(Math.round((x+104)/16)))add(key,printedKey(plan,11.6+h));x+=16*width;}});
function printedKey(plan,z){return line(k.lineOnTop([plan.x+plan.w*.38,plan.y+plan.d*.68],[plan.x+plan.w*.62,plan.y+plan.d*.68],z,P),'mid',{free:true});}
// Wireless mouse: each button and wheel sits on its casing.
const MOUSE={x:85,y:26,w:29,d:43,r:12};
slab('mouse.foot',{...MOUSE,x:87,y:28,w:25,d:39,r:10},7,1,{tone:'lo',className:'workstation-rubber'});
const mouse=slab('mouse.case',MOUSE,8,7,{tone:'mid'});inset(mouse,MOUSE,15,2.1);
for(const [i,x] of [89,100.5].entries())slab(`mouse.button.${i}`,{x,y:29,w:9.5,d:17,r:3.3},15,.65,{tone:'lo'});
const wheel=slab('mouse.wheel',{x:98.2,y:32,w:2.6,d:8,r:1.2},15,1.4,{tone:'lo'});
for(let i=0;i<5;i++)add(wheel,line(k.lineOnTop([98.2,33+i*1.2],[100.8,33+i*1.2],16.4,P),'faint'));
A.settle(R,P,{states:[0],step:.65});
items.sort((a,b)=>a.key-b.key);
const CSS=`
.anatomy-svg{--anatomy-paper:#efefeb;--anatomy-top:#fdfdfa;--anatomy-shade-0:#b8bab5;--anatomy-shade-1:#c9cbc5;--anatomy-shade-2:#daddd5;--anatomy-shade-3:#e6e8e1;--anatomy-hi:#737870;--anatomy-mid:#92988e;--anatomy-lo:#a8ada3;--anatomy-faint:#c3c8bd;--anatomy-weight:.6px;--anatomy-dot:#676f60;--screen-paper:#fcfcfa;--screen-panel:#fff;--screen-line:#d6d9d1;--screen-ink:#555e50;--screen-muted:#a8afa1;--screen-accent:#c96a43;--screen-accent-soft:#f5e3d8;--screen-rule:#d6dbcf;--screen-toolbar:#edf0e8;--screen-heading:#515c49}
.anatomy-svg path,.anatomy-svg circle{vector-effect:non-scaling-stroke}
.anatomy-svg .iso-fill{fill:var(--anatomy-paper);stroke:none}.anatomy-svg .iso-shade,.anatomy-svg .iso-top{stroke:none}
.anatomy-svg .iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}.anatomy-svg .iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}.anatomy-svg .iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}.anatomy-svg .iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}.anatomy-svg .iso-top{fill:var(--anatomy-top)}
.anatomy-svg .iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}.anatomy-svg .iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}.anatomy-svg .iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}.anatomy-svg .iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.anatomy-svg .iso-dots circle{fill:var(--anatomy-dot);stroke:none}.anatomy-svg .iso-face-text{fill:var(--anatomy-mid);font-family:ui-monospace,monospace;letter-spacing:.13em}
.anatomy-svg .workstation-rubber{--anatomy-paper:#91968a;--anatomy-top:#a7ad9f;--anatomy-shade-0:#808779;--anatomy-shade-1:#8e9487;--anatomy-shade-2:#9da494;--anatomy-shade-3:#adb4a3}
.anatomy-svg .workstation-glass{--anatomy-top:#c8cec2;--anatomy-paper:#c8cec2;--anatomy-shade-0:#b3bbab;--anatomy-shade-1:#bdc5b5;--anatomy-shade-2:#c7cfbf;--anatomy-shade-3:#d1d9c9}
.screen-paper{fill:var(--screen-paper)}.screen-toolbar,.screen-address{fill:var(--screen-toolbar)}.screen-address{fill:var(--screen-paper)}.screen-dot{fill:var(--screen-muted)}
.screen-panel{fill:var(--screen-panel);stroke:var(--screen-line);stroke-width:.65}.screen-wire{fill:none;stroke:var(--screen-muted);stroke-width:.8;stroke-linejoin:round;stroke-linecap:round}
.screen-text,.screen-heading,.screen-meta,.screen-ai-text{font-family:var(--sans,Arial,sans-serif);fill:var(--screen-ink);font-weight:500}.screen-heading{fill:var(--screen-heading);font-weight:600}.screen-meta{fill:var(--screen-muted)}.screen-rule{fill:var(--screen-rule)}.screen-data-cell,.screen-check-bg{fill:var(--screen-toolbar)}
.screen-setting{fill:none;stroke:var(--screen-muted);stroke-width:.7}.screen-setting-knob,.screen-port{fill:var(--screen-panel);stroke:var(--screen-muted);stroke-width:.7}.screen-check{fill:none;stroke:var(--screen-ink);stroke-width:.7;stroke-linecap:round;stroke-linejoin:round}
.screen-ai-panel{fill:var(--screen-accent-soft);stroke:var(--screen-accent);stroke-width:.8}.screen-ai-text{fill:var(--screen-accent);font-weight:600}.screen-ai-port{fill:var(--screen-accent);stroke:none}
.screen-signal{fill:var(--screen-accent)}.screen-signal-halo{fill:var(--screen-accent)}.screen-outline{fill:none;stroke:var(--screen-line);stroke-width:.5}
.camera-ring{fill:#d0d4ca;stroke:#999f91;stroke-width:.45}.camera-lens{fill:#7e8974}.power-light{fill:var(--screen-accent)}
.anatomy-svg[data-theme="dark"]{--anatomy-paper:#292d29;--anatomy-top:#3a4039;--anatomy-shade-0:#1c211b;--anatomy-shade-1:#232922;--anatomy-shade-2:#2b3229;--anatomy-shade-3:#343c31;--anatomy-hi:#bbc4b4;--anatomy-mid:#929d89;--anatomy-lo:#76826c;--anatomy-faint:#56634d;--screen-paper:#222820;--screen-panel:#30382b;--screen-line:#56634b;--screen-ink:#bbc8ae;--screen-muted:#819172;--screen-rule:#536047;--screen-toolbar:#343e2c;--screen-heading:#cedbc0;--screen-accent:#e69b73;--screen-accent-soft:#5e3927}
.anatomy-svg[data-theme="dark"] .workstation-rubber{--anatomy-paper:#20261e;--anatomy-top:#31392c;--anatomy-shade-0:#161b14;--anatomy-shade-1:#1d231a;--anatomy-shade-2:#242d20;--anatomy-shade-3:#2d3827}
.anatomy-svg[data-theme="dark"] .workstation-glass{--anatomy-paper:#394333;--anatomy-top:#394333;--anatomy-shade-0:#26311f;--anatomy-shade-1:#2e3926;--anatomy-shade-2:#36412e;--anatomy-shade-3:#3e4936}
.anatomy-svg[data-theme="dark"] .camera-ring{fill:#48533f;stroke:#829176}.anatomy-svg[data-theme="dark"] .camera-lens{fill:#9aaa8b}
`;
const halo=`<defs><filter id="software-shadow" x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur stdDeviation="6"/></filter></defs><path d="${k.haloOf(BASE,0,5,P)}" fill="#68725c" opacity=".12" filter="url(#software-shadow)"/>`;
const svg=(`<svg xmlns="http://www.w3.org/2000/svg" class="anatomy-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="acelera-anatomy-title acelera-anatomy-desc"><title id="acelera-anatomy-title">Software conectado</title><desc id="acelera-anatomy-desc">Una estación de trabajo muestra una aplicación que conecta datos, reglas y un resultado. Una rama naranja permite incorporar IA cuando hace falta.</desc><style>${CSS}</style>${halo}${items.map(i=>i.svg).join('\n')}</svg>\n`).replace(/(\sdata-[\w-]+)(?=[\s>])/g, '$1=""');
writeFileSync(resolve(OUT,'figure.svg'),svg);
const metadata={version:2,source:'https://skills.wheresryan.sh/anatomy',build:'node scripts/build-anatomy-figure.mjs',viewBox:{width:W,height:H},projection:P,solidCount:R.solids.length,pathCount:(svg.match(/<path\b/g)||[]).length,mode:'software',noExternalAssets:true,screen:{width:196,height:100,matrix:screenPlane},motion:'Only screen content animates; physical geometry stays fixed.'};
writeFileSync(resolve(OUT,'geometry.json'),JSON.stringify(metadata,null,2)+'\n');
if(process.argv.includes('--audit')){
 const result=A.audit(R,P,{apart:false,frames:[0]});
 writeFileSync(resolve(OUT,'audit.txt'),`Anatomy · Software conectado\n${R.solids.length} real static solids. UI movement stays in the clipped screen plane.\n\n${A.report(result)}\n`);
 console.log(A.report(result));
 if(A.failures(result))process.exitCode=1;
}
console.log(`Wrote software terminal · ${R.solids.length} solids · ${metadata.pathCount} paths`);
