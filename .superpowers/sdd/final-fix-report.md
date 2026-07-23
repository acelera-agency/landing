# Logistics landing final-fix report

Date: 2026-07-23
Branch: `feat/logistica-demos`

## Outcome

The final review findings for `logistica.html` are resolved without adding dependencies or external services.

## Implemented changes

### Approved demo domains

- **Cruce** now reconciles a fixed fictitious export set across invoice, packing list, booking, and draft HBL.
  - Exposes the conflicting bultos values: invoice/draft HBL `24` versus packing list `26`.
  - Exposes the weight conflict: source consensus `12.480 kg` versus draft HBL `12.840 kg`.
  - Exposes the transposed notify tax ID.
  - Exposes the customer rule that blocks HBL issuance until bultos, weight, and notify tax ID match the approved invoice.
- **Margen** now compares:
  - quotation: `USD 5.600`;
  - invoice: `USD 5.450`;
  - estimated quoted cost: `USD 4.300`;
  - fixed forwarder actuals for carrier, terminal, agent, and handling.
  - The interactive result calculates actual reconciled margin and its variance against the quoted margin.
- **Límite** now manages one fictitious ocean FCL container through:
  - free-time deadline;
  - customs release;
  - terminal pickup;
  - empty return;
  - daily and projected exposure.
  - Resolving the action confirms customs release and pickup while leaving the empty-return milestone explicit.
- The five-operation audit copy was aligned with these same logistics domains so the page no longer falls back to the former generic trip/credit-limit examples.

### Accessibility and restart

- Changed the accent from `#c96a43` to `#a3482c`.
- Calculated contrast against paper `#f7f5f0`: `5.47:1`, meeting WCAG AA for normal/small text and for paper text on accent hover backgrounds.
- Kept the minimal outlined control style and applied the compliant accent to the submit and restart hover states.
- Added a visible native `button[type=button]` labeled `Reiniciar escena`, with accessible name `Reiniciar demo activa`.
- Wired that control directly to `resetProduct`, so it restores the current product's initial UI state.

### Native form safety

- Added `method="post"` and the approved lead-gateway `action` directly to the form.
- Preserved `data-lead-form`, the required privacy consent, and `data-variant="logistica"`.
- Added a static hidden `variant=logistica`; the existing JavaScript reuses that field, while native fallback posts the same attribution.
- With JavaScript unavailable, the browser now sends fields in a POST body instead of exposing PII in a query string.

## Tests

The logistics test now asserts:

- the four Cruce document sources and the four reconciliation fields;
- quotation, invoice, and all four forwarder cost domains;
- ocean FCL plus free-time, customs-release, pickup, empty-return, and daily-exposure milestones;
- form POST method, exact gateway action, and static variant;
- the visible restart control and accessible label.

A focused Playwright test starts the existing local server, selects all three demos, mutates each one, activates restart, and confirms the initial state is restored:

- Cruce clears the selected bultos finding.
- Margen rechecks handling.
- Límite re-enables the action after the resolved state.

No package or dependency changes were required; the existing `playwright` development dependency and installed Chromium binary were used.

## Verification evidence

- `npm run test:logistica` — passed, 4/4 tests.
- `npm test` — passed, 33/33 tests.
- `git diff --check` — passed.
- Additional Playwright viewport review:
  - `1440x900` — all three scenes fit without horizontal overflow; restart visible.
  - `390x844` — all three scenes fit without horizontal overflow; restart visible.

## Scope and concerns

- Modified implementation/test files: `logistica.html`, `logistica.test.mjs`.
- Added this required report.
- Did not modify `package.json`, shared application JavaScript, dependencies, or unrelated files.
- Existing unrelated untracked workspace artifacts were left untouched and are not part of the commit.
- The lead gateway was not called during verification, intentionally avoiding test PII or an external side effect. The native fallback contract is verified from the rendered form attributes; existing repository lead-gateway tests remain green.
- All displayed operational values remain explicitly fictitious and are not production calculations or live logistics data.

## P2 follow-up: resolved exposure card

The Límite resolution now updates the visible daily-exposure card as well as the status/result copy:

- Before resolution: `USD 185` and `3 días proyectados · USD 555 acumulables`.
- After resolution: `USD 0` and `0 días proyectados · exposición contenida; controlar devolución`.

The Playwright interaction test asserts both sides of this visible transition before it exercises restart. The new assertion first failed on the stale `USD 185` value, then `npm run test:logistica` passed 4/4 after the resolver update.
