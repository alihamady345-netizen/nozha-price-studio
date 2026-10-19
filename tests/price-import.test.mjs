import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({state:{language:'ar'},tr:s=>s});context.window=context;
for(const file of ['public/assets/JsBarcode.all.min.js','public/offers-xlsx.js'])vm.runInContext(readFileSync(file,'utf8'),context);
const app=readFileSync('public/app.js','utf8');
vm.runInContext(app.slice(app.indexOf('const latinDigits ='),app.indexOf('const escapeHtml =')),context);
vm.runInContext(app.slice(app.indexOf('function barcodeData('),app.indexOf('function riyalMarkup(')),context);
vm.runInContext(readFileSync('public/price-import.js','utf8').split('// IMPORT_UI')[0],context);
const api=context.PriceImportData;
const sheet={rows:[{number:3,values:['رقم الصنف','اسم الصنف','الوحدة','1-سعرالتجزئه']},{number:4,values:['0000123456789','صنف تجريبي','حبة','19.9985']},{number:5,values:['6285008710029','صنف آخر','حبة','12.95']}]};
const config=api.detect(sheet);assert.equal(config.header,3);assert.equal(config.mapping.price,3);
const result=api.extract(sheet,config,context.validateProduct);
assert.equal(result.products.length,2);assert.equal(result.products[0].barcode,'0000123456789');assert.equal(result.products[0].price,'20.00');assert.equal(result.roundedRows[0],4);
assert.equal(api.money('1.005').price,'1.01');assert.equal(api.money('١٢٫٩٥').price,'12.95');assert.equal(api.money('0').price,'0.00');
assert.equal(api.money('19.99000').rounded,false);
assert.throws(()=>api.money('-1'));assert.throws(()=>api.money('12,999.00'));
const bad=structuredClone(sheet);bad.rows.push({number:6,values:['123','بدون سعر','حبة','']});
assert.throws(()=>api.extract(bad,api.detect(bad),context.validateProduct),/الصف 6/);
const noCode=structuredClone(sheet);noCode.rows[1].values[0]='';assert.throws(()=>api.extract(noCode,api.detect(noCode),context.validateProduct),/باركود/);
const ambiguous={rows:[{number:1,values:['اسم الصنف','السعر','سعر التجزئة','الباركود']}]};assert.throws(()=>api.extract(ambiguous,api.detect(ambiguous),context.validateProduct),/أكثر من عمود/);
const many=structuredClone(sheet);many.rows[0].values.push('عدد النسخ');many.rows[1].values.push('1000');assert.throws(()=>api.extract(many,api.detect(many),context.validateProduct),/١٠٠٠/);
if(process.argv[2]){
 const actual=JSON.parse(readFileSync(process.argv[2],'utf8'));
 const imported=api.extract(actual,api.detect(actual),context.validateProduct);
 assert.equal(imported.products.length,37);assert.equal(imported.products[1].price,'20.00');
 for(let i=0;i<37;i++){assert.equal(imported.products[i].barcode,String(actual.rows[i+1].values[0]));assert.equal(imported.products[i].name,actual.rows[i+1].values[1]);assert.equal(imported.products[i].unit,actual.rows[i+1].values[2]);}
 console.log('Actual user workbook: all 37 identifiers, names, units and rounded price verified.');
}
console.log('Header detection, exact codes, decimal rounding, malformed rows, ambiguity and card limit passed.');
