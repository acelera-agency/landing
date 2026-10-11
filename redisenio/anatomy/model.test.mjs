import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceFlow, finalFrame, flowDuration, flowFrame, followLevel, routeAnchors } from './model.js';

for (const mode of ['direct', 'ai']) {
  test(`${mode}: flow is bounded, continuous and completes in the right order`, () => {
    const phases = new Set();
    let last = flowFrame(0, mode);
    for (let step = 0; step <= 1000; step++) {
      const frame = flowFrame(flowDuration(mode) * step / 1000, mode);
      phases.add(frame.phase);
      assert.ok(frame.progress >= last.progress - 1e-10 && frame.progress <= 1);
      assert.ok(frame.signalOpacity >= 0 && frame.signalOpacity <= 1);
      // The shortest smoothstep envelope is 160 ms (maximum slope 9.375/s).
      assert.ok(Math.abs(frame.signalOpacity - last.signalOpacity) <= 10 * flowDuration(mode) / 1000);
      for (let row = 0; row < 4; row++) {
        assert.ok(frame.rows[row] >= last.rows[row] && frame.rows[row] <= 1);
        if (row) assert.ok(frame.rows[row] <= frame.rows[row - 1]);
      }
      if (mode === 'direct') assert.equal(frame.active.ai, 0);
      last = frame;
    }
    assert.deepEqual([...phases], mode === 'ai' ? ['input', 'rules', 'ai', 'output', 'done'] : ['input', 'rules', 'output', 'done']);
    assert.equal(last.complete, true);
    assert.deepEqual(last.rows, [1, 1, 1, 1]);
    assert.equal(last.signalOpacity, 0);
  });
}

test('static state preserves the complete application without a moving signal', () => {
  for (const mode of ['direct', 'ai']) {
    const frame = finalFrame(mode);
    assert.equal(frame.label, 'Aplicación actualizada');
    assert.equal(frame.signalOpacity, 0);
    assert.equal(frame.active.output, 1);
    assert.deepEqual(frame.rows, [1, 1, 1, 1]);
  }
});

test('offscreen time cannot cause a jump and easing cannot overshoot', () => {
  assert.equal(advanceFlow(0, 100, 'direct'), 1 / 30);
  assert.equal(advanceFlow(2, -1, 'direct'), 2);
  let value = 0;
  for (let frame = 0; frame < 200; frame++) {
    const next = followLevel(value, 1, 1 / 60);
    assert.ok(next >= value && next <= 1);
    value = next;
  }
  assert.equal(value, 1);
  assert.equal(followLevel(0, 1, 0, true), 1);
});

test('invalid or reversed SVG anchors cannot reverse the signal', () => {
  assert.deepEqual(routeAnchors('ai', { rules: 0.8, ai: 0.2, output: 0.9 }), routeAnchors('ai'));
  assert.deepEqual(routeAnchors('direct', { rules: NaN, output: -1 }), routeAnchors('direct'));
  const route = { rules: 0.25, ai: 0.55, output: 0.9 };
  assert.deepEqual(routeAnchors('ai', route), route);
  assert.equal(finalFrame('ai', route).progress, 0.9);
});
