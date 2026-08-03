(function () {
  const siteConfig = {
    workingBrand: "Acelera",
    formEndpoint: "https://acelera-lead-gateway.vercel.app/api/lead",
    calendlyUrl: "https://calendly.com/contacto-acelera/30min"
  };

  const body = document.body;
  const params = new URLSearchParams(window.location.search);
  const variant = body.dataset.variant || "sin-variant";
  const utmFields = ["utm_source"];
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

    ensureHiddenInput(form, "landing_url").value = window.location.origin + window.location.pathname;
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

  const sectionIndex = document.querySelector("[data-section-index]");
  if (sectionIndex) {
    const links = Array.from(sectionIndex.querySelectorAll(".section-index__link"));
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);
    const toneSections = Array.from(document.querySelectorAll("[data-header-scheme]"));
    let sectionOffsets = [];
    let toneOffsets = [];
    let sectionIndexFrame = 0;
    let sectionMeasureFrame = 0;
    let activeSectionIndex = -1;
    let activeTone = "";

    const measureSections = () => {
      sectionOffsets = sections.map((section) => ({
        top: section.getBoundingClientRect().top + window.scrollY,
        scheme: section.dataset.headerScheme || "light"
      }));
      toneOffsets = toneSections.map((section) => ({
        top: section.getBoundingClientRect().top + window.scrollY,
        scheme: section.dataset.headerScheme || "light"
      })).sort((a, b) => a.top - b.top);
    };

    const updateSectionIndex = () => {
      sectionIndexFrame = 0;

      const readingLine = window.scrollY + window.innerHeight * 0.5;
      let activeIndex = 0;
      sectionOffsets.forEach((section, index) => {
        if (section.top <= readingLine) activeIndex = index;
      });

      let nextTone = "light";
      toneOffsets.forEach((section) => {
        if (section.top <= readingLine) nextTone = section.scheme;
      });

      if (nextTone !== activeTone) {
        activeTone = nextTone;
        sectionIndex.dataset.tone = nextTone;
      }

      if (activeIndex === activeSectionIndex) return;
      activeSectionIndex = activeIndex;

      sectionIndex.style.setProperty("--section-index-active", String(activeIndex));
      links.forEach((link, index) => {
        if (index === activeIndex) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };

    const requestSectionIndexUpdate = () => {
      if (!sectionIndexFrame) sectionIndexFrame = window.requestAnimationFrame(updateSectionIndex);
    };

    const requestSectionMeasurement = () => {
      if (sectionMeasureFrame) return;
      sectionMeasureFrame = window.requestAnimationFrame(() => {
        sectionMeasureFrame = 0;
        measureSections();
        requestSectionIndexUpdate();
      });
    };

    measureSections();
    updateSectionIndex();
    window.addEventListener("scroll", requestSectionIndexUpdate, { passive: true });
    window.addEventListener("resize", requestSectionMeasurement, { passive: true });
    window.addEventListener("load", requestSectionMeasurement, { once: true });

    if (document.fonts?.ready) {
      document.fonts.ready.then(requestSectionMeasurement);
    }

    if ("ResizeObserver" in window) {
      const sectionResizeObserver = new ResizeObserver(requestSectionMeasurement);
      new Set([...sections, ...toneSections]).forEach((section) => sectionResizeObserver.observe(section));
    }
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

  // El tono del header según la sección visible lo maneja el script inline
  // de index.html (syncHeaderBrandTone); acá había una versión duplicada
  // que recalculaba layout en cada scroll por segunda vez.

  // ====================================================================
  // Calendly inline embed — se carga recién cuando la sección de contacto
  // se acerca al viewport (~1200px antes). El widget arrastra varios MB
  // (booking JS/CSS, Stripe, reCAPTCHA, analytics): cargarlo al inicio
  // competía con el primer render y hacía lenta toda la página.
  // ====================================================================
  (function initCalendlyEmbed() {
    var url = siteConfig.calendlyUrl.trim();
    if (!url) return;

    var container = document.getElementById("calendly-embed");
    if (!container) return;

    var widgetRequested = false;

    var embedUrl = url + (url.indexOf("?") === -1 ? "?" : "&") + "hide_event_type_details=1";

    // Calendly inyecta el iframe real 1-3s después de initInlineWidget.
    // Si removemos el placeholder antes, queda un hueco en blanco visible
    // durante varios segundos. Esperamos al iframe con MutationObserver y
    // hacemos fade-out elegante cuando llega. Fallback a 12s por si el
    // iframe nunca se monta (ad blocker, error de red, etc).
    function hidePlaceholderWhenReady() {
      var placeholder = document.getElementById("calendly-placeholder");
      if (!placeholder) return;
      var embed = document.getElementById("calendly-embed");
      if (!embed) { placeholder.remove(); return; }

      var done = false;
      var observer = null;

      function fadeOut() {
        if (done) return;
        done = true;
        if (observer) observer.disconnect();
        placeholder.style.transition = "opacity 280ms ease";
        placeholder.style.opacity = "0";
        placeholder.style.pointerEvents = "none";
        setTimeout(function () { placeholder.remove(); }, 320);
      }

      // Fade recién cuando el contenido del iframe cargó (evita el hueco
      // en blanco de 1-3s mientras Calendly renderiza).
      function armIframe(iframe) {
        if (!iframe || iframe.dataset.placeholderArmed) return;
        iframe.dataset.placeholderArmed = "true";
        iframe.addEventListener("load", fadeOut, { once: true });
      }

      // initInlineWidget inserta el iframe de forma síncrona: si ya está,
      // el MutationObserver no vería ninguna mutación — chequear primero.
      armIframe(embed.querySelector("iframe"));

      observer = new MutationObserver(function () {
        armIframe(embed.querySelector("iframe"));
      });
      observer.observe(embed, { childList: true, subtree: true });
      setTimeout(function () {
        if (observer && !done) observer.disconnect();
      }, 12000);
    }

    function loadWidget() {
      if (widgetRequested) return;
      widgetRequested = true;

      if (typeof Calendly !== "undefined" && Calendly.initInlineWidget) {
        Calendly.initInlineWidget({
          url: embedUrl,
          parentElement: container,
          prefill: {},
          utm: Object.fromEntries(utmFields.map(function (f) { return [f, params.get(f) || ""]; }))
        });
        hidePlaceholderWhenReady();
        return;
      }

      var script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = function () {
        if (typeof Calendly !== "undefined" && Calendly.initInlineWidget) {
          Calendly.initInlineWidget({
            url: embedUrl,
            parentElement: container,
            prefill: {},
            utm: Object.fromEntries(utmFields.map(function (f) { return [f, params.get(f) || ""]; }))
          });
          hidePlaceholderWhenReady();
        }
      };
      document.head.appendChild(script);
    }

    // Ejecutar la carga recién cuando el scroll se detiene: evaluar el JS
    // de Calendly (widget + analytics, ~300KB en el frame principal) en
    // plena scrolleada congelaba frames por ~250ms a la altura de la cita.
    function loadWidgetOnScrollPause() {
      var idleTimer = null;
      function fire() {
        window.removeEventListener("scroll", onScroll);
        loadWidget();
      }
      function onScroll() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(fire, 220);
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    if ("IntersectionObserver" in window) {
      var lazyObserver = new IntersectionObserver(
        function (entries) {
          if (entries.some(function (e) { return e.isIntersecting; })) {
            lazyObserver.disconnect();
            loadWidgetOnScrollPause();
          }
        },
        { rootMargin: "1200px 0px" }
      );
      lazyObserver.observe(container);
    } else if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.requestAnimationFrame(loadWidget);
      });
    } else {
      window.requestAnimationFrame(loadWidget);
    }
  })();

  // Cursor aura — a single pre-rendered radial gradient follows the pointer.
  // Only transform and opacity change, so movement stays on the compositor and
  // avoids repainting the large CSS blur surfaces used by the previous effect.
  (function initCursorAuras() {
    var precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!precisePointer.matches || reducedMotion.matches) return;

    document.querySelectorAll("[data-cursor-aura-zone]").forEach(function (zone) {
      var aura = zone.querySelector("[data-cursor-aura]");
      if (!aura) return;

      var bounds = null;
      var targetX = 0;
      var targetY = 0;
      var currentX = 0;
      var currentY = 0;
      var targetOpacity = 0;
      var currentOpacity = 0;
      var frameId = 0;
      var previousTime = 0;
      var isVisible = true;

      function measure() {
        bounds = zone.getBoundingClientRect();
        return bounds;
      }

      function setPointerTarget(event, immediate) {
        var rect = bounds || measure();
        targetX = event.clientX - rect.left;
        targetY = event.clientY - rect.top;
        if (immediate) {
          currentX = targetX;
          currentY = targetY;
        }
      }

      function schedule() {
        if (isVisible && !frameId) frameId = window.requestAnimationFrame(render);
      }

      function render(time) {
        frameId = 0;
        var elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.064) : 1 / 60;
        previousTime = time;
        var positionBlend = 1 - Math.exp(-22 * elapsed);
        var opacityBlend = 1 - Math.exp(-14 * elapsed);

        currentX += (targetX - currentX) * positionBlend;
        currentY += (targetY - currentY) * positionBlend;
        currentOpacity += (targetOpacity - currentOpacity) * opacityBlend;

        aura.style.transform =
          "translate3d(" + currentX.toFixed(2) + "px," + currentY.toFixed(2) + "px,0) translate3d(-50%,-50%,0)";
        aura.style.opacity = currentOpacity.toFixed(3);

        var positionSettled = Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1;
        var opacitySettled = Math.abs(targetOpacity - currentOpacity) < 0.004;
        if (!positionSettled || !opacitySettled) schedule();
      }

      function enter(event) {
        bounds = null;
        previousTime = 0;
        setPointerTarget(event, true);
        targetOpacity = 1;
        schedule();
      }

      function move(event) {
        setPointerTarget(event, false);
        schedule();
      }

      function leave() {
        targetOpacity = 0;
        bounds = null;
        schedule();
      }

      function invalidateBounds() {
        bounds = null;
      }

      zone.addEventListener("pointerenter", enter, { passive: true });
      zone.addEventListener("pointermove", move, { passive: true });
      zone.addEventListener("pointerleave", leave, { passive: true });
      zone.addEventListener("pointercancel", leave, { passive: true });
      window.addEventListener("resize", invalidateBounds, { passive: true });
      window.addEventListener("scroll", invalidateBounds, { passive: true });

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          isVisible = entries.some(function (entry) { return entry.isIntersecting; });
          if (!isVisible) {
            if (frameId) window.cancelAnimationFrame(frameId);
            frameId = 0;
            previousTime = 0;
            targetOpacity = 0;
            currentOpacity = 0;
            aura.style.opacity = "0";
          }
        }).observe(zone);
      }
    });
  })();

  // ====================================================================
  // GSAP fallback. Las entradas .gsap-reveal viven en index.html para no
  // duplicar ScrollTrigger con este archivo.
  // ====================================================================
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

  } else {
    document.querySelectorAll(".gsap-reveal").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.filter = "none";
    });
  }

})();
