/** Normalize an array of keyframe objects using the CSS keyframe offset algorithm.
 * Missing offsets are interpolated; explicit offsets must be nondecreasing.
 */
export function normalizeKeyframes(frames) {
  if (!Array.isArray(frames)) throw new TypeError("Keyframes must be an array");
  const result = frames.map((frame, index) => {
    if (frame === null || typeof frame !== "object" || Array.isArray(frame)) {
      throw new TypeError(`Invalid keyframe at index ${index}`);
    }
    const copy = { ...frame };
    if (copy.offset !== undefined && (typeof copy.offset !== "number" || !Number.isFinite(copy.offset) || copy.offset < 0 || copy.offset > 1)) {
      throw new RangeError(`Invalid offset at index ${index}`);
    }
    return copy;
  });
  if (result.length === 0) return result;
  if (result[0].offset === undefined) result[0].offset = 0;
  if (result.length > 1 && result.at(-1).offset === undefined) result[result.length - 1].offset = 1;
  if (result.length === 1 && frames[0].offset === undefined) result[0].offset = 1;
  let anchor = 0;
  for (let i = 1; i < result.length; i++) {
    if (result[i].offset === undefined) continue;
    if (result[i].offset < result[anchor].offset) throw new RangeError("Keyframe offsets must be nondecreasing");
    const n = i - anchor;
    for (let j = 1; j < n; j++) {
      result[anchor + j].offset = result[anchor].offset + (result[i].offset - result[anchor].offset) * j / n;
    }
    anchor = i;
  }
  return result;
}
