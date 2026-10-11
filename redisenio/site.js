(() => {
  "use strict";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 809px)");
  // Keep the shared privacy dialog on the current site route.
  const policyObserver = new MutationObserver(() => {
    const link = document.querySelector(".analytics-consent__link");
    if (!link) return;
    link.href = (location.pathname.startsWith("/redisenio/") ? "/redisenio" : "") + "/privacidad#tecnologias";
    policyObserver.disconnect();
  });
  policyObserver.observe(document.body, { childList: true });
  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#mobile-menu");
  const setMenu = (open, restoreFocus = false) => {
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    if (restoreFocus) menuButton.focus();
  };
  menuButton.addEventListener("click", () => setMenu(menu.hidden));
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) setMenu(false, true);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".navigation") && !menu.hidden) setMenu(false);
  });
  mobile.addEventListener("change", () => setMenu(false));

  const track = document.querySelector("#project-track");
  if (track) {
    const previous = document.querySelector("[data-project-prev]");
    const next = document.querySelector("[data-project-next]");
    const position = document.querySelector("#project-position");
    const cards = [...track.children];
    const updateProjects = () => {
      const step = cards[0].getBoundingClientRect().width + 10;
      const first = Math.round(track.scrollLeft / step);
      const visible = Math.max(1, Math.round(track.clientWidth / step));
      previous.disabled = track.scrollLeft < 2;
      next.disabled =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 3;
      position.textContent = `${String(first + 1).padStart(2, "0")} — ${String(Math.min(first + visible, cards.length)).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
    };
    const moveProjects = (direction, keyboard = false) =>
      track.scrollBy({
        left: direction * (cards[0].getBoundingClientRect().width + 10),
        behavior: reducedMotion.matches || keyboard ? "instant" : "smooth",
      });
    previous.addEventListener("click", () => moveProjects(-1));
    next.addEventListener("click", () => moveProjects(1));
    track.addEventListener("scroll", updateProjects, { passive: true });
    track.addEventListener("keydown", (event) => {
      if (
        event.target !== track ||
        mobile.matches ||
        !["ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
      event.preventDefault();
      moveProjects(event.key === "ArrowRight" ? 1 : -1, true);
    });
    new ResizeObserver(updateProjects).observe(track);
  }

  const dialog = document.querySelector(".demo-dialog");
  if (dialog) {
    const video = dialog.querySelector("video");
    document
      .querySelector("[data-demo]")
      ?.addEventListener("click", () => dialog.showModal());
    document
      .querySelector("[data-close-demo]")
      ?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => video.pause());
  }
  document.querySelector("[data-year]").textContent = new Date().getFullYear();

  // Keep each silhouette still; color only the texture under the pointer.
  // Cache the drawing separately from the footer's optional low-rate shimmer.
  const artworks = [];
  const glyphs = [".", ":", "+", "*", "o", "O", "#", "@"];
  const heroArt = document.querySelector(".hand-left [data-ascii]");
  const footerFrame = document.querySelector(".footer-main");
  let hoverRadius = 44;
  const updateHoverRadius = () => {
    // Both hands share the hero's brush size, regardless of the footer crop.
    // Internal pages have no hero; mirror its responsive share of the frame.
    const handShare = window.matchMedia("(max-width: 599px)").matches
      ? 0.58 : mobile.matches ? 0.55 : 0.535;
    const referenceWidth = heroArt?.clientWidth || Math.round(
      (footerFrame?.clientWidth || document.documentElement.clientWidth) * handShare,
    );
    hoverRadius = Math.min(125, Math.max(44, referenceWidth * 0.16));
  };
  updateHoverRadius();
  let artFrame = 0;
  let artTime = 0;
  let textureTimer = 0;
  const needsPaint = (art) =>
    Math.abs(art.pointer.mix - art.target.mix) > 0.002 ||
    (art.target.mix > 0 &&
      Math.hypot(art.pointer.x - art.target.x, art.pointer.y - art.target.y) >
        0.3);
  const drawBlockArt = (art, cell, rowHeight, offsetX, offsetY) => {
    const { columns, rows, samples, dpr, spotContext, baseContext } = art;
    // Paint the three Unicode-style density blocks directly, so the texture
    // stays identical even when the system's fallback font changes.
    if (art.patternDpr !== dpr) {
      const dot = Math.max(1, Math.round(dpr));
      const order = [0, 2, 3, 1];
      art.blockPatterns = [null];
      for (let level = 1; level <= 3; level++) {
        const tile = document.createElement("canvas");
        tile.width = tile.height = dot * 2;
        const tileContext = tile.getContext("2d");
        tileContext.fillStyle = art.color;
        for (let i = 0; i < order.length; i++) {
          if (order[i] < level)
            tileContext.fillRect((i % 2) * dot, Math.floor(i / 2) * dot, dot, dot);
        }
        art.blockPatterns.push(spotContext.createPattern(tile, "repeat"));
      }
      art.patternDpr = dpr;
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const shade = samples[y * columns + x];
        if (shade < 0.085) continue;
        const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = seed - Math.floor(seed);
        const jitter = (noise * 2 - 1) * 0.12;
        const phase = noise * Math.PI * 2;
        // Independent slow phases change neighboring density levels gradually,
        // without shifting the hand or flashing the entire texture at once.
        const drift = art.glitchMotion
          ? (Math.sin(phase + art.textureFrame * (0.28 + noise * 0.16)) -
              Math.sin(phase)) * 0.08
          : 0;
        const level = Math.max(0, Math.min(3, Math.floor((shade + jitter + drift) * 4.5)));
        if (!level) continue;
        // Shared, rounded boundaries keep coarse cells flush without seams.
        const left = Math.round((offsetX + x * cell) * dpr);
        const right = Math.round((offsetX + (x + 1) * cell) * dpr);
        const top = Math.round((offsetY + y * rowHeight) * dpr);
        const bottom = Math.round((offsetY + (y + 1) * rowHeight) * dpr);
        spotContext.fillStyle = art.blockPatterns[level];
        spotContext.fillRect(left, top, right - left, bottom - top);
      }
    }
    // Tint only the crisp texture, matching the hero; keep the resting glow gray.
    art.warmContext.drawImage(art.spot, 0, 0);
    baseContext.save();
    baseContext.setTransform(1, 0, 0, 1, 0, 0);
    if (art.glow) {
      baseContext.globalAlpha = 0.16;
      baseContext.shadowColor = art.color;
      baseContext.shadowBlur = 3.5 * dpr;
      baseContext.drawImage(art.spot, 0, 0);
      baseContext.globalAlpha = 1;
      baseContext.shadowBlur = 0;
    }
    baseContext.drawImage(art.spot, 0, 0);
    baseContext.restore();
    spotContext.clearRect(0, 0, art.spot.width, art.spot.height);
  };
  const rebuildArt = (art) => {
    const width = art.element.clientWidth;
    const height = art.element.clientHeight;
    if (!width || !height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resized = art.width !== width || art.height !== height || art.dpr !== dpr;
    if (!resized && !art.textureDirty) return true;
    Object.assign(art, { width, height, dpr });
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (resized) {
      for (const canvas of [art.canvas, art.base, art.warm, art.spot]) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
    } else {
      // Texture frames reuse their canvases. Clear both color caches together,
      // including the shared hover mask, so density and glow never accumulate.
      for (const context of [art.baseContext, art.warmContext, art.spotContext]) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, pixelWidth, pixelHeight);
      }
    }
    const { columns, rows, samples, baseContext } = art;
    const cell = Math.min(width / columns, height / (rows * 1.667));
    const fontSize = cell * 1.667;
    const offsetX = (width - columns * cell) / 2;
    const offsetY = (height - rows * fontSize) / 2;
    baseContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseContext.fillStyle = art.color;
    baseContext.font = `${fontSize}px "Fragment Mono", monospace`;
    baseContext.textBaseline = "middle";
    baseContext.textAlign = "center";
    if (art.blockStyle) {
      drawBlockArt(art, cell, fontSize, offsetX, offsetY);
    } else {
      // ASCII characters use the actual mono font. Drawing each cell avoids
      // cumulative spacing drift and the horizontal seams of Unicode blocks.
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const shade = samples[y * columns + x];
          if (shade < 0.085) continue;
          const level = Math.min(
            glyphs.length - 1,
            Math.floor(((shade - 0.085) / 0.915) * glyphs.length),
          );
          baseContext.fillText(
            glyphs[level],
            offsetX + (x + 0.5) * cell,
            offsetY + (y + 0.5) * fontSize,
          );
        }
      }
    }
    if (!art.blockStyle) art.warmContext.drawImage(art.base, 0, 0);
    art.warmContext.globalCompositeOperation = "source-in";
    art.warmContext.fillStyle = art.hoverColor || art.color;
    art.warmContext.fillRect(0, 0, pixelWidth, pixelHeight);
    art.warmContext.globalCompositeOperation = "source-over";
    art.textureDirty = false;
    return true;
  };
  const drawArt = (art) => {
    if (!rebuildArt(art)) return;
    const { context, canvas, pointer, dpr } = art;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(art.base, 0, 0);
    if (art.hoverColor && pointer.mix > 0.002) {
      const radius = hoverRadius * dpr;
      const x = pointer.x * dpr;
      const y = pointer.y * dpr;
      const mask = art.spotContext;
      mask.clearRect(0, 0, canvas.width, canvas.height);
      mask.drawImage(art.warm, 0, 0);
      const gradient = mask.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(0,0,0,${pointer.mix})`);
      gradient.addColorStop(0.34, `rgba(0,0,0,${pointer.mix * 0.95})`);
      gradient.addColorStop(0.72, `rgba(0,0,0,${pointer.mix * 0.4})`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      mask.globalCompositeOperation = "destination-in";
      mask.fillStyle = gradient;
      mask.fillRect(0, 0, canvas.width, canvas.height);
      mask.globalCompositeOperation = "source-over";
      context.drawImage(art.spot, 0, 0);
    }
    art.element.classList.add("is-rendered");
  };
  const canAnimateTexture = (art) =>
    art.glitchMotion && art.visible && !document.hidden && !reducedMotion.matches;
  const syncTextureAnimation = () => {
    let active = false;
    for (const art of artworks) {
      if (!art.glitchMotion) continue;
      const animating = canAnimateTexture(art);
      const state = String(animating);
      if (art.element.dataset.animating !== state)
        art.element.dataset.animating = state;
      active ||= animating;
    }
    if (!active) {
      clearTimeout(textureTimer);
      textureTimer = 0;
    } else if (!textureTimer) {
      // A timeout avoids an idle 60 fps loop between these 8 fps texture frames.
      textureTimer = window.setTimeout(animateTexture, 125);
    }
  };
  const animateTexture = () => {
    textureTimer = 0;
    for (const art of artworks) {
      if (!canAnimateTexture(art)) continue;
      art.textureFrame += 1;
      art.textureDirty = true;
      drawArt(art);
      art.element.dataset.textureFrame = String(art.textureFrame);
    }
    // Resume from the current frame after a pause; never catch up missed time.
    syncTextureAnimation();
  };
  const animateArt = (timestamp) => {
    artFrame = 0;
    if (document.hidden) return;
    const seconds = artTime ? Math.min((timestamp - artTime) / 1000, 0.04) : 1 / 60;
    artTime = timestamp;
    let pending = false;
    for (const art of artworks) {
      if (!art.visible || !needsPaint(art)) continue;
      const positionStep = 1 - Math.exp(-seconds / 0.04);
      const colorStep = 1 - Math.exp(-seconds / 0.055);
      art.pointer.x += (art.target.x - art.pointer.x) * positionStep;
      art.pointer.y += (art.target.y - art.pointer.y) * positionStep;
      art.pointer.mix += (art.target.mix - art.pointer.mix) * colorStep;
      if (!needsPaint(art)) Object.assign(art.pointer, art.target);
      drawArt(art);
      pending ||= needsPaint(art);
    }
    if (pending) artFrame = requestAnimationFrame(animateArt);
    else artTime = 0;
  };
  const requestArtPaint = (art) => {
    if (document.hidden || !art.visible) return;
    if (reducedMotion.matches) {
      Object.assign(art.pointer, art.target);
      drawArt(art);
    } else if (!artFrame && needsPaint(art)) {
      artFrame = requestAnimationFrame(animateArt);
    }
  };
  const clearArtPointer = (art) => {
    art.target.mix = 0;
    art.touchId = null;
    art.element.dataset.hovering = "false";
    requestArtPaint(art);
  };
  const artObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const art = artworks.find((item) => item.element === entry.target);
      if (!art) continue;
      art.visible = entry.isIntersecting;
      if (art.visible) drawArt(art);
      else {
        art.pointer.mix = art.target.mix = 0;
        art.touchId = null;
        art.element.dataset.hovering = "false";
      }
    }
    syncTextureAnimation();
  });
  const artResize = new ResizeObserver((entries) => {
    updateHoverRadius();
    for (const entry of entries) {
      const art = artworks.find((item) => item.element === entry.target);
      if (art?.visible) {
        art.pointer.mix = art.target.mix = 0;
        art.touchId = null;
        art.element.dataset.hovering = "false";
        drawArt(art);
      }
    }
  });
  const prepareArt = async (element) => {
    const picture = new Image();
    picture.src = element.dataset.ascii;
    try {
      await picture.decode();
    } catch {
      return; // The original image remains the no-canvas fallback.
    }
    await document.fonts.load('10px "Fragment Mono"').catch(() => {});
    const columns = Number(element.dataset.columns || 138);
    const requestedCrop = (element.dataset.crop || "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    const validCrop =
      requestedCrop.length === 4 &&
      requestedCrop.every(Number.isFinite) &&
      requestedCrop[0] >= 0 &&
      requestedCrop[1] >= 0 &&
      requestedCrop[2] > 0 &&
      requestedCrop[3] > 0 &&
      requestedCrop[0] + requestedCrop[2] <= picture.naturalWidth &&
      requestedCrop[1] + requestedCrop[3] <= picture.naturalHeight;
    const [sourceX, sourceY, sourceWidth, sourceHeight] = validCrop
      ? requestedCrop
      : [0, 0, picture.naturalWidth, picture.naturalHeight];
    const aspect = sourceWidth / sourceHeight;
    const rows = Math.max(1, Math.round((columns / aspect) * 0.6));
    const source = document.createElement("canvas");
    source.width = columns;
    source.height = rows;
    const sourceContext = source.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) return;
    sourceContext.drawImage(
      picture,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      columns,
      rows,
    );
    const rgba = sourceContext.getImageData(0, 0, columns, rows).data;
    const samples = new Float32Array(columns * rows);
    for (let i = 0; i < samples.length; i++) {
      const p = i * 4;
      const luminance =
        (rgba[p] * 0.2126 + rgba[p + 1] * 0.7152 + rgba[p + 2] * 0.0722) /
        255;
      samples[i] =
        (element.dataset.luminance ? luminance : Math.max(0, 1 - luminance)) *
        (rgba[p + 3] / 255);
    }
    const canvas = document.createElement("canvas");
    const base = document.createElement("canvas");
    const warm = document.createElement("canvas");
    const spot = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const baseContext = base.getContext("2d");
    const warmContext = warm.getContext("2d");
    const spotContext = spot.getContext("2d");
    if (!context || !baseContext || !warmContext || !spotContext) return;
    canvas.setAttribute("aria-hidden", "true");
    element.append(canvas);
    const art = {
      element, canvas, context, base, baseContext, warm, warmContext,
      spot, spotContext, samples, columns, rows,
      blockStyle: element.dataset.asciiStyle === "blocks",
      glitchMotion: element.dataset.asciiStyle === "blocks" &&
        element.dataset.asciiMotion === "glitch",
      textureFrame: 0,
      textureDirty: false,
      glow: element.dataset.glow === "true",
      color: element.dataset.tone || "#b0b0b0",
      hoverColor: element.dataset.hoverColor,
      visible: false,
      pointer: { x: 0, y: 0, mix: 0 },
      target: { x: 0, y: 0, mix: 0 },
      touchId: null,
    };
    if (art.glitchMotion) {
      element.dataset.animating = "false";
      element.dataset.textureFrame = "0";
    }
    if (art.hoverColor) {
      const point = (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (element.clientWidth / rect.width);
        const y = (event.clientY - rect.top) * (element.clientHeight / rect.height);
        if (!art.target.mix) {
          art.pointer.x = x;
          art.pointer.y = y;
        }
        Object.assign(art.target, { x, y, mix: 1 });
        element.dataset.hovering = "true";
        requestArtPaint(art);
      };
      element.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "touch") point(event);
      }, { passive: true });
      element.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "touch" || art.touchId === event.pointerId)
          point(event);
      }, { passive: true });
      element.addEventListener("pointerleave", () => clearArtPointer(art));
      element.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch" || art.touchId !== null) return;
        art.touchId = event.pointerId;
        point(event);
      }, { passive: true });
      element.addEventListener("pointerup", (event) => {
        if (art.touchId === event.pointerId) clearArtPointer(art);
      });
      element.addEventListener("pointercancel", () => clearArtPointer(art));
    }
    artworks.push(art);
    artObserver.observe(element);
    artResize.observe(element);
  };
  const lazyArt = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        lazyArt.unobserve(entry.target);
        prepareArt(entry.target);
      }
    },
    { rootMargin: "300px" },
  );
  document.querySelectorAll("[data-ascii]").forEach((element) =>
    lazyArt.observe(element),
  );
  document.addEventListener("visibilitychange", () => {
    if (artFrame) cancelAnimationFrame(artFrame);
    artFrame = artTime = 0;
    for (const art of artworks) {
      art.pointer.mix = art.target.mix = 0;
      art.touchId = null;
      art.element.dataset.hovering = "false";
      if (!document.hidden && art.visible) drawArt(art);
    }
    syncTextureAnimation();
  });
  reducedMotion.addEventListener("change", () => {
    if (artFrame) cancelAnimationFrame(artFrame);
    artFrame = artTime = 0;
    for (const art of artworks) {
      Object.assign(art.pointer, art.target);
      if (art.visible) drawArt(art);
    }
    syncTextureAnimation();
  });
  window.addEventListener("resize", () => {
    // A monitor or zoom change can alter DPR without changing the CSS box.
    updateHoverRadius();
    for (const art of artworks) if (art.visible) drawArt(art);
  }, { passive: true });

  const hero = document.querySelector(".hero");
  const header = document.querySelector(".site-header");
  let heroVisible = !!hero;
  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
    header?.classList.toggle("is-scrolled", window.scrollY > 20);
    if (!hero || !heroVisible) return;
    const progress = reducedMotion.matches
      ? 1
      : Math.min(1, Math.max(0, window.scrollY / 400));
    hero.style.setProperty("--left-hand-x", `${-50 + progress * 50}px`);
    hero.style.setProperty("--right-hand-x", `${50 - progress * 50}px`);
  };
  if (hero)
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible) updateScroll();
    }).observe(hero);
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    },
    { passive: true },
  );
  reducedMotion.addEventListener("change", updateScroll);
  updateScroll();

  // Content stays visible without JavaScript. Only offscreen items get a one-time entrance.
  const revealObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("reveal-pending");
        revealObserver.unobserve(entry.target);
      }),
    { threshold: 0.08 },
  );
  document
    .querySelectorAll(
      ".section-heading,.service-row,.process-card,.tech-card,.team-card,.faq-item,.system-visual",
    )
    .forEach((element) => {
      element.classList.add("reveal-item");
      if (
        !reducedMotion.matches &&
        element.getBoundingClientRect().top > innerHeight
      )
        element.classList.add("reveal-pending");
      revealObserver.observe(element);
    });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches)
      document
        .querySelectorAll(".reveal-pending")
        .forEach((element) => element.classList.remove("reveal-pending"));
  });

})();
