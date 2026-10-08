import test from "node:test";
import assert from "node:assert/strict";
import { parseNumeric, parseColor, interpolateValue, interpolateProperties } from "../src/index.js";

test("numeric parsing and unit normalization", () => {
  assert.deepEqual(parseNumeric(" 10PX "), {value:10,unit:"px"});
  assert.deepEqual(parseNumeric(.5), {value:.5,unit:""});
  assert.equal(parseNumeric("calc(1px + 2px)"), null);
  assert.equal(parseNumeric(Infinity), null);
});
test("numeric interpolation preserves type and unit", () => {
  assert.equal(interpolateValue(0, 10, .25), 2.5);
  assert.equal(interpolateValue("0px", "12px", .5), "6px");
  assert.equal(interpolateValue("1rem", "2rem", .25), "1.25rem");
});
test("incompatible units and unknown CSS fall back discretely", () => {
  assert.equal(interpolateValue("1px", "2rem", .25), "1px");
  assert.equal(interpolateValue("1px", "2rem", .75), "2rem");
  assert.equal(interpolateValue("none", "block", .25), "none");
  assert.equal(interpolateValue("none", "block", .5), "block");
});
test("color parsing supports valid hex and rgb forms", () => {
  assert.deepEqual(parseColor("#fff"), [255,255,255,1]);
  assert.deepEqual(parseColor("#0000"), [0,0,0,0]);
  assert.deepEqual(parseColor("rgb(255, 0, 12)"), [255,0,12,1]);
  assert.equal(parseColor("rgb(999, 0, 0)"), null);
});
test("color interpolation uses premultiplied alpha", () => {
  assert.equal(interpolateValue("#000", "#fff", .5), "rgba(128, 128, 128, 1)");
  assert.equal(interpolateValue("#0000", "#ff0000", .5), "rgba(255, 0, 0, 0.5)");
});
test("property interpolation keeps missing values and does not mutate inputs", () => {
  const from = {opacity:0, width:"0px", display:"none"};
  const to = {opacity:1, width:"20px", transform:"scale(2)"};
  assert.deepEqual(interpolateProperties(from,to,.5), {opacity:.5,width:"10px",display:"none",transform:"scale(2)"});
  assert.equal(from.width,"0px");
});
test("progress boundaries preserve exact source values", () => {
  assert.equal(interpolateValue("#fff","#000",0),"#fff");
  assert.equal(interpolateValue("#fff","#000",1),"#000");
  assert.throws(()=>interpolateValue(0,1,NaN),TypeError);
});
