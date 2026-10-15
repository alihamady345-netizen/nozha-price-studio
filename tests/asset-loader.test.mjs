import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const scripts = [];
const window = {};
const context = {
  window, setTimeout, clearTimeout,
  document:{ documentElement:{lang:'en'}, createElement:() => ({remove(){this.removed=true;}}), head:{append:script => scripts.push(script)} }
};
vm.runInNewContext(readFileSync(new URL('../public/asset-loader.js', import.meta.url), 'utf8'), context);
assert.equal(scripts.length, 0, 'Opening the app must not download optional tools');
const first = window.StudioAssets.load('camera');
assert.equal(window.StudioAssets.load('camera'), first, 'Concurrent requests share one download');
assert.equal(scripts.length, 1);
window.ZXingBrowser = {BrowserMultiFormatReader:class {}};
scripts[0].onload();
await first;
await window.StudioAssets.load('camera');
assert.equal(scripts.length, 1, 'An available tool is not loaded twice');
const failed = window.StudioAssets.load('zip');
scripts[1].onerror();
await assert.rejects(failed, /Check your connection/);
assert.ok(scripts[1].removed);
const retry = window.StudioAssets.load('zip');
assert.equal(scripts.length, 3);
window.JSZip = {};
scripts[2].onload();
await retry;
const pdf = window.StudioAssets.pdf();
assert.equal(scripts.length, 5, 'PDF loads both required tools on demand');
window.html2canvas = () => {};
window.jspdf = {jsPDF:class {}};
scripts[3].onload(); scripts[4].onload();
await pdf;
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
for (const asset of ['html2canvas.min.js','jspdf.umd.min.js','zxing-browser.min.js','jszip.min.js','xlsx.full.min.js']) {
  assert.ok(!html.includes(`src="assets/${asset}"`), `${asset} must not be eagerly downloaded`);
}
console.log('On-demand tools, concurrent deduplication, error retry and PDF dependencies passed.');
