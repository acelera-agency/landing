import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIndexNowSubmission,
  canonicalOrigin,
  indexNowEndpoint,
  indexNowKey,
  submitIndexNow,
} from "./scripts/submit-indexnow.mjs";

test("builds a bounded IndexNow submission from the canonical sitemap", async () => {
  const payload = await buildIndexNowSubmission();

  assert.equal(payload.host, "www.acelera.agency");
  assert.match(payload.key, /^[a-f0-9]{32}$/);
  assert.equal(payload.key, indexNowKey);
  assert.equal(payload.keyLocation, `${canonicalOrigin}/${indexNowKey}.txt`);
  assert.equal(payload.urlList.length, 5);
  assert.equal(new Set(payload.urlList).size, payload.urlList.length);
  assert.ok(payload.urlList.every((url) => url.startsWith(`${canonicalOrigin}/`)));
  assert.ok(payload.urlList.every((url) => !url.includes("?") && !url.includes("#")));
});

test("submits only the sitemap URLs and accepts an asynchronous IndexNow response", async () => {
  let request;
  const result = await submitIndexNow(async (url, options) => {
    request = { url, options };
    return new Response("", { status: 202 });
  });
  const payload = JSON.parse(request.options.body);

  assert.equal(request.url, indexNowEndpoint);
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers["Content-Type"], "application/json; charset=utf-8");
  assert.deepEqual(payload.urlList, result.urls);
  assert.equal(result.status, 202);
  assert.equal(result.submitted, 5);
});
