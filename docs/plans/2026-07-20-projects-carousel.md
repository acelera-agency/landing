# Projects Carousel Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convertir la grilla de proyectos en un carrusel manual escalable con dos tarjetas visibles en desktop y una en mobile.

**Architecture:** Mantener las tarjetas y medios existentes dentro de un rail horizontal nativo con CSS scroll snap. Agregar controles accesibles y una función pequeña de JavaScript que derive el paso desde el ancho visible, sincronice el indicador y deje que el `IntersectionObserver` existente controle los videos.

**Tech Stack:** HTML estático, CSS, JavaScript del navegador, Node test runner y Playwright existente. Sin dependencias nuevas.

---

### Task 1: Contrato estructural del carrusel

**Files:**
- Modify: `projects.test.mjs`
- Modify: `index.html`

1. Escribir un test que exija un viewport accesible, un rail con las cuatro tarjetas y controles anterior/siguiente con indicador.
2. Ejecutar `node --test projects.test.mjs` y confirmar que falla porque el markup aún es una grilla.
3. Agregar el markup mínimo del carrusel alrededor de las tarjetas existentes.
4. Ejecutar el test y confirmar el contrato estructural.

### Task 2: Layout responsive y navegación

**Files:**
- Modify: `projects.test.mjs`
- Modify: `index.html`

1. Escribir tests para `scroll-snap`, una tarjeta por vista mobile, dos por vista desktop, flechas y teclado.
2. Ejecutar el test y confirmar que falla por CSS/JavaScript ausentes.
3. Implementar el rail con overflow horizontal, snap, controles deshabilitados en los extremos e indicador `actual / total`.
4. Usar `scrollBy` con movimiento suave salvo cuando exista `prefers-reduced-motion`.
5. Ejecutar `node --test projects.test.mjs` hasta obtener verde.

### Task 3: Integración con videos y QA automatizado

**Files:**
- Modify: `scripts/verify-projects.mjs`

1. Actualizar el verificador para medir una tarjeta visible en 390 px y dos en 1024/1440 px.
2. Verificar flechas, teclado, indicador y que sólo se reproduzcan videos visibles.
3. Ejecutar `node scripts/verify-projects.mjs` contra `http://127.0.0.1:4173`.

### Task 4: Cierre

**Files:**
- Verify only.

1. Ejecutar `npm test`.
2. Ejecutar `git diff --check`.
3. Hacer QA visual en 1440, 1024 y 390 px, revisando overflow, foco, swipe y reduced motion.
4. Mantener los cambios locales; no crear commit, push ni merge sin autorización explícita.
