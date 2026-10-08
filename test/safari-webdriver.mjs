import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const http=createServer(async (request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,"http://localhost").pathname);
  const pathnameOnDisk=resolve(root,"."+pathname);
  if(pathnameOnDisk!==root && !pathnameOnDisk.startsWith(root+sep)) return void response.writeHead(403).end();
  try{
    const bytes=await readFile(pathnameOnDisk);
    response.writeHead(200,{"Content-Type":extname(pathnameOnDisk)===".js"?"text/javascript":"text/html","Cache-Control":"no-store"}).end(bytes);
  }catch{response.writeHead(404).end("Not Found");}
});
await new Promise(done=>http.listen(0,"127.0.0.1",done));
let driver,sessionId;
const port=4444;
const endpoint="http://127.0.0.1:"+port;
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
async function webdriver(method,path,data){
  const response=await fetch(endpoint+path,{method,headers:{"Content-Type":"application/json"},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
  const body=await response.json();
  if(!response.ok || body.value?.error)throw new Error("WebDriver "+method+" "+path+": "+JSON.stringify(body));
  return body.value;
}
try{
  driver=spawn("/usr/bin/safaridriver",["-p",String(port)],{stdio:["ignore","pipe","pipe"]});
  let driverLog="";
  driver.stdout.on("data",chunk=>driverLog+=chunk.toString());
  driver.stderr.on("data",chunk=>driverLog+=chunk.toString());
  let available=false;
  for(let tries=0;tries<40;tries++){
    if(driver.exitCode!==null)throw new Error("safaridriver exited: "+driverLog);
    try{const check=await webdriver("GET","/status");if(check){available=true;break;}}catch{}
    await sleep(500);
  }
  if(!available)throw new Error("SafariDriver not reachable: "+driverLog);
  const newSession=await webdriver("POST","/session",{capabilities:{alwaysMatch:{browserName:"safari"}}});
  sessionId=newSession.sessionId;
  if(!sessionId)throw new Error("No Safari session ID: "+JSON.stringify(newSession));
  await webdriver("POST","/session/"+sessionId+"/url",{url:"http://127.0.0.1:"+http.address().port+"/test/browser-conformance.html"});
  let report=null;
  for(let tries=0;tries<60;tries++){
    report=await webdriver("POST","/session/"+sessionId+"/execute/sync",{script:"return window.pfxConformanceResult || null;",args:[]});
    if(report)break;
    await sleep(500);
  }
  if(!report)throw new Error("Safari browser check did not produce a report");
  console.log("PFx_SAFARI_RESULT",JSON.stringify(report));
  assert.match(report.browser,/Safari/);
  assert.equal(report.passed,true,"Real Safari conformance or CSS output mismatch");
} finally {
  if(sessionId){try{await webdriver("DELETE","/session/"+sessionId);}catch{}}
  if(driver){driver.kill("SIGTERM");}
  await new Promise(done=>http.close(done));
}
