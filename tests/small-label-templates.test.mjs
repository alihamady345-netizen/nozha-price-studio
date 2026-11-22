import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const context=vm.createContext({labelTemplate:'check',state:{outputMode:'bw',brand:'nozha'},currentLayout:{cw:34.13,ch:23.25,compact:true,micro:true,mini:false,headerH:0}});
vm.runInContext(source.slice(source.indexOf('const isCompetitiveTemplate='),source.indexOf('const isPromotionTemplate=')),context);
vm.runInContext(source.slice(source.indexOf('function labelCheckMarkup('),source.indexOf('function promotionHeaderMarkup(')),context);
for(const layout of [{cw:34.13,ch:23.25,micro:true,mini:false},{cw:23.25,ch:16.06,micro:false,mini:true},{cw:10.63,ch:16.06,micro:false,mini:true}]){
  Object.assign(context.currentLayout,layout);
  assert.equal(context.labelCheckMarkup(),'','Small labels must not reserve a separate band above the name');
  const amount=context.priceMarkup('29.95');
  assert.match(amount,/inline-check-price/);assert.match(amount,/price-inline-check/);
  assert.match(amount,/price-frame-amount/,'The fitter must measure the amount after subtracting icon width');
  assert.match(amount,/29\.95/);
}
Object.assign(context.currentLayout,{cw:97.5,ch:141,micro:false,mini:false,compact:false,headerH:15});
assert.match(context.labelCheckMarkup(),/tag-check-mark/);
assert.doesNotMatch(context.priceMarkup('29.95'),/inline-check-price/);
console.log('Small check labels keep their content height and measure the amount independently of the icon.');
