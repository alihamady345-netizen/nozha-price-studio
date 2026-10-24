'use strict';
const $ = id => document.getElementById(id);
const state = { language:new URL(location.href).searchParams.get('lang')==='en'?'en':'ar', brand:'nozha', paper:'A4', orientation:'portrait', count:6, margin:5, gap:2, cutLines:true, outputMode:'color', cards:Array(6).fill(null), drafts:{}, page:0, selected:0, sample:false };
const PAPER = {A3:[297,420],A4:[210,297],A5:[148,210],A6:[105,148]};
const arabicDigits = value => String(value).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const latinDigits = value => String(value).replace(/[٠-٩۰-۹]/g,d=>String((d.charCodeAt(0)-0x660)%16));
const escapeHtml = value => String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const demo = {name:'أرز بسمتي فاخر',nameEn:'Premium Basmati Rice',unit:'٥ كجم',unitEn:'5 kg',price:'29.95',barcode:'1234567890128',format:'EAN13',copies:1,demo:true};
let currentLayout;
let lastIssues=[];
let printPrepared=false;
let logoCounter=0;
let formSaving=false;

function getLayout(settings=state){
  let [w,h]=PAPER[settings.paper];
  if(settings.orientation==='landscape')[w,h]=[h,w];
  let cols=1,rows=1;
  if(settings.count===2){cols=settings.orientation==='landscape'?2:1;rows=settings.orientation==='landscape'?1:2;}
  if(settings.count===4){cols=2;rows=2;}
  if(settings.count===5){cols=1;rows=5;}
  if(settings.count===6){cols=settings.orientation==='landscape'?3:2;rows=settings.orientation==='landscape'?2:3;}
  if(settings.count===8){cols=settings.orientation==='landscape'?4:2;rows=settings.orientation==='landscape'?2:4;}
  if(settings.count===12){cols=settings.orientation==='landscape'?4:3;rows=settings.orientation==='landscape'?3:4;}
  if(settings.count===16){cols=4;rows=4;}
  if(settings.count===32){cols=4;rows=8;}
  if(settings.count===64){cols=8;rows=8;}
  if(settings.count===128){cols=8;rows=16;}
  if(settings.count===256){cols=16;rows=16;}
  if(settings.count===20){cols=settings.orientation==='landscape'?5:4;rows=settings.orientation==='landscape'?4:5;}
  const cw=(w-2*settings.margin-(cols-1)*settings.gap)/cols;
  const ch=(h-2*settings.margin-(rows-1)*settings.gap)/rows;
  const micro=settings.count===32||settings.count===64;
  const compact=ch<47||(cw/ch>2&&ch<65);
  const large=!compact&&ch>=120&&cw>=90;
  const nameLineHeight=ch<90?1.22:1.3;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const pad=compact?clamp(ch*.043,1.1,2):clamp(ch*.035,1.6,8);
  const logoH=compact?clamp(ch*.17,3.5,7):large?clamp(ch*.125,12,38):clamp(ch*.10,6,30);
  const logoW=logoH*(settings.brand==='karaz'?1.76:1.16);
  const bw=compact?Math.min(cw-2*pad-2*(logoW+1),70):Math.min(cw-2*pad-4,large?108:86);
  const barcodeH=compact?5:clamp(ch*.07,5,large?20:17);
  const barcodeText=compact?1.7:clamp(ch*.021,2.1,3.5);
  const footerPad=compact?.4:clamp(ch*.015,.8,3);
  const headerH=compact?0:logoH+(large?4:1.5);
  const promiseSize=compact?clamp(ch*.034,1.75,2.2):large?clamp(ch*.02,3,5.3):clamp(ch*.035,1.75,3.2);
  const promiseGap=compact?.6:large?2.5:1;
  const footerH=barcodeH+barcodeText*1.35+footerPad+.6+promiseSize*1.4+promiseGap;
  const unitMargin=compact?.2:large?2:.5;
  const contentW=Math.max(1,cw-2*pad-.4);
  const priceShift=Math.min(3,contentW*.02);
  const layout={w,h,cols,rows,cw,ch,compact,large,pad,bw,unitMargin,nameLineHeight,priceShift,
    logoW,logoH,
    nameSecondaryRatio:large?.74:compact?.86:.82,
    nameSize:compact?clamp(ch*.105,2.8,4.2):large?clamp(Math.min(ch*.09,cw*.14),5,27):clamp(Math.min(ch*.071,cw*.095),3.5,18),
    unitSize:compact?clamp(ch*.077,2.1,2.6):large?clamp(Math.min(ch*.037,cw*.041),3.8,8):clamp(ch*.035,2.5,5.4),
    priceSize:compact?clamp(ch*.27,6.5,13):large?clamp(Math.min(ch*.29,cw*.36),10,95):clamp(Math.min(ch*.24,cw*.29),8,82),
    currencySize:compact?2:large?clamp(ch*.03,3,7):clamp(ch*.025,2.4,5.5),
    barcodeH,barcodeText,
    headerH,footerH,promiseSize,promiseGap,
    contentH:Math.max(0,ch-2*pad-.4-headerH-footerH),
    contentW,
    productPad:0,
    priceMargin:compact?.3:large?clamp(ch*.035,3,11):clamp(ch*.02,1,5),
    footerPad
  };
  // A9 labels reserve the full width for a readable barcode and a compact price row.
  if(micro)Object.assign(layout,{micro:true,pad:1.2,bw:cw-2.8,logoH:4.5,logoW:settings.brand==='karaz'?7.92:5.22,headerH:0,
    nameSize:3,unitSize:2.1,priceSize:7.5,barcodeH:5,barcodeText:1.8,footerPad:.3,
    footerH:8.5,contentW:cw-2.8,contentH:ch-11.3,promiseSize:0,promiseGap:0,priceMargin:.2,unitMargin:0});
  if(settings.count===64)Object.assign(layout,{tiny:true,pad:.7,bw:cw-1.8,logoH:3,logoW:settings.brand==='karaz'?5.28:3.48,
    nameSize:2,unitSize:1.5,priceSize:5,barcodeH:4,barcodeText:1.5,footerH:6.7,contentW:cw-1.8,contentH:ch-8.5,
    priceMargin:.1,priceShift:0});
  if(settings.count>=128)Object.assign(layout,{mini:true,compact:true,pad:.6,bw:cw-1.6,headerH:0,footerH:3.5,barcodeH:1.8,barcodeText:1,footerPad:.1,
    nameSize:settings.count===128?1.9:1.45,priceSize:settings.count===128?4.3:3,
    contentH:ch-5.1,contentW:cw-1.6,nameSecondaryRatio:1,priceMargin:.1,priceShift:0});
  if(settings.paper==='A4'&&settings.count===1){layout.bw=68;layout.barcodeH=11;}
  if(!layout.micro&&!layout.mini&&settings.count>1){layout.bw=Math.max(Math.min(layout.bw,40),layout.bw*.65);layout.barcodeH=Math.max(3.2,layout.barcodeH*.65);}
  layout.promiseIconH=layout.mini?.7:layout.tiny?1:layout.micro?1.3:compact?1.8:large?(settings.count===1?9:6):2.5;
  if(layout.micro||layout.mini){layout.promiseSize=layout.mini?.6:layout.tiny?.8:1;layout.promiseGap=.2;}
  const previousFooter=layout.footerH;
  layout.footerH=layout.barcodeH+layout.barcodeText*1.35+layout.footerPad+.6+(layout.mini?Math.max(layout.promiseIconH,layout.promiseSize*1.4):layout.promiseIconH+layout.promiseSize*1.4)+layout.promiseGap+.4;
  layout.contentH-=layout.footerH-previousFooter;
  return layout;
}

