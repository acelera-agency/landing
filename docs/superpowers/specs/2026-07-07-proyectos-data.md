# Acelera — Datos de proyectos para la sección "Proyectos"

Material fuente para la sección 5 de la nueva home (ver `2026-07-07-reposicionamiento-acelera-design.md`).
Fuente: pasado por Mauro + scrapeado de https://www.mauroproto.com (con su autorización implícita — es su página).
Estado: **datos completos de los 5 reconocimientos.** Queda 1 pregunta bloqueante (ver "Pendientes").

## Inventario de reconocimientos

| # | Proyecto | Premio | Evento/Organizador |
|---|---|---|---|
| 1 | **AgentPay** | 1er puesto general | Hackathon de Anthropic + KASZEK |
| 2 | **Faro** | 1er puesto (track Transparencia y Corrupción) | Hack@LATAM |
| 3 | **Vueltito** | 1er puesto | Hackathon para ONGs de Paisanos |
| 4 | **MUSA** | Premio Especial | Hackathon global de AI Music |
| 5 | **Huella del Fuego** | Tercera mención | Contar con Datos (UdeSA + Secretaría de Innovación, Ciencia y Tecnología) |

**Resolución del "3 vs 4":** son **3 primeros puestos** (AgentPay, Faro, Vueltito) + 1 premio especial (MUSA) + 1 tercera mención (Huella del Fuego). El claim actual "3 hackathones ganados" es correcto si "ganar" = 1er puesto. Alternativas para la landing: "3 hackathones ganados" (conservador) · "4 hackathones premiados" · "5 reconocimientos en hackathons y concursos". **Decisión pendiente de Mauro.**

---

## 01 · AgentPay — 1er puesto general · Anthropic + KASZEK

**Qué es:** plugin de seguridad para Claude Code que protege pagos y transacciones entre agentes.

**El problema:** si los agentes empiezan a pagar, cobrar o contratar servicios, la seguridad tiene que estar **antes** de la acción — una orden mal interpretada puede mover plata, cambiar permisos o ejecutar algo sensible.

**Qué construyeron:** antes de ejecutar una operación, AgentPay revisa intención, permisos, límites, contexto y riesgo. Cada acción sensible tiene una razón visible y auditoría posterior. La demo mostraba el flujo completo: el agente intenta operar, AgentPay evalúa y explica por qué permite o frena.

**Lección citable:** "cuando una demo toca dinero, permisos o infraestructura, la seguridad no puede aparecer como una nota al pie."

**Qué demuestra:** dominio de lo más nuevo del ecosistema (agentes, Claude Code, seguridad) validado por Anthropic y el fondo KASZEK. Primer puesto **general**.

**⚠️ Alerta de honestidad:** el texto del portfolio dice "fue mi primer hackathon con un equipo que no conocía de antemano" → **este premio podría no ser del equipo Acelera**. Confirmar quiénes participaron antes de publicarlo como logro del equipo.

**Links:** github, video. Capturas: pendientes (el portfolio tiene sección imágenes).

---

## 02 · Faro — 1er puesto · Hack@LATAM (Transparencia y Corrupción)

**Qué es:** plataforma que cruza contrataciones de obra pública de Argentina, Chile y Perú en un mapa interactivo. Tagline: **"No acusa. Ilumina."**

**El problema:** los datos de obra pública existen pero están repartidos en portales, planillas y formatos que no conversan entre sí.

**Qué construyeron:**
- Mapa interactivo con 426 expedientes (CONTRAT.AR + mapa de inversiones): organismo, proveedor, monto, ubicación y fuente oficial de cada dato.
- Señales de revisión (no acusaciones): competencia baja, proveedor recurrente, monto sobre presupuesto, reclamos, posible alias, monto faltante. Priorización alta/media/baja.
- Expediente verificable por obra: montos USD/ARS, detalles técnicos, "qué verificar después", informe PDF, exportación, link a fuente.
- Vista satelital con línea de tiempo (2014-2026) para ver la evolución física de la obra.

**Historia:** poco tiempo, datos desordenados de 3 países, y una decisión de producto clave: Faro no declara corrupción, marca señales — "una interfaz puede ordenar una investigación o agregar ruido".

**Qué demuestra:** producto de datos completo (ingesta + cruce multi-país + mapa + scoring + informes) construido en tiempo de hackathon, con criterio en un dominio sensible.

