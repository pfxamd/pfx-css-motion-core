import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url));
const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));

assert.equal(pkg.version,"1.0.0");
assert.equal(pkg.license,"Apache-2.0");
assert.equal(pkg.private,false);
assert.deepEqual(Object.keys(pkg.dependencies??{}),[]);
assert.deepEqual(Object.keys(pkg.optionalDependencies??{}),[]);
assert.deepEqual(Object.keys(pkg.peerDependencies??{}),[]);
assert.equal(pkg.exports["."],"./src/index.js");

const raw=execFileSync("npm",["pack","--dry-run","--json","--ignore-scripts"],{
 cwd:root,encoding:"utf8",timeout:60000
});
const [result]=JSON.parse(raw);
assert.equal(result.name,pkg.name);
assert.equal(result.version,pkg.version);
assert.equal(result.filename,"pfxamd-css-motion-core-1.0.0.tgz");
const paths=result.files.map(item=>item.path);
for(const required of [
 "package.json","README.md","LICENSE","NOTICE","CHANGELOG.md",
 "src/index.js","src/browser.js","src/timing.js","src/compiler.js"
]) assert(paths.includes(required),`Missing package file ${required}`);
assert(paths.every(path=>path.startsWith("src/")||
  path.startsWith("docs/")||
  ["package.json","README.md","LICENSE","NOTICE","CHANGELOG.md"].includes(path)),
  "Package unexpectedly contains tests, CI scripts or other development files");
const license=await readFile(new URL("../LICENSE",import.meta.url),"utf8");
assert(license.includes("Apache License"));
assert(license.includes("Version 2.0"));
const notice=await readFile(new URL("../NOTICE",import.meta.url),"utf8");
assert(notice.includes("PFxamd"));
console.log(JSON.stringify({
 result:"PASS",name:result.name,version:result.version,
 fileCount:paths.length,packedSize:result.size,unpackedSize:result.unpackedSize,
 runtimeDependencies:0,
 contains:["src/index.js","src/browser.js","LICENSE","NOTICE"].every(x=>paths.includes(x))
},null,2));