function updateLayout(){
  currentLayout=getLayout();
  const l=currentLayout;
  const css={'--content-h':l.contentH+'mm','--content-w':l.contentW+'mm','--tag-w':l.cw+'mm','--tag-h':l.ch+'mm','--tag-pad':l.pad+'mm','--tag-logo-w':l.logoW+'mm','--tag-logo-h':l.logoH+'mm','--name-size':l.nameSize+'mm','--unit-size':l.unitSize+'mm','--unit-margin':l.unitMargin+'mm','--price-size':l.priceSize+'mm','--currency-size':l.currencySize+'mm','--barcode-w':l.bw+'mm','--barcode-h':l.barcodeH+'mm','--barcode-text':l.barcodeText+'mm','--header-h':l.headerH+'mm','--tag-footer-h':l.footerH+'mm','--product-pad':l.productPad+'mm','--price-margin':l.priceMargin+'mm','--footer-pad':l.footerPad+'mm','--tag-brand':state.brand==='nozha'?'#506a38':'#97217c','--tag-secondary':state.brand==='nozha'?'#d9ad13':'#3b982f'};
  for(const[k,v]of Object.entries(css))document.documentElement.style.setProperty(k,v);
  document.documentElement.style.setProperty('--promise-icon-h',l.promiseIconH+'mm');
  document.documentElement.style.setProperty('--promise-size',l.promiseSize+'mm');
  document.documentElement.style.setProperty('--promise-gap',l.promiseGap+'mm');
  document.documentElement.style.setProperty('--name-line-height',String(l.nameLineHeight));
  document.documentElement.style.setProperty('--price-shift',l.priceShift+'mm');
  document.documentElement.style.setProperty('--tag-soft',state.brand==='nozha'?'#f4f7f0':'#fbf3fb');
  document.documentElement.style.setProperty('--tag-unit-color',state.brand==='nozha'?'#426334':'#832477');
  document.documentElement.style.setProperty('--accent',state.brand==='nozha'?'#28573d':'#872f82');
  document.documentElement.dataset.outputMode=state.outputMode;
  if(state.outputMode==='bw'){
    document.documentElement.style.setProperty('--tag-brand','#000000');
    document.documentElement.style.setProperty('--tag-secondary','#4b4b4b');
    document.documentElement.style.setProperty('--tag-soft','#ffffff');
    document.documentElement.style.setProperty('--tag-unit-color','#000000');
  }
  $('printSize').textContent=`@page { size: ${l.w}mm ${l.h}mm; margin: 0; }`;
  $('cardDimensions').textContent=`${l.cw.toFixed(1)} × ${l.ch.toFixed(1)} mm`;
  $('sheetSummary').textContent=state.language==='en'?`${state.paper} · ${state.count} labels / sheet`:`${state.paper} · ${arabicDigits(state.count)} بطاقة / ورقة`;
  const warning=[];
  if(!l.mini&&(l.ch<22||l.cw<(l.tiny?32:40)))warning.push(tr('هذا التقسيم صغير لعرض الاسم والسعر والباركود بوضوح. اختر ورقًا أكبر أو عدد بطاقات أقل.'));
  lastIssues=warning;
}

function logoMarkup(){
  const karaz=state.brand==='karaz';
  const view=karaz?'493 390 534 303':'74 70 1370 1180';
  const [x,y,width,height]=view.split(' '),clipId='logoCrop'+(++logoCounter);
  const label=state.language==='en'?(karaz?'Karaz logo':'Nozha logo'):`شعار ${karaz?'كرز':'نزهة'}`;
  return `<svg class="tag-logo" viewBox="${view}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}"><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white"/></clipPath></defs><image href="assets/${state.brand}.jpg" width="1536" height="${karaz?'1086':'1331'}" clip-path="url(#${clipId})"/></svg>`;
}

function signatureMarkup(){
  const main=state.outputMode==='bw'?'#000000':state.brand==='nozha'?'#506a38':'#97217c';
  const secondary=state.outputMode==='bw'?'#4b4b4b':state.brand==='nozha'?'#d9ad13':'#3b982f';
  return `<svg class="tag-signature" viewBox="0 0 90 28" aria-hidden="true"><path fill="${main}" d="M0 19h52l13-13h25v5H68L55 24H0z"/><path fill="${secondary}" d="M0 5h36v5H0z"/></svg>`;
}

function barcodeData(barcode,format){
  if(typeof JsBarcode!=='function')throw new Error(tr('تعذر تحميل مولد الباركود. أعد تحميل الصفحة.'));
  const cache=barcodeData.cache??=new Map(),key=format+'\n'+barcode;
  if(cache.has(key))return cache.get(key);
  const output={};
  try { JsBarcode(output,barcode,{format,displayValue:false}); }
  catch {throw new Error(state.language==='en'?`Invalid ${format} barcode. Check its number and check digit, or choose CODE128 for an internal code.`:`الباركود غير صحيح لنوع ${format}. راجع الرقم وخانة التحقق، أو اختر CODE128 إذا كان رقمًا داخليًا.`);}
  const encoded=output.encodings.map(e=>e.data).join('');
  if(cache.size>=2000)cache.clear();cache.set(key,encoded);return encoded;
}

function resolveBarcodeFormat(barcode,format='AUTO'){
  const candidate=format==='AUTO'?(/^\d{13}$/.test(barcode)?'EAN13':/^\d{12}$/.test(barcode)?'UPC':/^\d{8}$/.test(barcode)?'EAN8':'CODE128'):format;
  // Preserve the supplied number even when a retail format cannot encode it.
  // The same fallback applies to manually selected formats and scanned codes.
  if(candidate!=='CODE128'){
    if(typeof JsBarcode!=='function')throw new Error(tr('تعذر تحميل مولد الباركود. أعد تحميل الصفحة.'));
    try{barcodeData(barcode,candidate);return candidate;}catch{return 'CODE128';}
  }
  return candidate;
}

