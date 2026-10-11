import { advanceFlow, finalFrame, flowFrame, followLevel, normalizeMode } from './model.js?v=20261011-release-18';

const card = document.querySelector('[data-anatomy-card]');
if (card) {
  const stage = card.querySelector('[data-anatomy-stage]');
  const svg = stage?.querySelector('.anatomy-svg');
  const readout = card.querySelector('[data-anatomy-readout]');
  const status = card.querySelector('[data-anatomy-status]');
  const motionButton = card.querySelector('[data-anatomy-motion]');
  const modeButtons = [...card.querySelectorAll('button[data-anatomy-mode]')];
  const signal = svg?.querySelector('[data-anatomy-signal]');
  const halo = svg?.querySelector('[data-anatomy-signal-halo]');
  const rows = [...(svg?.querySelectorAll('[data-output-row]') || [])];
  const aiOnly = [...(svg?.querySelectorAll('[data-ai-only]') || [])];
  const nodes = Object.fromEntries(['input', 'rules', 'ai', 'output'].map(name => [name, [...(svg?.querySelectorAll('[data-flow-' + name + ']') || [])]]));
  const paths = Object.fromEntries(['direct', 'ai'].map(name => {
    const node = svg?.querySelector('[data-flow-path="' + name + '"]');
    return [name, node ? { node, length: node.getTotalLength(), anchors: { rules: Number(node.dataset.rulesAt), ai: Number(node.dataset.aiAt), output: Number(node.dataset.outputAt) } } : null];
  }));

  if (svg && readout && signal && halo && paths.direct?.length && paths.ai?.length) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let mode = normalizeMode(card.dataset.anatomyMode);
    let elapsed = 0, raf = 0, last = 0, idleTimer = 0;
    let visible = false, hovered = false, focused = false, paused = false, playing = false;
    let source = 'idle', phase = '';
    let current = finalFrame(mode, paths[mode].anchors);
    let lastAnnounced = '';

    function announce(text) {
      if (!status || text === lastAnnounced) return;
      status.textContent = text; lastAnnounced = text;
    }
    function updateControls() {
      card.dataset.anatomyMode = mode; svg.dataset.flowMode = mode;
      for (const node of aiOnly) node.removeAttribute('opacity');
      for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.anatomyMode === mode));
      svg.setAttribute('aria-label', mode === 'ai' ? 'Terminal con una aplicación: los datos pasan por reglas y una etapa opcional de IA antes de actualizar el resultado.' : 'Terminal con una aplicación: los datos pasan por reglas y actualizan el resultado, sin una etapa de IA.');
      if (!motionButton) return;
      motionButton.disabled = reduced.matches; motionButton.dataset.paused = String(paused || reduced.matches);
      motionButton.setAttribute('aria-label', reduced.matches ? 'Animación desactivada por movimiento reducido' : paused ? 'Reanudar la animación del software' : 'Pausar la animación del software');
    }
    function writeLevel(element, level) {
      element.style.setProperty('--flow-active', level.toFixed(3));
      const active = String(level > 0.7);
      if (element.dataset.active !== active) element.dataset.active = active;
    }
    function draw(frame, immediate = false, seconds = 1 / 60) {
      for (const name of Object.keys(nodes)) {
        current.active[name] = followLevel(current.active[name], frame.active[name], seconds, immediate);
        for (const node of nodes[name]) writeLevel(node, current.active[name]);
      }
      for (let index = 0; index < rows.length; index++) {
        current.rows[index] = followLevel(current.rows[index] ?? 1, frame.rows[index] ?? 1, seconds, immediate);
        writeLevel(rows[index], current.rows[index]);
      }
      const point = paths[mode].node.getPointAtLength(paths[mode].length * frame.progress);
      for (const node of [signal, halo]) { node.setAttribute('cx', point.x.toFixed(3)); node.setAttribute('cy', point.y.toFixed(3)); }
      // Inline opacity takes priority over the standalone SVG's halo styles.
      signal.style.opacity = frame.signalOpacity.toFixed(3); halo.style.opacity = (frame.signalOpacity * 0.15).toFixed(3);
      if (readout.textContent !== frame.label) readout.textContent = frame.label;
      if (phase !== frame.phase) {
        phase = frame.phase; card.dataset.flowPhase = phase;
        if (source === 'user' && playing) announce(frame.label);
      }
    }
    function stop() {
      cancelAnimationFrame(raf); raf = 0; last = 0; card.dataset.animating = 'false';
    }
    function canIdle() { return visible && !document.hidden && !reduced.matches && !paused && !hovered && !focused; }
    function canRun() { return visible && !document.hidden && !reduced.matches && !paused && playing && (source === 'user' || (!hovered && !focused)); }
    function tick(now) {
      raf = 0;
      if (!canRun()) { stop(); return; }
      const seconds = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now; elapsed = advanceFlow(elapsed, seconds, mode);
      const frame = flowFrame(elapsed, mode, paths[mode].anchors);
      draw(frame, false, seconds);
      if (frame.complete) { draw(frame, true); playing = false; stop(); scheduleIdle(); return; }
      card.dataset.animating = 'true'; raf = requestAnimationFrame(tick);
    }
    function run() { if (!raf && canRun()) { last = 0; raf = requestAnimationFrame(tick); } }
    function begin(nextMode, origin = 'user') {
      clearTimeout(idleTimer); stop();
      mode = normalizeMode(nextMode); source = origin; elapsed = 0; phase = ''; updateControls();
      if (reduced.matches || paused) {
        playing = false; current = finalFrame(mode, paths[mode].anchors); draw(current, true);
        if (origin === 'user') announce((mode === 'ai' ? 'Con IA' : 'Sin IA') + '. Aplicación actualizada.');
        return;
      }
      playing = true;
      // A restart has an invisible signal, never a visible trip backwards.
      draw(flowFrame(0, mode, paths[mode].anchors));
      if (origin === 'user') announce((mode === 'ai' ? 'Con IA' : 'Sin IA') + '. Conectando datos.');
      run();
    }
    function scheduleIdle(delay = 3600) {
      clearTimeout(idleTimer);
      if (!canIdle()) return;
      idleTimer = setTimeout(() => {
        if (!canIdle()) return;
        if (playing) run(); else begin(mode, 'idle');
      }, delay);
    }
    function holdIdle() { clearTimeout(idleTimer); if (source === 'idle') stop(); }
    for (const button of modeButtons) button.addEventListener('click', () => begin(button.dataset.anatomyMode));
    card.addEventListener('pointerenter', event => { if (event.pointerType !== 'mouse') return; hovered = true; holdIdle(); });
    card.addEventListener('pointerleave', () => { hovered = false; scheduleIdle(); });
    card.addEventListener('focusin', () => { focused = true; holdIdle(); announce((mode === 'ai' ? 'Con IA' : 'Sin IA') + '. ' + readout.textContent + '.'); });
    card.addEventListener('focusout', event => { if (card.contains(event.relatedTarget)) return; focused = false; scheduleIdle(); });
    motionButton?.addEventListener('click', () => {
      paused = !paused; updateControls(); clearTimeout(idleTimer);
      if (paused) stop();
      else if (playing) { source = 'user'; run(); }
      else begin(mode, 'user');
      announce(paused ? 'Animación pausada.' : 'Animación habilitada.');
    });
    new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting;
      if (!visible) { clearTimeout(idleTimer); stop(); return; }
      if (playing) run(); else scheduleIdle(1400);
    }, { rootMargin: '120px 0px', threshold: 0.08 }).observe(card);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearTimeout(idleTimer); stop(); }
      else if (playing) run(); else scheduleIdle();
    });
    reduced.addEventListener('change', () => {
      clearTimeout(idleTimer); stop(); playing = false;
      current = finalFrame(mode, paths[mode].anchors); draw(current, true); updateControls();
      if (!reduced.matches) scheduleIdle();
    });
    addEventListener('pagehide', () => { clearTimeout(idleTimer); stop(); });
    updateControls(); draw(current, true);
  }
}
