import { assertValidMotion } from './validate.js';
import { normalizeKeyframes } from './keyframes.js';
import { parseEasing } from './easing.js';

const RESERVED = new Set(['offset', 'easing', 'composite']);
const PROPERTY = /^(?:--[a-zA-Z_][\w-]*|-?[a-zA-Z_][\w-]*)$/;
const CLASS = /^[a-zA-Z_][a-zA-Z\d_-]*$/;
const FORBIDDEN_VALUE = /[;{}\r\n\f]|\/\*|\*\/|!\s*important\b/i;
const ANIMATION_PROPERTY = /^animation(?:-|$)/;

export class CSSCompileError extends Error {
  constructor(message, path) {
    super(`${path}: ${message}`);
    this.name = 'CSSCompileError';
    this.path = path;
  }
}

// Keep numbers legal in CSS without exponent notation (e.g., 1e-7ms is not a CSS time).
function decimal(number) {
  const value = String(number);
  if (!/[eE]/.test(value)) return value;
  const [mantissa, rawExponent] = value.toLowerCase().split('e');
  const exponent = Number(rawExponent);
  const sign = mantissa[0] === '-' ? '-' : '';
  const unsigned = sign ? mantissa.slice(1) : mantissa;
  const dot = unsigned.indexOf('.');
  const digits = unsigned.replace('.', '');
  const shift = (dot < 0 ? unsigned.length : dot) + exponent;
  if (shift <= 0) return sign + '0.' + '0'.repeat(-shift) + digits;
  if (shift >= digits.length) return sign + digits + '0'.repeat(shift - digits.length);
  return sign + digits.slice(0, shift) + '.' + digits.slice(shift);
}

function slug(value) {
  const clean = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return (clean || 'motion').slice(0, 48);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function propertyName(value, path) {
  if (!PROPERTY.test(value)) throw new CSSCompileError('Invalid CSS property name', path);
  const css = value.startsWith('--') ? value : value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).toLowerCase();
  if (ANIMATION_PROPERTY.test(css)) throw new CSSCompileError('Animation properties cannot be animated inside @keyframes', path);
  return css;
}

function safeValue(value, path) {
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))) {
    throw new CSSCompileError('CSS value must be a string or finite number', path);
  }
  const string = typeof value === 'number' ? decimal(value) : value.trim();
  if (!string || FORBIDDEN_VALUE.test(string)) throw new CSSCompileError('Unsafe or empty CSS value', path);
  return string;
}

function easing(value, path) {
  try {
    parseEasing(value);
  } catch {
    throw new CSSCompileError('Unsupported easing syntax', path);
  }
  return value.trim();
}

/**
 * Compile one validated motion to self-contained CSS with a deterministic class.
 * Supported: CSS values, computed offsets, per-keyframe easing, standard iteration/direction/fill.
 * Not supported: endDelay, non-replace per-keyframe composition, arbitrary easing syntax.
 * CSS value syntax is escaped/guarded, but property-specific semantic validity must be
 * checked in a real browser (this module intentionally has no DOM dependency).
 */
export function compileCSS(motion, options = {}) {
  assertValidMotion(motion);
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Compiler options must be an object');
  }
  if (motion.timing.endDelay !== 0) {
    throw new CSSCompileError('CSS animations cannot represent endDelay', 'timing.endDelay');
  }
  if (motion.keyframes.length === 0) {
    throw new CSSCompileError('At least one keyframe is required', 'keyframes');
  }
  const className = options.className === undefined
    ? `pfx-motion-${slug(motion.id)}-${hashString(motion.id)}`
    : options.className;
  if (typeof className !== 'string' || !CLASS.test(className)) {
    throw new CSSCompileError('className must be a simple CSS class identifier', 'options.className');
  }
  const keyframesName = `pfx-kf-${slug(motion.id)}-${hashString(motion.id)}`;
  const frames = normalizeKeyframes(motion.keyframes);
  let hasProperties = false;
  const frameCSS = frames.map((frame, index) => {
    if (frame.composite !== undefined && frame.composite !== 'replace') {
      throw new CSSCompileError('Per-keyframe additive composition cannot be represented faithfully', `keyframes[${index}].composite`);
    }
    const lines = [];
    for (const [name, value] of Object.entries(frame)) {
      if (RESERVED.has(name)) continue;
      hasProperties = true;
      lines.push(`    ${propertyName(name, `keyframes[${index}].${name}`)}: ${safeValue(value, `keyframes[${index}].${name}`)};`);
    }
    if (frame.easing !== undefined) {
      lines.push(`    animation-timing-function: ${easing(frame.easing, `keyframes[${index}].easing`)};`);
    }
    return `  ${decimal(frame.offset * 100)}% {\n${lines.join('\n')}\n  }`;
  });
  if (!hasProperties) throw new CSSCompileError('No animatable properties supplied', 'keyframes');
  const t = motion.timing;
  const globalEasing = easing(t.easing, 'timing.easing');
  const iterationCount = t.iterations === Infinity ? 'infinite' : decimal(t.iterations);
  const css = [
    `@keyframes ${keyframesName} {`,
    ...frameCSS,
    '}',
    '',
    `.${className} {`,
    `  animation-name: ${keyframesName};`,
    `  animation-duration: ${decimal(t.duration)}ms;`,
    `  animation-timing-function: ${globalEasing};`,
    `  animation-delay: ${decimal(t.delay)}ms;`,
    `  animation-iteration-count: ${iterationCount};`,
    `  animation-direction: ${t.direction};`,
    `  animation-fill-mode: ${t.fill};`,
    '}'
  ].join('\n');
  return { css, className, keyframesName };
}