function validateProduct(raw){
  const name=String(raw.name??'').trim(),unit=String(raw.unit??'').trim(),nameEn=String(raw.nameEn??'').trim(),unitEn=String(raw.unitEn??'').trim();
  if(!name&&!nameEn)throw new Error(tr('أدخل اسم الصنف.'));
  if(name.length>100||nameEn.length>100||unit.length>35||unitEn.length>35)throw new Error(tr('اسم الصنف أو الوحدة أطول من الحد المتاح.'));
  const priceText=latinDigits(raw.price??'').trim().replace(/[٫,]/g,'.');
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(priceText))throw new Error(tr('أدخل سعرًا صحيحًا؛ مثال: 12.95. يُسمح بمنزلتين عشريتين.'));
  const copies=Number(latinDigits(raw.copies??1));
  if(!Number.isInteger(copies)||copies<1||copies>1000)throw new Error(tr('عدد النسخ يجب أن يكون عددًا صحيحًا من ١ إلى ١٠٠٠.'));
  const barcode=latinDigits(raw.barcode??'').trim();
  if(!barcode||barcode.length>40||!/^[\x20-\x7E]+$/.test(barcode))throw new Error(tr('أدخل باركودًا صحيحًا بالأرقام أو الأحرف الإنجليزية، بحد أقصى ٤٠ حرفًا.'));
  let format=raw.format??'AUTO';
  if(!['AUTO','EAN13','EAN8','UPC','CODE128'].includes(format))throw new Error(tr('نوع الباركود غير مدعوم.'));
  format=resolveBarcodeFormat(barcode,format);
  barcodeData(barcode,format);
  return {name,nameEn,unit,unitEn,price:Number(priceText).toFixed(2),copies,barcode,format};
}

function promiseMarkup(){
  const quality='<path d="m16 2 3 3 4-.2 1.5 3.7L28 11l-1 4 1 4-2.5 2.5L24 25l-4-.2-4 3-4-3L8 25l-1.5-3.5L4 19l1-4-1-4 2.5-2.5L8 4.8l4 .2Z"/><circle cx="16" cy="15" r="8" fill="white"/><path d="m12 15 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="m9 25-2 7 6-3 3 3 2-6 5 6 1-8"/>';
  const price='<g transform="translate(13 12) scale(.009)"><path  d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/><path  d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/></g><path d="M4 17 17 4h10l2 3v10L16 30Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="24" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="2"/>';
  const service='<path d="M15 17C3 10 9 2 15 7c6-5 12 3 0 10Z"/><path d="m3 23 5-3 7 2h8c3 0 3 4 0 4h-7m-8-6 3-3h5l5 4m-14 1 5 9 12-2 7-7c2-3-1-5-3-3l-5 3" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m1 23 5-3 6 11-5 3Z"/><path d="M15 1v2M4 5l2 2M27 5l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  return `<div class="tag-promise" lang="ar" dir="ltr" translate="no"><span class="promise-item"><svg viewBox="0 0 34 35" aria-hidden="true">${quality}</svg><span>الجودة</span></span><i aria-hidden="true">·</i><span class="promise-item"><svg viewBox="0 0 34 35" aria-hidden="true">${price}</svg><span>السعر</span></span><i aria-hidden="true">·</i><span class="promise-item"><svg viewBox="0 0 34 35" aria-hidden="true">${service}</svg><span>الخدمة</span></span></div>`;
}
function riyalMarkup(){return `<img class="riyal-symbol" src="assets/saudi-riyal.svg" width="512" height="572" alt="${state.language==='en'?'Saudi riyal':'ريال سعودي'}">`;}

function tagMarkup(item,index=null,{draft=false,sample=false}={}){
  const preview=index!==null;
  const name=latinDigits(productText(item)).replace(/٫/g,'.'),unit=latinDigits(productText(item,'unit')).replace(/٫/g,'.'),number=displayDigits(index%state.count+1);
  const editLabel=state.language==='en'?`Edit label ${number}: ${name}`:`تعديل البطاقة ${number}: ${name}`;
  const nameScript=/[\u0600-\u06ff]/u.test(name)?'ar':'en',unitScript=/[\u0600-\u06ff]/u.test(unit)?'ar':'en';
  const priceOK=/^\d+\.\d{2}$/.test(item.price||'');
  const [whole,fraction]=(priceOK?item.price:'').split('.');
  const price=priceOK?`${riyalMarkup()}<span class="whole">${whole}</span><span class="fraction">.${fraction}</span>`:'<span class="whole">—</span>';
  return `<article class="price-tag${currentLayout.compact?' compact':''}${currentLayout.large?' large-label':''}${currentLayout.micro?' micro-label':''}${currentLayout.tiny?' tiny-label':''}${currentLayout.mini?' mini-label':''}${state.cutLines?'':' no-cut'}${preview?' preview-slot':''}${preview&&index===state.selected?' slot-selected':''}" dir="${state.language==='en'?'ltr':'rtl'}" data-missing-name="${!name.trim()}" ${preview?`data-slot="${index}" role="button" tabindex="0" aria-label="${escapeHtml(editLabel)}" aria-pressed="${index===state.selected}"`:''} data-barcode="${escapeHtml(item.barcode||'')}" data-format="${item.format||'CODE128'}"><div class="tag-header">${logoMarkup()}${signatureMarkup()}</div><div class="tag-content"><div class="tag-content-inner"><div class="tag-product"><div class="tag-name" lang="${nameScript}" dir="${nameScript==='ar'?'rtl':'ltr'}">${escapeHtml(name||tr('تعريف الصنف'))}</div>${unit?`<div class="tag-unit" lang="${unitScript}" dir="${unitScript==='ar'?'rtl':'ltr'}"><span class="tag-unit-badge">${escapeHtml(unit)}</span></div>`:''}</div><div class="tag-price"><span class="tag-price-inner">${price}</span></div></div></div><div class="tag-footer"><svg class="tag-barcode" aria-label="${state.language==='en'?'Product barcode':'باركود الصنف'}"></svg><div class="barcode-number">${escapeHtml(item.barcode||'')}</div>${promiseMarkup()}</div>${draft?`<span class="draft-marker">${tr('تعديل غير محفوظ')}</span>`:sample?`<span class="draft-marker example-marker">${tr('مثال توضيحي')}</span>`:''}</article>`;
}

function emptySlotMarkup(index,preview){
  if(!preview)return `<div class="empty-print${state.cutLines?'':' no-cut'}"></div>`;
  const n=displayDigits(index%state.count+1),label=state.language==='en'?`Fill label ${n}`:`تعبئة البطاقة ${n}`;
  return `<article class="price-tag empty-preview preview-slot${currentLayout.compact?' compact':''}${index===state.selected?' slot-selected':''}" data-slot="${index}" role="button" tabindex="0" aria-label="${label}" aria-pressed="${index===state.selected}"><div class="tag-header">${logoMarkup()}${signatureMarkup()}</div><div class="slot-empty-content"><strong>${tr('تعريف الصنف')}</strong><span>${tr('اضغط لإدخال البيانات')}</span><div class="empty-price">—</div></div><div class="tag-footer">${tr('اسم الصنف · السعر · الباركود')}</div></article>`;
}

