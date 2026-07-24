import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import test from "node:test";
import { chromium } from "playwright";

import * as data from "./assets/logistica/data.js";

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
  await new Promise((resolve, reject) => reservation.close((error) => (error ? reject(error) : resolve())));
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
      if (output.includes("disponible")) finish(resolve);
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
  if (server.exitCode !== null) return;
  const waitForExit = () => {
    if (server.exitCode !== null) return Promise.resolve(true);
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
  if (await waitForExit()) return;
  server.kill("SIGKILL");
  if (!(await waitForExit())) throw new Error("El servidor logístico no terminó después del apagado forzado.");
}

async function withServer(run, { timeout } = {}) {
  const port = await getAvailableLoopbackPort();
  const server = spawn(process.execPath, ["scripts/dev-server.mjs"], {
    cwd: new URL(".", import.meta.url),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitForServer(server);
    await run(port);
  } finally {
    await stopServer(server);
  }
}

/* ------------------------------------------------------------------ */
/* Contrato del hub                                                    */
/* ------------------------------------------------------------------ */
test("el hub /logistica presenta los tres productos con links directos", async () => {
  const html = await readFile(new URL("./logistica.html", import.meta.url), "utf8");

  for (const [name, href] of [
    ["Control Documental", "/logistica/preflight"],
    ["Control de Margen", "/logistica/margin"],
    ["Control de Contenedores", "/logistica/freetime"],
  ]) {
    assert.match(html, new RegExp(name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")));
    assert.match(html, new RegExp(`href=["']${href}["']`));
  }

  assert.match(html, /data-variant=["']logistica["']/);
  assert.match(html, /<form[^>]*data-lead-form[^>]*method=["']post["']/i);
  assert.match(html, /<form[^>]*data-lead-form[^>]*action=["']https:\/\/acelera-lead-gateway\.vercel\.app\/api\/lead["']/i);
  assert.match(html, /<input[^>]*name=["']variant["'][^>]*value=["']logistica["']/i);
  assert.match(html, /privacy_consent/);
  assert.match(html, /cinco operaciones/i);

  // Integraciones: solo herramientas con APIs oficiales/desarrollables.
  for (const tool of ["Gmail", "Outlook 365", "WhatsApp Business", "CargoWise", "Magaya", "Maersk", "Hapag-Lloyd", "AFIP / ARCA"]) {
    assert.match(html, new RegExp(tool.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")), `El hub debería mencionar ${tool}`);
  }
});

/* ------------------------------------------------------------------ */
/* Contrato de cada página de demo                                     */
/* ------------------------------------------------------------------ */
for (const { file, demo, modulo } of [
  { file: "preflight", demo: "preflight", modulo: "Control Documental" },
  { file: "margin", demo: "margin", modulo: "Control de Margen" },
  { file: "freetime", demo: "freetime", modulo: "Control de Contenedores" },
]) {
  test(`la página ${file} monta el shell de la demo ${demo}`, async () => {
    const html = await readFile(new URL(`./logistica/${file}.html`, import.meta.url), "utf8");
    assert.match(html, new RegExp(`id=["']logistica-app["'][^>]*data-demo=["']${demo}["']`));
    assert.match(html, /type=["']module["'][^>]*assets\/logistica\/demo\.js/);
    assert.match(html, /assets\/logistica\/shell\.css/);
    assert.match(html, /name=["']robots["'][^>]*noindex/);
    assert.match(html, new RegExp(modulo.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")));
    assert.match(html, /<noscript>/);
  });
}

/* ------------------------------------------------------------------ */
/* Contrato del dataset maestro                                        */
/* ------------------------------------------------------------------ */
test("el dataset maestro es coherente entre las tres demos", () => {
  assert.equal(data.OPERACION.id, "AR-IMP-02418");
  assert.equal(data.SUITE.marca, "Acelera Control");

  // Preflight: al menos un conflicto crítico y 5 hallazgos.
  assert.ok(data.MATRIZ.some((row) => row.veredicto === "critical"));
  assert.equal(data.HALLAZGOS_PREFLIGHT.length, 5);
  assert.ok(data.HALLAZGOS_PREFLIGHT.every((h) => h.evidencia && h.accion && h.anuncio));

  // Margin: la base + suma de costos reales debe cerrar con el costo real declarado.
  const sumaReal = data.COSTOS_MARGIN.reduce((s, c) => s + c.real, 0);
  assert.equal(data.MARGEN_BASE_COSTO + sumaReal, data.MARGEN_RESUMEN.costoReal);
  const totalDesvio = data.MARGEN_DESVIO.detalle.reduce((s, d) => s + d.monto, 0);
  assert.equal(totalDesvio, data.MARGEN_DESVIO.totalRevisable);

  // Free-time: el contenedor protagonista aparece en el tablero como crítico.
  assert.ok(data.TABLERO.some((c) => c.id === data.CONTENEDOR.id && c.status === "critical"));

  // Cartera: la operación protagonista está y las 3 demos comparten el id.
  assert.ok(data.CARTERA.some((op) => op.id === data.OPERACION.id));
});

/* ------------------------------------------------------------------ */
/* Rutas responden 200                                                 */
/* ------------------------------------------------------------------ */
test("las cuatro rutas logísticas responden 200", { timeout: 15_000 }, async () => {
  await withServer(async (port) => {
    for (const route of ["/logistica", "/logistica/preflight", "/logistica/margin", "/logistica/freetime"]) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`);
      assert.equal(response.status, 200, `Ruta ${route} debería responder 200`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Comportamiento renderizado (Playwright)                             */
/* ------------------------------------------------------------------ */
test("Preflight: abre evidencia de un hallazgo y prepara/aprueba el borrador", { timeout: 25_000 }, async () => {
  await withServer(async (port) => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/logistica/preflight`);

      await assert.doesNotReject(() => page.locator(".app-bar__suite", { hasText: "Acelera Control" }).waitFor());
      await assert.doesNotReject(() => page.locator(".app-bar__context", { hasText: "AR-IMP-02418" }).waitFor());
      await assert.doesNotReject(() => page.locator(".app-foot", { hasText: "punto de partida" }).waitFor());

      // Pipeline: procesar documentos → chips extraídos → cruzar documentos
      await page.locator("[data-process]").click();
      await assert.doesNotReject(() => page.locator("[data-goto-cruce]").waitFor({ state: "visible", timeout: 15_000 }));
      assert.ok((await page.locator(".chip").count()) > 10, "la extracción debe mostrar chips de campos por documento");
      await page.locator("[data-goto-cruce]").click();
      await assert.doesNotReject(() => page.locator("table.matrix").waitFor());

      // Abrir evidencia del hallazgo crítico de peso
      await page.locator('[data-hallazgo="peso"]').click();
      await assert.doesNotReject(() => page.locator(".evidence.is-open").waitFor());
      assert.match(await page.locator(".evidence__hit").textContent(), /7\.280/);

      // Preparar y aprobar el borrador
      await page.locator("[data-make-draft]").click();
      await assert.doesNotReject(() => page.locator("[data-draft]").waitFor({ state: "visible" }));
      await page.locator("[data-approve]").click();
      await assert.doesNotReject(() => page.locator(".draft.is-approved").waitFor());
    } finally {
      await browser.close();
    }
  });
});

test("Margin Guard: recalcula el margen al desactivar un costo", { timeout: 25_000 }, async () => {
  await withServer(async (port) => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/logistica/margin`);
      await page.locator('.side-nav button[data-view="1"]').click();

      const value = page.locator("[data-recalc] .value");
      await assert.doesNotReject(() => value.waitFor());
      // Esperar a que termine la animación de conciliación de entrada.
      await assert.doesNotReject(() => page.locator("[data-recalc] .delta", { hasText: "desvío" }).waitFor({ timeout: 10_000 }));
      const before = (await value.textContent()).trim();

      // El input del toggle está oculto por diseño; clic en el track visible.
      await page.locator('label.toggle:has(input[data-cost-id="storage"]) .toggle__track').click();
      assert.equal(await page.locator('input[data-cost-id="storage"]').isChecked(), false);
      const after = (await value.textContent()).trim();
      assert.notEqual(before, after, "El margen recalculado debe cambiar al desactivar un costo");
    } finally {
      await browser.close();
    }
  });
});

test("Free-Time Guard: resolver el contenedor lleva la exposición a cero", { timeout: 25_000 }, async () => {
  await withServer(async (port) => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/logistica/freetime`);

      await page.locator('.side-nav button[data-view="1"]').click();
      await assert.doesNotReject(() => page.locator("[data-resolve]").waitFor());
      await page.locator("[data-resolve]").click();

      assert.equal(await page.locator("[data-resolve]").isDisabled(), true);
      await assert.doesNotReject(() => page.locator('[data-exposure]').getByText("USD 0").waitFor());
    } finally {
      await browser.close();
    }
  });
});
