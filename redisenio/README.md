# Rediseño de Acelera

Vista local: **http://127.0.0.1:4173/** (`npm run dev`). La raíz usa ahora el rediseño; `/redisenio/` conserva una copia no indexable para revisión. Las versiones previas se documentan abajo como historial.

## Publicación — revisión 18, 10 de octubre de 2026

- Se eliminó el selector «Sin IA / Con IA». La ilustración conserva un único recorrido animado.
- `scripts/promote-redisenio.mjs` publica la portada y las siete páginas internas, remapea navegación y conserva metadatos, canónicos, privacidad y consentimiento. Los textos originales de las páginas internas se mantienen. La versión anterior de la portada y las fuentes de esas páginas están en `docs/archive/pre-redesign/`.
- Regeneración: `node scripts/build-redisenio-pages.mjs` y después `node scripts/promote-redisenio.mjs`. El generador de Anatomy y su integrador siguen siendo opcionales cuando cambia la figura.
- El sitio se publica por Git desde `main` en `acelera-agency/landing`, en los proyectos existentes del dominio. No vincular este checkout al proyecto `ai-acelera-agency`, que corresponde a otro subdominio.
- La agenda tiene un servidor dedicado `acelera-schedule-api`, proyecto `prj_oxih2MPrmLeU9rnX2begcKHzeEYh` del equipo `mprotocassina15-gmailcoms-projects`. Su endpoint público es `https://acelera-schedule-api.vercel.app/api/schedule`. `vercel.json` lo integra mediante una reescritura de `/api/schedule`. El gateway de leads existente sigue funcionando por separado.
- El servidor de agenda contiene sólo `api/schedule.js` y `lib/scheduling/`, Node 22, región `gru1` y límite de 30 segundos. Sus variables de Google Calendar se almacenan como variables cifradas de producción; no se incluyen en Git ni en la web. Los orígenes de reserva son `https://acelera.agency` y `https://www.acelera.agency`.
- `.vercelignore` excluye credenciales, temporales, pruebas, fuentes del servidor dedicado, documentación y capturas. La agenda nativa oculta sus campos a la captura automática de analítica.
- Comprobación local: 67 pruebas aprobadas. Se actualizaron las pruebas del diseño eliminado y se conservaron sus versiones en el archivo; los contratos de API, privacidad, SEO y captura de demos se mantienen activos.
- Comprobación del servidor desplegado: disponibilidad real, 240 horarios. Las escrituras se verifican con proveedor simulado; no se realizó una reserva real ni se enviaron invitaciones de prueba.

## Revisión 17 — software conectado, 10 de octubre de 2026

“Elegida con criterio” ahora muestra una estación de trabajo con una aplicación en pantalla. El flujo conecta datos, reglas propias y un resultado visible; el selector «Con IA» incorpora una rama naranja opcional. Reemplaza la mordaza industrial de la revisión 3 a pedido del usuario. La copia del resto de la sección permanece igual.

Se mantuvo el estilo isométrico de Anatomy, con 65 sólidos reales, 666 trazados, teclado, mouse, biseles y detalles de superficie. La geometría es estática; la señal recorre las rutas del SVG y las filas del resultado se actualizan desde el mismo modelo temporal. Es una ilustración conceptual, no una captura de un cliente ni una medición de rendimiento. Concepto y partes: [`anatomy/CONCEPT.md`](anatomy/CONCEPT.md).

Los botones funcionan con puntero, teclado y toque. La demostración conserva el modo elegido; se detiene fuera de pantalla, con la pestaña oculta y con movimiento reducido. En este último caso muestra el resultado completo sin señal animada. La pausa es local a la figura; el carrusel de marcas sigue siendo automático. El SVG estático también conserva el recorrido directo sin JavaScript.

### Comprobaciones de la revisión 17