function draftProduct(raw){
  const price=latinDigits(raw.price||'').trim().replace(/[٫,]/g,'.');
  let barcode=latinDigits(raw.barcode||'').trim(),format=raw.format||'AUTO';
  try{format=resolveBarcodeFormat(barcode,format);if(barcode)barcodeData(barcode,format);}catch{barcode='';}
  return {name:raw.name||'',nameEn:raw.nameEn||'',unit:raw.unit||'',unitEn:raw.unitEn||'',price:/^\d{1,7}(?:\.\d{1,2})?$/.test(price)?Number(price).toFixed(2):'',barcode,format};
}

function makePaper(items,{preview=false,offset=0,sample=false}={}){
  const l=currentLayout;
  const paper=document.createElement('div');paper.className='paper';
  paper.dir=state.language==='en'?'ltr':'rtl';
  Object.assign(paper.style,{width:l.w+'mm',height:l.h+'mm',padding:state.margin+'mm',gap:state.gap+'mm',gridTemplateColumns:`repeat(${l.cols}, ${l.cw}mm)`,gridTemplateRows:`repeat(${l.rows}, ${l.ch}mm)`});
  paper.innerHTML=Array.from({length:state.count},(_,i)=>{
    const index=offset+i;
    if(preview&&!sample&&hasPendingDraft(index))return tagMarkup(draftProduct(state.drafts[index]),index,{draft:true});
    const item=sample?demo:items[i];
    return item?tagMarkup(item,preview?index:null,{sample}):emptySlotMarkup(index,preview);
  }).join('');
  paper.querySelectorAll('.price-tag[data-barcode]').forEach(tag=>{
    if(tag.dataset.missingName==='true')addIssue(tr('أكمل تعريف الصنف بالعربية في جميع البطاقات قبل الطباعة.'));
    if(!tag.dataset.barcode)return;
    const data=barcodeData(tag.dataset.barcode,tag.dataset.format),svg=tag.querySelector('.tag-barcode');
    const quiet=10,height=50;
    svg.setAttribute('viewBox',`0 0 ${data.length+2*quiet} ${height}`);svg.setAttribute('preserveAspectRatio','none');
    let bars='';for(let i=0;i<data.length;i++)if(data[i]==='1')bars+=`<rect x="${i+quiet}" y="0" width="1" height="${height}"/>`;
    svg.innerHTML=bars;
    if(!l.mini&&l.bw/(data.length+2*quiet)<.25)addIssue(tr('الباركود طويل لهذا المقاس. اختر تقسيمًا أقل أو ورقًا أكبر للحفاظ على وضوح الخطوط.'));
  });
  return paper;
}

function addIssue(message){if(!lastIssues.includes(message))lastIssues.push(message);}

function hasPendingDraft(index){const draft=state.drafts[index];return !!draft&&(!!state.cards[index]||['name','nameEn','unit','unitEn','price','barcode'].some(key=>String(draft[key]??'').trim()));}
function pendingDraftIndexes(){return Object.keys(state.drafts).filter(hasPendingDraft);}
function filledCount(){return state.cards.filter(Boolean).length;}
function pageCount(){return Math.max(1,Math.ceil(state.cards.length/state.count));}
function expandedProducts(){return state.cards.filter(Boolean);}
function growCards(minimum){const length=Math.ceil(Math.max(minimum,state.count)/state.count)*state.count;while(state.cards.length<length)state.cards.push(null);}
function trimGrid(){let last=state.cards.findLastIndex(Boolean);for(const key of Object.keys(state.drafts))last=Math.max(last,Number(key));state.cards=state.cards.slice(0,Math.max(last+1,state.count));growCards(last+1);}

function drawPicker(){
  const start=state.page*state.count;
  $('slotPicker').innerHTML=Array.from({length:state.count},(_,i)=>{
    const index=start+i,selected=index===state.selected;
    const n=displayDigits(i+1),label=(state.language==='en'?`Label ${n}`:`البطاقة ${n}`)+' — '+(state.cards[index]?(productText(state.cards[index])||tr('تعريف الصنف')):tr('بطاقة فارغة'));
    return `<button type="button" data-pick-slot="${index}" class="${selected?'selected ':''}${state.cards[index]?'has-product':''}" aria-label="${escapeHtml(label)}" aria-pressed="${selected}">${n}</button>`;
  }).join('');
  $('formHeading').textContent=state.language==='en'?`Label ${state.selected%state.count+1} details`:`بيانات البطاقة ${arabicDigits(state.selected%state.count+1)}`;
  $('cancelEdit').hidden=!state.drafts[state.selected];
  $('removeSlot').hidden=!state.cards[state.selected]&&!state.drafts[state.selected];
}

function drawPreview(){
  updateLayout();
  state.page=Math.max(0,Math.min(state.page,pageCount()-1));
  const start=state.page*state.count,items=state.cards.slice(start,start+state.count);
  const saved=items.filter(Boolean).length,hasDraft=pendingDraftIndexes().length>0;
  $('previewPaper').replaceChildren(makePaper(items,{preview:true,offset:start,sample:state.sample}));
  $('previewBadge').textContent=state.sample?tr('مثال توضيحي'):state.language==='en'?`${saved} of ${state.count} labels`:`${arabicDigits(saved)} من ${arabicDigits(state.count)} بطاقات`;
  $('previewBadge').classList.toggle('ready',saved>0&&!state.sample);
  $('previewSubtitle').textContent=state.sample?tr('البيانات المعروضة مثال للتصميم ولا تدخل ضمن الطباعة'):hasDraft?tr('احفظ التعديلات الحالية لتجهيز الطباعة'):tr('يمكن طباعة صنف واحد؛ الخانات غير المعبأة تظل فارغة.');
  $('sheetProgressFill').style.width=(saved/state.count*100)+'%';
  $('sampleToggle').textContent=state.sample?tr('العودة لتعبئة الورقة'):tr('مشاهدة مثال للتصميم');
  $('pageNumber').textContent=state.language==='en'?`Sheet ${state.page+1} of ${pageCount()}`:`ورقة ${arabicDigits(state.page+1)} من ${arabicDigits(pageCount())}`;
  $('prevPage').disabled=state.page===0;$('nextPage').disabled=state.page>=pageCount()-1;
  printPrepared=false;resizePreview();checkFit();showLayoutIssues();
}

