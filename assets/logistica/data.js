/*
 * Acelera Control — dataset ficticio maestro para las demos de /logistica.
 *
 * TODO ES FICTICIO. No hay OCR, integración con TMS, tracking real ni cálculo
 * productivo. Una sola operación protagonista (AR-IMP-02418) alimenta las tres
 * demos desde ángulos distintos; alrededor, una cartera de 6 operaciones puebla
 * los tableros de "control de cartera".
 *
 * Ver diseño: docs/superpowers/specs/2026-07-23-logistica-showcase-v2-design.md
 */

export const SUITE = Object.freeze({
  marca: "Acelera Control",
  disclaimer: "Escena de demostración · datos ficticios",
});

/* ------------------------------------------------------------------ */
/* Operación protagonista                                              */
/* ------------------------------------------------------------------ */

export const OPERACION = Object.freeze({
  id: "AR-IMP-02418",
  cliente: "ACME Argentina S.A.",
  origen: "Shanghái",
  origenCode: "CNSHA",
  destino: "Buenos Aires",
  destinoCode: "ARBUE",
  modo: "Ocean FCL",
  equipo: "1 × 40' HC",
  contenedor: "MSCU 148213-0",
  naviera: "Pacific Star Line",
  agenteOrigen: "Grand East Logistics · Shanghái",
  incoterm: "FOB Shanghái",
  referenciaCliente: "PO-4471",
});

/* ------------------------------------------------------------------ */
/* PREFLIGHT — documentos, matriz de cruce y hallazgos                 */
/* ------------------------------------------------------------------ */

export const DOCUMENTOS = Object.freeze([
  { id: "invoice", nombre: "Commercial Invoice", archivo: "Commercial-Invoice.pdf", tipo: "PDF" },
  { id: "packing", nombre: "Packing List", archivo: "Packing-List.xlsx", tipo: "XLSX" },
  { id: "instructions", nombre: "Shipping Instructions", archivo: "Shipping-Instructions.docx", tipo: "DOCX" },
  { id: "hbl", nombre: "Draft HBL", archivo: "Draft-HBL.pdf", tipo: "PDF" },
  { id: "booking", nombre: "Booking Confirmation", archivo: "Booking-Confirmation.pdf", tipo: "PDF" },
]);

// Matriz de cruce: cada fila es un campo comparado entre documentos.
// veredicto: "ok" | "warn" | "critical"
export const MATRIZ = Object.freeze([
  {
    campo: "Bultos",
    valores: { invoice: "392", packing: "392", instructions: "390", hbl: "392" },
    conflicto: ["instructions"],
    veredicto: "warn",
  },
  {
    campo: "Peso bruto",
    valores: { invoice: "7.820 kg", packing: "7.820 kg", instructions: "7.820 kg", hbl: "7.280 kg" },
    conflicto: ["hbl"],
    veredicto: "critical",
  },
  {
    campo: "Incoterm",
    valores: { invoice: "FOB", packing: "—", instructions: "FOB", hbl: "—" },
    conflicto: [],
    veredicto: "ok",
  },
  {
    campo: "Notify tax ID",
    valores: { invoice: "—", packing: "—", instructions: "Requerido", hbl: "Vacío" },
    conflicto: ["hbl"],
    veredicto: "warn",
  },
  {
    campo: "Descripción",
    valores: { invoice: "Industrial pumps", packing: "Industrial pumps", instructions: "Pump parts", hbl: "Parts" },
    conflicto: ["instructions", "hbl"],
    veredicto: "warn",
  },
  {
    campo: "POL / POD",
    valores: { invoice: "CNSHA / ARBUE", packing: "—", instructions: "CNSHA / ARBUE", hbl: "CNSHA / ARBUE" },
    conflicto: [],
    veredicto: "ok",
  },
  {
    campo: "Contenedor",
    valores: { invoice: "—", packing: "MSCU 148213-0", instructions: "MSCU 148213-0", hbl: "MSCU 148213-0" },
    conflicto: [],
    veredicto: "ok",
  },
]);

