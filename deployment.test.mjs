import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";
const read = p=>readFile(new URL(p,import.meta.url),"utf8");
const pages=["index","desarrollo-software-a-medida","plataformas-internas","agentes-ia-empresas","consultoria-ia-empresas","casos/faro","privacidad","terminos"];
test("mutable shared and redesign assets are revalidated",async()=>{
  const config=JSON.parse(await read("vercel.json"));
  for(const source of ["/assets/(.*)","/redisenio/(.*)"]) assert.equal(config.headers.find(r=>r.source===source)?.headers.find(h=>h.key==="Cache-Control")?.value,"public, max-age=0, must-revalidate");
});
test("all production pages point to final routes and existing released resources",async()=>{
  for(const page of pages){
    const html=await read(page+".html");
    for(const tag of html.matchAll(/<(?:script|link|img)\b[^>]*>/g)){
      const url=tag[0].match(/(?:src|href)="(\/[^"?#]+)/)?.[1];
      if(url) await access(new URL("."+url,import.meta.url));
    }
    assert.match(html,/styles\.css\?v=20261011-release-18/);
    assert.match(html,/app\.js\?v=20261011-release-18/);
    assert.doesNotMatch(html,/href="\/redisenio\/(?:privacidad|terminos|casos\/faro|desarrollo-software-a-medida|plataformas-internas|agentes-ia-empresas|consultoria-ia-empresas)(?:["#])/);
  }
});
test("the native agenda proxies to its production backend and preserves the lead gateway",async()=>{
  const config=JSON.parse(await read("vercel.json"));
  assert.deepEqual(config.rewrites.find(r=>r.source==="/api/schedule"),{source:"/api/schedule",destination:"https://acelera-schedule-api.vercel.app/api/schedule"});
  assert.match(await read("assets/app.js"),/formEndpoint: "https:\/\/acelera-lead-gateway\.vercel\.app\/api\/lead"/);
});
test("private files and tooling are excluded from the deployment",async()=>{
  const ignore=await read(".vercelignore");
  for(const path of ["tmp/","scripts/",".env*","docs/","output/","**/*.test.*","lib/"]) assert.ok(ignore.split("\n").includes(path));
});
test("the illustration has no IA mode selector in either entry point",async()=>{
  for(const page of ["index.html","redisenio/index.html"]){
    const html=await read(page);
    assert.doesNotMatch(html,/data-anatomy-toggle|Sin IA|Con IA/);
    assert.match(html,/data-anatomy-mode="ai"/);
  }
});
