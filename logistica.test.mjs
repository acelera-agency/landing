import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.match(html, /<button\s+type=["']button["']/);
  assert.match(html, /aria-live=/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /cinco operaciones/i);
});