// severidad: "critical" | "warn"
export const HALLAZGOS_PREFLIGHT = Object.freeze([
  {
    id: "peso",
    titulo: "Peso bruto en conflicto",
    severidad: "critical",
    resumen: "El draft HBL declara 7.280 kg; invoice, packing e instrucciones declaran 7.820 kg (−540 kg).",
    fuentes: ["Commercial Invoice", "Packing List", "Shipping Instructions", "Draft HBL"],
    responsable: "Documentación",
    accion: "Corregir el peso del draft HBL antes de emitir.",
    evidencia: {
      documento: "Draft HBL",
      ubicacion: "Bloque de mercadería · línea 3",
      texto: "GROSS WEIGHT: 7.280 KGS",
      contraste: "Invoice / Packing / Instructions: 7.820 KGS",
    },
    anuncio: "Peso bruto: el draft HBL difiere en 540 kilogramos respecto de las demás fuentes.",
  },
  {
    id: "bultos",
    titulo: "Cantidad de bultos en conflicto",
    severidad: "warn",
    resumen: "Las instrucciones de embarque indican 390 bultos; invoice, packing y HBL indican 392.",
    fuentes: ["Shipping Instructions", "Commercial Invoice", "Packing List", "Draft HBL"],
    responsable: "Operaciones",
    accion: "Confirmar el packing list definitivo con el cliente.",
    evidencia: {
      documento: "Shipping Instructions",
      ubicacion: "Sección Cargo · Total packages",
      texto: "TOTAL PACKAGES: 390 CTNS",
      contraste: "Invoice / Packing / HBL: 392 CTNS",
    },
    anuncio: "Bultos: las instrucciones indican 390 y el resto de las fuentes 392.",
  },
  {
    id: "notify-taxid",
    titulo: "Notify tax ID incompleto",
    severidad: "warn",
    resumen: "El CUIT del notify party está vacío en el draft HBL y es requerido por las instrucciones.",
    fuentes: ["Draft HBL", "Shipping Instructions"],
    responsable: "Operaciones",
    accion: "Completar la identificación fiscal del notify antes de emitir.",
    evidencia: {
      documento: "Draft HBL",
      ubicacion: "Notify party · Tax ID",
      texto: "NOTIFY TAX ID: (vacío)",
      contraste: "Instructions: campo requerido",
    },
    anuncio: "Notify tax ID: el draft HBL no tiene el CUIT requerido.",
  },
  {
    id: "descripcion",
    titulo: "Descripción de mercadería inconsistente",
    severidad: "warn",
    resumen: "Invoice y packing dicen «Industrial pumps»; instrucciones «Pump parts»; HBL «Parts» (demasiado genérica).",
    fuentes: ["Commercial Invoice", "Packing List", "Shipping Instructions", "Draft HBL"],
    responsable: "Documentación",
    accion: "Unificar la descripción; la del HBL es demasiado genérica para aduana.",
    evidencia: {
      documento: "Draft HBL",
      ubicacion: "Description of goods",
      texto: "DESCRIPTION: PARTS",
      contraste: "Invoice / Packing: INDUSTRIAL PUMPS",
    },
    anuncio: "Descripción: el draft HBL usa «Parts», demasiado genérica.",
  },
  {
    id: "sop-cutoff",
    titulo: "Regla del cliente: pre-alerta pendiente",
    severidad: "critical",
    resumen: "La SOP de ACME exige pre-alerta 48 h antes del arribo; vence en 6 h y aún no fue preparada.",
    fuentes: ["SOP ACME Argentina"],
    responsable: "Operaciones",
    accion: "Preparar y enviar la pre-alerta al cliente.",
    evidencia: {
      documento: "SOP ACME Argentina",
      ubicacion: "Regla 4 · Comunicación",
      texto: "Pre-alerta obligatoria 48 h antes del arribo.",
      contraste: "Estado actual: pendiente · vence en 6 h",
    },
    anuncio: "Regla del cliente: la pre-alerta obligatoria vence en 6 horas y sigue pendiente.",
  },
]);

export const PREFLIGHT_BORRADOR = Object.freeze({
  para: "Juan Pérez · ACME Argentina",
  asunto: "AR-IMP-02418 · Validación antes de emitir el HBL",
  cuerpo: [
    "Hola Juan, antes de confirmar el draft necesitamos validar dos datos:",
    "• El packing list indica 392 bultos, mientras que las instrucciones indican 390.",
    "• El peso bruto informado es 7.820 kg, pero el draft del HBL muestra 7.280 kg.",
    "También necesitamos completar el CUIT del notify party para poder emitir.",
    "Quedamos a la espera para avanzar con la emisión. Gracias.",
  ],
});

export const PREFLIGHT_KPIS = Object.freeze([
  { label: "Files listos", valor: "18", tono: "signal" },
  { label: "Esperando info del cliente", valor: "7", tono: "muted" },
  { label: "Cerca del cut-off", valor: "3", tono: "warn" },
  { label: "Diferencias críticas", valor: "2", tono: "risk" },
  { label: "Draft BL por revisar", valor: "4", tono: "muted" },
]);

/* ------------------------------------------------------------------ */
/* MARGIN GUARD — venta, costo y conciliación de conceptos             */
/* ------------------------------------------------------------------ */

export const MARGEN_RESUMEN = Object.freeze({
  ventaCotizada: 5880,
  ventaReal: 5980,
  costoCotizado: 4620,
  costoReal: 5110,
  // margen cotizado 1260 (21,4%) · real 870 (14,5%)
});

