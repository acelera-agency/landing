# Task 2 — Verificación de ruta y experiencia

## Cambio realizado

- Se agregó una prueba HTTP mínima a `logistica.test.mjs`.
- La prueba inicia `node scripts/dev-server.mjs` con `PORT=4181`, espera el mensaje `disponible`, consulta `http://127.0.0.1:4181/logistica` y exige HTTP 200.
- El proceso hijo se detiene desde `finally`; si el puerto está ocupado o el servidor termina antes de anunciarse, la prueba falla con su salida de diagnóstico y no deja el proceso de prueba activo.

## Verificación automatizada

Ejecutado correctamente el 2026-07-23:

```text
npm run test:logistica  # 2/2 pruebas aprobadas
npm test                # 31/31 pruebas aprobadas
git diff --check        # sin errores
```

## Verificación de experiencia

Se inició temporalmente el servidor en el puerto 4181 y se confirmó que el listener se liberó al finalizar.

- `Cruce`: el hallazgo "Ver dato en conflicto" muestra "Dato en conflicto".
- `Margen`: la escena muestra el cálculo "Margen estimado" con sus costos ficticios.
- `Límite`: "Confirmar ampliación con responsable" cambia el estado a "Resuelto" y deshabilita la acción.
- Revisión visual realizada en 1440 px y 390 px sin defectos bloqueantes observados.

Evidencia local:

- `output/playwright/task-2-logistica-desktop.png`
- `output/playwright/task-2-logistica-desktop-resolved.png`
- `output/playwright/task-2-logistica-mobile.png`

## Alcance y preocupaciones

- `logistica.html` no fue modificado.
- No se detectaron preocupaciones bloqueantes.

## Corrección de revisión

- El puerto fijo fue reemplazado por una reserva temporal de un puerto efímero en `127.0.0.1`; la prueba pasa ese puerto al servidor y a `fetch`.
- La espera de inicio ahora libera los listeners de `stdout`, `stderr`, `error` y `exit` al resolver o rechazar, evitando listeners residuales.
- El apagado espera como máximo 1 segundo tras `SIGTERM` y, si es necesario, otro segundo tras `SIGKILL`; si el hijo no termina, falla en vez de quedar esperando indefinidamente.

### Salida exacta de pruebas (2026-07-23)

