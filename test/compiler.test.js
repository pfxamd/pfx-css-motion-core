import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotion, compileCSS, CSSCompileError } from '../src/index.js';
const make = (overrides = {}) => createMotion({
  id: 'fade-in',
  timing: { duration: 600, delay: -100, iterations: 2, fill: 'both', direction: 'alternate', easing: 'ease-in-out' },
  keyframes: [{ opacity: 0 }, { opacity: 1 }],
  ...overrides
});

test('produces deterministic self-contained CSS and class', () => {
  const a = compileCSS(make());
  const b = compileCSS(make());
  assert.deepEqual(a, b);
  assert.match(a.css, new RegExp(`@keyframes ${a.keyframesName.replace(/-/g, '\\-')}`));
  assert.match(a.css, /0% \{/);
  assert.match(a.css, /100% \{/);
  assert.match(a.css, /animation-duration: 600ms;/);
  assert.match(a.css, /animation-delay: -100ms;/);
  assert.match(a.css, /animation-direction: alternate;/);
});
test('interpolates implicit offsets and preserves duplicate offsets', () => {
  const { css } = compileCSS(make({keyframes:[{offset:0,opacity:0},{opacity:0.4},{offset:1,opacity:1},{offset:1,opacity:0.5}]}));
  assert.match(css, /50% \{/);
  assert.equal([...css.matchAll(/100% \{/g)].length,2);
});
test('compiles per-keyframe easing and camelCase properties', () => {
  const { css } = compileCSS(make({keyframes:[{offset:0,backgroundColor:'red',easing:'steps(4, end)'},{offset:1,backgroundColor:'blue'}]}));
  assert.match(css, /background-color: red;/);
  assert.match(css, /animation-timing-function: steps\(4, end\);/);
});
test('allows custom properties and CSS transform functions', () => {
  const { css } = compileCSS(make({keyframes:[{'--distance':'0px', transform:'translateX(var(--distance))'},{'--distance':'100px',transform:'translateX(100px)'}]}));
  assert.match(css, /--distance: 100px;/);
  assert.match(css, /transform: translateX\(100px\);/);
});
test('supports infinite and fractional iterations', () => {
  assert.match(compileCSS(make({timing:{...make().timing,iterations:Infinity}})).css,/animation-iteration-count: infinite;/);
  assert.match(compileCSS(make({timing:{...make().timing,iterations:1.5}})).css,/animation-iteration-count: 1.5;/);
});
test('generates simple selector names and rejects selector injection', () => {
  assert.match(compileCSS(make(),{className:'my-animation'}).css,/\.my-animation \{/);
  assert.throws(()=>compileCSS(make(),{className:'a, body'}),CSSCompileError);
  assert.throws(()=>compileCSS(make(),null),TypeError);
});
test('rejects endDelay and per-frame additive composition', () => {
  assert.throws(()=>compileCSS(make({timing:{...make().timing,endDelay:100}})),/endDelay/);
  assert.throws(()=>compileCSS(make({keyframes:[{opacity:0,composite:'add'},{opacity:1}]})),/composition/);
});
test('rejects unsafe CSS values, names and animation override attempts', () => {
  assert.throws(()=>compileCSS(make({keyframes:[{'opacity; } body {':'0'},{opacity:1}]})),CSSCompileError);
  assert.throws(()=>compileCSS(make({keyframes:[{opacity:'0; color: red'},{opacity:1}]})),CSSCompileError);
  assert.throws(()=>compileCSS(make({keyframes:[{transform:'scale(1)\ncolor:red'},{transform:'scale(2)'}]})),CSSCompileError);
  assert.throws(()=>compileCSS(make({keyframes:[{animationDuration:'10ms'},{opacity:1}]})),CSSCompileError);
});
test('rejects unsupported easing instead of emitting broken CSS', () => {
  assert.throws(()=>compileCSS(make({timing:{...make().timing,easing:'linear(0, 1)'}})),CSSCompileError);
  assert.throws(()=>compileCSS(make({keyframes:[{opacity:0,easing:'foo(10)'},{opacity:1}]})),CSSCompileError);
});
test('rejects empty keyframes and keyframes without properties', () => {
  assert.throws(()=>compileCSS(make({keyframes:[]})),CSSCompileError);
  assert.throws(()=>compileCSS(make({keyframes:[{offset:0,easing:'linear'},{offset:1}]})),CSSCompileError);
});
test('expands exponent notation for CSS numeric literals', () => {
  const { css } = compileCSS(make({timing:{...make().timing,duration:1e-7,delay:1e5}}));
  assert.match(css, /animation-duration: 0\.0000001ms;/);
  assert.match(css, /animation-delay: 100000ms;/);
});
test('leaves source motion unchanged', () => {
  const motion = make();
  const snapshot = JSON.stringify(motion);
  compileCSS(motion);
  assert.equal(JSON.stringify(motion), snapshot);
});