// Base de costo fija (no conciliable en la demo) para que la suma de conceptos
// conciliados + base = costoReal cuando todo está incluido.
// suma real de conceptos = 4470 → base = 5110 - 4470 = 640.
export const MARGEN_BASE_COSTO = 640;

// facturado: "incluido" | "no"
// veredicto: "ok" | "warn"
export const COSTOS_MARGIN = Object.freeze([
  { id: "ocean", concepto: "Ocean freight", esperado: 2900, real: 2900, facturado: "incluido", veredicto: "ok", nota: "Coincide con la tarifa comprada." },
  { id: "baf", concepto: "BAF (recargo combustible)", esperado: 420, real: 520, facturado: "incluido", veredicto: "warn", nota: "USD 100 por encima de la tarifa acordada con la naviera." },
  { id: "origin", concepto: "Origin handling", esperado: 280, real: 280, facturado: "incluido", veredicto: "ok", nota: "Sin diferencias." },
  { id: "storage", concepto: "Storage (depósito)", esperado: 0, real: 310, facturado: "no", veredicto: "warn", nota: "Costo real no trasladado a la factura del cliente." },
  { id: "waiting", concepto: "Truck waiting (espera)", esperado: 0, real: 180, facturado: "no", veredicto: "warn", nota: "Servicio documentado, potencialmente trasladable según acuerdo." },
  { id: "terminal", concepto: "Terminal handling", esperado: 140, real: 280, facturado: "incluido", veredicto: "warn", nota: "Posible duplicado: revisar contra la factura de terminal." },
]);

export const MARGEN_DESVIO = Object.freeze({
  totalRevisable: 730,
  detalle: [
    { concepto: "Diferencia contra tarifa (BAF)", monto: 100, tipo: "Diferencia vs proveedor" },
    { concepto: "Storage no trasladado", monto: 310, tipo: "Potencialmente trasladable" },
    { concepto: "Espera de transporte no facturada", monto: 180, tipo: "Servicio documentado" },
    { concepto: "Terminal handling", monto: 140, tipo: "Posible duplicado" },
  ],
});

export const MARGIN_KPIS = Object.freeze([
  { label: "Jobs bajo margen mínimo", valor: "24", tono: "risk" },
  { label: "Con costos no trasladados", valor: "11", tono: "warn" },
  { label: "Diferencias contra tarifa", valor: "7", tono: "warn" },
  { label: "Cerrados con costos pendientes", valor: "5", tono: "muted" },
  { label: "Posibles facturas duplicadas", valor: "3", tono: "risk" },
]);

/* ------------------------------------------------------------------ */
/* FREE-TIME GUARD — contenedor protagonista + tablero                 */
/* ------------------------------------------------------------------ */

// estado de hito: "ok" | "pending" | "critical"
export const CONTENEDOR = Object.freeze({
  id: "MSCU 148213-0",
  tipo: "40' HC",
  operacion: "AR-IMP-02418",
  cliente: "ACME Argentina S.A.",
  lastFreeDay: "25 JUL",
  exposicionDiaria: 165,
  exposicionDesde: "26 JUL",
  responsable: "María López",
  timeline: [
    { id: "descarga", hito: "Descarga", fecha: "22 JUL · 14:20", estado: "ok" },
    { id: "free-time", hito: "Last free day", fecha: "25 JUL", estado: "critical" },
    { id: "customs", hito: "Liberación aduanera", fecha: "Pendiente", estado: "pending" },
    { id: "pickup", hito: "Turno de retiro", fecha: "No solicitado", estado: "pending" },
    { id: "delivery", hito: "Entrega", fecha: "Sin coordinar", estado: "pending" },
    { id: "empty", hito: "Devolución del vacío", fecha: "Sin turno · Depósito Sur", estado: "pending" },
  ],
});

// Tablero de contenedores. status: "ok" | "warn" | "critical"
export const TABLERO = Object.freeze([
  { id: "MSCU 148213-0", cliente: "ACME Argentina", ruta: "Shanghái → BA", lastFreeDay: "25 JUL", horas: 18, status: "critical", detalle: "Sin customs release · sin turno", exposicion: 165 },
  { id: "TCLU 774120-3", cliente: "Textil Andina", ruta: "Ningbo → BA", lastFreeDay: "26 JUL", horas: 40, status: "warn", detalle: "Turno de retiro por confirmar", exposicion: 140 },
  { id: "HLXU 559031-2", cliente: "Global Retail", ruta: "Shenzhen → BA", lastFreeDay: "27 JUL", horas: 64, status: "warn", detalle: "Empty return depot modificado", exposicion: 155 },
  { id: "MRKU 481902-7", cliente: "Pumps & Co", ruta: "Hamburgo → BA", lastFreeDay: "29 JUL", horas: 112, status: "ok", detalle: "En regla", exposicion: 0 },
  { id: "CMAU 220845-9", cliente: "Sur Metal", ruta: "Santos → BA", lastFreeDay: "30 JUL", horas: 136, status: "ok", detalle: "En regla", exposicion: 0 },
  { id: "OOLU 903471-5", cliente: "Farma Global", ruta: "Valencia → BA", lastFreeDay: "31 JUL", horas: 160, status: "ok", detalle: "En regla", exposicion: 0 },
]);