function resizePreview(){
  if(!currentLayout)return;
  const stage=document.querySelector('.paper-stage');
  const padding=parseFloat(getComputedStyle(stage).paddingLeft)||26;
  const availableWidth=stage.clientWidth-2*padding;
  const maximumHeight=window.innerWidth<760?740:1000;
  const pixelW=currentLayout.w*96/25.4,pixelH=currentLayout.h*96/25.4;
  const scale=Math.min(Math.max(100,availableWidth)/pixelW,maximumHeight/pixelH,1);
  $('previewPaper').style.transform=`scale(${scale})`;
  $('paperFrame').style.width=pixelW*scale+'px';$('paperFrame').style.height=pixelH*scale+'px';
}

// Find the fewest whole-word lines that fit, then balance their visual widths.
function balancedNameLines(text,maxWidth,measure,secondaryScale=1){
  const words=text.trim().split(/\s+/u),n=words.length;
  if(n<2||measure(text)<=maxWidth)return [text];
  const widths=new Map();
  const width=(a,b)=>{const key=a+':'+b;if(!widths.has(key))widths.set(key,measure(words.slice(a,b).join(' ')));return widths.get(key);};
  for(let count=2;count<=n;count++){
    const detailWidth=secondaryScale<1?.86:1;
    const target=measure(words.join(' '))/(1+detailWidth*(count-1)/secondaryScale);
    let previous=Array(n+1).fill(null);previous[0]={cost:0,lines:[]};
    for(let line=0;line<count;line++){
      const scale=line===0?1:secondaryScale;
      const next=Array(n+1).fill(null);
      for(let start=0;start<n;start++){
        if(!previous[start])continue;
        for(let end=start+1;end<=n-(count-line-1);end++){
          const w=width(start,end)*scale;if(w>maxWidth)break;
          const orphan=end-start===1&&n>count+1?maxWidth*maxWidth*.12:0;
          const cost=previous[start].cost+(w-target*(line?detailWidth:1))**2+orphan;
          if(!next[end]||cost<next[end].cost)next[end]={cost,lines:[...previous[start].lines,words.slice(start,end).join(' ')]};
        }
      }
      previous=next;
    }
    if(previous[n])return previous[n].lines;
  }
  return [text]; // A single oversized word uses the existing character-wrap fallback.
}

function balanceName(name){
  const text=name.dataset.fullName??name.textContent;
  name.dataset.fullName=text;
  if(!name.clientWidth)return;
  // The primary name leads; description lines remain visibly quieter and readable.
  const fontMm=parseFloat(name.style.fontSize)||currentLayout.nameSize;
  const minimumScale=Math.min(1,2.8/fontMm);
  let secondaryScale=Math.min(1,Math.max(currentLayout.nameSecondaryRatio,minimumScale));
  const style=getComputedStyle(name),probe=document.createElement('span');
  Object.assign(probe.style,{position:'absolute',visibility:'hidden',whiteSpace:'pre',width:'max-content',fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,fontStyle:style.fontStyle,letterSpacing:style.letterSpacing,lineHeight:'1',pointerEvents:'none'});
  document.body.append(probe);
  let lines;
  try{
    const measure=value=>{probe.textContent=value;return probe.offsetWidth;};
    const paragraphs=text.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean);
    lines=paragraphs.length>1
      ?paragraphs.flatMap((s,i)=>balancedNameLines(s,name.clientWidth*.97/(i?secondaryScale:1),measure))
      :balancedNameLines(text,name.clientWidth*.97,measure,secondaryScale);
    if(lines.length>1){
      const widths=lines.map(measure);
      // A longer description must not overpower a short primary name.
      secondaryScale=Math.max(minimumScale,Math.min(secondaryScale,widths[0]*.9/Math.max(...widths.slice(1))));
    }
  }
  finally{probe.remove();}
  name.replaceChildren(...lines.map((line,index)=>{
    const span=document.createElement('span');span.className='tag-name-line '+(index?'tag-name-secondary':'tag-name-primary');
    if(index)span.style.fontSize=secondaryScale+'em';
    span.textContent=line+(index<lines.length-1?' ':'');return span;
  }));
}

function checkFit(){
  for(const tag of $('previewPaper').querySelectorAll('.price-tag:not(.empty-preview)')){
    const name=tag.querySelector('.tag-name'),product=tag.querySelector('.tag-product'),body=tag.querySelector('.tag-content-inner'),price=tag.querySelector('.tag-price'),inner=tag.querySelector('.tag-price-inner'),content=tag.querySelector('.tag-content'),l=currentLayout;
    let font=l.nameSize;
    const minimum=l.mini?(state.count===128?1.6:1.3):l.tiny?1.8:l.micro?2.5:l.compact?2.8:l.ch<75?3.2:3.5;
    if(body.scrollHeight){body.style.top='0';body.style.transform='none';}
    product.style.height='auto';product.style.paddingTop='0';product.style.paddingBottom='0';price.style.fontSize=l.priceSize+'mm';
    name.style.fontSize=font+'mm';balanceName(name);
    // Reserve the font's painted overflow inside the product group before fitting.
    // A short line box on another platform must not trigger a false clipping alert.
    const reserveProductInk=()=>{if(!l.large&&!l.mini)return;product.style.height='auto';product.style.height=Math.ceil(Math.max(product.scrollHeight,product.offsetHeight))*25.4/96+'mm';};
    reserveProductInk();
    // Large posters reserve the rendered header and barcode footer first.
    // Measure the actual content box rather than a theoretical font height.
    const availableH=content.clientHeight;
    const tooTall=()=>body.scrollHeight>availableH+2||tag.scrollHeight>tag.clientHeight+2;
    const nameDominates=()=>l.ch>=120&&name.offsetHeight>availableH*.46;
    let priceFont=l.priceSize;
    const minimumPrice=l.mini?(state.count===128?3.8:2.7):l.tiny?4:l.micro?5.5:l.compact?5:6;
    // Reserve equal edge clearance before shifting the amount slightly right.
    const priceWidth=()=>Math.max(0,price.clientWidth-2*l.priceShift*96/25.4);
    const shrinkPrice=floor=>{priceFont=Math.max(floor,priceFont-.5);price.style.fontSize=priceFont+'mm';};
    const shrinkName=()=>{font=Math.max(minimum,font-.15);name.style.fontSize=font+'mm';balanceName(name);reserveProductInk();};
    // Fit the price width first; a wide number must not needlessly shrink the name.
    while(inner.scrollWidth>priceWidth()+1&&priceFont>minimumPrice)shrinkPrice(minimumPrice);
    while((nameDominates()||name.scrollWidth>name.clientWidth+1)&&font>minimum)shrinkName();
    // Share the available height while keeping a clear, prominent price.
    const preferredPrice=Math.max(minimumPrice,Math.min(priceFont,l.priceSize*.7));
    while(tooTall()&&priceFont>preferredPrice)shrinkPrice(preferredPrice);
    while(tooTall()&&font>minimum)shrinkName();
    while(tooTall()&&priceFont>minimumPrice)shrinkPrice(minimumPrice);
    // Use measured physical space for the centered group in preview, PDF, and print.
    if(body.scrollHeight){body.style.top=Math.max(0,(availableH-body.scrollHeight)/2)*25.4/96+'mm';body.style.transform='none';}
    if(tooTall()||product.scrollHeight>product.clientHeight+2||inner.scrollWidth>priceWidth()+2){
      addIssue(tr('تعريف الصنف أو السعر لا يتسع لهذا المقاس. اختر ورقًا أكبر أو عدد بطاقات أقل؛ لن تُطبع بيانات مقصوصة.'));
    }
  }
  alignSheetPrices();
}

