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

  // Cursor trail — a soft terracotta wake that follows the pointer with inertia.
  // The shape is not a recording of the route: it is a chain of nodes where each
  // one chases the previous, so the tail always reads as a smooth ribbon, tapers
  // to nothing and retracts into the pointer as soon as the movement stops.
  (function initCursorTrails() {
    var precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!precisePointer.matches || reducedMotion.matches) return;

    var NODES = 26;            // length of the chain
    var HEAD_EASE = 0.38;      // how fast the head chases the pointer
    var TAIL_EASE = 0.26;      // how fast each node chases the previous one
    var MAX_LINK = 13;         // px between nodes, caps how far the wake stretches
    var HEAD_WIDTH = 8;        // px at the thickest point
    var SPEED_FOR_FULL = 11;   // px/frame needed for the trail at full opacity
    var TONES = {
      light: { head: [214, 116, 72], tail: [186, 84, 48], core: 0.58, halo: 0.1, ember: 0.06 },
      dark: { head: [244, 173, 141], tail: [201, 106, 67], core: 0.55, halo: 0.13, ember: 0.1 }
    };

    // Canvas filters let the halo be genuinely blurred instead of a wide fill,
    // which would crease against itself on tight curves. Falls back gracefully.
    var blurAvailable = (function () {
      var probe = document.createElement("canvas").getContext("2d");
      if (!probe || !("filter" in probe)) return false;
      probe.filter = "blur(4px)";
      return probe.filter === "blur(4px)";
    })();

    document.querySelectorAll("[data-cursor-trail-zone]").forEach(function (zone) {
      var canvas = zone.querySelector("[data-cursor-trail]");
      if (!canvas) return;

      var context = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!context) return;

      var tone = TONES[zone.dataset.cursorTrailTone === "dark" ? "dark" : "light"];
      var bounds = null;
      var nodes = [];
      var pointer = null;
      var presence = 0;
      var frameId = 0;
      var isVisible = true;
      var width = 0;
      var height = 0;
      var dpr = 1;

      function measure() {
        bounds = zone.getBoundingClientRect();
        return bounds;
      }

      function clear() {
        context.clearRect(0, 0, width, height);
      }

      function reset() {
        nodes = [];
        pointer = null;
        presence = 0;
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
        reset();
        bounds = null;
        clear();
      }

      function schedule() {
        if (isVisible && !frameId) frameId = window.requestAnimationFrame(render);
      }

      function track(event) {
        var rect = bounds || measure();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;

        pointer = { x: x, y: y };
        if (!nodes.length) {
          for (var index = 0; index < NODES; index += 1) nodes.push({ x: x, y: y });
        }
        schedule();
      }

      function mix(from, to, amount) {
        return [
          Math.round(from[0] + (to[0] - from[0]) * amount),
          Math.round(from[1] + (to[1] - from[1]) * amount),
          Math.round(from[2] + (to[2] - from[2]) * amount)
        ];
      }

      function rgba(color, alpha) {
        return "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + alpha.toFixed(3) + ")";
      }

      // Catmull-Rom resample: turns the node chain into a dense smooth spine so
      // fast gestures curve instead of showing the corners between nodes.
      function spine() {
        var points = [];
        var subdivisions = 4;
        var last = nodes.length - 1;

        for (var index = 0; index < last; index += 1) {
          var p0 = nodes[Math.max(0, index - 1)];
          var p1 = nodes[index];
          var p2 = nodes[index + 1];
          var p3 = nodes[Math.min(last, index + 2)];

          for (var step = 0; step < subdivisions; step += 1) {
            var t = step / subdivisions;
            var t2 = t * t;
            var t3 = t2 * t;
            points.push({
              x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
              y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
            });
          }
        }

        points.push({ x: nodes[last].x, y: nodes[last].y });
        return points;
      }

      // One continuous tapered ribbon filled with a gradient — a single fill
      // keeps it seamless, unlike stroking each segment on its own.
      function fillRibbon(points, spread, alpha) {
        if (alpha <= 0.004) return;

        var count = points.length;
        var edge = count - 1;
        var left = [];
        var right = [];

        for (var index = 0; index < count; index += 1) {
          var before = points[Math.max(0, index - 1)];
          var after = points[Math.min(edge, index + 1)];
          var length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
          var normalX = -(after.y - before.y) / length;
          var normalY = (after.x - before.x) / length;
          var life = 1 - index / edge;
          var half = (HEAD_WIDTH / 2) * spread * Math.pow(life, 0.7);

          left.push({ x: points[index].x + normalX * half, y: points[index].y + normalY * half });
          right.push({ x: points[index].x - normalX * half, y: points[index].y - normalY * half });
        }

        context.beginPath();
        context.moveTo(left[0].x, left[0].y);
        for (var forward = 1; forward < count; forward += 1) context.lineTo(left[forward].x, left[forward].y);
        for (var backward = edge; backward >= 0; backward -= 1) context.lineTo(right[backward].x, right[backward].y);
        context.closePath();

        var gradient = context.createLinearGradient(points[0].x, points[0].y, points[edge].x, points[edge].y);
        gradient.addColorStop(0, rgba(tone.head, alpha));
        gradient.addColorStop(0.4, rgba(mix(tone.head, tone.tail, 0.5), alpha * 0.6));
        gradient.addColorStop(1, rgba(tone.tail, 0));
        context.fillStyle = gradient;
        context.fill();

        // Round the leading end so the head reads as a drop, not a cut edge.
        // Filled on its own path: merging it above would punch a nonzero hole.
        context.beginPath();
        context.arc(points[0].x, points[0].y, (HEAD_WIDTH / 2) * spread, 0, Math.PI * 2);
        context.fillStyle = rgba(tone.head, alpha);
        context.fill();
      }

      function drawEmber(head, alpha) {
        if (alpha <= 0.004) return;
        var radius = HEAD_WIDTH * 2.6;
        var glow = context.createRadialGradient(head.x, head.y, 0, head.x, head.y, radius);
        glow.addColorStop(0, rgba(tone.head, alpha));
        glow.addColorStop(1, rgba(tone.head, 0));
        context.beginPath();
        context.fillStyle = glow;
        context.arc(head.x, head.y, radius, 0, Math.PI * 2);
        context.fill();
      }

      function render() {
        frameId = 0;
        clear();

        if (!nodes.length) return;

        // Inertia: the head eases toward the pointer, every other node toward
        // the node in front of it. Stop moving and the chain folds into itself.
        var head = nodes[0];
        var previousX = head.x;
        var previousY = head.y;
        if (pointer) {
          head.x += (pointer.x - head.x) * HEAD_EASE;
          head.y += (pointer.y - head.y) * HEAD_EASE;
        }
        for (var index = 1; index < nodes.length; index += 1) {
          var link = nodes[index];
          var ahead = nodes[index - 1];
          link.x += (ahead.x - link.x) * TAIL_EASE;
          link.y += (ahead.y - link.y) * TAIL_EASE;

          // Rope constraint: a sharp flick cannot stretch the wake indefinitely.
          var gapX = link.x - ahead.x;
          var gapY = link.y - ahead.y;
          var gap = Math.hypot(gapX, gapY);
          if (gap > MAX_LINK) {
            link.x = ahead.x + (gapX / gap) * MAX_LINK;
            link.y = ahead.y + (gapY / gap) * MAX_LINK;
          }
        }

        // Opacity follows the gesture: it appears while the pointer moves and
        // eases away when it rests, so an idle cursor leaves nothing behind.
        var speed = Math.hypot(head.x - previousX, head.y - previousY);
        var energy = pointer ? Math.min(1, speed / SPEED_FOR_FULL) : 0;
        presence += (energy - presence) * (energy > presence ? 0.4 : 0.09);

        var last = nodes.length - 1;
        var reach = Math.hypot(nodes[last].x - nodes[0].x, nodes[last].y - nodes[0].y);

        if (presence > 0.006 && reach > 1.5) {
          var points = spine();

          if (blurAvailable) {
            context.filter = "blur(7px)";
            fillRibbon(points, 1.6, presence * tone.halo * 1.7);
            context.filter = "none";
          } else {
            fillRibbon(points, 2.3, presence * tone.halo);
          }

          fillRibbon(points, 1, presence * tone.core);     // solid body
          drawEmber(nodes[0], presence * tone.ember);      // ember at the head
        }

        // Keep animating while the trail is visible, still folding back in, or
        // while the head has not caught up with the pointer yet.
        var chasing = pointer ? Math.hypot(pointer.x - nodes[0].x, pointer.y - nodes[0].y) : 0;
        if (presence > 0.006 || reach > 1.2 || chasing > 0.5) {
          schedule();
        } else if (!pointer) {
          reset();
        }
      }

      function invalidateBounds() {
        bounds = null;
      }

      function endTrail() {
        pointer = null;
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