export const FREETIME_KPIS = Object.freeze([
  { label: "Contenedores activos", valor: "18", tono: "muted" },
  { label: "Free time < 48 h", valor: "4", tono: "warn" },
  { label: "Sin customs release", valor: "2", tono: "risk" },
  { label: "Sin turno de devolución", valor: "1", tono: "warn" },
  { label: "Empty depot modificado", valor: "1", tono: "warn" },
]);

/* ------------------------------------------------------------------ */
/* CARTERA compartida (poblada para los tableros)                      */
/* ------------------------------------------------------------------ */

// docStatus: "listo" | "pendiente" | "critico"
// margenEstado: "ok" | "warn" | "risk"
export const CARTERA = Object.freeze([
  { id: "AR-IMP-02418", cliente: "ACME Argentina", ruta: "Shanghái → BA", modo: "Ocean FCL", estado: "Activo", docStatus: "critico", margenPct: 14.5, margenEstado: "risk" },
  { id: "AR-IMP-02431", cliente: "Textil Andina", ruta: "Ningbo → BA", modo: "Ocean LCL", estado: "Documentación", docStatus: "pendiente", margenPct: 19.8, margenEstado: "warn" },
  { id: "AR-EXP-01890", cliente: "Sur Metal", ruta: "BA → Rotterdam", modo: "Ocean FCL", estado: "En tránsito", docStatus: "listo", margenPct: 23.1, margenEstado: "ok" },
  { id: "AR-IMP-02455", cliente: "Farma Global", ruta: "Frankfurt → EZE", modo: "Air HAWB", estado: "Documentación", docStatus: "pendiente", margenPct: 17.2, margenEstado: "warn" },
  { id: "AR-IMP-02460", cliente: "Pumps & Co", ruta: "Hamburgo → BA", modo: "Ocean FCL", estado: "Entregado", docStatus: "listo", margenPct: 12.4, margenEstado: "risk" },
  { id: "AR-IMP-02402", cliente: "Global Retail", ruta: "Shenzhen → BA", modo: "Ocean FCL", estado: "Cerrado", docStatus: "listo", margenPct: 20.6, margenEstado: "ok" },
]);

/* ------------------------------------------------------------------ */
/* Integraciones — solo herramientas con APIs oficiales/desarrollables */
/* ------------------------------------------------------------------ */

export const INTEGRACIONES = Object.freeze({
  ingesta: {
    label: "Mail y documentos",
    items: ["Gmail", "Outlook 365", "WhatsApp Business", "Google Drive", "Excel / Sheets"],
  },
  tms: {
    label: "Sistemas de forwarding",
    items: ["CargoWise", "Magaya"],
  },
  carriers: {
    label: "Navieras y tracking",
    items: ["Maersk", "MSC", "Hapag-Lloyd", "CMA CGM", "Terminal49"],
  },
  finanzas: {
    label: "Contabilidad y facturación",
    items: ["Xubio", "Colppy", "QuickBooks", "AFIP / ARCA"],
  },
});

/* ------------------------------------------------------------------ */
/* Metadatos de cada demo (para la top bar y navegación)               */
/* ------------------------------------------------------------------ */

export const DEMOS = Object.freeze({
  preflight: {
    slug: "preflight",
    modulo: "Control Documental",
    titulo: "Documentos",
    kicker: "Antes de emitir el documento",
    persona: "Para Operaciones y Documentación",
    nav: ["Bandeja", "Operación", "Cartera"],
    cta: "Revisamos 5 operaciones sin integración",
  },
  margin: {
    slug: "margin",
    modulo: "Control de Margen",
    titulo: "Margen",
    kicker: "Margen real por operación",
    persona: "Para Administración y Pricing",
    nav: ["Resumen", "Conciliación", "Cartera"],
    cta: "Auditamos 20 operaciones cerradas, sin integración",
  },
  freetime: {
    slug: "freetime",
    modulo: "Control de Contenedores",
    titulo: "Contenedores",
    kicker: "Exposición por contenedor",
    persona: "Para Importaciones y mesa de contenedores",
    nav: ["Tablero", "Contenedor", "Exposición"],
    cta: "Revisamos tu cartera de contenedores, sin integración",
  },
});
