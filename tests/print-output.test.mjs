import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const pdfSource=readFileSync(new URL('../public/export-pdf.js',import.meta.url),'utf8');
const geometry=vm.createContext({state:{margin:5,gap:2},PAPER:{A3:[297,420],A4:[210,297],A5:[148,210],A6:[105,148]},isShelfTemplate:()=>false});
vm.runInContext(app.slice(app.indexOf('function getLayout('),app.indexOf('function updateLayout(')),geometry);
for(const paper of ['A3','A4','A5','A6'])for(const orientation of ['portrait','landscape'])for(const count of [1,2,4,5,6,8,12,16,20,32,64,128,256])for(const margin of [3,5,15])for(const gap of [0,1,2,5]){
  const l=geometry.getLayout({paper,orientation,count,margin,gap,brand:'karaz'});
  assert.ok(l.cw>0&&l.ch>0,'Never emit zero or negative CSS dimensions');
  if(l.invalid)continue;
  assert.ok(Math.abs(l.cw*l.cols+gap*(l.cols-1)+2*margin-l.w)<1e-9);
  assert.ok(Math.abs(l.ch*l.rows+gap*(l.rows-1)+2*margin-l.h)<1e-9);
}
assert.equal(geometry.getLayout({paper:'A6',orientation:'portrait',count:256,margin:15,gap:5,brand:'karaz'}).invalid,true);
vm.runInContext(app.slice(app.indexOf('const LABEL_PRESETS='),app.indexOf('const arabicDigits ='))+'\nglobalThis.presets=LABEL_PRESETS;',geometry);
for(const [size,[count,orientation]]of Object.entries(geometry.presets)){
  const l=geometry.getLayout({paper:'A4',orientation,count,margin:5,gap:2,brand:'nozha'});
  assert.equal(l.invalid,false,size+' preset must fit its A4 sheet');
  assert.equal(l.cols*l.rows,count);
}

// Company signs must use the same 210 x 99 mm strips when printed and exported.
const designs=readFileSync(new URL('../public/designs.js',import.meta.url),'utf8');
const company=vm.createContext({document:{createElement:()=>({style:{}})},data:{template:'geometry',brand:'nozha',writing:'bold',mono:false,cuts:true},entries:()=>[],esc:x=>x});
vm.runInContext(designs.slice(designs.indexOf('function sheet('),designs.indexOf('function fit(')),company);
const companySheet=company.sheet(0);
assert.equal(companySheet.style.width,'210mm');assert.equal(companySheet.style.height,'297mm');
company.download=async options=>{assert.equal(options.forPrint,true);};
vm.runInContext(designs.slice(designs.indexOf('async function print('),designs.indexOf('async function download(')),company);
await company.print();

const offers=readFileSync(new URL('../public/offers.js',import.meta.url),'utf8');
const offer=vm.createContext({PAPER:{A4:[210,297]},data:{paper:'A4'}});
vm.runInContext(offers.slice(offers.indexOf('function automaticCount('),offers.indexOf('function whitePaper(')),offer);
vm.runInContext(offers.slice(offers.indexOf('function geometry('),offers.indexOf('function groupKey(')),offer);
for(const size of ['A4','A5','A6','A7','A8','A4_20']){
 const l=offer.geometry(size);assert.equal(l.cols*l.rows,l.count);assert.ok(Math.abs(l.cw*l.cols-l.w)<1e-9);assert.ok(Math.abs(l.ch*l.rows-l.h)<1e-9);
}
const bundleSource=readFileSync(new URL('../public/bundle-offer.js',import.meta.url),'utf8');
const bundle=vm.createContext({data:{size:'A4'}});
vm.runInContext(bundleSource.slice(bundleSource.indexOf('const sizes ='),bundleSource.indexOf('const note =')),bundle);
vm.runInContext(bundleSource.slice(bundleSource.indexOf('function geometry('),bundleSource.indexOf('function logo(')),bundle);
for(const size of ['A4','A5','A6','A7']){bundle.data.size=size;const l=bundle.geometry();assert.ok(Math.abs(l.cw*l.cols-l.w)<1e-9);assert.ok(Math.abs(l.ch*l.rows-l.h)<1e-9);}

