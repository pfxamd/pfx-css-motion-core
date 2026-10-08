import test from "node:test";
import assert from "node:assert/strict";
import { sampleTiming, parseEasing, cubicBezier, steps } from "../src/index.js";
const base={duration:1000,delay:100,iterations:2,fill:"both"};
test("before, active, and after timing",()=>{
  assert.equal(sampleTiming(base,0).progress,0);
  assert.equal(sampleTiming(base,600).progress,.5);
  assert.equal(sampleTiming(base,2100).progress,1);
  assert.equal(sampleTiming(base,2200).phase,"after");
});
test("no-fill produces null progress",()=>{
  assert.equal(sampleTiming({...base,fill:"none"},0).progress,null);
  assert.equal(sampleTiming({...base,fill:"none"},2200).progress,null);
});
test("alternating direction flips the second iteration",()=>{
  const t={...base,direction:"alternate"};
  assert.equal(sampleTiming(t,350).progress,.25);
  assert.equal(sampleTiming(t,1350).progress,.75);
  assert.equal(sampleTiming(t,2100).progress,0);
});
test("zero duration, zero iterations and infinite repeats",()=>{
  assert.equal(sampleTiming({duration:0,iterations:1,fill:"both"},0).progress,1);
  assert.equal(sampleTiming({duration:100,iterations:0,fill:"both"},0).progress,0);
  assert.equal(sampleTiming({duration:100,iterations:Infinity,fill:"both"},350).progress,.5);
});
test("invalid timing fails",()=>assert.throws(()=>sampleTiming({duration:-1},0)));
test("bezier maps endpoints, linear and common presets",()=>{
  assert.equal(cubicBezier(.25,.1,.25,1)(0),0);
  assert.equal(cubicBezier(.25,.1,.25,1)(1),1);
  assert.equal(parseEasing("linear")(.4),.4);
  assert(parseEasing("ease")(.5)>.5);
});
test("steps and invalid easing",()=>{
  assert.equal(steps(4)(.3),.25);
  assert.equal(parseEasing("steps(4, start)")(.3),.5);
  assert.throws(()=>steps(1,"jump-none"));
  assert.throws(()=>parseEasing("nonsense"));
});
