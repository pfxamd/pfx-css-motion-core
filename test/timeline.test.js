import test from "node:test";
import assert from "node:assert/strict";
import { createMotion, createTimeline, sampleTimeline } from "../src/index.js";
const motion = (id, duration, extras={}) => createMotion({id,timing:{duration,...extras}});
test("empty timeline",()=>assert.deepEqual(createTimeline(),{duration:0,clips:[]}));
test("sequential clips",()=>{
  const t=createTimeline([{motion:motion("a",100)},{motion:motion("b",200)}]);
  assert.deepEqual(t.clips.map(x=>[x.start,x.end]),[[0,100],[100,300]]);
  assert.equal(t.duration,300);
});
test("overlap with previous",()=>{
  const t=createTimeline([{motion:motion("a",100)},{motion:motion("b",250),at:"with-previous"}]);
  assert.deepEqual(t.clips.map(x=>x.start),[0,0]);
  assert.equal(t.duration,250);
});
test("absolute positions",()=>{
  const t=createTimeline([{motion:motion("a",100),at:50},{motion:motion("b",20),at:5}]);
  assert.equal(t.duration,150);
  assert.deepEqual(t.clips.map(x=>x.start),[50,5]);
});
test("timing delays and repeated iterations contribute to span",()=>{
  const t=createTimeline([{motion:motion("a",100,{delay:20,endDelay:30,iterations:3})}]);
  assert.equal(t.duration,350);
});
test("samples boundaries and does not mutate the source",()=>{
  const m=motion("a",100);
  const t=createTimeline([{motion:m}]);
  assert.deepEqual(sampleTimeline(t,0).map(x=>x.active),[true]);
  assert.deepEqual(sampleTimeline(t,100).map(x=>x.active),[false]);
  assert.equal(sampleTimeline(t,30)[0].localTime,30);
  assert.equal(m.timing.duration,100);
});
test("rejects invalid input",()=>{
  assert.throws(()=>createTimeline(null),TypeError);
  assert.throws(()=>createTimeline([{motion:motion("a",100),at:-10}]),TypeError);
  assert.throws(()=>sampleTimeline(createTimeline(),NaN),TypeError);
});
