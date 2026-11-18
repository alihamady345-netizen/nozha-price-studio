import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the actual import UI and clear/remove handlers without a shared catalog.
const elements=new Map();
const element=id=>{
  if(!elements.has(id))elements.set(id,{
    value:'',textContent:'',hidden:false,disabled:false,parentElement:{hidden:false},handlers:{},
    classList:{remove(){},contains(){return false;}},
    addEventListener(type,handler){this.handlers[type]=handler;},
    setAttribute(){},prepend(){},replaceChildren(){},
    querySelector(){return element(id+'-child');},querySelectorAll(){return [];}
  });
  return elements.get(id);
};
const state={language:'ar',count:2,cards:[],drafts:{},selected:0};
let importedTool,observer;
const context=vm.createContext({
  state,window:{},LABEL_PRESETS:{A4:[1,'portrait'],A5:[2,'landscape']},
  $:element,tr:x=>x,formSaving:false,pendingDraftIndexes:()=>[],isShelfTemplate:()=>false,
  printNow(){},downloadPricePdf(){},loadForm(){},render(){},trimGrid(){},toast(){},confirm:()=>true,
  presetSpacing:()=>({margin:5,gap:5}),
  validateProduct:x=>x,replaceProducts:products=>{state.cards=products;},escapeHtml:x=>x,productText:p=>p.name,
  document:{createElement:()=>element('root'),querySelector:()=>element('main'),querySelectorAll:()=>[],addEventListener(){},
    body:{classList:{contains:()=>false}},modelContext:{registerTool:tool=>{importedTool=tool;}}},
  MutationObserver:class{constructor(callback){observer=callback;}observe(){}}
});
context.window.PriceImportData={detect:()=>({header:1}),extract:()=>({products:[{name:'First',barcode:'111',price:'1'},{name:'Second',barcode:'222',price:'2'}],roundedRows:[]})};
const importSource=readFileSync(new URL('../public/price-import.js',import.meta.url),'utf8');
vm.runInContext(importSource.split('// IMPORT_UI')[1],context);
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
vm.runInContext(app.slice(app.indexOf('function removeCard('),app.indexOf('function saveCurrentCard(')),context);
vm.runInContext(app.slice(app.indexOf("$('clearAll').addEventListener"),app.indexOf("document.querySelectorAll('[data-brand]')")),context);
const start=()=>{importedTool.execute({rows:[]});element('priceImportRows').handlers.change({target:{dataset:{priceRowSize:'0'},value:'A4',matches:()=>true,checked:true}});};
start();
assert.equal(context.window.priceImport.active,true);
assert.match(element('priceImportReady').textContent,/اختر مقاس 1 صنف/);
// Removing one slot must discard that slot's old selection when it is reused.
context.removeCard(0);observer();state.cards[0]={name:'Replacement',barcode:'333',price:'3'};observer();
assert.match(element('priceImportReady').textContent,/اختر مقاس 2 صنف/);
// Clearing the whole job must immediately restore manual printing, even before an observer runs.
element('clearAll').handlers.click();
assert.equal(context.window.priceImport.active,false);
assert.equal(context.window.priceImport.blocksPrint,false);
assert.equal(element('priceImportJob').hidden,true);
state.cards=[{name:'Manual',barcode:'444',price:'4'}];observer();
assert.equal(context.window.priceImport.active,false);
// A subsequent upload starts normally, and deleting its final card also exits import mode.
start();context.removeCard(0);observer();context.removeCard(1);
assert.equal(context.window.priceImport.active,false);
assert.equal(element('priceImportRows').innerHTML,'');
console.log('Cleared imports and removed slots cannot transfer stale sizes to later manual cards.');