function alignSheetPrices(){
  const l=currentLayout,pxPerMm=96/25.4;
  const parts=Array.from($('previewPaper').querySelectorAll('.price-tag:not(.empty-preview)')).map(tag=>({
    tag,product:tag.querySelector('.tag-product'),price:tag.querySelector('.tag-price'),body:tag.querySelector('.tag-content-inner'),content:tag.querySelector('.tag-content')
  }));
  if(parts.length<2||parts.some(p=>!p.product.offsetHeight||!p.price.offsetHeight))return;
  // A sheet uses one price size and one price position, even with mixed name lengths.
  let font=Math.min(...parts.map(p=>parseFloat(p.price.style.fontSize)||l.priceSize));
  parts.forEach(p=>p.price.style.fontSize=font+'mm');
  const productH=Math.max(...parts.map(p=>p.product.offsetHeight));
  const contentH=Math.min(...parts.map(p=>p.content.clientHeight));
  const measureGroup=()=>productH+Math.max(...parts.map(p=>p.price.offsetHeight))+l.priceMargin*pxPerMm;
  // Equalizing two independently fitted cards can add a few pixels of rounding.
  // Fit the shared price before rejecting the whole sheet, leaving real clearance.
  const minimumPrice=l.mini?(state.count===128?3.8:2.7):l.tiny?4:l.micro?5.5:l.compact?5:6;
  while(measureGroup()>contentH-2&&font>minimumPrice){
    font=Math.max(minimumPrice,font-.25);
    parts.forEach(p=>p.price.style.fontSize=font+'mm');
  }
  const groupH=measureGroup();
  if(groupH>contentH+2){addIssue(tr('تعريف الصنف أو السعر لا يتسع لهذا المقاس. اختر ورقًا أكبر أو عدد بطاقات أقل؛ لن تُطبع بيانات مقصوصة.'));return;}
  const start=Math.max(0,(contentH-groupH)/2);
  for(const p of parts){
    const padding=Math.max(0,(productH-p.product.offsetHeight)/2)/pxPerMm+'mm';
    p.product.style.height=productH/pxPerMm+'mm';p.product.style.paddingTop=padding;p.product.style.paddingBottom=padding;
    p.body.style.top=start/pxPerMm+'mm';
    p.body.style.transform='none';
  }
}

function showLayoutIssues(){
  if(window.bundleStudio?.active){window.bundleStudio.syncButtons();return;}
  if(window.designStudio?.active){window.designStudio.syncButtons();return;}
  if(window.priceImport?.active){window.priceImport.syncButtons();return;}
  $('layoutWarning').hidden=!lastIssues.length;$('layoutWarning').textContent=lastIssues.join(' ');
  const disabled=!filledCount()||!!lastIssues.length||pendingDraftIndexes().length>0||state.sample||formSaving||document.body.classList.contains('exporting');
  for(const id of ['printTop','printBottom','downloadTop','downloadBottom'])$(id).disabled=disabled;
}

