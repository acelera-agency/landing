# Marcas para la propuesta Acelera

Verificadas el 10 de octubre de 2026. Se conservan los trazados originales; los SVG no tienen scripts, recursos remotos ni controladores de eventos. Las marcas se muestran a título identificativo, sin implicar patrocinio ni afirmar que son clientes de Acelera.

La experiencia previa de Franco en Ford, HSBC y Aivo está declarada en [su portfolio](https://www.francoferreira.com/). Anthropic, AWS y Cloudflare corresponden a tecnologías utilizadas; no empleadores. Lemon corresponde al trabajo en Lemon Box. Lain, Rely y Atrae se presentan como proyectos.

| Archivo | Dimensiones / viewBox | Fuente | Preparación |
| --- | --- | --- | --- |
| `anthropic.svg` | 143 × 16 | [Origen](https://www.anthropic.com/) | Paths originales del primer fotograma del wordmark Lottie oficial, congelados en SVG. Sin fuentes, redibujo ni animación. |
| `aws.svg` | 109 × 64 | [Origen](https://aws.amazon.com/) | SVG inline del logo en la navegación oficial. Conserva relación 109:64; no usar width y height iguales. |
| `cloudflare.svg` | 719 × 59 | [Origen](https://www.cloudflare.com/) | Wordmark SVG inline oficial del footer, relleno fijo oscuro. |
| `lemon.svg` | 274 × 63 | [Origen](https://lemon.me/) | Logo oficial del header, símbolo y letras, paths originales. Lemon Box es el proyecto; la marca es Lemon. |
| `rely.png` | 380 × 218 | [Origen](https://rely.business/) | PNG oficial, recortado únicamente al área alfa. Es blanco; aplicar filter: brightness(0) en fondos claros. |
| `ford.svg` | 264.583 × 95.2273 | [Origen](https://www.francoferreira.com/) | SVG usado por Franco en su historia laboral; paths originales, colores conservados. |
| `hsbc.svg` | 315.9 × 85 | [Origen](https://www.francoferreira.com/) | SVG usado por Franco en su historia laboral; CSS de rellenos convertido a atributos, colores conservados. |
| `aivo.png` | 600 × 201 | [Origen](https://www.francoferreira.com/) | Logo histórico de Aivo usado por Franco; sólo reducción proporcional. aivo.co hoy redirige a Engageware, por eso se mantiene la marca de la experiencia original. |
| `lain.svg` | 2329.23 × 832.046 | [Origen](https://lainagent.com/) | Wordmark tipográfico Lain de su sidebar: Libre Baskerville, peso 600. Letras convertidas a paths de la fuente oficial; no se inventó símbolo. Configuración corroborada en la web y repositorio de Lain. |
| `atrae-wordmark.png` | 640 × 195 | [Origen](https://atrae.app/landing) | Wordmark vigente del repositorio propietario, sin cambios; coincide con AtraeWordmark de la landing pública. |
| `atrae-mark.png` | 128 × 128 | [Origen](https://atrae.app/landing) | Símbolo oficial azul reducido de 256 a 128 px. |
| `atrae-workspace.webp` | 1600 × 1000 | [Origen](https://atrae.app/landing) | Captura que ya se muestra públicamente en la landing Atrae, convertida a WebP 1600×1000. No es una nueva verificación funcional del producto. |

## Integración

- Mantener siempre `object-fit: contain` y las proporciones; nunca forzar logotipos a cuadrados.
- AWS requiere más altura (aprox. 34 px) que los wordmarks muy anchos de Anthropic/Cloudflare (aprox. 16–20 px).
- Rely es una marca clara sobre transparencia: `filter: brightness(0)` para su uso sobre blanco. Los demás pueden usar `grayscale(1)` en la banda monocroma.
- La banda puede mostrar solamente los logos; usar `alt` o `aria-label` para explicar la relación sin texto secundario visible.
- `manifest.json` conserva enlaces exactos, dimensiones, tamaño y hash.

## Atrae en el portfolio

Nombre: **Atrae**. Enlace: [atrae.app](https://atrae.app/landing).

Descripción factual breve sugerida: «Plataforma de prospección B2B para encontrar empresas y contactos mediante una conversación, organizar listas y gestionar el contacto desde la propia casilla».

La web pública declara búsqueda de contactos, listas y correo desde una casilla propia. Esta revisión no valida calidad de datos, disponibilidad de integraciones ni resultados comerciales. No añadir métricas de rendimiento o claims de exportación: la FAQ pública describe la descarga como una función pendiente durante la beta, aunque la imagen pública histórica incluya un botón de Excel.

## Fuente tipográfica de Lain

El sidebar actual de [Lain](https://lainagent.com/) muestra “Lain” como texto con Libre Baskerville y `font-weight: 600`. La versión de la banda congela esas letras en SVG a partir de la fuente pública Google Fonts. Se acompaña su licencia OFL en `licenses/LibreBaskerville-OFL.txt`; no se incorpora un nuevo archivo de fuente al runtime.
