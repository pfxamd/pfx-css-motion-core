import test from "node:test";
import assert from "node:assert/strict";
import { normalizeKeyframes } from "../src/index.js";

test("empty and single keyframes", () => {
  assert.deepEqual(normalizeKeyframes([]), []);
  assert.deepEqual(normalizeKeyframes([{ opacity: 1 }]), [{ opacity: 1, offset: 1 }]);
});
test("interpolates omitted offsets", () => {
  assert.deepEqual(normalizeKeyframes([{ opacity: 0 }, { opacity: .5 }, { opacity: 1 }]).map(x => x.offset), [0, .5, 1]);
  assert.deepEqual(normalizeKeyframes([{ offset: .2 }, {}, { offset: .8 }]).map(x => x.offset), [.2, .5, .8]);
});
test("preserves duplicate offsets and input immutability", () => {
  const input = [{ offset: 0 }, { offset: 0 }, { offset: 1 }];
  assert.deepEqual(normalizeKeyframes(input).map(x => x.offset), [0, 0, 1]);
  assert.deepEqual(input, [{ offset: 0 }, { offset: 0 }, { offset: 1 }]);
});
test("rejects invalid and descending offsets", () => {
  assert.throws(() => normalizeKeyframes([{ offset: .8 }, { offset: .1 }]), RangeError);
  assert.throws(() => normalizeKeyframes([{ offset: NaN }]), RangeError);
  assert.throws(() => normalizeKeyframes([null]), TypeError);
});
