import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const buttons=['standard','check','price-frame','shelf','special-offer','wholesale'].map(template=>({
  dataset:{labelTemplate:template},classList:{toggle(){}},setAttribute(){},addEventListener(type,fn){this.click=fn;}
}));
const colors=['color','bw'].map(mode=>({dataset:{outputMode:mode},classList:{toggle(){}},setAttribute(){}}));
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{value:'',disabled:false,hidden:false});return elements.get(id);};
const state={paper:'A5',orientation:'landscape',count:4,margin:7,gap:2,outputMode:'color',cards:[{name:'First'},{name:'Second'}],drafts:{1:{name:'Draft'}},selected:1,page:0};
const original=structuredClone(state);
const context=vm.createContext({
  state,$:element,window:{},Object,Event:class{},
  document:{querySelectorAll:selector=>selector==='[data-label-template]'?buttons:selector==='[data-output-mode]'?colors:[],dispatchEvent(){}},
  trimGrid(){},loadForm(){},render(){},drawPreview(){}
});
vm.runInContext("let labelTemplate='standard';"+source.slice(source.indexOf('const SHELF_PRINT='),source.indexOf('function getLayout(')),context);
vm.runInContext(source.slice(source.indexOf('const labelTemplateButtons='),source.indexOf("document.querySelectorAll('[data-output-mode]').forEach(button=>button.addEventListener")),context);
const click=template=>buttons.find(b=>b.dataset.labelTemplate===template).click();
for(const template of ['special-offer','wholesale']){
  click(template);
  assert.equal(state.paper,'A4');assert.equal(state.orientation,'portrait');assert.equal(state.count,1);
  assert.equal(state.outputMode,'bw');assert.equal(state.margin,5);
  assert.ok(colors.every(b=>b.disabled));
  assert.equal(element('promotionLayoutNote').hidden,false);
  click('shelf');assert.equal(state.count,16);assert.equal(state.gap,1);
  assert.equal(element('promotionLayoutNote').hidden,true);
  click(template);assert.equal(state.count,1);assert.equal(state.outputMode,'bw');
  click('standard');
  for(const key of ['paper','orientation','count','margin','gap','outputMode'])assert.equal(state[key],original[key]);
  assert.ok(colors.every(b=>!b.disabled));
  assert.deepEqual(state.cards,original.cards);assert.deepEqual(state.drafts,original.drafts);
}
console.log('A4 monochrome posters preserve cards, drafts and the previous layout across template switches.');
vm.runInContext(source.slice(source.indexOf('function balancedNameLines('),source.indexOf('function balanceName(')),context);
const lines=context.balancedNameLines('شوكولاتة فاخرة 25 جم',14,text=>text.length,1,true);
assert.ok(lines.some(line=>line.includes('25\u00a0جم')),'Keep the quantity with its unit when balancing product names');
assert.ok(!lines.some(line=>line==='جم'));