- `node scripts/build-anatomy-figure.mjs --audit`: cero problemas geométricos para los 65 sólidos; XML válido y sin scripts ni recursos externos en el SVG. Reconstrucción mediante el integrador documentado abajo.
- `npm test`: **78/78**, incluyendo cinco pruebas del modelo de movimiento, continuidad, orden de fases, límites y estado estático. Las escrituras de agenda siguen simuladas en las pruebas; esta revisión no creó reservas.
- Chrome mediante CUA a 1200, 768, 390 y 320 px: ilustración completa, controles sin superposición y sin desbordamiento horizontal. Modos, activación por teclado, pausa/reanudación, detención fuera de pantalla y movimiento reducido comprobados en navegador. La pausa por pestaña oculta está implementada y revisada en código, sin prueba independiente de esa transición.
- Checker de extremos de Anatomy adaptado a solo lectura: 73 líneas y 18 extremos, cero problemas en ambos modos. Ignora conservadoramente 34/37 rellenos recortados como oclusores; no supone que cubren trazos. Se ejecutó por CUA/CDP para disponer de las matrices SVG nativas.
- Inspección a 1× y 4×; se corrigió una transparencia que dejaba ver las rutas a través de los paneles. Se inspeccionó también la paleta oscura del dibujo como control de geometría, sin incorporarla al diseño de la página. Son viewports emulados; no dispositivos físicos ni Safari.
- Evidencia: `../output/redisenio-framer/v17-software-proposal.png`, `v17-software-mobile.png`, `v17-software-tablet.png` y `v17-software-detail-4x.png`. La figura anterior y su generador se conservan en `../tmp/redisenio-v17/`.

## Hablemos y agenda — revisión 15, 10 de octubre de 2026

