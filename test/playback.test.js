import test from "node:test";
import assert from "node:assert/strict";
import { createPlayback } from "../src/index.js";

test("starts, advances, and completes", () => {
 const p=createPlayback(100);
 assert.equal(p.play(0).status,"running");
 assert.equal(p.tick(30).time,30);
 assert.deepEqual([p.tick(100).time,p.state.status],[100,"finished"]);
});
test("pause and resume do not count paused time", () => {
 const p=createPlayback(100);
 p.play(10);p.pause(30);p.play(100);
 assert.equal(p.tick(120).time,40);
});
test("seek during playback resets its clock anchor", () => {
 const p=createPlayback(100);p.play(0);
 p.seek(75,50);
 assert.equal(p.tick(60).time,85);
});
test("reverse continues from current position", () => {
 const p=createPlayback(100);p.play(0);p.tick(70);p.reverse(70);
 assert.equal(p.tick(90).time,50);
 assert.equal(p.tick(140).status,"finished");
});
test("negative rate starts at the end", () => {
 const p=createPlayback(100,{rate:-2});p.play(0);
 assert.equal(p.tick(20).time,60);
});
test("loop wraps in both directions", () => {
 const p=createPlayback(100,{loop:true});p.play(0);
 assert.equal(p.tick(125).time,25);
 p.reverse(125);
 assert.equal(p.tick(155).time,95);
 assert.equal(p.state.status,"running");
});
test("rate changes preserve continuity", () => {
 const p=createPlayback(100);p.play(0);p.setRate(2,20);
 assert.equal(p.tick(30).time,40);
});
test("reset and invalid arguments", () => {
 const p=createPlayback(100);p.play(0);p.tick(40);p.reset();
 assert.equal(p.state.time,0);
 assert.equal(p.state.status,"idle");
 assert.throws(()=>createPlayback(-1),RangeError);
 assert.throws(()=>createPlayback(10,{rate:0}),RangeError);
 assert.throws(()=>p.seek(NaN,1),TypeError);
});
