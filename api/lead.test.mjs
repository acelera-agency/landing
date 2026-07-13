import assert from "node:assert/strict";
import test from "node:test";

import handler from "./lead.js";

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      Object.entries(headers).forEach(([name, value]) => this.setHeader(name, value));
    },
    end(payload = "") {
      this.body = String(payload);
    }
  };
}

function withLeadEnv(run) {
  const originalEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    LEAD_TO_EMAIL: process.env.LEAD_TO_EMAIL,
    LEAD_FROM_EMAIL: process.env.LEAD_FROM_EMAIL
  };

  process.env.RESEND_API_KEY = "re_test_key";
  process.env.LEAD_TO_EMAIL = "contacto@acelera.agency";
  process.env.LEAD_FROM_EMAIL = "Acelera <contacto@acelera.agency>";

  return Promise.resolve(run()).finally(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

test("sends a lead notification through Resend", async () => {
  await withLeadEnv(async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ id: "email_123" })
      };
    };

    try {
      const req = {
        method: "POST",
        body: {
          nombre: "Ana Perez",
          empresa: "Operaciones Norte",
          email: "ana@example.com",
          proceso: "Clasificar pedidos entrantes",
          variant: "acelera-diagnostic",
          utm_source: "linkedin",
          landing_url: "https://acelera.agency/",
          privacy_consent: "accepted"
        }
      };
      const res = createResponse();

      await handler(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(JSON.parse(res.body), {
        ok: true,
        message: "Recibimos tu consulta. Te respondemos pronto."
      });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://api.resend.com/emails");
      assert.equal(calls[0].options.method, "POST");
      assert.equal(calls[0].options.headers.Authorization, "Bearer re_test_key");

      const payload = JSON.parse(calls[0].options.body);
      assert.equal(payload.from, "Acelera <contacto@acelera.agency>");
      assert.deepEqual(payload.to, ["contacto@acelera.agency"]);
      assert.equal(payload.reply_to, "ana@example.com");
      assert.match(payload.subject, /Operaciones Norte/);
      assert.match(payload.text, /Clasificar pedidos entrantes/);
      assert.match(payload.text, /Consentimiento de privacidad: Aceptado/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("rejects invalid lead payloads before calling Resend", async () => {
  await withLeadEnv(async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("fetch should not be called");
    };

    try {
      const req = {
        method: "POST",
        body: {
          nombre: "Ana Perez",
          empresa: "Operaciones Norte",
          email: "no-es-email",
          proceso: "Clasificar pedidos entrantes",
          privacy_consent: "accepted"
        }
      };
      const res = createResponse();

      await handler(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(JSON.parse(res.body).error, "Ingresá un email válido.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("requires an explicit privacy consent", async () => {
  await withLeadEnv(async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("fetch should not be called");
    };

    try {
      const req = {
        method: "POST",
        body: {
          nombre: "Ana Perez",
          empresa: "Operaciones Norte",
          email: "ana@example.com",
          proceso: "Clasificar pedidos entrantes"
        }
      };
      const res = createResponse();

      await handler(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(
        JSON.parse(res.body).error,
        "Necesitás aceptar la Política de Privacidad para enviar la consulta."
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