const editIcon='<svg viewBox="0 0 24 24"><path d="M16 3l5 5L9 20l-6 1 1-6zM14 5l5 5"/></svg>';
const deleteIcon='<svg viewBox="0 0 24 24"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg>';
function drawList(){
  const start=state.page*state.count;
  const saved=state.cards.slice(start,start+state.count).filter(Boolean).length;
  $('productCount').textContent=displayDigits(saved);
  $('copiesSummary').textContent=state.language==='en'?`${state.count} independent positions · ${filledCount()} saved labels in total`:`${arabicDigits(state.count)} أماكن مستقلة · ${arabicDigits(filledCount())} بطاقة محفوظة إجمالًا`;
  $('clearAll').hidden=!filledCount()&&!Object.keys(state.drafts).length;
  $('productList').innerHTML=Array.from({length:state.count},(_,i)=>{
    const index=start+i,p=state.cards[index],draft=hasPendingDraft(index)?state.drafts[index]:null,shown=draft?draftProduct(draft):p,n=displayDigits(i+1),unit=productText(shown,'unit');
    const editLabel=state.language==='en'?`Edit label ${n}`:`تعديل البطاقة ${n}`,clearLabel=state.language==='en'?`Clear label ${n}`:`إفراغ البطاقة ${n}`;
    return `<div class="product-row${index===state.selected?' is-selected':''}${shown?'':' empty'}"><span class="row-slot-number">${n}</span><div class="product-main"><strong>${shown?escapeHtml(productText(shown)||tr('تعريف الصنف')):tr('بطاقة فارغة')}</strong><div class="product-meta">${unit?`<span>${escapeHtml(unit)}</span>`:''}${shown&&shown.barcode?`<b dir="ltr">${escapeHtml(shown.barcode)}</b>`:''}${draft?`<span class="sample-note">${tr('تعديل غير محفوظ')}</span>`:''}</div></div>${shown&&shown.price?`<div class="product-price">${riyalMarkup()}${displayPrice(shown.price)}</div>`:''}${shown?`<div class="row-actions"><button type="button" data-edit="${index}" aria-label="${editLabel}">${editIcon}</button><button type="button" class="delete-button" data-delete="${index}" aria-label="${clearLabel}">${deleteIcon}</button></div>`:`<button type="button" class="fill-slot-button" data-edit="${index}">${tr('تعبئة')}</button>`}</div>`;
  }).join('');
}
function render(){drawPicker();drawList();drawPreview();}
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',2600);}
function readForm(){
  const english=state.language==='en';
  const source=state.drafts[state.selected]||state.cards[state.selected];
  return {name:$(english?'productNameOther':'productName').value,nameEn:$(english?'productName':'productNameOther').value,unit:$(english?'productUnitOther':'productUnit').value,unitEn:$(english?'productUnit':'productUnitOther').value,price:$('productPrice').value,copies:$('productCopies').value,barcode:$('productBarcode').value,format:$('barcodeType').value,catalogId:source?.catalogId,catalogVersion:source?.catalogVersion,catalogPrice:source?.catalogPrice,saveDestination:$('saveDestination').value};
}
function loadForm(){
  window.priceCatalog?.clearMatch();
  const p=state.drafts[state.selected]||state.cards[state.selected];
  $('productForm').reset();
  if(p){
    const english=state.language==='en';
    $('productName').value=productText(p);$('productUnit').value=productText(p,'unit');
    $('productNameOther').value=p[english?'name':'nameEn']||'';$('productUnitOther').value=p[english?'unit':'unitEn']||'';
    $('productPrice').value=p.price||'';$('productCopies').value=p.copies||1;$('productBarcode').value=p.barcode||'';$('barcodeType').value=p.format||'AUTO';
    $('alternateLanguageFields').open=!!$('productNameOther').value;
  }
  const destination=$('saveDestination');
  destination.querySelector('[value="print"]').disabled=!p?.catalogId;
  destination.value=p?.catalogId?(p.saveDestination||'print'):'library';
  updateSaveDestination();
  $('formError').textContent='';
}
function updateSaveDestination(){
  const p=state.drafts[state.selected]||state.cards[state.selected];
  const onlyPrint=!!p?.catalogId&&$('saveDestination').value==='print';
  $('addProduct').textContent=tr(onlyPrint?'تجهيز البطاقة للطباعة':'حفظ الصنف والبطاقة');
  const hint=$('saveDestinationHint');hint.replaceChildren();
  if(onlyPrint){
    const baseline=document.createElement('span');baseline.className='library-price';
    baseline.append(tr('السعر المحفوظ:')+' ');
    const price=document.createElement('b');price.dir='ltr';price.innerHTML=riyalMarkup()+escapeHtml(displayPrice(p.catalogPrice||p.price));baseline.append(price);
    hint.append(baseline,document.createTextNode(tr('التعديل لهذه الطباعة فقط؛ بيانات المكتبة تبقى كما هي.')));
  }else hint.textContent=tr(p?.catalogId?'سيتم تحديث بيانات الصنف وسعره في المكتبة المشتركة.':'الصنف الجديد يُحفظ في المكتبة ليكون متاحًا للجميع.');
}
function selectSlot(index,{scroll=false,focus=false}={}){
  if(!Number.isInteger(index)||index<0||index>=state.cards.length)return;
  state.selected=index;state.page=Math.floor(index/state.count);state.sample=false;loadForm();render();
  if(scroll)$('productForm').scrollIntoView({behavior:'smooth',block:'center'});
  if(focus)$('productName').focus();
}
function removeCard(index){state.cards[index]=null;delete state.drafts[index];if(state.selected===index)loadForm();render();toast(tr('تم إفراغ البطاقة مع بقاء أماكن بقية الأصناف'));}
function saveCurrentCard(raw,position=state.selected){
  const product=validateProduct(raw),next=state.cards.slice(),positions=[position];
  let index=position+1;
  while(positions.length<product.copies){
    if(!next[index]&&!state.drafts[index])positions.push(index);
    index++;
    if(index>2020)throw new Error(tr('الحد في مهمة الطباعة الواحدة ١٠٠٠ بطاقة.'));
  }
  const existing=next.filter(Boolean).length-(next[position]?1:0);
  if(existing+positions.length>1000)throw new Error(tr('الحد في مهمة الطباعة الواحدة ١٠٠٠ بطاقة.'));
  while(next.length<=positions.at(-1))next.push(null);
  for(const index of positions)next[index]={...product,copies:1,...(raw.catalogId?{catalogId:raw.catalogId,catalogVersion:raw.catalogVersion,catalogPrice:raw.catalogPrice||raw.price,printOnly:raw.saveDestination!=='library'}:{})};
  state.cards=next;growCards(next.length);delete state.drafts[position];
  return positions;
}

$('productForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(formSaving)return;
  try{
    const position=state.selected,raw=readForm();validateProduct(raw);
    formSaving=true;document.body.classList.add('catalog-saving');$('addProduct').disabled=true;showLayoutIssues();
    const onlyPrint=!!raw.catalogId&&raw.saveDestination==='print';
    const saved=window.priceCatalog&&!onlyPrint?await window.priceCatalog.saveProduct(raw):raw;
    saveCurrentCard({...saved,copies:raw.copies,saveDestination:onlyPrint?'print':'library'},position);
    const next=state.cards.findIndex((p,i)=>i>position&&!p&&!state.drafts[i]);
    if(state.selected===position&&next>=0)selectSlot(next,{focus:true});else{loadForm();render();}
    toast(onlyPrint?tr('تم تجهيز البطاقة بسعر هذه الطباعة فقط'):window.priceCatalog?tr('تم حفظ الصنف في المكتبة والبطاقة'):state.language==='en'?'Label '+(position%state.count+1)+' saved':'تم حفظ البطاقة '+arabicDigits(position%state.count+1));
  }catch(error){$('formError').textContent=error.message;}
  finally{formSaving=false;document.body.classList.remove('catalog-saving');$('addProduct').disabled=false;showLayoutIssues();}
});
let draftTimer;
$('productForm').addEventListener('input',()=>{
  state.drafts[state.selected]=readForm();state.sample=false;$('formError').textContent='';
  clearTimeout(draftTimer);draftTimer=setTimeout(render,120);
  for(const id of ['printTop','printBottom','downloadTop','downloadBottom'])$(id).disabled=true;
  $('cancelEdit').hidden=false;
});
$('productForm').addEventListener('change',()=>{state.drafts[state.selected]=readForm();state.sample=false;updateSaveDestination();clearTimeout(draftTimer);render();});
$('cancelEdit').addEventListener('click',()=>{delete state.drafts[state.selected];loadForm();render();});
$('removeSlot').addEventListener('click',()=>removeCard(state.selected));
$('slotPicker').addEventListener('click',event=>{const button=event.target.closest('[data-pick-slot]');if(button)selectSlot(Number(button.dataset.pickSlot));});
$('previewPaper').addEventListener('click',event=>{const tag=event.target.closest('[data-slot]');if(tag)selectSlot(Number(tag.dataset.slot),{scroll:window.innerWidth<760,focus:true});});
$('previewPaper').addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const tag=event.target.closest('[data-slot]');if(tag){event.preventDefault();selectSlot(Number(tag.dataset.slot),{scroll:window.innerWidth<760,focus:true});}});
$('productList').addEventListener('click',event=>{const edit=event.target.closest('[data-edit]'),del=event.target.closest('[data-delete]');if(edit)selectSlot(Number(edit.dataset.edit),{scroll:true,focus:true});if(del)removeCard(Number(del.dataset.delete));});
$('clearAll').addEventListener('click',()=>{if(confirm(tr('هل تريد مسح جميع بطاقات الطباعة؟'))){state.cards=Array(state.count).fill(null);state.drafts={};state.page=0;state.selected=0;state.sample=false;loadForm();render();}});
document.querySelectorAll('[data-brand]').forEach(button=>button.addEventListener('click',()=>{
  state.brand=button.dataset.brand;document.querySelectorAll('[data-brand]').forEach(b=>{const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});drawPreview();
}));
document.querySelectorAll('[data-count]').forEach(button=>button.addEventListener('click',()=>{
  state.count=Number(button.dataset.count);if(state.count===64){state.orientation='landscape';$('orientation').value=state.orientation;}trimGrid();state.page=0;state.selected=0;state.sample=false;
  document.querySelectorAll('[data-count]').forEach(b=>{const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});loadForm();render();
}));
for(const id of ['paper','orientation'])$(id).addEventListener('change',()=>{state[id]=$(id).value;drawPreview();});
for(const id of ['margin','gap'])$(id).addEventListener('change',()=>{let value=Number($(id).value);const min=id==='margin'?3:0,max=id==='margin'?15:5;if(!Number.isFinite(value))value=id==='margin'?5:2;state[id]=Math.max(min,Math.min(max,value));$(id).value=state[id];drawPreview();});
$('cutLines').addEventListener('change',()=>{state.cutLines=$('cutLines').checked;drawPreview();});
$('prevPage').addEventListener('click',()=>selectSlot((state.page-1)*state.count));
$('nextPage').addEventListener('click',()=>selectSlot((state.page+1)*state.count));
$('addPage').addEventListener('click',()=>{if(state.cards.length>=1020){toast(tr('الحد في مهمة الطباعة الواحدة ١٠٠٠ بطاقة'));return;}const start=state.cards.length;growCards(start+state.count);selectSlot(start);});
$('sampleToggle').addEventListener('click',()=>{state.sample=!state.sample;drawPreview();});
document.querySelectorAll('[data-output-mode]').forEach(button=>button.addEventListener('click',()=>{
  state.outputMode=button.dataset.outputMode;
  document.querySelectorAll('[data-output-mode]').forEach(b=>{const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  $('downloadStatus').textContent='';drawPreview();
}));
window.addEventListener('resize',resizePreview);

document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{
  const language=button.dataset.language;if(language===state.language)return;
  clearTimeout(draftTimer);
  if(state.drafts[state.selected])state.drafts[state.selected]=readForm();
  state.language=language;
  const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);
  translateInterface();loadForm();render();$('printRoot').replaceChildren();$('downloadStatus').textContent='';$('toast').style.display='none';
  window.priceCatalog?.refreshLabels();
  $('scannerHint').textContent=tr('المسح يملأ الباركود؛ اكتب تعريف الصنف والسعر.');$('scannerHint').classList.remove('scan-ready');
}));

