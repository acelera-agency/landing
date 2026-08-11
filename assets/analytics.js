(function () {
  "use strict";

  const PROJECT_TOKEN = "phc_pj2qsoyLwvpV2H2azgn57VeVZG7RxwEQruFmUfZhYpmV";
  const API_HOST = "https://us.i.posthog.com";
  const UI_HOST = "https://us.posthog.com";
  const CONSENT_KEY = "acelera-analytics-consent";
  const CONSENT_GRANTED = "granted";
  const CONSENT_DENIED = "denied";
  const DEBUG_PARAM = "posthog_debug";
  const trackedSections = new Set(["situaciones", "servicios", "proyectos", "proceso", "equipo", "contacto"]);
  const trackedScrollDepths = [25, 50, 75, 90];

  let posthogInitialized = false;
  let consentElement = null;
  const viewedSections = new Set();
  const reachedScrollDepths = new Set();

  function readConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch (_error) {
      return null;
    }
  }

  function writeConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch (_error) {
      // La elección sigue vigente durante la navegación actual aunque el storage esté bloqueado.
    }
  }

  function isCaptureEnvironment() {
    const productionHost = /(^|\.)acelera\.agency$/i.test(window.location.hostname);
    const debugEnabled = new URLSearchParams(window.location.search).get(DEBUG_PARAM) === "1";
    return productionHost || debugEnabled;
  }

  function pageContext() {
    const pathname = window.location.pathname || "/";
    let pageType = "landing";

    if (pathname.startsWith("/casos/")) pageType = "case_study";
    else if (["/privacidad", "/terminos"].includes(pathname)) pageType = "legal";
    else if (pathname !== "/") pageType = "service";

    return {
      page_path: pathname,
      page_title: document.title,
      page_type: pageType,
      site_language: document.documentElement.lang || "es-AR"
    };
  }

  function capture(eventName, properties) {
    if (!posthogInitialized || !window.posthog || readConsent() !== CONSENT_GRANTED) return false;

    window.posthog.capture(eventName, Object.assign({}, pageContext(), properties || {}));
    return true;
  }

  window.AceleraAnalytics = Object.freeze({
    capture,
    consent: function () {
      return readConsent();
    },
    openPreferences: openConsentPreferences
  });

  function loadPostHog() {
    if (window.posthog && window.posthog.__SV) return;

    !function (t, e) {
      var o, n, p, r;
      e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) {
        function g(t, e) {
          var o = e.split(".");
          2 === o.length && (t = t[o[0]], e = o[1]);
          t[e] = function () {
            t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
          };
        }

        (p = t.createElement("script")).type = "text/javascript";
        p.crossOrigin = "anonymous";
        p.async = true;
        p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
        (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
        var u = e;
        void 0 !== a ? u = e[a] = [] : a = "posthog";
        u.people = u.people || [];
        u.toString = function (t) {
          var e = "posthog";
          return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e;
        };
        u.people.toString = function () {
          return u.toString(1) + ".people (stub)";
        };
        o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" ");
        for (n = 0; n < o.length; n++) g(u, o[n]);
        e._i.push([i, s, a]);
      }, e.__SV = 1);
    }(document, window.posthog || []);
  }

  function initializePostHog() {
    if (posthogInitialized || !isCaptureEnvironment() || readConsent() !== CONSENT_GRANTED) return;

    loadPostHog();
    window.posthog.init(PROJECT_TOKEN, {
      api_host: API_HOST,
      ui_host: UI_HOST,
      defaults: "2026-05-30",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      capture_pageleave: "if_capture_pageview",
      capture_dead_clicks: true,
      autocapture: {
        dom_event_allowlist: ["click", "submit"],
        element_allowlist: ["a", "button", "form"],
        css_selector_ignorelist: [
          ".ph-no-autocapture",
          "[data-ph-no-autocapture]",
          ".ph-no-capture",
          "[data-analytics-consent]"
        ],
        element_attribute_ignorelist: ["value", "placeholder", "aria-label", "data-sensitive"],
        capture_copied_text: false
      },
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: ".ph-mask, [data-ph-mask]"
      },
      loaded: function (posthog) {
        posthog.register({
          site: "acelera.agency",
          analytics_version: "2026-08-11"
        });
      }
    });

    posthogInitialized = true;
  }

  function enableAnalytics(source) {
    writeConsent(CONSENT_GRANTED);

    if (posthogInitialized && window.posthog) {
      window.posthog.opt_in_capturing();
      window.posthog.startSessionRecording();
    } else {
      initializePostHog();
    }

    capture("analytics_consent_updated", { choice: CONSENT_GRANTED, source: source || "banner" });
  }

  function disableAnalytics(source) {
    if (posthogInitialized && window.posthog) {
      capture("analytics_consent_updated", { choice: CONSENT_DENIED, source: source || "banner" });
      window.posthog.stopSessionRecording();
      window.posthog.opt_out_capturing();
    }

    writeConsent(CONSENT_DENIED);
  }

  function buildConsentElement() {
    const element = document.createElement("section");
    element.className = "analytics-consent";
    element.dataset.analyticsConsent = "";
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-labelledby", "analytics-consent-title");
    element.setAttribute("aria-describedby", "analytics-consent-description");
    element.innerHTML = [
      '<div class="analytics-consent__copy">',
      '<p id="analytics-consent-title" class="analytics-consent__title">Analítica con privacidad</p>',
      '<p id="analytics-consent-description" class="analytics-consent__description">Usamos PostHog para entender visitas, recorridos y problemas de uso. Las grabaciones ocultan todos los campos del formulario y no activamos analítica hasta que elijas.</p>',
      '<a class="analytics-consent__link" href="/privacidad#tecnologias">Ver política de privacidad</a>',
      "</div>",
      '<div class="analytics-consent__actions">',
      '<button type="button" data-analytics-choice="deny">Solo necesarias</button>',
      '<button type="button" data-analytics-choice="accept" class="analytics-consent__accept">Aceptar analítica</button>',
      "</div>"
    ].join("");

    element.addEventListener("click", function (event) {
      const button = event.target.closest("[data-analytics-choice]");
      if (!button) return;

      if (button.dataset.analyticsChoice === "accept") enableAnalytics("banner");
      else disableAnalytics("banner");

      closeConsentPreferences();
    });

    return element;
  }

  function openConsentPreferences(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();

    if (!consentElement) {
      consentElement = buildConsentElement();
      document.body.appendChild(consentElement);
    }

    consentElement.hidden = false;
    window.requestAnimationFrame(function () {
      consentElement.classList.add("is-visible");
      const preferredAction = readConsent() === CONSENT_GRANTED ? "deny" : "accept";
      consentElement.querySelector('[data-analytics-choice="' + preferredAction + '"]')?.focus();
    });
  }

  function closeConsentPreferences() {
    if (!consentElement) return;
    consentElement.classList.remove("is-visible");
    window.setTimeout(function () {
      if (consentElement) consentElement.hidden = true;
    }, 220);
  }

  function safeDestination(anchor) {
    const rawHref = anchor.getAttribute("href") || "";
    if (rawHref.startsWith("mailto:")) return "email";
    if (rawHref.startsWith("tel:")) return "phone";

    try {
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin) return url.pathname + (url.hash || "");
      return url.hostname + url.pathname;
    } catch (_error) {
      return rawHref.split("?")[0].slice(0, 160);
    }
  }

  function installInteractionTracking() {
    document.addEventListener("click", function (event) {
      const preferencesLink = event.target.closest("[data-analytics-preferences]");
      if (preferencesLink) {
        openConsentPreferences(event);
        return;
      }

      const languageOption = event.target.closest("[data-language-option]");
      if (languageOption) {
        capture("language_changed", { language: languageOption.dataset.languageOption || "unknown" });
      }

      const anchor = event.target.closest("a[href]");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href") || "";
      const destination = safeDestination(anchor);
      const location = anchor.closest("header") ? "header" : anchor.closest("footer") ? "footer" : "content";

      if (rawHref.startsWith("mailto:")) {
        capture("contact_cta_clicked", { channel: "email", destination, location });
      } else if (/calendly\.com/i.test(anchor.href)) {
        capture("contact_cta_clicked", { channel: "calendar", destination, location });
      } else if (rawHref.includes("#contacto") || anchor.classList.contains("primary-action")) {
        capture("contact_cta_clicked", { channel: "form", destination, location });
      } else if (/\/casos\//.test(anchor.pathname)) {
        capture("case_study_clicked", { destination, location });
      } else if (anchor.origin && anchor.origin !== window.location.origin) {
        capture("outbound_link_clicked", { destination, location });
      }
    });

    document.querySelectorAll("[data-lead-form]").forEach(function (form) {
      let started = false;
      form.addEventListener("focusin", function (event) {
        if (started || !event.target.matches("input, textarea, select")) return;
        started = true;
        capture("contact_form_started", { form: "main_contact" });
      });
    });
  }

  function installSectionTracking() {
    if (!("IntersectionObserver" in window)) return;

    const candidates = Array.from(document.querySelectorAll("main [id], main section"))
      .filter(function (element) {
        return trackedSections.has(element.id) || element.hasAttribute("data-analytics-section");
      });

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const section = entry.target.id || entry.target.dataset.analyticsSection;
        if (!entry.isIntersecting || !section || viewedSections.has(section)) return;

        viewedSections.add(section);
        capture("section_viewed", { section });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.45 });

    candidates.forEach(function (element) {
      observer.observe(element);
    });
  }

  function installScrollTracking() {
    function measureScrollDepth() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const depth = Math.round((window.scrollY / scrollable) * 100);
      trackedScrollDepths.forEach(function (threshold) {
        if (depth < threshold || reachedScrollDepths.has(threshold)) return;
        reachedScrollDepths.add(threshold);
        capture("scroll_depth_reached", { depth_percent: threshold });
      });
    }

    window.addEventListener("scroll", measureScrollDepth, { passive: true });
    measureScrollDepth();
  }

  function installErrorTracking() {
    window.addEventListener("error", function (event) {
      let sourcePath = "unknown";
      try {
        sourcePath = event.filename ? new URL(event.filename, window.location.href).pathname : "unknown";
      } catch (_error) {
        sourcePath = "unknown";
      }
      capture("frontend_error", {
        error_type: "error",
        message: String(event.message || "Unknown error").slice(0, 160),
        source_path: sourcePath,
        line: event.lineno || null
      });
    });

    window.addEventListener("unhandledrejection", function (event) {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason || "Unknown rejection");
      capture("frontend_error", {
        error_type: "unhandled_rejection",
        message: reason.slice(0, 160)
      });
    });
  }

  function boot() {
    installInteractionTracking();
    installSectionTracking();
    installScrollTracking();
    installErrorTracking();

    if (readConsent() === CONSENT_GRANTED) initializePostHog();
    else if (readConsent() !== CONSENT_DENIED) openConsentPreferences();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
