import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const sources=[];
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  const src=match[1].match(/\bsrc="([^"]+)"/i)?.[1];
  if(!src)continue;
  assert.equal(match[2].trim(),'','An external script must close before another tag: '+src);
  sources.push(src.split('?')[0]);
}
for(const required of ['app.js','catalog.js','export-pdf.js','offers-library.js']){
  assert.equal(sources.filter(src=>src===required).length,1,required+' must load exactly once');
}
console.log('Page script tags load the shared catalog and print tools independently.');
