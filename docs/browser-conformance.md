# Browser conformance: specification versus native browser output

## Reference algorithm

The core's `sampleTiming` uses the Web Animations timing model:

- W3C Web Animations, §4.8.3.1 — active time, including the effects of negative start/end delays.
- W3C Web Animations, §4.8.3.3 — simple iteration progress.
- W3C Web Animations, §4.8.4 — current iteration.

**Normative endpoint rule:** after a completed integer iteration with forward fill, if active time equals active duration, progress must be **1**, not the start of an unplayed iteration. A nonzero iteration count is required.

Specification: https://www.w3.org/TR/web-animations-1/#calculating-the-simple-iteration-progress

## Actual cross-browser observations, October 8, 2026

| Environment | Native timing comparison | CSS output |
|---|---|---|
| Firefox 157 on Linux | 21,600 / 21,600 matched | midpoint opacity 0.5, translateX 50px |
| Playwright WebKit 27.2 on Linux | 21,600 / 21,600 matched | midpoint opacity 0.5, translateX 50px |
| macOS Safari 26.6.1 via SafariDriver | 8,308 / 8,424 matched; 116 known endpoint disagreements | midpoint and final fill rendered correctly |

The Safari deviations occurred at or beyond the end of integer-length iterations with `fill: both`: after completion, its `getComputedTiming().progress` sometimes wraps to approximately **0** instead of **1**, or approximately **1** instead of **0** for reversed direction. This is inconsistent with §4.8.3.3.

**Safari CSS rendering itself was tested:** the compiled opacity animation rendered opacity **0.5** midway, and opacity **1** both immediately and well after completion. Therefore the observed native API discrepancy was **not** reproduced as an incorrect final CSS rendering in these tested cases.

## CI policy

- Run `npm run check` on Node 20, 22 and 24.
- Compare all 21,600 targeted samples against Firefox and Playwright WebKit. Any deviation fails CI.
- Run the 8,424-sample macOS SafariDriver suite. Every difference is counted and logged.
- Only one **narrow, documented Safari discrepancy** is recognized: after a completed positive integer iteration at an endpoint, a large 0 ↔ 1 wrap in the native `getComputedTiming().progress`. Even recognized deviations are reported and preserved as failures of **strict native parity**.
- Any new/unrecognized discrepancy, or any incorrect midpoint/final CSS appearance, **fails CI**.
- The W3C endpoint regression tests run without depending on browser behavior. We do not change the core to emulate Safari's divergent API values.

GitHub issue: https://github.com/pfxamd/pfx-css-motion-core/issues/2

**Scope limits:** This verifies the tested timing matrix and CSS samples; it does not certify every CSS property, easing function, browser release, device, or all time-boundary precision cases. Playwright WebKit is not identical to macOS Safari, hence the separate native Safari job.
