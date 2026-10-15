import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../public/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', root)));
assert.equal(manifest.name, 'PriceDesk Studio');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.id, '/');
for (const size of [192, 512]) {
  const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
  assert.ok(icon);
  const image = readFileSync(new URL(icon.src.slice(1), root));
  assert.equal(image.readUInt32BE(16), size);
  assert.equal(image.readUInt32BE(20), size);
}
assert.ok(existsSync(new URL(manifest.start_url.split('?')[0].slice(1) + 'index.html', root)));
const handlers = {};
const cached = [];
let offline = false;
const notice = { offlineNotice:true };
const network = { currentNetworkResponse:true };
vm.runInNewContext(readFileSync(new URL('sw.js', root), 'utf8'), {
  URL,
  self: { location:{origin:'https://example.test'}, addEventListener:(name, fn) => handlers[name] = fn, skipWaiting:() => {}, clients:{claim:async () => {}} },
  caches: {open:async () => ({add:async path => cached.push(path), match:async path => {assert.equal(path, '/offline.html'); return notice;}})},
  fetch:async () => {if (offline) throw Error('offline'); return network;}
});
await new Promise((resolve, reject) => handlers.install({waitUntil:task => task.then(resolve, reject)}));
assert.deepEqual(cached, ['/offline.html']);
for (const [path, method] of [['/api/products','GET'],['/api/products','POST'],['/api/offers','GET']]) {
  let intercepted = false;
  handlers.fetch({request:{url:'https://example.test'+path, method, mode:'cors'}, respondWith:() => intercepted = true});
  assert.equal(intercepted, false, 'Never intercept or cache shared price APIs');
}
for (const isOffline of [false, true]) {
  offline = isOffline;
  let response;
  handlers.fetch({request:{url:'https://example.test/?lang=ar',method:'GET',mode:'navigate'}, respondWith:promise => response = promise});
  assert.equal(await response, isOffline ? notice : network);
}
assert.deepEqual(cached, ['/offline.html'], 'Never cache product data or application HTML');
console.log('PWA manifest, PNG icons, network-first navigation and API exclusion passed.');
