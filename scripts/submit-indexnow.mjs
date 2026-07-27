import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const canonicalOrigin = "https://www.acelera.agency";
export const indexNowEndpoint = "https://api.indexnow.org/indexnow";
export const indexNowKey = "ea91d86f3694501ea4a4cdeec90a106a";

export function extractCanonicalUrls(sitemap) {
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/www\.acelera\.agency\/[^<]*)<\/loc>/g)]
    .map((match) => match[1]);

  if (urls.length === 0) {
    throw new Error("The sitemap does not contain canonical Acelera URLs.");
  }

  if (new Set(urls).size !== urls.length) {
    throw new Error("The sitemap contains duplicate URLs.");
  }

  return urls;
}

export async function buildIndexNowSubmission() {
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
  const publishedKey = (
    await readFile(new URL(`../${indexNowKey}.txt`, import.meta.url), "utf8")
  ).trim();

  if (publishedKey !== indexNowKey) {
    throw new Error("The public IndexNow key file does not match the submission key.");
  }

  return {
    host: "www.acelera.agency",
    key: indexNowKey,
    keyLocation: `${canonicalOrigin}/${indexNowKey}.txt`,
    urlList: extractCanonicalUrls(sitemap),
  };
}

export async function submitIndexNow(fetchImplementation = fetch) {
  const payload = await buildIndexNowSubmission();
  const response = await fetchImplementation(indexNowEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `IndexNow rejected the submission with HTTP ${response.status}${responseBody ? `: ${responseBody}` : ""}`,
    );
  }

  return {
    status: response.status,
    submitted: payload.urlList.length,
    urls: payload.urlList,
  };
}

const isMainModule = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  submitIndexNow()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
