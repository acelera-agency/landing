import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
try {
  process.loadEnvFile(path.join(rootDir, ".env.local"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const port = Number(process.env.PORT || 4173);
const leadApiUrl = pathToFileURL(path.join(rootDir, "api", "lead.js")).href;
const scheduleApiUrl = pathToFileURL(path.join(rootDir, "api", "schedule.js")).href;

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"]
]);

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function resolveCandidates(requestPathname) {
  if (requestPathname === "/") {
    return [path.join(rootDir, "index.html")];
  }

  const cleanPath = requestPathname.replace(/^\/+/, "");
  const decodedPath = decodeURIComponent(cleanPath);
  const directPath = path.resolve(rootDir, decodedPath);

  if (path.extname(decodedPath)) {
    return [directPath];
  }

  return [
    directPath,
    path.resolve(rootDir, `${decodedPath}.html`),
    path.resolve(rootDir, decodedPath, "index.html")
  ];
}

function isSafePath(filePath) {
  return filePath === rootDir || filePath.startsWith(`${rootDir}${path.sep}`);
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (["/api/lead", "/api/schedule"].includes(requestUrl.pathname)) {
    try {
      const { default: handler } = await import(requestUrl.pathname === "/api/schedule" ? scheduleApiUrl : leadApiUrl);
      await handler(req, res);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Server error" }));
      console.error(`[dev-server] Failed to handle ${requestUrl.pathname}`, error.name);
    }

    return;
  }

  // Only public site files are served; local credentials and server sources
  // must never be reachable through the static preview.
  let segments;
  try {
    segments = decodeURIComponent(requestUrl.pathname).split("/").filter(Boolean);
  } catch {
    res.writeHead(400).end("Invalid path");
    return;
  }
  if (segments.some(segment => segment.startsWith(".")) ||
      ["api", "lib", "node_modules", "scripts"].includes(segments[0])) {
    res.writeHead(404).end("Not found");
    return;
  }

  const candidates = resolveCandidates(requestUrl.pathname);

  const filePath = await (async () => {
    for (const candidate of candidates) {
      if (isSafePath(candidate) && (await fileExists(candidate))) {
        return candidate;
      }
    }

    return null;
  })();

  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes.get(extension) || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    res.end(body);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
    console.error(`[dev-server] Failed to serve ${filePath}`, error);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Landing Acelera disponible en http://127.0.0.1:${port}`);
});
