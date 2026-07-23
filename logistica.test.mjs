import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import test from "node:test";
import { chromium } from "playwright";

const startupTimeoutMs = 5_000;
const shutdownTimeoutMs = 1_000;

async function getAvailableLoopbackPort() {
  const reservation = createServer();

  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });

  const address = reservation.address();
  assert.equal(typeof address, "object");
  assert.ok(address?.port, "No se pudo reservar un puerto loopback para la prueba logística.");
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));

  return address.port;
}

function waitForServer(server) {
  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      server.stdout.off("data", captureOutput);
      server.stderr.off("data", captureOutput);
      server.off("error", handleError);
      server.off("exit", handleExit);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const timeout = setTimeout(() => {
      finish(reject, new Error(`El servidor logístico no estuvo disponible a tiempo. Salida:\n${output}`));
    }, startupTimeoutMs);

    const captureOutput = (chunk) => {
      output += chunk.toString();

      if (output.includes("disponible")) {
        finish(resolve);
      }
    };
    const handleError = (error) => finish(reject, error);
    const handleExit = (code) => finish(reject, new Error(`El servidor logístico terminó antes de estar disponible (código ${code}). Salida:\n${output}`));

    server.stdout.on("data", captureOutput);
    server.stderr.on("data", captureOutput);
    server.once("error", handleError);
    server.once("exit", handleExit);
  });
}

async function stopServer(server) {
  if (server.exitCode !== null) {
    return;
  }

  const waitForExit = () => {
    if (server.exitCode !== null) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        server.off("exit", handleExit);
        resolve(false);
      }, shutdownTimeoutMs);
      const handleExit = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      server.once("exit", handleExit);
    });
  };

  server.kill();
  if (await waitForExit()) {
    return;
  }

  server.kill("SIGKILL");
  if (!await waitForExit()) {
    throw new Error("El servidor logístico no terminó después del apagado forzado.");
  }
}

test("la demo logística conserva el contrato de contenido, accesibilidad y movimiento", async () => {
  const html = await readFile(new URL("./logistica.html", import.meta.url), "utf8");

  for (const label of ["Cruce", "Margen", "Límite"]) {
    assert.match(html, new RegExp(label));
  }

  for (const product of ["cruce", "margen", "limite"]) {
    assert.match(html, new RegExp(`data-logistics-product=["']${product}["']`));
  }

  assert.match(html, /data-variant=["']logistica["']/);
  assert.match(html, /data-lead-form/);
  assert.match(html, /<form[^>]*data-lead-form[^>]*method=["']post["']/i);
  assert.match(html, /<form[^>]*data-lead-form[^>]*action=["']https:\/\/acelera-lead-gateway\.vercel\.app\/api\/lead["']/i);
  assert.match(html, /<input[^>]*name=["']variant["'][^>]*value=["']logistica["']/i);
  assert.match(html, /data-reset-product/);
  assert.match(html, /aria-label=["']Reiniciar demo activa["']/);
  assert.match(html, /resetProduct/);
  assert.match(html, /<button\s+type=["']button["']/);
  assert.match(html, /aria-live=/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /cinco operaciones/i);
});

test("cada demo declara el contrato operativo aprobado", async () => {
  const html = await readFile(new URL("./logistica.html", import.meta.url), "utf8");

  for (const source of ["invoice", "packing-list", "booking", "draft-hbl"]) {
    assert.match(html, new RegExp(`data-cruce-source=["']${source}["']`));
  }
  for (const field of ["bultos", "peso", "notify-tax-id", "customer-rule"]) {
    assert.match(html, new RegExp(`data-finding=["']${field}["']`));
  }

  assert.match(html, /data-margin-reference=["']quotation["']/);
  assert.match(html, /data-margin-reference=["']invoice["']/);
  for (const cost of ["carrier", "terminal", "agent", "handling"]) {
    assert.match(html, new RegExp(`data-forwarder-cost=["']${cost}["']`));
  }

  assert.match(html, /data-limit-domain=["']ocean-fcl["']/);
  for (const milestone of ["free-time", "customs-release", "pickup", "empty-return", "daily-exposure"]) {
    assert.match(html, new RegExp(`data-limit-milestone=["']${milestone}["']`));
  }
});

test("la ruta logística responde por HTTP desde el servidor de desarrollo", { timeout: 10_000 }, async () => {
  const logisticsServerPort = await getAvailableLoopbackPort();
  const server = spawn(process.execPath, ["scripts/dev-server.mjs"], {
    cwd: new URL(".", import.meta.url),
    env: { ...process.env, PORT: String(logisticsServerPort) },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer(server);
    const response = await fetch(`http://127.0.0.1:${logisticsServerPort}/logistica`);

    assert.equal(response.status, 200);
  } finally {
    await stopServer(server);
  }
});

test("las tres demos se pueden seleccionar, alterar y reiniciar", { timeout: 20_000 }, async () => {
  const logisticsServerPort = await getAvailableLoopbackPort();
  const server = spawn(process.execPath, ["scripts/dev-server.mjs"], {
    cwd: new URL(".", import.meta.url),
    env: { ...process.env, PORT: String(logisticsServerPort) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let browser;

  try {
    await waitForServer(server);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${logisticsServerPort}/logistica`);
    const reset = page.locator("[data-reset-product]");

    await page.locator('[data-logistics-product="cruce"]').click();
    await page.locator('[data-finding="bultos"]').click();
    await reset.click();
    await assert.doesNotReject(() => page.locator('[data-finding="bultos"][aria-pressed="false"]').waitFor());

    await page.locator('[data-logistics-product="margen"]').click();
    await page.locator('[data-forwarder-cost="handling"]').uncheck();
    await reset.click();
    assert.equal(await page.locator('[data-forwarder-cost="handling"]').isChecked(), true);

    await page.locator('[data-logistics-product="limite"]').click();
    await page.locator("[data-limit-action]").click();
    assert.equal(await page.locator("[data-limit-action]").isDisabled(), true);
    await reset.click();
    assert.equal(await page.locator("[data-limit-action]").isEnabled(), true);

    assert.equal(await reset.getAttribute("aria-label"), "Reiniciar demo activa");
  } finally {
    await browser?.close();
    await stopServer(server);
  }
});