```text
> landing-acelera@1.0.0 test:logistica
> node --test logistica.test.mjs

TAP version 13
# Subtest: la demo logística conserva el contrato de contenido, accesibilidad y movimiento
ok 1 - la demo logística conserva el contrato de contenido, accesibilidad y movimiento
  ---
  duration_ms: 2.4243
  ...
# Subtest: la ruta logística responde por HTTP desde el servidor de desarrollo
ok 2 - la ruta logística responde por HTTP desde el servidor de desarrollo
  ---
  duration_ms: 81.7127
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 130.9213

> landing-acelera@1.0.0 test
> node --test

TAP version 13
# Subtest: sends a lead notification through Resend
ok 1 - sends a lead notification through Resend
  ---
  duration_ms: 1.9851
  ...
# Subtest: rejects invalid lead payloads before calling Resend
ok 2 - rejects invalid lead payloads before calling Resend
  ---
  duration_ms: 0.2334
  ...
# Subtest: requires an explicit privacy consent
ok 3 - requires an explicit privacy consent
  ---
  duration_ms: 0.21
  ...
# Subtest: mutable assets are revalidated instead of cached as immutable
ok 4 - mutable assets are revalidated instead of cached as immutable
  ---
  duration_ms: 2.6731
  ...
# Subtest: critical CSS and JavaScript assets use a release cache key
ok 5 - critical CSS and JavaScript assets use a release cache key
  ---
  duration_ms: 1.0781
  ...
# Subtest: legal pages invalidate their shared stylesheet
ok 6 - legal pages invalidate their shared stylesheet
  ---
  duration_ms: 1.1189
  ...
# Subtest: the public forms use the managed lead gateway
ok 7 - the public forms use the managed lead gateway
  ---
  duration_ms: 1.3144
  ...
# Subtest: la demo logística conserva el contrato de contenido, accesibilidad y movimiento
ok 8 - la demo logística conserva el contrato de contenido, accesibilidad y movimiento
  ---
  duration_ms: 3.5194
  ...
# Subtest: la ruta logística responde por HTTP desde el servidor de desarrollo
ok 9 - la ruta logística responde por HTTP desde el servidor de desarrollo
  ---
  duration_ms: 80.1778
  ...
# Subtest: features four Acelera projects with equal card treatment
ok 10 - features four Acelera projects with equal card treatment
  ---
  duration_ms: 1.1031
  ...
# Subtest: renders project cases in an accessible carousel
ok 11 - renders project cases in an accessible carousel
  ---
  duration_ms: 0.2189
  ...
# Subtest: shows one project on mobile, two on desktop and supports manual navigation
ok 12 - shows one project on mobile, two on desktop and supports manual navigation
  ---
  duration_ms: 0.4337
  ...
# Subtest: lands on the project overview and cards when navigating to the projects section
ok 13 - lands on the project overview and cards when navigating to the projects section
  ---
  duration_ms: 0.4365
  ...
# Subtest: keeps project cards under the Acelera brand without personal credits
ok 14 - keeps project cards under the Acelera brand without personal credits
  ---
  duration_ms: 0.246
  ...
# Subtest: links every public project to a real destination
ok 15 - links every public project to a real destination
  ---
  duration_ms: 0.3036
  ...
# Subtest: keeps a poster layer visible until every project video is ready
ok 16 - keeps a poster layer visible until every project video is ready
  ---
  duration_ms: 0.8721
  ...
# Subtest: maps all capability pills to one of the four featured cases
ok 17 - maps all capability pills to one of the four featured cases
  ---
  duration_ms: 0.5373
  ...
# Subtest: renders the capability case as a static image with only its project title
ok 18 - renders the capability case as a static image with only its project title
  ---
  duration_ms: 0.2555
  ...
# Subtest: controls project playback by viewport, motion preference and data saver
ok 19 - controls project playback by viewport, motion preference and data saver
  ---
  duration_ms: 0.364
  ...
# Subtest: ships a reusable, side-effect-safe demo capture pipeline
ok 20 - ships a reusable, side-effect-safe demo capture pipeline
  ---
  duration_ms: 4.0912
  ...
# Subtest: captures each product from a deliberate wider viewport
ok 21 - captures each product from a deliberate wider viewport
  ---
  duration_ms: 0.6667
  ...
# Subtest: starts each capture from real product content and derives a matching poster
ok 22 - starts each capture from real product content and derives a matching poster
  ---
  duration_ms: 0.8348
  ...
# Subtest: records every project as a closed loop with a blended seam
ok 23 - records every project as a closed loop with a blended seam
  ---
  duration_ms: 0.7438
  ...
# Subtest: masks private network details in the Lemon demo
ok 24 - masks private network details in the Lemon demo
  ---
  duration_ms: 0.5087
  ...
# Subtest: provides English copy for the four-project story
ok 25 - provides English copy for the four-project story
  ---
  duration_ms: 0.154
  ...
# Subtest: translates each project's case-specific capability copy
ok 26 - translates each project's case-specific capability copy
  ---
  duration_ms: 0.0658
  ...
# Subtest: publishes crawl controls and only canonical indexable URLs
ok 27 - publishes crawl controls and only canonical indexable URLs
  ---
  duration_ms: 3.3559
  ...
# Subtest: keeps canonical metadata aligned with the final www host
ok 28 - keeps canonical metadata aligned with the final www host
  ---
  duration_ms: 1.6179
  ...
# Subtest: exposes valid WebSite and Organization JSON-LD without changing page copy
ok 29 - exposes valid WebSite and Organization JSON-LD without changing page copy
  ---
  duration_ms: 1.3544
  ...
# Subtest: keeps non-public previews out of Vercel deployments
ok 30 - keeps non-public previews out of Vercel deployments
  ---
  duration_ms: 0.6195
  ...
# Subtest: does not defer the largest hero heading behind an entrance animation
ok 31 - does not defer the largest hero heading behind an entrance animation
  ---
  duration_ms: 1.735
  ...
1..31
# tests 31
# suites 0
# pass 31
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 153.8273
```
