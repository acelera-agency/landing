// Editorial software flow: timing illustrates the steps, never product performance.
export const FLOW_MODES = Object.freeze(["direct", "ai"]);
export const FLOW_TIMING = Object.freeze({ input: 1.9, rules: 1.6, ai: 1.4, output: 2, settle: 0.7 });
export const normalizeMode = mode => mode === "ai" ? "ai" : "direct";
export const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
export function smoothstep(from, to, value) {
  const share = clamp01((value - from) / (to - from));
  return share * share * (3 - 2 * share);
}
export function flowDuration(mode) {
  return FLOW_TIMING.input + FLOW_TIMING.rules + FLOW_TIMING.output + FLOW_TIMING.settle + (normalizeMode(mode) === "ai" ? FLOW_TIMING.ai : 0);
}
export function routeAnchors(mode, proposed = {}) {
  const aiMode = normalizeMode(mode) === "ai";
  const fallback = aiMode ? { rules: 0.238, ai: 0.628, output: 0.98 } : { rules: 0.394, ai: 0.628, output: 0.98 };
  const value = { ...fallback };
  for (const key of Object.keys(value)) {
    if (Number.isFinite(proposed[key]) && proposed[key] > 0 && proposed[key] <= 1) value[key] = proposed[key];
  }
  if (value.rules >= value.output || (aiMode && (value.ai <= value.rules || value.ai >= value.output))) return fallback;
  return value;
}
export function advanceFlow(elapsed, seconds, mode) {
  const current = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const delta = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, 1 / 30));
  return Math.min(flowDuration(mode), current + delta);
}
export function followLevel(current, target, seconds, reduced = false) {
  if (reduced) return target;
  const dt = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, 1 / 30));
  const next = current + (target - current) * (1 - Math.exp(-dt / 0.12));
  return Math.abs(target - next) < 0.002 ? target : next;
}
export function flowFrame(elapsed, selectedMode = "direct", proposedAnchors = {}) {
  const mode = normalizeMode(selectedMode), anchors = routeAnchors(mode, proposedAnchors);
  const duration = flowDuration(mode), time = Math.min(duration, Math.max(0, Number.isFinite(elapsed) ? elapsed : 0));
  const rulesStart = FLOW_TIMING.input, aiStart = rulesStart + FLOW_TIMING.rules;
  const outputStart = aiStart + (mode === "ai" ? FLOW_TIMING.ai : 0), settledAt = outputStart + FLOW_TIMING.output;
  const active = { input: 0.35, rules: 0.35, ai: 0, output: 0 };
  const rows = [0, 0, 0, 0];
  let phase, label, progress, signalOpacity;
  if (time < rulesStart) {
    const share = time / FLOW_TIMING.input;
    phase = "input"; label = "Conectando datos";
    progress = anchors.rules * smoothstep(0, 1, share);
    active.input = 1; active.rules = smoothstep(0.65, 1, share);
    signalOpacity = smoothstep(0, 0.16, time) * (1 - 0.8 * smoothstep(0.8, 1, share));
  } else if (time < aiStart) {
    phase = "rules"; label = "Aplicando reglas"; progress = anchors.rules;
    active.rules = 1; signalOpacity = 0.2;
  } else if (mode === "ai" && time < outputStart) {
    const share = (time - aiStart) / FLOW_TIMING.ai;
    phase = "ai"; label = "Interpretando con IA";
    progress = anchors.rules + (anchors.ai - anchors.rules) * smoothstep(0, 0.75, share);
    active.ai = smoothstep(0.12, 0.7, share);
    signalOpacity = 0.2 + 0.8 * smoothstep(0, 0.18, share) * (1 - smoothstep(0.62, 0.82, share));
  } else if (time < settledAt) {
    const share = (time - outputStart) / FLOW_TIMING.output, start = mode === "ai" ? anchors.ai : anchors.rules;
    phase = "output"; label = "Actualizando la aplicación";
    progress = start + (anchors.output - start) * smoothstep(0, 0.62, share);
    active.ai = mode === "ai" ? 0.5 : 0; active.output = smoothstep(0.3, 0.7, share);
    signalOpacity = (0.2 + 0.8 * smoothstep(0, 0.12, share)) * (1 - smoothstep(0.65, 1, share));
    for (let index = 0; index < rows.length; index++) rows[index] = smoothstep(0.48 + index * 0.1, 0.65 + index * 0.1, share);
  } else {
    phase = "done"; label = "Aplicación actualizada"; progress = anchors.output; signalOpacity = 0;
    active.ai = mode === "ai" ? 0.5 : 0; active.output = 1; rows.fill(1);
  }
  return { mode, phase, label, progress: clamp01(progress), signalOpacity: clamp01(signalOpacity), active, rows, elapsed: time, complete: time === duration };
}
export const finalFrame = (mode, anchors) => flowFrame(flowDuration(mode), mode, anchors);
