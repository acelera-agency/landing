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

  // Cursor trail — draws the pointer's recent route and then lets it disappear.
  // There is no fixed shape attached to the cursor; the canvas only renders
  // while a real path exists and is cleared as soon as that path expires.
  (function initCursorTrails() {
    var precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!precisePointer.matches || reducedMotion.matches) return;

    var TRAIL_LIFETIME = 680;
    var MAX_POINTS = 110;
    var SAMPLE_DISTANCE = 8;

    document.querySelectorAll("[data-cursor-trail-zone]").forEach(function (zone) {
      var canvas = zone.querySelector("[data-cursor-trail]");
      if (!canvas) return;

      var context = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!context) return;

      var bounds = null;
      var points = [];
      var lastPoint = null;
      var frameId = 0;
      var isVisible = true;
      var width = 0;
      var height = 0;
      var dpr = 1;
      var darkTone = zone.dataset.cursorTrailTone === "dark";

      function measure() {
        bounds = zone.getBoundingClientRect();
        return bounds;
      }

      function clear() {
        context.clearRect(0, 0, width, height);
      }

      function resize() {
        width = Math.max(1, zone.clientWidth);
        height = Math.max(1, zone.clientHeight);
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        var pixelWidth = Math.max(1, Math.round(width * dpr));
        var pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.lineCap = "round";
        context.lineJoin = "round";
        points = [];
        lastPoint = null;
        bounds = null;
        clear();
      }

      function schedule() {
        if (isVisible && !frameId) frameId = window.requestAnimationFrame(render);
      }

      function addPoint(x, y, createdAt) {
        if (!lastPoint) {
          lastPoint = { x: x, y: y, createdAt: createdAt };
          points.push(lastPoint);
          schedule();
          return;
        }

        var deltaX = x - lastPoint.x;
        var deltaY = y - lastPoint.y;
        var distance = Math.hypot(deltaX, deltaY);
        if (distance < 1.25) return;

        var steps = Math.min(18, Math.max(1, Math.ceil(distance / SAMPLE_DISTANCE)));
        var origin = lastPoint;
        for (var step = 1; step <= steps; step += 1) {
          var progress = step / steps;
          points.push({
            x: origin.x + deltaX * progress,
            y: origin.y + deltaY * progress,
            createdAt: createdAt - (steps - step) * 0.4
          });
        }

        lastPoint = points[points.length - 1];
        if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
        schedule();
      }

      function track(event) {
        var rect = bounds || measure();
        var coalesced = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
        var samples = coalesced.length ? coalesced : [event];
        var now = performance.now();

        samples.forEach(function (sample, index) {
          addPoint(
            sample.clientX - rect.left,
            sample.clientY - rect.top,
            now - (samples.length - index - 1) * 0.6
          );
        });
      }

      function strokeSegment(start, control, end, widthValue, alpha, color) {
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.quadraticCurveTo(control.x, control.y, end.x, end.y);
        context.lineWidth = widthValue;
        context.strokeStyle = "rgba(" + color + "," + alpha.toFixed(3) + ")";
        context.stroke();
      }

      function render(now) {
        frameId = 0;
        clear();
        points = points.filter(function (point) {
          return now - point.createdAt < TRAIL_LIFETIME;
        });

        if (points.length > 1) {
          for (var index = 1; index < points.length; index += 1) {
            var previous = points[Math.max(0, index - 2)];
            var control = points[index - 1];
            var current = points[index];
            var start = index === 1
              ? control
              : { x: (previous.x + control.x) / 2, y: (previous.y + control.y) / 2 };
            var end = index === points.length - 1
              ? current
              : { x: (control.x + current.x) / 2, y: (control.y + current.y) / 2 };
            var life = Math.max(0, 1 - (now - control.createdAt) / TRAIL_LIFETIME);
            var alpha = life * life;
            var lineWidth = 0.6 + life * 2.15;

            strokeSegment(
              start,
              control,
              end,
              lineWidth * 3.4,
              alpha * (darkTone ? 0.13 : 0.09),
              darkTone ? "229,127,83" : "201,106,67"
            );
            strokeSegment(
              start,
              control,
              end,
              lineWidth,
              alpha * (darkTone ? 0.72 : 0.58),
              darkTone ? "239,143,101" : "194,65,12"
            );
          }
        }

        if (points.length) schedule();
      }

      function invalidateBounds() {
        bounds = null;
      }

      function endTrail() {
        lastPoint = null;
        bounds = null;
        schedule();
      }

      zone.addEventListener("pointerenter", track, { passive: true });
      zone.addEventListener("pointermove", track, { passive: true });
      zone.addEventListener("pointerleave", endTrail, { passive: true });
      zone.addEventListener("pointercancel", endTrail, { passive: true });
      window.addEventListener("scroll", invalidateBounds, { passive: true });

      if ("ResizeObserver" in window) {
        new ResizeObserver(resize).observe(zone);
      } else {
        window.addEventListener("resize", resize, { passive: true });
      }

      resize();

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          isVisible = entries.some(function (entry) { return entry.isIntersecting; });
          if (!isVisible) {
            if (frameId) window.cancelAnimationFrame(frameId);
            frameId = 0;
            points = [];
            lastPoint = null;
            clear();
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