- “Hablemos” conserva el tamaño pequeño `clamp(28px, 3vw, 36px)` y el ancho de 780 px.
- Se reemplazó el iframe por una agenda nativa, adaptada del componente de [Atrae](https://atrae.app/landing#agenda). En escritorio mide **780 × 400 px**, con horarios a la izquierda y mes a la derecha, proporción de columnas `1 / 1.18`, borde de 2 px y radio de 22 px. En tablet conserva ambas columnas; hasta 600 px pasa a calendario seguido de horarios. El formulario tiene altura automática. No se escala ni se recorta una página de Google.
- `scheduler.js` y `scheduler.css` cargan únicamente en la portada. La disponibilidad se consulta al acercarse a la sección. Las fechas se presentan en la zona horaria del visitante; la API trabaja con instantes UTC. Hay navegación por teclado, selección de fecha/horario, formulario, confirmación, reintento y alternativa a la agenda pública si falla la conexión.
- `/api/schedule` consulta Google Calendar y vuelve a comprobar disponibilidad antes de crear un evento de Acelera, solicitar Meet e invitar al correo ingresado. El servidor conserva las credenciales; nunca se incluyen en HTML, JS de navegador ni respuestas. `lib/scheduling/` contiene la integración. `.env.example` documenta las variables; `.env.local` está ignorado y el servidor local bloquea archivos ocultos y fuentes privadas.
- La conexión local usa la integración de calendario existente del equipo. Se verificaron OAuth, permiso de escritura, soporte de Meet y disponibilidad real (240 horarios en la consulta del 10 de octubre). **No se creó ningún evento real ni se enviaron invitaciones de prueba.**
- CSRF con orígenes permitidos explícitos, límite de cuerpo, honeypot, cuotas por proceso y timeout. Los reintentos usan el mismo identificador; la API reconcilia respuestas inciertas y errores 409 sin insertar un segundo ID. Un mutex evita conflictos dentro del proceso local. Los IDs asociados a eventos cancelados o movidos no se vuelven a ofrecer.
- Las revisiones 8–14 usaban el iframe de Google Calendar. Fueron reemplazadas por esta implementación; las capturas `v8-*` a `v14-*` son evidencia histórica, no la interfaz actual. El enlace permanente a la [agenda pública](https://calendar.app.google/Ci3pYTwmLT6q3LMQ8) se conserva como alternativa.

### Comprobaciones de la revisión 15

- `npm test`: **73/73**, incluyendo 22 pruebas nuevas de disponibilidad, validación, conflictos, errores, transporte Google y reintentos. El proveedor está simulado en las pruebas de escritura.
- Navegador real mediante CUA: 1200, 768, 648, 601, 600, 390 y 320 px, sin desbordamiento horizontal. Dimensiones observadas: 780 × 400 px en escritorio, 686 × 400 px en tablet y 566 × 400 px en el panel de vista previa a 648 px. La vista apilada se limita a 420 px de ancho para no agrandar innecesariamente el mes. En móvil el contenido y el formulario crecen sin recortes. Son viewports emulados, no dispositivos físicos.
- Prueba de UI aislada en el puerto 4174: fecha y turno → formulario → confirmación; doble clic produjo una sola petición; dos reintentos tras error conservaron el mismo `requestId`; un 409 volvió a disponibilidad mostrando el aviso; los datos del formulario se conservaron al cambiar el turno. Todos los POST de esa prueba fueron simulados y no llegaron a Google.
- Evidencia en `../output/redisenio-framer/v15-*`: escritorio, tablet, móvil y confirmación simulada. La lectura real de disponibilidad se verificó aparte contra el servidor del puerto 4173.

### Configuración histórica de la revisión 15

La revisión 15 era una propuesta local. La revisión 18 configura y publica el servidor de agenda descrito arriba. `.env.example` documenta sus variables. No subir `.env.local`.

Las cuotas y el mutex actuales son por proceso. El ID de Google y la reconciliación de 409 **no son un bloqueo distribuido absoluto**; para desplegar múltiples instancias con exclusión global, incorporar una reserva atómica compartida y cuotas compartidas. La comprobación de disponibilidad tampoco es una transacción con reservas que ingresen simultáneamente por otros canales. Google documenta la limitación de colisiones de IDs en [Events.insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert). No se afirma que la prueba local verifique esas condiciones de producción.

## Textura del footer — 10 de octubre de 2026

La mano recupera los bloques grandes y la trama irregular de la referencia de Framer. Usa el mismo recurso original, muestreado a 50 columnas sobre el recorte, con tres densidades dibujadas directamente en canvas y un brillo suave. El tratamiento se activa solo en el footer de las ocho páginas; la mano del hero conserva su ASCII fino. Se mantiene el naranja localizado bajo el puntero.

El hover ahora comparte el radio del hero, además de su color, gradiente y transición. El footer colorea solo la textura, sin teñir el brillo de fondo. A 1200 px ambas manos usan un radio de 100,8 px; la medida responde al ancho de pantalla y las páginas internas reproducen la proporción del hero. Evidencia: `v9-hover-hero.png` y `v9-hover-footer.png`.

La revisión 10 agrega movimiento continuo a la trama del footer, observado en Framer: pequeñas variaciones de densidad por bloque, sin desplazar la silueta. Un temporizador de 125 ms reutiliza los canvases y patrones y actualiza juntas las versiones gris y naranja. Se detiene fuera de pantalla, con la pestaña oculta y con `prefers-reduced-motion`; al volver continúa sin recuperar cuadros perdidos. El hero permanece estático. `data-animating` y `data-texture-frame` permiten comprobar la pausa sin instrumentar la página.

Verificación de la revisión 10: los píxeles del canvas y el contador cambian con el footer visible, se mantienen idénticos fuera de pantalla y con movimiento reducido, y vuelven a cambiar al reactivarlo. A 390 px no hay desbordamiento horizontal. Sintaxis de `site.js` aprobada; las ocho páginas incluyen el atributo de movimiento solo en el footer. `../output/redisenio-framer/v10-footer-glitch.webp` muestra una captura animada real del navegador; `v10-live-frames.json` conserva los tiempos y estados observados. La pausa por pestaña oculta se revisó en código, sin prueba independiente de esa transición.

Revisado visualmente en Chrome a 1200, 810 y 390 px, sin desbordamiento horizontal; hover localizado y sintaxis de JavaScript comprobados. Capturas `v6-footer-pixel-*` y referencia `v6-framer-footer-reference.png` en `../output/redisenio-framer/`. Esta comprobación usa viewports emulados, no dispositivos físicos.

## Ajuste del footer — 10 de octubre de 2026

La franja inferior separada se eliminó en las ocho páginas. Copyright, enlaces legales, preferencias de analítica y volver al inicio ahora se integran debajo de las redes en la columna de Acelera. Se conserva el año automático y el botón de preferencias abre el diálogo existente. Revisión visual en escritorio y móvil, sin desbordamiento horizontal.

La línea superior del footer se extiende de borde a borde de la pantalla. El marco interior conserva los anchos y la alineación de la página en cada breakpoint. Captura: `../output/redisenio-framer/v7-footer-full-width.png`.

## Revisión 16 — separación óptica de logos

Cada marca ocupa el ancho de su dibujo visible, en lugar de una caja común de 140/125 px. Se mantiene la escala anterior de los logos y se elimina el espacio que añadía `object-fit` al encajarlos en rectángulos desproporcionados, especialmente Rely. Se compensan también los márgenes internos de Cloudflare y, a menor escala, Anthropic, AWS y Lemon; los archivos originales permanecen intactos.

La distancia visible es de 80 px en escritorio/tablet y 52 px en móvil, también entre el final y el inicio del ciclo. Los dos grupos mantienen igual ancho, por lo que el loop conserva su continuidad. Con movimiento reducido se muestran las diez marcas en filas estáticas con separación uniforme, sin estirar sus contenedores.

Comprobación en navegador a 1440, 768 y 390 px: separación constante y sin desbordamiento horizontal. A 320 px con movimiento reducido se ven las diez marcas en cinco filas, sin desbordamiento. CSS validado con PostCSS. Captura: `../output/redisenio-framer/v16-logos-spacing-desktop.png`.

## Revisión 12 — carrusel automático

La banda de marcas funciona como una franja expositiva: sin botón de pausa, enlaces, desplazamiento horizontal ni arrastre. El puntero y el foco no detienen su recorrido. Cada marca conserva su nombre y relación con el equipo en una etiqueta accesible. Se mantiene la pausa automática fuera de pantalla y con la pestaña oculta; con movimiento reducido las diez marcas aparecen en una grilla estática completa. Esta revisión reemplaza los controles y la navegación del carrusel documentados en la revisión 4.

## Revisión 4 — retratos, marcas e interacción, 10 de octubre de 2026

- Se mantienen los textos de servicios, proceso, equipo y roles, preguntas frecuentes, contacto y los cinco proyectos anteriores. La comparación de texto DOM contra `tmp/redisenio-v4/index-before.html` confirma que esas secciones no cambiaron. Las excepciones son la eliminación solicitada del texto secundario de experiencia y la incorporación de **Atrae** como sexto proyecto.
- La banda de experiencia usa marcas originales y movimiento pausado al pasar el puntero, al enfocar un control o mediante el botón de pausa. Las relaciones se explican en las etiquetas accesibles; no se presenta a todas las marcas como clientes. Procedencia de las marcas en [`assets/brands/README.md`](assets/brands/README.md).
- Los retratos usan las fotos ampliadas de LinkedIn, con versiones WebP de 640 y 320 px y `srcset`. Se conserva su encuadre; no se generaron ni retocaron rostros. Fuentes y experiencia verificada en [`assets/team/PROVENANCE.md`](assets/team/PROVENANCE.md).
- Los hovers de servicios y proyectos cambian acentos y flechas sin desplazar toda la tarjeta. Las manos usan una textura ASCII estática y un acento naranja localizado bajo el puntero, compuesto con imágenes de canvas previamente dibujadas.
- El footer recupera una composición con la mano central, marca a la izquierda y navegación a la derecha; en móvil se apilan sus partes. La figura Anatomy mantiene un tamaño útil antes de reorganizar las tarjetas de tecnología.
- El grupo repetido de marcas conserva `aria-hidden` y enlaces fuera de la secuencia Tab, pero sigue siendo clickeable con el puntero. Al navegar los originales con teclado se detiene la animación, se permite desplazamiento horizontal y se restablece la posición al salir para evitar huecos en el ciclo.

### Verificación de la revisión 4

- En Chrome mediante CUA, Tab recorrió los diez logos originales y luego el primer servicio. Cada logo quedó completamente dentro de la ventana del carrusel, sin transformación; al salir se reanudó la animación.
- Viewports de 320, 390, 600, 768, 810, 1024 y 1440 px sin desbordamiento horizontal. Inspección visual de escritorio, tablet de 810 px, móvil de 390 px y equipo a 600 px.
- Hovers de retratos y color localizado de ambas manos comprobados. Demo Harness: apertura, cierre con Escape y video pausado al cerrar.
- `npm test`: 51/51 pruebas existentes aprobadas; cubren regresiones del sitio original, no prueban por sí solas todas las funciones de la propuesta. Sintaxis de tres módulos de JavaScript revisada sin errores.
- SEO/GEO técnico: ocho páginas con un H1, rutas y fragmentos válidos, metadatos sociales y JSON-LD vinculados al contenido visible. El generador conserva los datos estructurados originales de las secundarias; la portada incorpora los seis proyectos. `noindex` sigue activo durante la revisión.
- Rendimiento local en Chrome, 390 × 844, CPU 4×, caché desactivada y red de 150 ms / 200.000 bytes/s: tres cargas finales con LCP de 1,796–1,860 s, CLS de 0,000319 y sin errores observados. La mano humana ahora usa WebP responsive: el candidato elegido pesó 15.686 bytes frente a 187.465 bytes del PNG; los subrecursos iniciales transfirieron 25,8% menos. El LCP mediano fue similar (1,872 → 1,840 s); no se presenta esa pequeña variación como una mejora significativa.
- Recorrido bajo CPU 4×: cinco interacciones observadas, máximo de 240 ms (no es INP de campo), CLS estable y sin errores observados. En 15,314 s de reposo no aumentaron los contadores de JavaScript ni layout; esto no equivale a CPU cero ni mide toda la actividad del compositor.

La comparación de copia, revisión de CSS, corrección del carrusel y evidencia CUA se documentan en [`../output/redisenio-framer/revision-copy-interacciones-v4.md`](../output/redisenio-framer/revision-copy-interacciones-v4.md). Los resultados técnicos y las mediciones están en [`../output/redisenio-framer/auditoria-tecnica-v4.md`](../output/redisenio-framer/auditoria-tecnica-v4.md). La evidencia visual de esta revisión lleva el prefijo `v4-`. Las verificaciones mediante viewports de Chrome son emulación de tamaños y entradas; **no constituyen pruebas en dispositivos físicos ni en Safari**. Las mediciones locales no son Lighthouse, CrUX ni INP de campo y no representan el TTFB/compresión de producción; los límites del sondeo están en [`../output/redisenio-framer/performance-probe.md`](../output/redisenio-framer/performance-probe.md).

## Revisión 3 — figura Anatomy anterior, 10 de octubre de 2026

Esta figura fue reemplazada por “Software conectado” en la revisión 17. En la revisión 3, la sección **“Elegida con criterio”** reemplazó la imagen de módulos de vidrio por **“Ajuste a medida”**, una figura SVG interactiva construida con la [skill Anatomy](https://skills.wheresryan.sh/anatomy), solicitada por el usuario.

Una mordaza naranja se desplaza sobre dos guías de un banco de precisión. Su apertura representa la adaptación de una solución al alcance de un proyecto. La lectura de 48 a 96 mm proviene del mismo modelo que mueve las piezas; son medidas del instrumento ilustrado, no métricas de rendimiento ni resultados comerciales. El concepto anterior, las partes y los límites se conservan en `../tmp/redisenio-v17/anatomy/CONCEPT.md`.

- Geometría propia de 61 sólidos y 554 trazados SVG, con volumen, biseles, tornillos, patines, escala y pomo moleteado. Dos grupos móviles sincronizados mantienen el orden correcto delante y detrás de las guías.
- Controles de puntero, arrastre y teclado; lectura de apertura, pausa de la demostración y descripción accesible. El runtime contempla movimiento reducido y detención fuera de pantalla.
- SVG incluido en la portada; `anatomy/figure.css`, `anatomy/model.js` y `anatomy/live.js` están separados del código original de la landing. La figura no requiere WebGL ni imágenes rasterizadas.
- Biblioteca de construcción y auditoría Anatomy de Ryan, licencia MIT, conservada con su licencia y procedencia en [`../scripts/vendor/anatomy/`](../scripts/vendor/anatomy/README.md). Estos módulos se usan durante la construcción, no se cargan en el navegador.
- `assets/technology-system.png` y su prompt quedan archivados como la propuesta de la revisión 2; ya no se utilizan en la portada ni en las páginas internas.

### Reconstrucción

```sh
node scripts/build-anatomy-figure.mjs --audit
node scripts/integrate-anatomy-figure.mjs
```

El primer comando genera `anatomy/figure.svg`, `anatomy/geometry.json` y el informe `anatomy/audit.txt`; la auditoría falla si detecta problemas. El segundo sustituye únicamente el bloque delimitado de la figura en `redisenio/index.html` y agrega sus dependencias una sola vez. Para reconstruir las siete páginas secundarias sigue disponible `node scripts/build-redisenio-pages.mjs`.

### Verificación de la revisión 3

- El informe de geometría registra cero problemas para las 61 formas reales y 13 poses entre los extremos del recorrido. Contrasta el orden de profundidad con el orden de los grupos emitidos. Es una comprobación geométrica muestreada; no sustituye la inspección visual y la interacción en navegador.
- `npm test`: 51/51 pruebas existentes aprobadas después de integrar la figura. Estas pruebas cubren regresiones existentes del sitio, no prueban por sí solas la nueva interacción.
- `node --check`: aprobados los dos módulos de navegador, los dos generadores y los cuatro módulos locales de Anatomy.
- Revisión estática de los ocho HTML de la propuesta: sin identificadores ni cargas de CSS/JavaScript duplicados. La portada contiene una figura, una referencia a su CSS y una referencia a su runtime; las páginas internas no cargan Anatomy.
- En Chrome controlado mediante CUA: hover de 48 a 95,1 mm, primer toque hasta 96 mm y arrastre táctil de 48 a 96 mm, con asentamiento correcto. Teclado: Inicio a 48, Escape a 64 y Fin a 96 mm; Shift + flecha suma 10 mm y flecha izquierda resta 2 mm.
- Movimiento reducido: ajuste manual inmediato y botón de animación deshabilitado; la pausa elegida por el usuario se conserva al alternar la preferencia. Demostración automática confirmada tras el período de inactividad.
- Comprobación de extremos de líneas en las poses de 48, 64 y 96 mm: 56 líneas, 186 extremos y cero problemas en cada pose. Se ejecutó mediante CUA la adaptación de solo lectura del checker de Anatomy; conserva las reglas de extremos, tolerancia y marcas de escala, y evalúa cobertura mediante geometría SVG y orden DOM. La adaptación y sus límites están documentados en `../tmp/anatomy-skill/line-check-readonly.md`.
- Viewports de 320, 390, 768, 810 y 1440 px: sin desbordamiento horizontal. Capturas revisadas, incluidos acercamientos 4× claros y oscuros sin defectos visibles en los puntos inspeccionados. El tema oscuro se utilizó únicamente para control visual; la propuesta conserva su tema claro. Evidencia: `v3-anatomy-*` en `../output/redisenio-framer/`.
- Consola sin errores ni advertencias durante estas verificaciones. Detención fuera de pantalla comprobada al navegar al inicio: tarjeta fuera del viewport y `data-animating="false"`. Los overrides de viewport y movimiento reducido se restauraron al terminar; la vista de entrega queda en la sección de tecnología con animación habilitada.

Estas comprobaciones usan Chrome y su emulación de viewport/entrada táctil; no constituyen pruebas en dispositivos físicos ni en Safari.

## Revisión 2 — 10 de octubre de 2026

- Tipografía **Geist**: los mismos archivos Regular, Medium y SemiBold que utiliza [A-Lign](https://www.a-lign.studio/), alojados localmente con su licencia SIL OFL. Títulos Medium 500, cuerpo Regular 400, variante `ss09` y tracking ajustado según la referencia. Tamaños e interlineado adaptados a esta composición y al español.
- Manos ASCII del hero y footer con transición a naranja `#C96A43`, brillo más definido, respuesta al puntero y movimiento reducido. Acento naranja original de la marca recuperado.
- Banda de experiencia: Lemon Box, Lain, Rely, Anthropic, AWS y Cloudflare, identificando proyectos y tecnologías sin presentarlos como clientes o empleadores del equipo. Evidencia: `docs/seo/evidence-matrix-2026-07-27.md`.
- Ilustración 3D original para tecnología en lugar de la carpeta y lupa.
- Eliminados el rótulo “El código” y el bloque adicional “Cómo trabajamos” junto al equipo. Se conserva la sección de proceso con cuatro etapas. Preguntas frecuentes pasa a “Antes de empezar”.
- Contacto simplificado a “Hablemos”, correo y agenda real de Calendly; se retira el formulario de esta propuesta. El iframe se carga al acercarse a la sección y tiene un enlace alternativo para abrir la agenda.
- Footer con servicios, navegación, redes, páginas legales, preferencias y regreso al inicio.
- Transiciones de enlaces y tarjetas, entradas discretas al hacer scroll, navegación móvil y respeto de `prefers-reduced-motion`.

## Páginas e integración

La propuesta contiene portada y siete páginas completas: software a medida, plataformas internas, agentes de IA, consultoría en IA, caso Faro, privacidad y términos. Cada ruta está bajo `/redisenio/`. El contenido de las páginas originales se conserva y se adapta visualmente con `pages.css`.

`node scripts/build-redisenio-pages.mjs` vuelve a generar las siete páginas leyendo el contenido original y la cabecera/footer de la propuesta. No escribe en los originales.

- `index.html`, `styles.css`, `site.js`: implementación independiente.
- `pages.css`: estilos específicos de páginas secundarias.
- `/assets/analytics.js` y su CSS: preferencias y consentimiento existentes. Un pequeño adaptador local mantiene el enlace de privacidad dentro de la propuesta.
- `/assets/app.js`: compatibilidad con las integraciones compartidas. No se envían leads desde la nueva portada.

### Calendario anterior — revisiones 2 a 7

Estas revisiones usaron `contacto-acelera/30min` en Calendly, que mostraba disponibilidad e interfaz en inglés. La revisión de Hablemos lo reemplaza por la agenda de Google Calendar documentada arriba. No se alteró la configuración de Calendly ni se hicieron reservas de prueba.

## Recursos y procedencia

La composición inicial se basó en el proyecto de Framer **Stack Grid (copy)**, página `/software-agency`, revisado en escritorio, tablet y teléfono. Se conserva el ancho de 1180 px, la composición de las manos, las etiquetas con cruces, las líneas punteadas y el tratamiento ASCII. La segunda revisión sustituye las tipografías de la plantilla por Geist a pedido del usuario.

La marca de Acelera proviene del sitio existente. Los retratos actuales provienen de las fotos ampliadas de los tres perfiles de LinkedIn, verificados en esta revisión; sus archivos WebP y procedencia están en [`assets/team/PROVENANCE.md`](assets/team/PROVENANCE.md). Los logos del carrusel se documentan en [`assets/brands/README.md`](assets/brands/README.md). Recursos locales de Framer:

| Archivo | Origen |
| --- | --- |
| `hand-human.png` | `https://framerusercontent.com/images/MpKWrlDz2KQ3ymuppyxexEQ4Yrs.png` |
| `graphic-c.png` — mano del hero | `https://framerusercontent.com/images/L03UNs5gQKHm2O8hVIiFW45Hz4.png` |
| `graphic-b.png` — mano del footer | `https://framerusercontent.com/images/pqpbvKiigJ9pgoJTfHCvlonvQ.png` |
| `graphic-a.png` — recurso anterior, ya sin uso | `https://framerusercontent.com/images/soyrmVUDP6ujrsoU9JioDoUW3s.png` |

El PNG de la mano humana se conserva como fuente. La portada sirve derivados WebP de 480, 960 y 1672 px mediante `srcset` y `sizes`, sin cambiar la ilustración.

**Imagen de la revisión 2, archivada:** `assets/technology-system.png`, PNG 1536 × 1024 con transparencia, creada con la herramienta integrada `image_gen`. El [prompt exacto y la procedencia](assets/technology-system.prompt.md) se conservan junto al recurso. Es una ilustración conceptual, no representa la arquitectura real de un producto. La revisión 3 la reemplaza por la figura SVG Anatomy y ya no carga este PNG.

**Fuentes:** `assets/geist-regular.woff2`, `geist-medium.woff2`, `geist-semibold.woff2` y `OFL-Geist.txt`. [Geist oficial](https://vercel.com/font). Fragment Mono se conserva para dibujar el ASCII. Las fuentes anteriores quedan archivadas, sin aplicarse al texto de esta versión.

## Verificación de la revisión 2

- Portada en Chrome a 320, 390, 768, 810, 1024, 1200 y 1440 px: sin desbordamiento horizontal del documento.
- Las siete páginas internas recorridas en navegador a 320, 810 y 1440 px: sin desbordamiento horizontal; títulos y rutas correctos.
- Hover naranja comprobado visualmente en ambas manos. Nueva imagen revisada en móvil y escritorio.
- Menú móvil y regreso desde página interna a la sección de servicios; carrusel hasta `03 — 05 / 05`; apertura de demo y cierre con Escape, video pausado al cerrar.
- Agenda visible en escritorio y 320 px; sin reservar un turno. Preferencias de analítica y enlace a privacidad de la propuesta verificados.
- 446 referencias locales e identificadores revisados; 45 URLs únicas de páginas y recursos respondieron HTTP 200. No se verificaron todos los destinos externos.
- `npm test`: 51/51 pruebas existentes aprobadas. Sintaxis de `site.js` y generador aprobada.
- Capturas `v2-*` en `../output/redisenio-framer/`; las anteriores documentan la primera versión. Las capturas completas usan movimiento reducido para fijar la imagen.

La revisión responsive corresponde a viewports de Chrome, no a dispositivos físicos ni a Safari. No se probaron reservas ni notificaciones de Calendly.