function setup({fail=false,allowed=true}={}){
  const calls=[],buttons=[{disabled:false},{disabled:true}],main={inert:false};
  const pages=[{style:{width:'297mm',height:'210mm'},classList:{add(){}},querySelectorAll:()=>[]},{style:{width:'210mm',height:'297mm'},classList:{add(){}},querySelectorAll:()=>[]}];
  const root={children:pages.slice(),style:{},getAttribute:()=>null,removeAttribute(){},replaceChildren(...next){this.children=next;},querySelectorAll:()=>[]};
  const status={textContent:''};
  const flags=new Set();
  class Pdf{
    constructor(options){calls.push(['new',options]);}
    setProperties(){}
    addImage(...args){calls.push(['image',args.slice(2,6)]);}
    addPage(...args){calls.push(['page',args]);}
    output(type){assert.equal(type,'blob');return {type:'application/pdf'};}
    async save(filename){calls.push(['save',filename]);}
  }
  const context=vm.createContext({
    $:id=>id==='printRoot'?root:id==='downloadStatus'?status:{addEventListener(){}},
    document:{body:{classList:{contains:x=>flags.has(x),add:x=>flags.add(x),remove:x=>flags.delete(x)}},fonts:{ready:Promise.resolve()},querySelector:()=>main,querySelectorAll:()=>buttons,documentElement:{clientWidth:1000,clientHeight:800}},
    window:{StudioAssets:{pdf:async()=>{}},jspdf:{jsPDF:Pdf},html2canvas:async()=>{if(fail)throw new Error('render failed');return {width:3508,height:2480,toDataURL:()=> 'data:image/jpeg;base64,TEST'};},print(){throw new Error('Must never print the HTML page with browser headers');}},
    state:{outputMode:'color',language:'en',brand:'karaz',paper:'A4',count:2},labelTemplate:'standard',isShelfTemplate:()=>false,preparePrint:()=>allowed,lastIssues:[],printPrepared:false,tr:x=>x,toast(){},showLayoutIssues(){},URL,console
  });
  vm.runInContext(pdfSource,context);
  vm.runInContext('showPricePrintPreview=(blob,filename,pages)=>{printResult={blob,filename,dimensions:pages.map(p=>[p.style.width,p.style.height])};};',context);
  return {context,calls,buttons,main,root,status,flags};
}
const print=setup();
await print.context.downloadPricePdf({print:true});
assert.equal(print.context.printResult.blob.type,'application/pdf');
assert.deepEqual(JSON.parse(JSON.stringify(print.context.printResult.dimensions)),[['297mm','210mm'],['210mm','297mm']]);
assert.ok(!print.calls.some(x=>x[0]==='save'),'Print opens the PDF instead of downloading or printing HTML');
assert.deepEqual(JSON.parse(JSON.stringify(print.calls.find(x=>x[0]==='page'))),['page',[[210,297],'portrait']]);
assert.equal(print.main.inert,false);assert.deepEqual(print.buttons.map(x=>x.disabled),[false,true]);assert.equal(print.root.children.length,0);
const download=setup();await download.context.downloadPricePdf();assert.equal(download.calls.filter(x=>x[0]==='save').length,1);assert.equal(download.context.printResult,undefined);
const error=setup({fail:true});await error.context.downloadPricePdf({print:true});assert.equal(error.context.printResult,undefined);assert.equal(error.main.inert,false);assert.deepEqual(error.buttons.map(x=>x.disabled),[false,true]);assert.equal(error.flags.size,0);assert.match(error.status.textContent,/render failed/);
const invalid=setup({allowed:false});await invalid.context.downloadPricePdf({print:true});assert.equal(invalid.calls.length,0);assert.equal(invalid.context.printResult,undefined);
console.log('Exact grid dimensions, clean PDF print delivery, mixed paper sizes, downloads, validation and error recovery passed.');
