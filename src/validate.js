import { SCHEMA_VERSION } from "./model.js";

const DIRECTIONS = new Set(["normal", "reverse", "alternate", "alternate-reverse"]);
const FILLS = new Set(["none", "forwards", "backwards", "both"]);
const RESERVED = new Set(["offset", "easing", "composite"]);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = value => typeof value === "number" && Number.isFinite(value);

export function validateMotion(motion) {
  const errors = [];
  const issue = (path, code, message) => errors.push({ path, code, message });
  if (!record(motion)) {
    issue("$", "type", "Motion must be an object");
    return { valid: false, errors };
  }
  if (motion.schemaVersion !== SCHEMA_VERSION) issue("schemaVersion", "version", "Unsupported schema version");
  if (typeof motion.id !== "string" || !motion.id.trim()) issue("id", "type", "Expected a non-empty string");
  if (typeof motion.name !== "string" || !motion.name.trim()) issue("name", "type", "Expected a non-empty string");
  const t = motion.timing;
  if (!record(t)) {
    issue("timing", "type", "Expected a timing object");
  } else {
    for (const field of ["duration", "delay", "endDelay"]) {
      if (!finite(t[field]) || (field === "duration" && t[field] < 0)) issue(`timing.${field}`, "range", "Expected a finite number (duration must be non-negative)");
    }
    if (!(t.iterations === Infinity || (finite(t.iterations) && t.iterations >= 0))) issue("timing.iterations", "range", "Expected a non-negative number or Infinity");
    if (!DIRECTIONS.has(t.direction)) issue("timing.direction", "enum", "Unsupported direction");
    if (!FILLS.has(t.fill)) issue("timing.fill", "enum", "Unsupported fill");
    if (typeof t.easing !== "string" || !t.easing.trim()) issue("timing.easing", "type", "Expected a non-empty CSS easing string");
  }
  if (!Array.isArray(motion.keyframes)) {
    issue("keyframes", "type", "Expected an array");
  } else {
    let previous = -Infinity;
    for (let i = 0; i < motion.keyframes.length; i++) {
      const frame = motion.keyframes[i];
      const path = `keyframes[${i}]`;
      if (!record(frame)) { issue(path, "type", "Expected a keyframe object"); continue; }
      if (hasOwn(frame, "offset")) {
        if (!finite(frame.offset) || frame.offset < 0 || frame.offset > 1) issue(`${path}.offset`, "range", "Offset must be between 0 and 1");
        else if (frame.offset < previous) issue(`${path}.offset`, "order", "Offsets must be non-decreasing");
        else previous = frame.offset;
      }
      if (hasOwn(frame, "easing") && (typeof frame.easing !== "string" || !frame.easing.trim())) issue(`${path}.easing`, "type", "Expected a CSS easing string");
      if (hasOwn(frame, "composite") && !["replace", "add", "accumulate"].includes(frame.composite)) issue(`${path}.composite`, "enum", "Unsupported composite mode");
      for (const [property, value] of Object.entries(frame)) {
        if (RESERVED.has(property)) continue;
        if (typeof value !== "string" && !finite(value)) issue(`${path}.${property}`, "type", "Property values must be strings or finite numbers");
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidMotion(motion) {
  const result = validateMotion(motion);
  if (!result.valid) {
    const error = new TypeError("Invalid motion: " + result.errors.map(({ path, message }) => `${path}: ${message}`).join("; "));
    error.issues = result.errors;
    throw error;
  }
  return motion;
}
