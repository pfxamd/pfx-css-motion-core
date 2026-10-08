import test from "node:test";
import assert from "node:assert/strict";
import * as api from "@pfxamd/css-motion-core";

const API_V1 = [
  "SCHEMA_VERSION", "DEFAULT_TIMING", "createMotion",
  "validateMotion", "assertValidMotion", "sampleTiming",
  "cubicBezier", "steps", "parseEasing", "normalizeKeyframes",
  "parseNumeric", "parseColor", "interpolateValue", "interpolateProperties",
  "createTimeline", "sampleTimeline", "createPlayback",
  "compileCSS", "CSSCompileError",
  "toBrowserKeyframes", "toBrowserTiming", "createBrowserAnimation", "createBrowserTimeline"
].sort();

test("v1 public API contains exactly the documented named exports", () => {
  assert.deepEqual(Object.keys(api).sort(), API_V1);
});

test("schema contract remains at version 1", () => {
  assert.equal(api.SCHEMA_VERSION, 1);
  const m = api.createMotion({id:"stability",timing:{duration:500},
    keyframes:[{opacity:0},{opacity:1}]});
  assert.equal(m.schemaVersion,1);
  assert.equal(api.validateMotion(m).valid,true);
  assert.equal(api.compileCSS(m).className.startsWith("pfx-motion-"),true);
});

test("module imports and non-DOM operations work in Node.js", () => {
  assert.equal(typeof document,"undefined");
  assert.equal(typeof window,"undefined");
  assert.equal(api.sampleTiming({duration:100,iterations:1,fill:"both"},50).progress,.5);
  assert.deepEqual(api.toBrowserKeyframes(api.createMotion({
    keyframes:[{opacity:0},{opacity:1}]
  })).map(k=>k.offset),[0,1]);
});

test("the core exposes no runtime dependencies", async () => {
  const {readFile} = await import("node:fs/promises");
  const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
  assert.equal(pkg.version,"1.0.0");
  assert.equal(pkg.license,"Apache-2.0");
  for (const key of ["dependencies","optionalDependencies","peerDependencies"]) {
    assert.equal(Object.keys(pkg[key]??{}).length,0,`Unexpected runtime dependency in ${key}`);
  }
  assert.equal(pkg.exports["."],"./src/index.js");
});
