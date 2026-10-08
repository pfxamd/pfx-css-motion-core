import test from "node:test";
import assert from "node:assert/strict";
import { createMotion, validateMotion, assertValidMotion, DEFAULT_TIMING } from "../src/index.js";

test("creates a stable motion record", () => {
  const motion = createMotion();
  assert.equal(motion.schemaVersion, 1);
  assert.deepEqual(motion.timing, DEFAULT_TIMING);
  assert.equal(validateMotion(motion).valid, true);
});
test("overrides timing without changing defaults", () => {
  const motion = createMotion({ timing: { duration: 250 } });
  assert.equal(motion.timing.duration, 250);
  assert.equal(DEFAULT_TIMING.duration, 1000);
});
test("rejects invalid offsets and duration", () => {
  const motion = createMotion({ timing: { duration: -1 }, keyframes: [{ offset: 1 }, { offset: 0 }] });
  const result = validateMotion(motion);
  assert.equal(result.valid, false);
  assert(result.errors.some(e => e.path === "timing.duration"));
  assert(result.errors.some(e => e.code === "order"));
  assert.throws(() => assertValidMotion(motion), TypeError);
});
test("accepts partial offsets and supported composite modes", () => {
  assert.equal(validateMotion(createMotion({ keyframes: [{ opacity: 0 }, { offset: 0.8, opacity: 1, composite: "add" }] })).valid, true);
});
test("rejects non-object input without crashing", () => {
  assert.equal(validateMotion(null).valid, false);
});
test("rejects unknown schema versions", () => {
  const motion = createMotion();
  motion.schemaVersion = 99;
  assert.equal(validateMotion(motion).valid, false);
});
