import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {catalogApi} from '../worker/catalog.mjs';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const context=vm.createContext({state:{language:'ar'},tr:s=>s});
context.window=context;
vm.runInContext(readFileSync(new URL('../public/assets/JsBarcode.all.min.js',import.meta.url),'utf8'),context);
vm.runInContext(source.slice(source.indexOf('const latinDigits ='),source.indexOf('const escapeHtml =')),context);
context.latinDigits=vm.runInContext('latinDigits',context);
vm.runInContext(source.slice(source.indexOf('function barcodeData('),source.indexOf('function riyalMarkup(')),context);
vm.runInContext(source.slice(source.indexOf('function draftProduct('),source.indexOf('function makePaper(')),context);
const product=barcode=>({name:'اختبار باركود',unit:'حبة',price:'16.95',copies:1,barcode,format:'AUTO'});
const cases=[
  ['6285008710021','CODE128'],['6285008710029','EAN13'],
  ['042100005264','UPC'],['042100005261','CODE128'],
  ['96385074','EAN8'],['96385071','CODE128'],
  ['0000000000001','CODE128'],['INTERNAL-001','CODE128'],
  ['٦٢٨٥٠٠٨٧١٠٠٢١','CODE128']
];
for(const [barcode,format]of cases){
  const saved=context.validateProduct(product(barcode));
  assert.equal(saved.format,format);
  assert.equal(saved.barcode,context.latinDigits(barcode),'Never change the check digit or leading zeros');
  assert.ok(context.barcodeData(saved.barcode,saved.format).length);
  const draft=context.draftProduct(product(barcode));
  assert.equal(draft.barcode,saved.barcode);
  assert.equal(draft.format,saved.format);
}
assert.equal(context.validateProduct({...product('6285008710021'),format:'EAN13'}).format,'CODE128');
assert.equal(context.validateProduct({...product('042100005261'),format:'UPC'}).format,'CODE128');
for(const format of ['AUTO','EAN13','EAN8','UPC','CODE128']){
  for(const barcode of ['1','0000123','INTERNAL-001','ABC/12.3','6285008710021']){
    const item=context.validateProduct({...product(barcode),format});
    assert.equal(item.barcode,barcode);
    assert.ok(context.barcodeData(item.barcode,item.format).length);
    assert.equal(context.draftProduct({...product(barcode),format}).barcode,barcode);
  }
}
assert.throws(()=>context.validateProduct(product('')),/باركود/);
assert.throws(()=>context.validateProduct(product('x'.repeat(41))),/باركود/);
const generator=context.JsBarcode;context.JsBarcode=undefined;
assert.throws(()=>context.validateProduct(product('6285008710021')),/تحميل مولد الباركود/);
context.JsBarcode=generator;

// Exercise the real catalog handler against an isolated database.
const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('../drizzle/0000_woozy_psylocke.sql',import.meta.url),'utf8'));
const env={DB:{prepare(query){return {bind(...values){return {async first(){return sql.prepare(query).get(...values)||null;}};}};}}};
const saved=context.validateProduct(product('6285008710021'));
const response=await catalogApi(new Request('https://test.invalid/api/products',{method:'POST',headers:{origin:'https://test.invalid','content-type':'application/json'},body:JSON.stringify(saved)}),env);
assert.equal(response.status,201);
const created=(await response.json()).product;
assert.equal(created.barcode,'6285008710021');assert.equal(created.format,'CODE128');
const lookup=await catalogApi(new Request('https://test.invalid/api/products/by-barcode?barcode=6285008710021'),env);
assert.equal((await lookup.json()).product.id,created.id);
sql.close();
console.log('Barcode auto selection, exact digits, explicit-format fallback, preview and catalog save/reload passed.');
