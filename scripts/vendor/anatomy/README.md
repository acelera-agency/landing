# Anatomy · build-time library

Upstream skill: <https://skills.wheresryan.sh/anatomy>.

The four ESM modules in this folder were copied unchanged from the Anatomy skill downloaded on 2026-10-10. Author: Ryan. License: MIT; the complete copyright and license notice is included in `LICENSE`.

- `iso-kit.mjs`: projection, extruded solid geometry and SVG string rendering.
- `lathe.mjs`, `tube.mjs`: geometric dependencies of the auditor.
- `audit.mjs`: true-shape contacts, clearance, projected occlusion and coverage checks.

These modules are used by `scripts/build-anatomy-figure.mjs` only. They are not loaded by the landing page or bundled into its browser runtime. Their imports and executable code were inspected before running: no network, filesystem mutations, process spawning, `eval` or dynamic code evaluation; the auditor may set `process.exitCode` when requested.

The illustration geometry and runtime integration are original to Acelera. The renderer retains a scoped subset of the kit's SVG rendering conventions. Changes to the upstream modules should be made explicitly rather than silently replacing a downloaded dependency.