function preparePrint(){
  if(window.bundleStudio?.active)return window.bundleStudio.preparePrint();
  if(window.designStudio?.active)return window.designStudio.preparePrint();
  if(window.offerStudio?.active)return window.offerStudio.preparePrint();
  if(window.priceImport?.active)return window.priceImport.preparePrint();
  const root=$('printRoot');
  if(!filledCount()||pendingDraftIndexes().length||formSaving){root.replaceChildren();return false;}
  updateLayout();
  const pages=[];
  for(let i=0;i<state.cards.length;i+=state.count){const items=state.cards.slice(i,i+state.count);if(items.some(Boolean))pages.push(makePaper(items));}
  const preview=$('previewPaper'),old=preview.firstChild;
  for(const page of pages){preview.replaceChildren(page);checkFit();}
  preview.replaceChildren(old);root.replaceChildren(...pages);showLayoutIssues();
  printPrepared=!lastIssues.length;
  if(!printPrepared)root.replaceChildren();
  return printPrepared;
}
async function printNow(){
  try{await document.fonts.ready;if(!preparePrint()){toast(lastIssues[0]||tr('احفظ بيانات البطاقات قبل الطباعة'));return;}window.print();}
  catch(error){toast(error.message||tr('تعذر تجهيز الطباعة. أعد المحاولة.'));}
}
$('printTop').addEventListener('click',printNow);
$('printBottom').addEventListener('click',printNow);
window.addEventListener('beforeprint',()=>{if(!printPrepared)preparePrint();});
window.addEventListener('afterprint',()=>{printPrepared=false;});

function replaceProducts(rawProducts){
  const products=rawProducts.map(validateProduct),cards=products.flatMap(p=>Array.from({length:p.copies},()=>({...p,copies:1})));
  if(cards.length>1000)throw new Error('Maximum 1000 cards per print job.');
  state.cards=cards;state.drafts={};state.page=0;state.selected=0;state.sample=false;growCards(cards.length);loadForm();render();
  return {products:products.length,cards:filledCount(),pages:pageCount(),issues:lastIssues.slice()};
}
function registerAgentTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_price_label_workspace',title:tr('قراءة إعدادات بطاقات الأسعار'),description:'Read the language, paper, brand and saved cards with their exact positions. Does not print.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(){return {language:state.language,brand:state.brand,paper:state.paper,orientation:state.orientation,cardsPerSheet:state.count,margin:state.margin,gap:state.gap,cards:state.cards.map((p,i)=>({position:i+1,product:p?{...p}:null})),selectedPosition:state.selected+1,unsavedPositions:Object.keys(state.drafts).map(i=>Number(i)+1),dimensionsMM:{width:currentLayout.cw,height:currentLayout.ch},issues:lastIssues.slice()};}});
  const productSchema={type:'object',properties:{name:{type:'string'},nameEn:{type:'string'},unit:{type:'string'},unitEn:{type:'string'},price:{type:'string'},barcode:{type:'string'},copies:{type:'integer',minimum:1,maximum:1000},format:{type:'string',enum:['AUTO','EAN13','EAN8','UPC','CODE128']}},required:['price','barcode'],anyOf:[{required:['name']},{required:['nameEn']}],additionalProperties:false};
  register({name:'set_price_label_products',title:tr('إدخال أصناف بطاقات الأسعار'),description:'Replace all saved cards with validated products in order, preserving requested copies. Does not print.',inputSchema:{type:'object',properties:{products:{type:'array',minItems:1,maxItems:1000,items:productSchema}},required:['products'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||!Array.isArray(input.products)||!input.products.length)throw new Error('A nonempty products array is required.');return replaceProducts(input.products);}});
  register({name:'set_price_label_card',title:tr('تعبئة بطاقة محددة'),description:'Save a product in one specified card position without changing other cards. Does not print.',inputSchema:{type:'object',properties:{position:{type:'integer',minimum:1,maximum:1000},product:productSchema},required:['position','product'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||!Number.isInteger(input.position)||input.position<1||input.position>1000)throw new Error('Position must be an integer from 1 to 1000.');const product=validateProduct(input.product);if(product.copies!==1)throw new Error('This action saves one card; copies must be 1.');growCards(input.position);const index=input.position-1;state.cards[index]={...product,copies:1};delete state.drafts[index];selectSlot(index);return {position:input.position,product:{...product},issues:lastIssues.slice()};}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
translateInterface();loadForm();render();document.fonts.ready.then(()=>{drawPreview();registerAgentTools();});
