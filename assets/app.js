(function () {
  const siteConfig = {
    workingBrand: "Acelera",
    formEndpoint: "/api/lead",
    calendlyUrl: "https://calendly.com/contacto-acelera/30min"
  };

  const body = document.body;
  const params = new URLSearchParams(window.location.search);
  const variant = body.dataset.variant || "sin-variant";
  const utmFields = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  const configuredFormEndpoint = siteConfig.formEndpoint.trim();
  const hasRealFormEndpoint =
    configuredFormEndpoint &&
    !configuredFormEndpoint.includes("TU_FORM_ID") &&
    (configuredFormEndpoint.startsWith("http") || configuredFormEndpoint.startsWith("/"));

  function ensureHiddenInput(form, name, dataAttribute) {
    let input = form.querySelector('input[name="' + name + '"]');

    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;

      if (dataAttribute) {
        input.setAttribute(dataAttribute, name);
      }

      form.appendChild(input);
    }

    return input;
  }

  function applyTrackingContext(form) {
    const variantInput = ensureHiddenInput(form, "variant");
    variantInput.value = variant;

    utmFields.forEach((field) => {
      const input = ensureHiddenInput(form, field, "data-utm");
      input.value = params.get(field) || "";
    });

    ensureHiddenInput(form, "landing_url").value = window.location.href;
    ensureHiddenInput(form, "landing_title").value = document.title;
  }

  document.querySelectorAll("[data-calendly-link]").forEach((link) => {
    if (siteConfig.calendlyUrl) {
      link.href = siteConfig.calendlyUrl;
      return;
    }

    const fallbackHref = link.getAttribute("href") || "#contacto";
    link.setAttribute("href", fallbackHref);
  });

  document.querySelectorAll('[data-brand="working"]').forEach((node) => {
    node.textContent = siteConfig.workingBrand;
  });

  if (body) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        body.classList.add("is-ready");
      });
    });
  }

  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    applyTrackingContext(form);

    const feedback =
      form.querySelector("[data-feedback]") || form.parentElement?.querySelector("[data-feedback]");
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async function (event) {
      if (!hasRealFormEndpoint) {
        event.preventDefault();

        if (feedback) {
          feedback.textContent =
            "Falta conectar el endpoint real del formulario. Revisa apps/marketing/landing-lab/assets/app.js.";
        }

        return;
      }

      event.preventDefault();
      applyTrackingContext(form);

      const formData = new FormData(form);
      const formPayload = Object.fromEntries(formData.entries());
      const originalButtonLabel = submitButton ? submitButton.innerHTML : "";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = "Enviando...";
      }

      if (feedback) {
        feedback.textContent = "Enviando solicitud...";
      }

      try {
        const response = await fetch(configuredFormEndpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formPayload)
        });
        const payload = await response.json().catch(function () {
          return {};
        });

        if (!response.ok) {
          throw new Error(payload.error || "No pudimos enviar el formulario.");
        }

        form.reset();
        applyTrackingContext(form);

        if (feedback) {
          feedback.textContent = payload.message || "Recibimos tu consulta. Te respondemos pronto.";
        }
      } catch (error) {
        if (feedback) {
          feedback.textContent =
            error instanceof Error ? error.message : "Ocurrió un error enviando el formulario.";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonLabel;
        }
      }
    });
  });

  const navToggle = document.querySelector("[data-nav-toggle]");
  const navLinks = document.querySelector("[data-nav-links]");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      const isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.16 }
    );

    document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
  } else {
    document.querySelectorAll(".reveal").forEach((node) => node.classList.add("is-visible"));
  }

  // ====================================================================
  // Header: logo + nav desktop + menú móvil según fondo bajo el nav fijo
  // ====================================================================
  function syncHeaderNavTone() {
    const header = document.getElementById("site-header");
    if (!header) return;

    const probeY = Math.min(header.getBoundingClientRect().bottom + 4, window.innerHeight - 1);
    const candidates = document.querySelectorAll("[data-header-scheme]");
    let tone = "light";
    let bestTop = -Infinity;

    candidates.forEach(function (el) {
      if (window.getComputedStyle(el).display === "none") {
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.top <= probeY && r.top > bestTop) {
        bestTop = r.top;
        const t = el.getAttribute("data-header-scheme");
        if (t === "dark" || t === "light") tone = t;
      }
    });

    header.dataset.navTone = tone;
  }

  let navToneTicking = false;
  function scheduleHeaderNavTone() {
    if (navToneTicking) return;
    navToneTicking = true;
    requestAnimationFrame(function () {
      syncHeaderNavTone();
      navToneTicking = false;
    });
  }

  window.addEventListener("scroll", scheduleHeaderNavTone, { passive: true });
  window.addEventListener("resize", scheduleHeaderNavTone);
  window.addEventListener("load", scheduleHeaderNavTone);
  scheduleHeaderNavTone();

  // ====================================================================
  // Calendly inline embed — loads the widget at page start, without
  // waiting for scroll. Uses requestAnimationFrame (or DOMContentLoaded
  // if the document is still parsing) to avoid competing with the hero
  // initial paint. When the URL is empty, the placeholder stays.
  // ====================================================================
  (function initCalendlyEmbed() {
    var url = siteConfig.calendlyUrl.trim();
    if (!url) return;

    var container = document.getElementById("calendly-embed");
    if (!container) return;

    var embedUrl = url + (url.indexOf("?") === -1 ? "?" : "&") + "hide_event_type_details=1&hide_gdpr_banner=1";

    function loadWidget() {
      var placeholder = document.getElementById("calendly-placeholder");

      if (typeof Calendly !== "undefined" && Calendly.initInlineWidget) {
        if (placeholder) placeholder.remove();
        Calendly.initInlineWidget({
          url: embedUrl,
          parentElement: container,
          prefill: {},
          utm: Object.fromEntries(utmFields.map(function (f) { return [f, params.get(f) || ""]; }))
        });
        return;
      }

      var script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = function () {
        if (typeof Calendly !== "undefined" && Calendly.initInlineWidget) {
          if (placeholder) placeholder.remove();
          Calendly.initInlineWidget({
            url: embedUrl,
            parentElement: container,
            prefill: {},
            utm: Object.fromEntries(utmFields.map(function (f) { return [f, params.get(f) || ""]; }))
          });
        }
      };
      document.head.appendChild(script);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.requestAnimationFrame(loadWidget);
      });
    } else {
      window.requestAnimationFrame(loadWidget);
    }
  })();

  // ====================================================================
  // GSAP — hero glows y cards (las entradas .gsap-reveal van en index.html
  // para no duplicar ScrollTrigger con el script inline).
  // ====================================================================
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    // Hero glows
    var glow1 = document.getElementById("hero-glow-1");
    var glow2 = document.getElementById("hero-glow-2");
    if (glow1) {
      gsap.to(glow1, {
        opacity: 1,
        x: "15%",
        y: "10%",
        duration: 1.2,
        ease: "power2.out",
        delay: 0.3
      });
    }
    if (glow2) {
      gsap.to(glow2, {
        opacity: 1,
        x: "20%",
        y: "15%",
        duration: 1.4,
        ease: "power2.out",
        delay: 0.5
      });
    }

    // Card glow on hover (proceso + sector cards)
    gsap.utils.toArray(".proceso-card, .sector-card").forEach(function (card) {
      var primary = card.querySelector(".proceso-glow-primary, .sector-glow-primary");
      var secondary = card.querySelector(".proceso-glow-secondary, .sector-glow-secondary");

      card.addEventListener("mouseenter", function () {
        if (primary) gsap.to(primary, { opacity: 1, x: "-10%", y: "-10%", duration: 0.5, ease: "power2.out" });
        if (secondary) gsap.to(secondary, { opacity: 1, x: "5%", y: "5%", duration: 0.6, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", function () {
        if (primary) gsap.to(primary, { opacity: 0, x: 0, y: 0, duration: 0.4, ease: "power2.in" });
        if (secondary) gsap.to(secondary, { opacity: 0, x: 0, y: 0, duration: 0.4, ease: "power2.in" });
      });
    });

  } else {
    document.querySelectorAll(".gsap-reveal").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.filter = "none";
    });
  }

})();
