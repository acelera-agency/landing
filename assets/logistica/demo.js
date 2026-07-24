/*
 * Acelera Control — render + interacción compartida de las 3 demos.
 * Monta el app-shell y las vistas de la demo indicada en
 * <div id="logistica-app" data-demo="preflight|margin|freetime">.
 *
 * Todo el estado es local y efímero. Sin red, sin persistencia.
 */
import * as D from "./data.js";

const money = (n) => "USD " + Number(n).toLocaleString("es-AR");
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Íconos de navegación (line icons, heredan currentColor). Uno por posición.
const NAV_ICONS = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 6h14l2 6v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/></svg>',
];

function init(root) {
  const key = root.dataset.demo;
  const meta = D.DEMOS[key];
  if (!meta) return;

  root.innerHTML = shellHTML(meta);

  const canvas = root.querySelector("[data-canvas]");
  const evidence = root.querySelector("[data-evidence]");
  const status = root.querySelector("[data-status]");
  const navButtons = [...root.querySelectorAll("[data-view]")];

  const views = VIEWS[key];

  function announce(msg) { if (status) status.textContent = msg; }

  function closeEvidence() {
    evidence.classList.remove("is-open");
    evidence.setAttribute("aria-hidden", "true");
    root.querySelectorAll("[data-hallazgo], [data-cost-ev], .container-card").forEach((b) => b.setAttribute("aria-pressed", "false"));
  }

  function openEvidence(ev) {
    evidence.innerHTML = `
      <div class="evidence__head">
        <span class="evidence__doc">${ev.documento}</span>
        <button type="button" class="evidence__close" data-evidence-close aria-label="Cerrar evidencia">×</button>
      </div>
      <h3>${ev.titulo}</h3>
      <p class="evidence__loc">${ev.ubicacion}</p>
      <div class="evidence__doc-view"><span class="evidence__hit">${ev.texto}</span></div>
      <p class="evidence__contrast">${ev.contraste}</p>
      <div class="evidence__action">
        <span class="label">Acción sugerida</span>
        <p>${ev.accion}</p>
      </div>`;
    evidence.classList.add("is-open");
    evidence.setAttribute("aria-hidden", "false");
    evidence.querySelector("[data-evidence-close]").addEventListener("click", closeEvidence);
    const closeBtn = evidence.querySelector("[data-evidence-close]");
    if (closeBtn) closeBtn.focus();
  }

  function renderView(index) {
    const view = views[index] || views[0];
    canvas.innerHTML = view.render(meta);
    navButtons.forEach((b, i) => (i === index ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current")));
    closeEvidence();
    if (view.bind) view.bind({ canvas, openEvidence, announce, renderView });
    canvas.querySelector("[data-export]")?.addEventListener("click", () =>
      exportTableCSV(canvas, `acelera-${meta.slug}-${meta.nav[index].toLowerCase()}.csv`, announce)
    );
    animateIn(canvas);
    announce(view.status || `${meta.nav[index]} · ${meta.modulo}`);
  }

  navButtons.forEach((b, i) => b.addEventListener("click", () => renderView(i)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEvidence(); });

  renderView(0);
}

function shellHTML(meta) {
  return `
  <div class="app">
    <div class="app-bar">
      <div class="app-bar__brand">
        <span class="app-bar__logo" aria-hidden="true">AC</span>
        <span class="app-bar__suite">${D.SUITE.marca}</span>
      </div>
      <span class="app-bar__context">${D.OPERACION.id} · ${D.OPERACION.origen} → ${D.OPERACION.destino} · ${D.OPERACION.modo}</span>
    </div>
    <div class="app-body">
      <nav class="side-nav" aria-label="Vistas de ${meta.modulo}">
        <span class="side-nav__label">${meta.titulo}</span>
        ${meta.nav.map((n, i) => `<button type="button" data-view="${i}">${NAV_ICONS[i] || NAV_ICONS[0]}<span>${n}</span></button>`).join("")}
        <span class="side-nav__foot">${D.SUITE.disclaimer}</span>
      </nav>
      <main class="canvas" data-canvas></main>
    </div>
    <div class="app-foot">
      <span>Esta demo es un <b>punto de partida</b>: los controles, las reglas y los flujos se personalizan para cada operación y cada cliente.</span>
      <a href="/logistica#contacto">Hablar de tu caso →</a>
    </div>
    <aside class="evidence" data-evidence aria-hidden="true" aria-label="Evidencia del hallazgo"></aside>
    <p class="sr-only" role="status" aria-live="polite" data-status></p>
  </div>`;
}

function animateIn(canvas) {
  if (prefersReduced) return;
  const kids = [...canvas.children];
  kids.forEach((el, i) => {
    el.classList.add("enter");
    setTimeout(() => el.classList.add("is-in"), 40 + i * 55);
  });
}

function headHTML(meta, viewTitle, meta2, opts = {}) {
  return `
    <div class="canvas__head">
      <div>
        <h2 class="canvas__title">${viewTitle}</h2>
        ${meta2 ? `<p class="canvas__meta">${meta2}</p>` : ""}
      </div>
      ${opts.export ? `<div class="canvas__tools"><button type="button" class="btn btn--ghost btn--sm" data-export>Exportar CSV</button></div>` : ""}
    </div>`;
}

/* Exporta la primera tabla visible del canvas como CSV (funcional de verdad). */
function exportTableCSV(canvas, filename, announce) {
  const table = canvas.querySelector("table");
  if (!table) return;
  const rows = [...table.querySelectorAll("tr")]
    .filter((tr) => !tr.hidden)
    .map((tr) => [...tr.querySelectorAll("th,td")].map((c) => `"${c.innerText.trim().replace(/"/g, '""').replace(/\s+/g, " ")}"`).join(","));
  const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  announce?.("Tabla exportada como CSV.");
}

/* Stepper de pipeline: muestra en qué etapa de la demo estás. */
function stepperHTML(steps, active) {
  return `<ol class="stepper" aria-label="Etapas de la demo">${steps
    .map((s, i) => {
      const state = i < active ? "done" : i === active ? "active" : "todo";
      return `<li class="stepper__step" data-state="${state}"><span class="stepper__dot">${i < active ? "✓" : i + 1}</span><span>${s}</span></li>`;
    })
    .join("")}</ol>`;
}

const wait = (ms) => new Promise((r) => setTimeout(r, prefersReduced ? 0 : ms));

/* Chips de integraciones (monograma con color de marca + nombre). */
const BRAND_COLORS = {
  Gmail: "#EA4335", "Outlook 365": "#0F6CBD", "WhatsApp Business": "#25D366",
  "Google Drive": "#4285F4", "Excel / Sheets": "#34A853", CargoWise: "#003049",
  Magaya: "#0072BC", Maersk: "#42B0D5", MSC: "#13294B", "Hapag-Lloyd": "#F47C20",
  "CMA CGM": "#0C2340", Terminal49: "#1A1A1A", Xubio: "#29ABE2", Colppy: "#F5811F",
  QuickBooks: "#2CA01C", "AFIP / ARCA": "#128BC8",
};

function integrationsRow(groups, intro) {
  const chips = groups
    .flatMap((g) => D.INTEGRACIONES[g]?.items || [])
    .map((n) => `<span class="integ-chip"><span class="integ-chip__logo integ-chip__logo--brand" style="background:${BRAND_COLORS[n] || "var(--surface-3)"}" aria-hidden="true">${n.slice(0, 1)}</span>${n}</span>`)
    .join("");
  return `
    <div class="integ">
      <span class="integ__label">${intro}</span>
      <div class="integ__chips">${chips}</div>
    </div>`;
}

/* Campos extraídos por documento, derivados de la matriz. */
function camposDeDoc(docId) {
  return D.MATRIZ.filter((row) => row.valores[docId] && row.valores[docId] !== "—")
    .map((row) => ({ campo: row.campo, valor: row.valores[docId], conflicto: row.conflicto.includes(docId) }));
}

function kpiRow(kpis) {
  return `<div class="kpi-row">${kpis
    .map((k) => `<div class="kpi" data-tone="${k.tono}"><span class="kpi__value">${k.valor}</span><span class="kpi__label">${k.label}</span></div>`)
    .join("")}</div>`;
}

function carteraTable(mode) {
  const rows = D.CARTERA.map((op) => {
    const hero = op.id === D.OPERACION.id ? ' class="is-hero"' : "";
    const modoKey = op.modo.startsWith("Air") ? "air" : "ocean";
    const last = mode === "doc"
      ? `<td><span class="pill pill--${op.docStatus}">${op.docStatus}</span></td>`
      : mode === "margin"
      ? `<td><span class="pill pill--${op.margenEstado}">${op.margenPct}%</span></td>`
      : `<td>${op.estado}</td>`;
    return `<tr${hero} data-modo="${modoKey}"><td class="mono">${op.id}</td><td>${op.cliente}</td><td>${op.ruta}</td><td>${op.modo}</td>${last}</tr>`;
  }).join("");
  const lastHead = mode === "doc" ? "Estado doc." : mode === "margin" ? "Margen" : "Estado";
  return `
    <div class="filter-row" role="group" aria-label="Filtrar cartera">
      <button type="button" class="filter-chip" data-filter="all" aria-pressed="true">Todas</button>
      <button type="button" class="filter-chip" data-filter="ocean" aria-pressed="false">Marítimo</button>
      <button type="button" class="filter-chip" data-filter="air" aria-pressed="false">Aéreo</button>
      <span class="filter-row__note" data-filter-note>6 operaciones</span>
    </div>
    <div class="cartera-wrap"><table class="cartera"><thead><tr><th>Job</th><th>Cliente</th><th>Ruta</th><th>Modo</th><th>${lastHead}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function bindCarteraFilters(canvas, announce) {
  const chips = [...canvas.querySelectorAll("[data-filter]")];
  if (!chips.length) return;
  const note = canvas.querySelector("[data-filter-note]");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      const f = chip.dataset.filter;
      let visible = 0;
      canvas.querySelectorAll("table.cartera tbody tr").forEach((tr) => {
        const show = f === "all" || tr.dataset.modo === f;
        tr.hidden = !show;
        if (show) visible += 1;
      });
      if (note) note.textContent = `${visible} operacion${visible === 1 ? "" : "es"}`;
      announce?.(`Filtro aplicado: ${chip.textContent}. ${visible} operaciones visibles.`);
    });
  });
}

/* ================================================================== */
/* PREFLIGHT                                                          */
/* ================================================================== */
const preflightViews = [
  {
    status: "Bandeja: llegaron 5 documentos de AR-IMP-02418. Procesalos para extraer los datos.",
    render(meta) {
      const files = D.DOCUMENTOS.map(
        (d) => `
        <li class="doc-proc" data-doc="${d.id}">
          <div class="doc-proc__row">
            <span class="filelist__type">${d.tipo}</span>
            <span class="filelist__name">${d.archivo}</span>
            <span class="doc-proc__state" data-doc-state>Nuevo</span>
          </div>
          <div class="doc-proc__bar" hidden><span data-doc-bar></span></div>
          <div class="doc-proc__chips" data-doc-chips hidden></div>
        </li>`
      ).join("");
      return `
        ${headHTML(meta, "Operación recibida", `${D.OPERACION.id} · ${D.OPERACION.origen} → ${D.OPERACION.destino} · ${D.OPERACION.modo} · ${D.OPERACION.equipo}`)}
        ${stepperHTML(["Recibir", "Extraer", "Cruzar", "Resolver"], 0)}
        <div class="pipeline-cta">
          <div>
            <strong>5 documentos nuevos</strong>
            <p class="view-note" style="margin:4px 0 0">Llegaron por mail y carpeta compartida. Acelera los lee y extrae los datos clave de cada uno.</p>
            <p class="audit-line"><span class="audit-line__ok">✓</span> 14 controles configurados · SOP de ACME Argentina cargada · reglas de Ocean FCL activas</p>
          </div>
          <button type="button" class="btn" data-process>Procesar documentos</button>
        </div>
        <ul class="filelist filelist--proc">${files}</ul>
        ${integrationsRow(["ingesta", "tms"], "La ingesta se conecta a lo que ya usás:")}
        <div class="pipeline-next" data-pipeline-next hidden>
          <div class="summary-line" style="margin:0">
            <span>5 documentos leídos</span><span><b>2 diferencias críticas</b></span><span>2 datos incompletos</span><span>1 regla del cliente pendiente</span>
          </div>
          <button type="button" class="btn" data-goto-cruce>Cruzar documentos →</button>
          <p class="roi-note" style="flex:1 1 100%">Este chequeo a mano toma <b>~35 minutos</b> por file. Acá tomó <b>segundos</b> — y cada error que llega al BL emitido cuesta <b>USD 50–150</b> de corrección más la demora con el cliente.</p>
        </div>`;
    },
    async bind({ canvas, announce, renderView }) {
      const btn = canvas.querySelector("[data-process]");
      btn?.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Procesando…";
        announce("Procesando documentos.");
        for (const doc of D.DOCUMENTOS) {
          const li = canvas.querySelector(`[data-doc="${doc.id}"]`);
          if (!li) continue;
          const state = li.querySelector("[data-doc-state]");
          const barWrap = li.querySelector(".doc-proc__bar");
          const bar = li.querySelector("[data-doc-bar]");
          const chips = li.querySelector("[data-doc-chips]");
          li.classList.add("is-scanning");
          state.textContent = "Leyendo…";
          barWrap.hidden = false;
          await wait(60);
          bar.style.width = "100%";
          await wait(prefersReduced ? 0 : 620);
          barWrap.hidden = true;
          li.classList.remove("is-scanning");
          li.classList.add("is-done");
          state.textContent = "Extraído ✓";
          state.classList.add("is-ok");
          const campos = camposDeDoc(doc.id);
          chips.hidden = false;
          for (const c of campos) {
            const chip = document.createElement("span");
            chip.className = "chip" + (c.conflicto ? " chip--conflict" : "");
            chip.innerHTML = `<em>${c.campo}</em>${c.valor}`;
            chips.appendChild(chip);
            await wait(110);
          }
          await wait(90);
        }
        btn.textContent = "Documentos procesados";
        const next = canvas.querySelector("[data-pipeline-next]");
        next.hidden = false;
        next.classList.add("enter", "is-in");
        announce("5 documentos leídos. Hay diferencias para cruzar.");
        canvas.querySelector("[data-goto-cruce]")?.addEventListener("click", () => renderView(1));
      });
    },
  },
  {
    status: "Cruzando documentos. Los hallazgos aparecen a medida que se detectan.",
    render(meta) {
      const docsCols = ["invoice", "packing", "instructions", "hbl"];
      const docNames = { invoice: "Invoice", packing: "Packing", instructions: "Instructions", hbl: "Draft HBL" };
      const head = `<tr><th>Campo</th>${docsCols.map((c) => `<th>${docNames[c]}</th>`).join("")}<th>Veredicto</th></tr>`;
      const body = D.MATRIZ.map((row, i) => {
        const cells = docsCols
          .map((c) => {
            const conflict = row.conflicto.includes(c);
            const cls = conflict ? ` class="cell--conflict cell--${row.veredicto}"` : "";
            return `<td${cls}>${row.valores[c]}</td>`;
          })
          .join("");
        return `<tr class="row-reveal" style="--d:${i}"><th scope="row">${row.campo}</th>${cells}<td><span class="verdict verdict--${row.veredicto}">${row.veredicto === "ok" ? "OK" : row.veredicto === "warn" ? "Revisar" : "Crítico"}</span></td></tr>`;
      }).join("");
      const exceptions = D.HALLAZGOS_PREFLIGHT.map(
        (h, i) => `
        <button type="button" class="exception row-reveal" style="--d:${i + 3}" data-hallazgo="${h.id}" data-sev="${h.severidad}" aria-pressed="false">
          <span class="exception__bar" aria-hidden="true"></span>
          <span class="exception__body">
            <span class="exception__title">${h.titulo}</span>
            <span class="exception__meta"><span class="sev">${h.severidad === "critical" ? "Crítico" : "Revisar"}</span> · ${h.responsable} · ${h.accion}</span>
          </span>
          <span class="exception__go" aria-hidden="true">→</span>
        </button>`
      ).join("");
      return `
        ${headHTML(meta, "Cruce documental", `${D.OPERACION.id} · antes de emitir el HBL`, { export: true })}
        ${stepperHTML(["Recibir", "Extraer", "Cruzar", "Resolver"], 2)}
        <p class="audit-line" style="margin-bottom:14px"><span class="audit-line__ok">✓</span> 14 controles ejecutados en 4,2 s · 9 OK · 5 hallazgos · comparados 7 campos entre 5 documentos y la SOP del cliente</p>
        <div class="matrix-wrap"><table class="matrix"><thead>${head}</thead><tbody>${body}</tbody></table></div>
        <div class="exceptions" role="group" aria-label="Hallazgos">
          <p class="exceptions__count view-note" style="margin:0" data-count aria-live="polite">Cruzando campos…</p>
          ${exceptions}
        </div>
        <div style="margin-top:24px" data-actions></div>`;
    },
    bind({ canvas, openEvidence, announce }) {
      // Los hallazgos se revelan escalonados (CSS row-reveal). Contador en vivo:
      const count = canvas.querySelector("[data-count]");
      const totales = D.HALLAZGOS_PREFLIGHT.length;
      let n = 0;
      const tick = () => {
        n += 1;
        count.textContent = n < totales ? `${n} hallazgo${n > 1 ? "s" : ""} detectado${n > 1 ? "s" : ""}…` : `${totales} hallazgos detectados. Tocá uno para ver la evidencia.`;
        if (n < totales) setTimeout(tick, prefersReduced ? 0 : 260);
      };
      setTimeout(tick, prefersReduced ? 0 : 500);

      const byId = Object.fromEntries(D.HALLAZGOS_PREFLIGHT.map((h) => [h.id, h]));
      canvas.querySelectorAll("[data-hallazgo]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const h = byId[btn.dataset.hallazgo];
          canvas.querySelectorAll("[data-hallazgo]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
          openEvidence({
            documento: h.evidencia.documento,
            titulo: h.titulo,
            ubicacion: h.evidencia.ubicacion,
            texto: h.evidencia.texto,
            contraste: h.evidencia.contraste,
            accion: h.accion,
          });
          announce(h.anuncio);
          const actions = canvas.querySelector("[data-actions]");
          if (actions && !actions.dataset.ready) {
            actions.dataset.ready = "1";
            actions.innerHTML = draftBlock();
            bindDraft(actions, announce);
          }
        });
      });
    },
  },
  {
    status: "Control de cartera documental.",
    render(meta) {
      return `
        ${headHTML(meta, "Control de cartera", "Estado documental de los files activos", { export: true })}
        ${kpiRow(D.PREFLIGHT_KPIS)}
        ${carteraTable("doc")}
        <p class="view-note" style="margin-top:22px">Tiempo promedio hasta «documentación lista»: <strong>3,2 h</strong> · cliente con más correcciones: <strong>ACME Argentina</strong> · error más frecuente: <strong>peso bruto</strong>.</p>`;
    },
    bind({ canvas, announce }) {
      bindCarteraFilters(canvas, announce);
    },
  },
];

function draftBlock() {
  const b = D.PREFLIGHT_BORRADOR;
  return `
    <div class="card">
      <h3>Preparar consulta al cliente</h3>
      <p style="margin-bottom:14px">Generamos un borrador con las diferencias detectadas. Requiere tu aprobación antes de enviarse.</p>
      <button type="button" class="btn" data-make-draft>Preparar consulta</button>
      <div class="draft" data-draft hidden style="margin-top:16px">
        <div class="draft__head">Para: ${b.para}<br><span>Asunto: ${b.asunto}</span></div>
        <div class="draft__body">${b.cuerpo.map((l) => `<p style="margin:0">${l}</p>`).join("")}</div>
        <div class="draft__foot"><button type="button" class="btn btn--ghost" data-approve>Aprobar borrador</button><span class="draft__note" data-draft-note>El borrador no se envía en la demo.</span></div>
      </div>
    </div>`;
}

function bindDraft(scope, announce) {
  const makeBtn = scope.querySelector("[data-make-draft]");
  const draft = scope.querySelector("[data-draft]");
  makeBtn?.addEventListener("click", () => {
    draft.hidden = false;
    makeBtn.disabled = true;
    announce("Borrador de consulta preparado. Requiere aprobación.");
  });
  scope.querySelector("[data-approve]")?.addEventListener("click", (e) => {
    draft.classList.add("is-approved");
    e.target.disabled = true;
    e.target.textContent = "Borrador aprobado ✓";
    scope.querySelector("[data-draft-note]").textContent = "Aprobado. En producción, se enviaría al cliente.";
    announce("Borrador aprobado.");
  });
}

/* ================================================================== */
/* MARGIN GUARD                                                       */
/* ================================================================== */
const marginViews = [
  {
    status: "Resumen de margen de AR-IMP-02418.",
    render(meta) {
      const r = D.MARGEN_RESUMEN;
      const mCot = r.ventaCotizada - r.costoCotizado;
      const mReal = r.ventaReal - r.costoReal;
      const pctCot = ((mCot / r.ventaCotizada) * 100).toFixed(1);
      const pctReal = ((mReal / r.ventaReal) * 100).toFixed(1);
      const rowsHtml = [
        ["Venta", r.ventaCotizada, r.ventaReal, false],
        ["Costo", r.costoCotizado, r.costoReal, false],
      ].map(([label, cot, real]) =>
        `<div class="margin-table__row"><span class="head">${label}</span><span class="margin-table__num">${money(cot)}</span><span class="margin-table__num">${money(real)}</span></div>`
      ).join("");
      return `
        ${headHTML(meta, "Resumen de la operación", `${D.OPERACION.id} · ${D.OPERACION.cliente} · Entregado`)}
        <div class="margin-summary">
          <div class="margin-table">
            <div class="margin-table__row"><span class="head"></span><span class="head margin-table__num">Cotizado</span><span class="head margin-table__num">Real</span></div>
            ${rowsHtml}
            <div class="margin-table__row is-total"><span class="head">Margen</span><span class="margin-table__num margin-table__num--big">${money(mCot)} · ${pctCot}%</span><span class="margin-table__num margin-table__num--big">${money(mReal)} · ${pctReal}%</span></div>
          </div>
          <div class="margin-callout">
            <span class="big">−6,9 pts</span>
            <p style="margin:0;font-size:.9rem;line-height:1.5">El margen cayó de ${pctCot}% a ${pctReal}%. Encontramos <strong>4 diferencias</strong> para revisar. Pasá a <strong>Conciliación</strong>.</p>
          </div>
        </div>
        <p class="view-note">Comparamos la cotización con las facturas de naviera, terminal, agente y transportista, y con la factura final al cliente. No reemplaza tu contabilidad: audita las excepciones.</p>`;
    },
  },
  {
    status: "Conciliando facturas de proveedores. El margen se recalcula en vivo.",
    render(meta) {
      const rows = D.COSTOS_MARGIN.map((c, i) => `
        <tr data-verdict="${c.veredicto}" class="row-reveal" style="--d:${i}">
          <td class="concepto">${c.concepto}</td>
          <td class="num">${c.esperado ? money(c.esperado) : "—"}</td>
          <td class="num">${c.real ? money(c.real) : "—"}</td>
          <td><span class="tag tag--${c.facturado === "incluido" ? "ok" : "no"}">${c.facturado === "incluido" ? "Incluido" : "No facturado"}</span></td>
          <td>${c.veredicto === "warn" ? `<button type="button" class="exception" style="grid-template-columns:6px 1fr auto;min-height:0" data-cost-ev="${c.id}" data-sev="warn" aria-pressed="false"><span class="exception__bar"></span><span class="exception__body" style="padding:8px 0"><span class="exception__meta">Ver evidencia</span></span><span class="exception__go">→</span></button>` : `<span class="tag tag--ok">OK</span>`}</td>
          <td><label class="toggle"><input type="checkbox" data-cost="${c.real}" data-cost-id="${c.id}" checked><span class="toggle__track" aria-hidden="true"></span><span class="sr-only">Incluir ${c.concepto}</span></label></td>
        </tr>`).join("");
      return `
        ${headHTML(meta, "Conciliación de conceptos", "Costos reales del forwarder vs cotización", { export: true })}
        ${stepperHTML(["Cotización", "Facturas", "Conciliar", "Revisar"], 2)}
        <p class="audit-line" style="margin-bottom:14px"><span class="audit-line__ok">✓</span> Conciliado contra 6 facturas de 5 proveedores · tarifario vigente de Pacific Star Line · tipo de cambio del 21 JUL</p>
        <div class="recalc recalc--bar" data-recalc style="margin-bottom:10px"></div>
        <p class="roi-note" style="margin:0 0 16px">Sin esta conciliación, el margen real se conoce <b>semanas después</b> de la entrega — cuando ya no se puede reclamar ni trasladar nada. Solo este job dejó <b>USD 730</b> para revisar; con 12 jobs similares por mes son <b>~USD 8.700/mes</b> en juego.</p>
        ${integrationsRow(["ingesta", "tms", "finanzas"], "Facturas, tarifas y jobs pueden llegar desde:")}
        <div class="recon-wrap"><table class="recon"><thead><tr><th>Concepto</th><th class="num">Esperado</th><th class="num">Real</th><th>Cliente</th><th>Evidencia</th><th>Incluir</th></tr></thead><tbody>${rows}</tbody></table></div>
        <h3 style="margin:28px 0 12px;font-size:1.2rem">Explicación del desvío</h3>
        <div class="impact">
          <span class="canvas__kicker">Potencialmente recuperable o evitable</span>
          <div class="impact__value">${money(D.MARGEN_DESVIO.totalRevisable)}</div>
          <p class="impact__caption">Montos sujetos al acuerdo comercial. Se listan «para revisar», no como cargos confirmados al cliente.</p>
          <ul class="impact__list">${D.MARGEN_DESVIO.detalle.map((d) => `<li><span class="concepto">${d.concepto}</span><span class="tipo">${d.tipo}</span><span class="monto">${money(d.monto)}</span></li>`).join("")}</ul>
        </div>`;
    },
    bind({ canvas, openEvidence, announce }) {
      const recalc = canvas.querySelector("[data-recalc]");
      const byId = Object.fromEntries(D.COSTOS_MARGIN.map((c) => [c.id, c]));
      const mCot = D.MARGEN_RESUMEN.ventaCotizada - D.MARGEN_RESUMEN.costoCotizado;
      let raf = 0;

      function paint(margin, note) {
        const pct = (margin / D.MARGEN_RESUMEN.ventaReal) * 100;
        recalc.innerHTML = `
          <span class="label">Margen real conciliado</span>
          <span class="value">${money(Math.round(margin))}</span>
          <span class="delta">${note || `${pct.toFixed(1)}% sobre venta · desvío ${money(Math.round(margin - mCot))} vs cotización (${money(mCot)}).`}</span>`;
      }

      function currentMargin() {
        const included = [...canvas.querySelectorAll("[data-cost]:checked")];
        const sum = included.reduce((s, i) => s + Number(i.dataset.cost), 0);
        return D.MARGEN_RESUMEN.ventaReal - (D.MARGEN_BASE_COSTO + sum);
      }

      function update(anim) {
        cancelAnimationFrame(raf);
        const margin = currentMargin();
        paint(margin);
        if (anim) announce(`Margen real conciliado: ${margin} dólares.`);
      }

      // Entrada: el margen "baja en vivo" desde el cotizado hasta el real
      // mientras las facturas aterrizan en la tabla (solo animación de entrada).
      const target = currentMargin();
      if (prefersReduced) {
        paint(target);
      } else {
        const start = performance.now();
        const dur = 1400;
        paint(mCot, "Conciliando facturas de proveedores…");
        const step = (now) => {
          const t = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          paint(mCot + (target - mCot) * eased, t < 1 ? "Conciliando facturas de proveedores…" : undefined);
          if (t < 1) raf = requestAnimationFrame(step);
          else update(false);
        };
        raf = requestAnimationFrame(step);
      }

      canvas.querySelectorAll("[data-cost]").forEach((i) => i.addEventListener("change", () => update(true)));
      canvas.querySelectorAll("[data-cost-ev]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const c = byId[btn.dataset.costEv];
          canvas.querySelectorAll("[data-cost-ev]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
          openEvidence({
            documento: "Factura de proveedor",
            titulo: c.concepto,
            ubicacion: "Conciliación de costos · " + c.concepto,
            texto: `${c.concepto}: real ${money(c.real)} · esperado ${c.esperado ? money(c.esperado) : "no cotizado"}`,
            contraste: c.nota,
            accion: c.facturado === "no" ? "Evaluar traslado a la factura del cliente según acuerdo." : "Revisar contra la tarifa acordada / posible duplicado.",
          });
          announce(`${c.concepto}: ${c.nota}`);
        });
      });
    },
  },
  {
    status: "Cartera de operaciones.",
    render(meta) {
      return `
        ${headHTML(meta, "Cartera de operaciones", "Margen por operación", { export: true })}
        ${kpiRow(D.MARGIN_KPIS)}
        ${carteraTable("margin")}
        <p class="view-note" style="margin-top:22px">Margen promedio por modalidad: <strong>Ocean FCL 17,8%</strong> · <strong>Air 17,2%</strong>. Días promedio entre entrega y cierre financiero: <strong>11</strong>.</p>`;
    },
    bind({ canvas, announce }) {
      bindCarteraFilters(canvas, announce);
    },
  },
];

/* ================================================================== */
/* FREE-TIME GUARD                                                    */
/* ================================================================== */
const freetimeViews = [
  {
    status: "Tablero de contenedores.",
    render(meta) {
      const cards = D.TABLERO.map((c) => `
        <button type="button" class="container-card" data-status="${c.status}" ${c.id === D.CONTENEDOR.id ? 'data-hero="1"' : ""} aria-pressed="false">
          <span class="container-card__top" aria-hidden="true"></span>
          <span class="container-card__inner">
            <span class="container-card__id">${c.id}</span>
            <span class="container-card__route">${c.cliente} · ${c.ruta}</span>
            <span class="container-card__clock"><span class="container-card__hours">${c.horas}h</span><span class="container-card__lfd">LFD ${c.lastFreeDay}</span></span>
            <span class="container-card__detail">${c.detalle}</span>
            <span class="container-card__exp">${c.exposicion ? money(c.exposicion) + "/día" : "Sin exposición"}</span>
          </span>
        </button>`).join("");
      return `
        ${headHTML(meta, "Tablero de contenedores", "Free time, bloqueos y exposición")}
        <p class="audit-line" style="margin-bottom:14px"><span class="audit-line__ok">✓</span> Sincronizado con 3 terminales y 2 navieras · última actualización hace 12 min · reglas de free time por carrier aplicadas</p>
        ${kpiRow(D.FREETIME_KPIS)}
        <div class="board">${cards}</div>
        <p class="view-note" style="margin-top:22px">El contenedor <strong>${D.CONTENEDOR.id}</strong> tiene menos de 48 h de free time y bloqueos sin resolver. Abrí <strong>Contenedor</strong> para verlo en detalle.</p>
        ${integrationsRow(["carriers"], "Eventos y free time directo de las fuentes:")}`;
    },
    bind({ canvas, renderView }) {
      canvas.querySelectorAll(".container-card").forEach((card) => {
        card.addEventListener("click", () => renderView(1));
      });
    },
  },
  {
    status: "Detalle del contenedor. Resolvé los bloqueos para contener la exposición.",
    render(meta) {
      const c = D.CONTENEDOR;
      const timeline = c.timeline.map((m, i) => `
        <li data-state="${m.estado}" data-hito="${m.id}" class="row-reveal" style="--d:${i}">
          <span class="timeline__dot" aria-hidden="true"></span>
          <span class="timeline__hito">${m.hito}</span>
          <span class="timeline__fecha">${m.fecha}</span>
        </li>`).join("");
      return `
        ${headHTML(meta, c.id, `${c.tipo} · ${c.operacion} · ${c.cliente}`)}
        ${stepperHTML(["Eventos", "Riesgo", "Acción", "Contenido"], 2)}
        <div class="freetime-detail">
          <div>
            <h3 style="font-size:1.1rem;margin:0 0 14px">Secuencia del contenedor</h3>
            <ul class="timeline" data-timeline>${timeline}</ul>
          </div>
          <div class="detail-side">
            <div class="impact" data-exposure>
              <span class="canvas__kicker">Exposición proyectada</span>
              <div class="impact__value">${money(c.exposicionDiaria)}<span style="font-size:1rem">/día</span></div>
              <p class="impact__caption">Demurrage desde el ${c.exposicionDesde} si no se libera y retira dentro del free time (${c.lastFreeDay}).</p>
            </div>
            <div class="card">
              <h3>Acción</h3>
              <p style="margin-bottom:14px">Responsable: <strong>${c.responsable}</strong></p>
              <button type="button" class="btn" data-resolve>Confirmar liberación y solicitar turno</button>
              <button type="button" class="btn btn--ghost" data-reset hidden style="margin-top:8px">Reiniciar escena</button>
            </div>
          </div>
        </div>`;
    },
    bind({ canvas, announce, renderView }) {
      const resolve = canvas.querySelector("[data-resolve]");
      const reset = canvas.querySelector("[data-reset]");
      resolve?.addEventListener("click", () => {
        const tl = canvas.querySelector("[data-timeline]");
        ["customs", "pickup"].forEach((id) => {
          const li = tl.querySelector(`[data-hito="${id}"]`);
          if (li) {
            li.dataset.state = "ok";
            const f = li.querySelector(".timeline__fecha");
            if (id === "customs") f.textContent = "Liberado · 24 JUL";
            if (id === "pickup") f.textContent = "Solicitado · 25 JUL · 08:00";
          }
        });
        const exp = canvas.querySelector("[data-exposure]");
        exp.innerHTML = `<span class="canvas__kicker">Exposición contenida</span><div class="impact__value" style="color:var(--signal)">USD 0</div><p class="impact__caption">Retiro dentro del free time. Resta coordinar la devolución del vacío.</p>`;
        resolve.disabled = true;
        resolve.textContent = "Liberación y turno confirmados ✓";
        reset.hidden = false;
        const stepper = canvas.querySelector(".stepper");
        if (stepper) stepper.outerHTML = stepperHTML(["Eventos", "Riesgo", "Acción", "Contenido"], 4);
        announce("Liberación confirmada y turno solicitado. La exposición diaria quedó contenida.");
      });
      reset?.addEventListener("click", () => renderView(1));
    },
  },
  {
    status: "Exposición de cartera.",
    render(meta) {
      const risky = D.TABLERO.filter((c) => c.exposicion > 0);
      const totalDay = risky.reduce((s, c) => s + c.exposicion, 0);
      const rows = risky.map((c) => `<tr><td class="mono">${c.id}</td><td>${c.cliente}</td><td>${c.detalle}</td><td class="mono" style="text-align:right;color:var(--risk)">${money(c.exposicion)}/día</td></tr>`).join("");
      return `
        ${headHTML(meta, "Exposición de cartera", "Contenedores en riesgo y exposición diaria", { export: true })}
        <div class="impact" style="margin-bottom:24px">
          <span class="canvas__kicker">Exposición diaria en riesgo</span>
          <div class="impact__value">${money(totalDay)}<span style="font-size:1rem">/día</span></div>
          <p class="impact__caption">${risky.length} contenedores con bloqueos activos. Cada día sin resolver suma demurrage o detention.</p>
          <p class="roi-note" style="margin-top:12px">A este ritmo, un mes de descoordinación son <b>~${money(totalDay * 30)}</b> de gasto puro — plata que no se recupera ni se factura al cliente.</p>
        </div>
        <div class="cartera-wrap"><table class="cartera"><thead><tr><th>Contenedor</th><th>Cliente</th><th>Bloqueo</th><th style="text-align:right">Exposición</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    },
  },
];

const VIEWS = { preflight: preflightViews, margin: marginViews, freetime: freetimeViews };

/* Arranque: el shell y las vistas ya están definidos arriba. */
const app = document.getElementById("logistica-app");
if (app) init(app);
