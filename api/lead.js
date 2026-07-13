const RESEND_EMAILS_URL = "https://api.resend.com/emails";

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);

  if (typeof res.status === "function" && typeof res.json === "function") {
    Object.entries(headers).forEach(([name, value]) => {
      if (typeof res.setHeader === "function") {
        res.setHeader(name, value);
      }
    });
    return res.status(statusCode).json(payload);
  }

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(body);
}

function cleanText(value, maxLength = 2000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  if (typeof req.on !== "function") {
    return {};
  }

  const rawBody = await new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

  return rawBody ? JSON.parse(rawBody) : {};
}

function parseRecipients(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function buildEmail({ nombre, empresa, email, proceso, variant, landingUrl, utmSource, privacyConsent }) {
  const subject = `[Acelera] Nuevo lead de ${empresa}`;
  const details = [
    ["Nombre", nombre],
    ["Empresa", empresa],
    ["Email", email],
    ["Proceso", proceso],
    ["Variant", variant],
    ["UTM source", utmSource],
    ["Landing", landingUrl],
    ["Consentimiento de privacidad", privacyConsent === "accepted" ? "Aceptado" : "No registrado"]
  ].filter(([, value]) => value);

  const text = details.map(([label, value]) => `${label}: ${value}`).join("\n");
  const rows = details
    .map(([label, value]) => {
      return `<tr><th align="left" style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(
        label
      )}</th><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(value)}</td></tr>`;
    })
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
  <h1 style="font-size:20px;margin:0 0 16px;">Nuevo lead desde acelera.agency</h1>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;">${rows}</table>
</div>`;

  return { subject, text, html };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Metodo no permitido." }, { Allow: "POST" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = parseRecipients(process.env.LEAD_TO_EMAIL);
  const from = cleanText(process.env.LEAD_FROM_EMAIL, 320);

  if (!apiKey || !to.length || !from) {
    return sendJson(res, 503, {
      error: "El formulario todavia no esta configurado."
    });
  }

  let body;
  try {
    body = await readRequestBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: "No pudimos leer el formulario." });
  }

  const nombre = cleanText(body.nombre, 160);
  const apellido = cleanText(body.apellido, 160);
  const lead = {
    nombre: [nombre, apellido].filter(Boolean).join(" "),
    empresa: cleanText(body.empresa, 160),
    email: cleanText(body.email, 320).toLowerCase(),
    proceso: cleanText(body.proceso, 2000),
    variant: cleanText(body.variant, 120),
    landingUrl: cleanText(body.landing_url, 1000),
    utmSource: cleanText(body.utm_source, 160),
    privacyConsent: cleanText(body.privacy_consent, 32)
  };

  if (!lead.nombre || !lead.empresa) {
    return sendJson(res, 400, { error: "Completá tu nombre y empresa." });
  }

  if (!isEmail(lead.email)) {
    return sendJson(res, 400, { error: "Ingresá un email válido." });
  }

  if (lead.privacyConsent !== "accepted") {
    return sendJson(res, 400, {
      error: "Necesitás aceptar la Política de Privacidad para enviar la consulta."
    });
  }

  const email = buildEmail(lead);
  const resendPayload = {
    from,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    reply_to: lead.email
  };

  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(resendPayload)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[lead-form] Resend rejected the email", payload);
      return sendJson(res, 502, {
        error: "No pudimos enviar el formulario. Escribinos a contacto@acelera.agency."
      });
    }

    return sendJson(res, 200, {
      ok: true,
      message: "Recibimos tu consulta. Te respondemos pronto."
    });
  } catch (error) {
    console.error("[lead-form] Failed to send email", error);
    return sendJson(res, 502, {
      error: "No pudimos enviar el formulario. Escribinos a contacto@acelera.agency."
    });
  }
}

module.exports = handler;
