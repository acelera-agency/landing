# Logística: demos de excepciones operativas

## Objetivo

Crear una landing independiente en `/logistica` para vender a freight forwarders una prueba de Acelera sobre operaciones históricas, sin reemplazar su TMS. La página debe demostrar tres productos complementarios que detectan excepciones entre mails, documentos, exportaciones operativas y facturas.

## Público y posicionamiento

El público principal es Operaciones, Pricing, Administración y Dirección de freight forwarders multimodales de Argentina. No se presenta como tracking, cotizador ni TMS. La promesa común es: detectar errores, pérdidas y vencimientos antes de que se conviertan en retrabajo, demoras o costos.

El CTA único ofrece una auditoría de cinco operaciones históricas sin integración. El formulario reutiliza el endpoint y el consentimiento existentes, pero identifica el origen como logística.

## Productos de la demo

### Cruce

Control documental de un embarque marítimo FCL. Usa una operación ficticia de Shanghai a Buenos Aires y muestra invoice, packing list, instrucciones, booking y draft HBL. El usuario puede seleccionar los documentos y luego cada diferencia para abrir la evidencia exacta.

Hallazgos iniciales: cantidad de bultos inconsistente, peso bruto crítico, CUIT de notify incompleto y regla de cliente pendiente. Cada hallazgo nombra fuente, severidad, responsable y acción sugerida.

### Margen

Auditoría del margen final de la misma operación. Compara la cotización con flete, terminal, handling, agente y factura al cliente. El usuario puede activar costos y abrir las diferencias, con el margen esperado y el final actualizándose de forma animada.

Hallazgos iniciales: ajuste de terminal no cotizado, diferencia de factura de agente, handling no trasladado y una revisión pendiente. Se explica el impacto económico sin simular integración contable real.

### Límite

Control de free time y devolución para una cartera pequeña de contenedores. Muestra un timeline, cuenta regresiva, bloqueos y exposición económica por día. El usuario puede seleccionar cada contenedor y marcar una acción como resuelta para ver cómo baja el riesgo.

Hallazgos iniciales: customs release pendiente, turno de retiro no solicitado, cambio de empty return depot y devolución próxima a vencer. Esta pieza se explicita como foco de importación marítima FCL.

## Estructura de la ruta

1. Hero: “Las excepciones no viven en un solo sistema.” y CTA para iniciar un caso.
2. Franja de contexto: mails, PDFs, Excel y sistema operativo en una misma operación.
3. Selector cuadrado de productos: Cruce, Margen y Límite; no usa tabs flotantes ni cards redondeadas.
4. Escena interactiva para el producto seleccionado.
5. Cierre con la propuesta de auditoría histórica y formulario existente.

La ruta será estática y autocontenida, con `logistica.html` como origen del deploy actual. No se incorporan dependencias ni servicios externos, y los datos de las demos son explícitamente ficticios.

## Dirección visual y movimiento

Se conserva el tono de Acelera: fondo papel, tinta casi negra, acento rojo existente, serif editorial para titulares, monoespaciada para metadatos, líneas de 1px, grilla y módulos rectangulares. No habrá gradients exuberantes, tarjetas con sombras pesadas ni un dashboard genérico.

La interfaz usa animaciones breves y funcionales:

- La operación se compone con líneas que conectan archivos, costo o hitos al registro central.
- Los valores y estados cambian sólo al ejecutar una interacción del usuario; no hay números ficticios incrementando en loop.
- Cada hallazgo despliega evidencia desde un borde, con foco visible y soporte de teclado.
- Los módulos respetan `prefers-reduced-motion`: se muestran sin transiciones ni autoplay.

Las interacciones tienen un estado inicial utilizable sin necesidad de scroll, mouse o JavaScript avanzado. Botones y controles usan semántica nativa y anuncian los resultados relevantes mediante regiones `aria-live` cuando corresponde.

## Datos y comportamiento

Los datos viven como constantes locales en JavaScript. Cada demo tiene un estado mínimo independiente: item seleccionado, hallazgo activo y acciones resueltas. Las operaciones se reinician al cambiar de producto y hay un control claro para recomenzar. No se persisten datos del visitante.

El formulario reutiliza la configuración de `assets/app.js`, incluye `variant=logistica` y conserva los campos de privacidad y UTM actuales.

## Archivos previstos

- `logistica.html`: markup, estilos locales y comportamiento de la landing/demos.
- `assets/app.js`: sólo si hace falta incorporar la variante de procedencia al formulario existente.
- `README.md`: agrega la ruta a la lista de páginas activas y el modo de probarla.
- Pruebas Node existentes: se amplían sólo para comprobar presencia de la ruta, títulos, CTA, formulario, controles accesibles y enlaces válidos.

## Validación

1. Ejecutar las pruebas existentes y las específicas de logística.
2. Verificar localmente el servidor y la respuesta de `/logistica`.
3. Capturar prueba visual fresca de desktop y móvil.
4. Comprobar los tres recorridos: selección de producto, apertura de evidencia/acción y reset.
5. Verificar teclado, foco y reducción de movimiento.

## Límites explícitos

No se construye OCR, lectura real de PDFs, integración de email, conexión a TMS, tracking en vivo ni cálculo financiero real. Estas demos venden el flujo y la capacidad de un piloto de auditoría; no prometen automatización de producción todavía.