**Capturas:** `assets/proyectos/faro-hero.png`, `faro-mapa.png`, `faro-expediente.jpg`. Links: web, presentación.

---

## 03 · Vueltito — 1er puesto · Hackathon para ONGs (Paisanos)

**Qué es:** plataforma que transforma pequeños montos de compras cotidianas en donaciones recurrentes para ONGs (redondeo, vuelto, % de transacción). Tagline: **"Dale una vueltita a tu vueltito."**

**El proceso (lo más citable):** antes de construir, salieron a preguntar — encuestas y conversaciones con **más de 30 personas de ONGs**. Insight: conseguir donantes nuevos cuesta tiempo/dinero/energía, y sostener el vínculo también; no pueden depender de campañas grandes.

**Qué demuestra:** research primero, construcción después — exactamente el proceso que Acelera vende (diagnóstico antes de construir). Para una persona el aporte es imperceptible; para la ONG, repetido, es ingreso estable.

**Capturas:** `assets/proyectos/vueltito-hero.png`, `vueltito-equipo.png` (⚠️ son 4 personas en la foto — confirmar quiénes), `vueltito-evento.png`. Links: web, presentación.

---

## 04 · MUSA — Premio Especial · AI Music Hackathon (global)

**Qué es:** experiencia de accesibilidad musical para personas sordas o con hipoacusia: letras sincronizadas + señales visuales + patrones hápticos. Taglines: **"Lyrics you can read. Rhythm you can feel."** / "Music you can read and feel."

**La idea:** una canción no es solo letra — ritmo, tensión, silencios, energía quedan encerrados en el audio. MUSA convierte parte de eso en capa visual y táctil: los hápticos marcan batería, bajo, riffs y coros.

**Stack visible:** Musixmatch (línea temporal de letras) + LALAL.AI (stems) + análisis por stems + momentos sensoriales diseñados a mano + reproductor mobile-first con **Expo**. Demo con onboarding por experiencia auditiva, calibración háptica y concepto de concierto en vivo.

**Qué demuestra:** producto mobile pulido en un dominio de nicho (accesibilidad), integración de APIs de terceros, premio en un evento **global**.

**Capturas:** `assets/proyectos/musa-hero.png`, `musa-app.png`, `musa-landing.png`. Links: demo, web, video, presentación.

---

## 05 · Huella del Fuego — Tercera mención · Contar con Datos (UdeSA + Sec. de Innovación)

**Qué es:** plataforma interactiva para explorar incendios en Argentina con datos satelitales históricos y en tiempo real: mapa, series temporales, rankings, predicciones e indicadores de impacto sobre bosque nativo.

**Historia:** limpiar/cruzar/resumir datos pesados; la parte difícil fue decidir qué mostrar primero "para que el mapa no se volviera una pantalla llena de puntos sin lectura posible".

**Qué demuestra:** trabajo serio de datos (satelitales, series, predicción) reconocido por una universidad y un organismo público. Complementa: no todo es hackathon de 48hs.

**Capturas:** pendientes. Links: plataforma, presentación, video, linkedin.

---

## Side-projects (candidatos secundarios para la sección o para "qué construimos")

Del portfolio de Mauro (confirmar cuáles son del equipo vs. personales):

- **ml canvas** — boceta pipelines de ML antes del código.
- **synthetic** — transforma PDFs en datasets auditables para entrenar modelos.
- **terminal canvas** — organiza terminales y sesiones de agentes en escritorio.
- **badger** — revisa repos web sin ejecutar código de terceros.

## Pendientes (bloqueantes para publicar)

1. **⚠️ LA PREGUNTA CLAVE: ¿quiénes participaron en cada proyecto?** El portfolio es personal de Mauro y está escrito en primera persona singular; AgentPay dice explícitamente "equipo que no conocía de antemano". Para una marca que vende honestidad, la sección Proyectos solo puede presentar como "del equipo Acelera" lo que realmente construyeron los fundadores (o aclarar la participación individual con elegancia: "construido por nuestros fundadores en...").
2. Años de cada evento.
3. Decisión del claim: "3 hackathones ganados" vs "4 premiados" vs "5 reconocimientos".
4. Qué links van públicos en la landing (webs, videos, presentaciones, github).
5. Capturas de AgentPay y Huella del Fuego (el portfolio tiene sección "imágenes").
6. Confirmar qué side-projects se muestran y cuáles son del equipo vs. personales de Mauro.
