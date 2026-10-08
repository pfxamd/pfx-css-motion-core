import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { firefox, webkit } from "playwright";

const engineName = process.argv[2];
const engines = { firefox, webkit };
if (!Object.hasOwn(engines, engineName)) throw new Error("Use firefox or webkit");
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const mime = { ".js": "text/javascript", ".html": "text/html" };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const filename = resolve(root, "." + pathname);
  if (filename !== root && !filename.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const content = await readFile(filename);
    res.writeHead(200, { "Content-Type": mime[extname(filename)] ?? "text/plain", "Cache-Control": "no-store" });
    res.end(content);
  } catch {
    res.writeHead(404).end("Not Found");
  }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await engines[engineName].launch({headless:true});
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:" + server.address().port + "/test/browser-conformance.html");
  const report = await page.evaluate(async () => {
    const { sampleTiming, compileCSS, createMotion } = await import("/src/index.js");
    const box = document.createElement("div");
    document.body.append(box);
    let tested = 0;
    let mismatchCount = 0;
    const differences = [];
    for (const duration of [0,100,800]) {
      for (const iterations of [0,0.5,1,2,2.5]) {
        for (const direction of ["normal","reverse","alternate","alternate-reverse"]) {
          for (const delay of [-50,0,20]) {
            for (const endDelay of [-20,0,20]) {
              for (const fill of ["none","backwards","forwards","both"]) {
                const timing={duration,iterations,direction,delay,endDelay,fill};
                const animation=box.animate([{opacity:0},{opacity:1}],{...timing,easing:"linear"});
                animation.pause();
                for (const time of [-71,-1,0,0.37,23.71,87.41,151.37,371.71,801.13,1903.31]) {
                  animation.currentTime=time;
                  const native=animation.effect.getComputedTiming().progress;
                  const core=sampleTiming(timing,time).progress;
                  if ((native === null) !== (core === null) ||
                      (native !== null && (!Number.isFinite(core) || Math.abs(native-core) > 0.000001))) {
                    mismatchCount++;
                    if (differences.length<30) differences.push({timing,time,native,core});
                  }
                  tested++;
                }
                animation.cancel();
              }
            }
          }
        }
      }
    }
    box.remove();
    const compiled=compileCSS(createMotion({
      id:"browser-crosscheck",timing:{duration:1000,fill:"both"},
      keyframes:[{opacity:0,transform:"translateX(0px)"},{opacity:1,transform:"translateX(100px)"}]
    }));
    const style=document.createElement("style");
    style.textContent=compiled.css;
    document.head.append(style);
    const target=document.createElement("div");
    target.className=compiled.className;
    document.body.append(target);
    const cssAnimation=target.getAnimations()[0];
    let opacity=null,translateX=null;
    if(cssAnimation) {
      cssAnimation.pause();
      cssAnimation.currentTime=500;
      const styles=getComputedStyle(target);
      opacity=Number(styles.opacity);
      translateX=new DOMMatrixReadOnly(styles.transform).m41;
    }
    style.remove(); target.remove();
    return {
      tested,mismatchCount,differences, css: {opacity,translateX},
      userAgent:navigator.userAgent,
      passed: mismatchCount===0 && Math.abs(opacity-.5)<0.000001 &&
        Math.abs(translateX-50)<0.000001
    };
  });
  console.log("PFx_BROWSER_RESULT",JSON.stringify({engine:engineName,...report}));
  assert.equal(report.mismatchCount,0,"Timing mismatches vs native Web Animations API");
  assert.equal(report.passed,true,"CSS playback or timing conformance failed");
  await page.goto("http://127.0.0.1:" + server.address().port + "/test/adapter-conformance.html");
  await page.waitForFunction(() => !!window.pfxAdapterResult, {timeout:15000});
  const adapterReport=await page.evaluate(() => window.pfxAdapterResult);
  console.log("PFx_ADAPTER_RESULT",JSON.stringify({engine:engineName,...adapterReport}));
  assert.equal(adapterReport.passed,true,"Native adapter DOM/playback conformance failed");
} finally {
  if(browser) await browser.close();
  await new Promise(done => server.close(done));
}
