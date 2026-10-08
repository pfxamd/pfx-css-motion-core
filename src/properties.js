// Pure, dependency-free interpolation for a deliberately documented CSS subset.
// Unsupported or incompatible values use discrete interpolation; never guess unit conversion.
const NUMBER = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i;
const HEX = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const trim = value => String(Number(value.toFixed(9)));
function cssDecimal(value) {
  const text = String(value);
  if (!/[eE]/.test(text)) return text;
  const [mantissa, rawExponent] = text.toLowerCase().split('e');
  const exponent = Number(rawExponent);
  const sign = mantissa.startsWith('-') ? '-' : '';
  const unsigned = sign ? mantissa.slice(1) : mantissa;
  const dot = unsigned.indexOf('.');
  const digits = unsigned.replace('.', '');
  const shift = (dot < 0 ? unsigned.length : dot) + exponent;
  if (shift <= 0) return sign + '0.' + '0'.repeat(-shift) + digits;
  if (shift >= digits.length) return sign + digits + '0'.repeat(shift - digits.length);
  return sign + digits.slice(0, shift) + '.' + digits.slice(shift);
}
const channel = n => clamp(Math.round(n), 0, 255);
export function parseNumeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? { value, unit: "" } : null;
  if (typeof value !== "string") return null;
  const match = NUMBER.exec(value.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? { value: n, unit: match[2].toLowerCase() } : null;
}
export function parseColor(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (HEX.test(input)) {
    const raw = input.slice(1);
    const full = raw.length < 5 ? [...raw].map(x => x + x).join("") : raw;
    const parts = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    return [...parts, a];
  }
  const rgb = RGB.exec(input);
  if (!rgb) return null;
  const parts = rgb.slice(1, 4).map(Number);
  const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]);
  if (![...parts, alpha].every(Number.isFinite) || parts.some(x => x < 0 || x > 255) || alpha < 0 || alpha > 1) return null;
  return [...parts, alpha];
}
const serializeColor = rgba => {
  const [r, g, b, a] = rgba;
  return `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${trim(clamp(a, 0, 1))})`;
};
export function interpolateValue(from, to, progress) {
  if (typeof progress !== "number" || !Number.isFinite(progress)) throw new TypeError("progress must be finite");
  if (progress <= 0) return from;
  if (progress >= 1) return to;
  const a = parseNumeric(from), b = parseNumeric(to);
  if (a && b && a.unit === b.unit) {
    let result = a.value + (b.value - a.value) * progress;
    if (!Number.isFinite(result)) result = a.value * (1 - progress) + b.value * progress;
    if (!Number.isFinite(result)) throw new RangeError('Numeric interpolation overflow');
    return typeof from === "number" && typeof to === "number" ? result : cssDecimal(result) + a.unit;
  }
  const c = parseColor(from), d = parseColor(to);
  if (c && d) {
    // Premultiplied alpha avoids dark fringes when interpolating transparent colors.
    const alpha = c[3] + (d[3] - c[3]) * progress;
    const channels = [0, 1, 2].map(i => alpha === 0 ? 0 :
      (c[i] * c[3] * (1 - progress) + d[i] * d[3] * progress) / alpha);
    return serializeColor([...channels, alpha]);
  }
  return progress < 0.5 ? from : to;
}
export function interpolateProperties(from, to, progress) {
  if (!from || !to || typeof from !== "object" || typeof to !== "object" || Array.isArray(from) || Array.isArray(to)) {
    throw new TypeError("Expected two property objects");
  }
  const output = {};
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (!Object.hasOwn(from, key)) output[key] = to[key];
    else if (!Object.hasOwn(to, key)) output[key] = from[key];
    else output[key] = interpolateValue(from[key], to[key], progress);
  }
  return output;
}
