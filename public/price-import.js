'use strict';
// Fixed-price imports reuse the local workbook reader, with their own retail-price headers.
window.PriceImportData=(()=>{
  const clean=v=>String(v??'').trim();
  const digits=v=>clean(v).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
  const norm=v=>digits(v).normalize('NFKC').replace(/^[0-9]+\s*[-.:)]\s*/,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\sـ_\-\u200e\u200f\ufeff:：()[\]\/]+/g,'').toLowerCase();
  function detect(sheet){
    const aliases={...window.OfferWorkbook.aliases,price:['السعر','سعر التجزئة','سعر البيع','السعر العادي','السعر الأساسي','سعر الطباعة','سعر التجزئة شامل الضريبة','retail price','selling price','regular price','price']};
    const fields=['name','nameEn','unit','unitEn','barcode','code','copies','price'];
    aliases.unitEn=['الوحدة بالانجليزية','الوحدة بالانجليزي','unit en','english unit'];
    const recognized=new Map();for(const field of fields)for(const value of aliases[field]||[])recognized.set(norm(value),field);
    let best=null;
    for(const row of sheet.rows.slice(0,80)){
      const mapping={},duplicates=[];
      row.values.forEach((v,i)=>{const key=recognized.get(norm(v));if(key){if(mapping[key]!==undefined)duplicates.push(key);else mapping[key]=i;}});
      if(mapping.name===undefined&&mapping.nameEn===undefined||mapping.price===undefined)continue;
      const count=sheet.rows.filter(r=>r.number>row.number&&(clean(r.values[mapping.name])||clean(r.values[mapping.nameEn]))&&clean(r.values[mapping.price])).length;
      if(!best||count>best.count)best={header:row.number,mapping,duplicates,count};
    }
    return best;
  }
  function money(value){
    const raw=digits(value).replace(/[٫,]/g,'.');
    if(!/^\d{1,7}(?:\.\d+)?$/.test(raw))throw new Error('السعر غير صحيح أو غير متوفر.');
    // Decimal-string rounding avoids binary floating-point surprises (e.g. 1.005).
    const [whole,fraction='']=raw.split('.');
    const cents=BigInt(whole)*100n+BigInt((fraction+'00').slice(0,2))+(Number(fraction[2]||0)>=5?1n:0n);
    const price=(cents/100n)+'.'+String(cents%100n).padStart(2,'0');
    return {price,rounded:/[1-9]/.test(fraction.slice(2))};
  }
  function extract(sheet,config,validate){
    if(!config)throw new Error('لم أجد عناوين اسم الصنف وسعر التجزئة. استخدم عناوين واضحة للأعمدة.');
    if(config.duplicates.length)throw new Error('يوجد أكثر من عمود للاسم أو السعر أو البيانات نفسها. احتفظ بعمود واحد لكل بيان في ورقة الاستيراد.');
    const products=[],errors=[],roundedRows=[];
    for(const row of sheet.rows){
      if(row.number<=config.header)continue;
      const raw={};for(const [key,index]of Object.entries(config.mapping))raw[key]=clean(row.values[index]);
      if(!Object.values(raw).some(Boolean))continue;
      // A repeated column header is not a product. All other populated rows must validate.
      if(norm(raw.name)===norm('اسم الصنف')&&norm(raw.price)===norm('سعر التجزئة'))continue;
      try{
        const amount=money(raw.price);
        const product=validate({...raw,price:amount.price,barcode:digits(raw.barcode||raw.code),copies:digits(raw.copies||1),format:'AUTO'});
        products.push(product);if(amount.rounded)roundedRows.push(row.number);
      }catch(error){errors.push(`الصف ${row.number}: ${error.message}`);}
    }
    if(errors.length)throw new Error(errors.slice(0,6).join('\n')+(errors.length>6?`\nو${errors.length-6} أخطاء أخرى.`:''));
    if(!products.length)throw new Error('لا توجد أصناف صالحة في هذه الورقة.');
    if(products.reduce((n,p)=>n+p.copies,0)>1000)throw new Error('الحد الأقصى ١٠٠٠ بطاقة في المهمة الواحدة. قسّم الملف.');
    return {products,roundedRows};
  }
  return {detect,extract,money};
})();

// IMPORT_UI
(()=>{
  const sizes={A4:[1,'portrait'],A5:[2,'landscape'],A6:[4,'portrait'],A7:[8,'landscape'],A8:[16,'portrait'],A9:[32,'portrait'],A10:[64,'landscape'],A11:[128,'portrait'],A12:[256,'portrait']};
  const L=(ar,en)=>state.language==='en'?en:ar;
  const root=document.createElement('section');root.className='price-import';root.setAttribute('aria-labelledby','priceImportHeading');
  root.innerHTML=`<div class="price-import-heading"><div><span class="price-import-eyebrow">EXCEL → PRINT</span><h2 id="priceImportHeading">من الإكسيل إلى بطاقات الأسعار</h2><p id="priceImportIntro">ارفع الإكسيل، حدد مقاس كل صنف، ثم اطبع الكل.</p></div><label class="price-import-upload"><span id="priceImportUploadLabel">رفع إكسيل الأسعار</span><input id="priceImportFile" type="file" accept=".xlsx,.xls,.csv,.tsv"></label></div><div class="price-import-sheet" hidden><label for="priceImportSheet">ورقة العمل</label><select id="priceImportSheet"></select></div><p id="priceImportStatus" role="status" aria-live="polite">يتعرف على اسم الصنف والوحدة وسعر التجزئة والباركود أو رقم الصنف.</p><div id="priceImportJob" hidden><div class="price-import-bottom"><div><strong id="priceImportSizeLabel">تطبيق مقاس على الأصناف المحددة</strong><span id="priceImportSizeHint">يمكنك اختيار مقاس مختلف أمام كل صنف. المقاسات موزعة على ورق A4 بهوامش طباعة.</span></div><div class="price-import-sizes" role="group" aria-labelledby="priceImportSizeLabel">${Object.entries(sizes).map(([s,[n]])=>`<button type="button" data-price-size="${s}"><b>${s}</b><small>${n} / A4</small></button>`).join('')}</div></div><div class="price-import-table-wrap"><table class="price-import-table"><thead><tr><th><input id="priceImportSelectAll" type="checkbox" aria-label="تحديد جميع الأصناف" checked></th><th>#</th><th>الصنف / الباركود</th><th>السعر</th><th>مقاس البطاقة</th></tr></thead><tbody id="priceImportRows"></tbody></table></div><div id="priceImportGroups" class="price-import-groups"></div><p id="priceImportMiniNote" hidden>A11 وA12: الباركود ورقمه موجودان بحجم مصغّر جدًا؛ قراءة القارئ غير مضمونة. جرّب ورقة أولًا.</p><div class="price-import-actions"><div><strong id="priceImportSummary" role="status"></strong><p id="priceImportReady" role="status"></p></div><div><button type="button" id="priceImportPdf" class="download-button">تنزيل الكل PDF</button><button type="button" id="priceImportPrint" class="print-button">طباعة الكل</button></div></div></div>`;
  document.querySelector('.workspace .main-surface').prepend(root);
  const status=$('priceImportStatus'),input=$('priceImportFile'),sheetSelect=$('priceImportSheet');
  let workbook=null,filename='',busy=false,imported=false,rows=[],jobIssues=[];
  const active=()=>(imported||busy)&&!window.offerStudio?.active&&!window.designStudio?.active&&!window.bundleStudio?.active;
  const selected=()=>rows.filter(r=>r.selected&&state.cards[r.position]);
  const groups=()=>Object.keys(sizes).map(size=>({size,rows:selected().filter(r=>r.size===size)})).filter(g=>g.rows.length);
  function message(){if(busy)return L('جارٍ التحقق من الإكسيل…','Validating workbook…');if(!selected().length)return L('حدد صنفًا واحدًا على الأقل.','Select at least one product.');const missing=selected().filter(r=>!r.size).length;return missing?L(`اختر مقاس ${missing} صنف قبل الطباعة.`,`Choose a size for ${missing} product(s) before printing.`):jobIssues.join(' ');}
  function syncButtons(){
    const issue=message(),disabled=!!issue||formSaving||pendingDraftIndexes().length>0||state.sample||document.body.classList.contains('exporting');
    for(const id of ['priceImportPrint','priceImportPdf'])$(id).disabled=disabled;
    if(active()){
      for(const id of ['printTop','printBottom','downloadTop','downloadBottom'])$(id).disabled=disabled;
      $('layoutWarning').hidden=!issue;$('layoutWarning').textContent=issue;
    }
    $('priceImportReady').textContent=issue||L('جاهز: تُجمع الأصناف في صفحات حسب مقاس كل صنف.','Ready: products are grouped into sheets by their selected sizes.');
  }
  function renderRows(){
    $('priceImportRows').innerHTML=rows.filter(r=>state.cards[r.position]).map((r,i)=>{const p=state.cards[r.position];return `<tr><td><input type="checkbox" data-price-select="${r.position}" aria-label="تحديد ${escapeHtml(p.name||p.nameEn)}" ${r.selected?'checked':''}></td><td>${i+1}</td><td><strong>${escapeHtml(productText(p))}</strong><small>${escapeHtml(productText(p,'unit'))}</small><b dir="ltr">${escapeHtml(p.barcode)}</b></td><td dir="ltr">${escapeHtml(p.price)}</td><td><select data-price-row-size="${r.position}" aria-label="مقاس ${escapeHtml(p.name||p.nameEn)}"><option value="">${L('اختر المقاس','Choose size')}</option>${Object.keys(sizes).map(s=>`<option value="${s}" ${r.size===s?'selected':''}>${s}</option>`).join('')}</select></td></tr>`;}).join('');
  }
  function update({table=false}={}){
    if(imported){const known=new Set(rows.map(r=>r.position));state.cards.forEach((p,position)=>{if(p&&!known.has(position))rows.push({position,selected:true,size:''});});}
    input.disabled=busy;sheetSelect.disabled=busy;$('priceImportJob').hidden=!imported;
    root.querySelectorAll('[data-price-size]').forEach(b=>b.disabled=busy);
    if(table)renderRows();
    const plan=groups(),count=selected().length,sheets=plan.reduce((n,g)=>n+Math.ceil(g.rows.length/sizes[g.size][0]),0);
    $('priceImportSummary').textContent=L(`${count} بطاقة محددة · ${sheets} ورقة طباعة`,`${count} selected labels · ${sheets} print sheets`);
    $('priceImportGroups').innerHTML=plan.map(g=>`<span><b>${g.size}</b> · ${g.rows.length} ${L('صنف','products')} · ${Math.ceil(g.rows.length/sizes[g.size][0])} ${L('ورقة','sheets')}</span>`).join('');
    $('priceImportMiniNote').hidden=!plan.some(g=>sizes[g.size][0]>=128);
    const all=$('priceImportSelectAll'),populated=rows.filter(r=>state.cards[r.position]);all.checked=!!populated.length&&populated.every(r=>r.selected);all.indeterminate=count>0&&count<populated.length;
    if(active())syncButtons();
  }
  function previewSize(size){
    [state.count,state.orientation]=sizes[size];state.paper='A4';state.page=0;state.selected=0;state.sample=false;
    $('paper').value=state.paper;$('orientation').value=state.orientation;
    document.querySelectorAll('[data-count]').forEach(b=>{const on=Number(b.dataset.count)===state.count;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
    trimGrid();loadForm();render();
    $('previewSubtitle').textContent=L(`معاينة تقسيم ${size}؛ طباعة الكل تعتمد المقاس المحدد أمام كل صنف في جدول الإكسيل.`,`Preview of the ${size} layout; Print all uses each product’s size from the Excel table.`);
  }
  function importSheetData(sheet){
    const config=window.PriceImportData.detect(sheet),result=window.PriceImportData.extract(sheet,config,validateProduct);
    // Validation completes before the existing job is replaced.
    replaceProducts(result.products);rows=state.cards.flatMap((p,position)=>p?[{position,selected:true,size:''}]:[]);imported=true;jobIssues=[];
    let summary=L(`تم إدخال ${result.products.length} صنفًا من «${filename}» · ${sheet.name} · العناوين في الصف ${config.header}.`,`Imported ${result.products.length} products from “${filename}” · ${sheet.name} · header row ${config.header}.`);
    if(result.roundedRows.length)summary+=L(` تم تقريب ${result.roundedRows.length} سعر إلى منزلتين عشريتين (الصفوف: ${result.roundedRows.join('، ')}).`,` ${result.roundedRows.length} price(s) rounded to two decimals (rows: ${result.roundedRows.join(', ')}).`);
    status.textContent=summary;status.classList.remove('is-error');
  }
  async function importSheet(index){importSheetData(await workbook.sheet(index));}
  async function run(action){const started=performance.now();busy=true;status.textContent=L('جارٍ قراءة الإكسيل والتحقق من الأصناف…','Reading workbook and validating products…');update();try{await action();}catch(error){status.textContent=error.message;status.classList.add('is-error');}finally{busy=false;update({table:true});if(!status.classList.contains('is-error'))status.textContent+=L(` · تجهيز ${( (performance.now()-started)/1000).toFixed(1)} ثانية.`,` · Prepared in ${((performance.now()-started)/1000).toFixed(1)} s.`);}}
  input.addEventListener('change',()=>{const file=input.files[0];if(!file)return;input.value='';run(async()=>{
    if(file.size>20*1024*1024)throw new Error('حجم الملف أكبر من ٢٠ ميجابايت. قسّم الملف.');
    const next=await window.OfferWorkbook.read(await file.arrayBuffer(),file.name);let best=-1,bestCount=-1;
    for(let i=0;i<next.sheets.length;i++){if(next.sheets[i].hidden)continue;const c=window.PriceImportData.detect(await next.sheet(i));if(c&&c.count>bestCount){best=i;bestCount=c.count;}}
    if(best<0)throw new Error('لم أجد ورقة بها اسم الصنف وسعر التجزئة. راجع عناوين الأعمدة.');
    workbook=next;filename=file.name;sheetSelect.replaceChildren(...next.sheets.map((s,i)=>new Option(s.name,i)));sheetSelect.value=String(best);sheetSelect.parentElement.hidden=next.sheets.length<2;await importSheet(best);
  });});
  sheetSelect.addEventListener('change',()=>run(()=>importSheet(Number(sheetSelect.value))));
  root.querySelectorAll('[data-price-size]').forEach(b=>b.addEventListener('click',()=>{for(const r of selected())r.size=b.dataset.priceSize;jobIssues=[];previewSize(b.dataset.priceSize);update({table:true});}));
  $('priceImportRows').addEventListener('change',event=>{const el=event.target,position=Number(el.dataset.priceRowSize??el.dataset.priceSelect),row=rows.find(r=>r.position===position);if(!row)return;jobIssues=[];if(el.matches('[data-price-row-size]')){row.size=el.value;if(row.size)previewSize(row.size);}else row.selected=el.checked;update();});
  $('priceImportSelectAll').addEventListener('change',event=>{rows.forEach(r=>r.selected=event.target.checked);jobIssues=[];update({table:true});});
  $('priceImportPrint').addEventListener('click',printNow);$('priceImportPdf').addEventListener('click',downloadPricePdf);
  document.addEventListener('pricing:mode',update);
  new MutationObserver(()=>{if(imported){jobIssues=[];update({table:true});}}).observe($('copiesSummary'),{childList:true});
  function prepareImportedPrint(){
    if(message()||formSaving||pendingDraftIndexes().length){syncButtons();return false;}
    const original={paper:state.paper,count:state.count,orientation:state.orientation},preview=$('previewPaper'),old=preview.firstChild,oldIssues=lastIssues.slice(),pages=[],errors=[];
    try{
      for(const group of groups()){
        [state.count,state.orientation]=sizes[group.size];state.paper='A4';updateLayout();
        const items=group.rows.map(r=>state.cards[r.position]);
        for(let i=0;i<items.length;i+=state.count){
          lastIssues=[];const page=makePaper(items.slice(i,i+state.count));
          // Freeze each group's physical typography before switching to the next size.
          for(const key of document.documentElement.style)if(key.startsWith('--'))page.style.setProperty(key,document.documentElement.style.getPropertyValue(key));
          page.dataset.labelSize=group.size;page.style.page=state.orientation==='landscape'?'priceLandscape':'pricePortrait';
          preview.replaceChildren(page);checkFit();
          errors.push(...lastIssues.map(issue=>group.size+': '+issue));pages.push(page);
        }
      }
    }finally{Object.assign(state,original);updateLayout();lastIssues=oldIssues;preview.replaceChildren(old);}
    jobIssues=[...new Set(errors)];$('printRoot').replaceChildren(...(jobIssues.length?[]:pages));
    $('printSize').textContent='@page pricePortrait { size: 210mm 297mm; margin: 0; } @page priceLandscape { size: 297mm 210mm; margin: 0; }';
    printPrepared=pages.length>0&&!jobIssues.length;syncButtons();return printPrepared;
  }
  window.priceImport={get active(){return active();},get blocksPrint(){return busy||imported&&!!message();},get message(){return message();},syncButtons,preparePrint:prepareImportedPrint};
  // Allow browser assistants to use the same validated import flow as file uploads.
  if(document.modelContext?.registerTool)document.modelContext.registerTool({
    name:'import_fixed_price_rows',title:'استيراد جدول الأسعار الموحدة',
    description:'Import fixed-price worksheet rows into the local print job. Replaces print cards only; never writes to the shared catalog or prints.',
    inputSchema:{type:'object',properties:{filename:{type:'string'},rows:{type:'array',minItems:1,maxItems:1100,items:{type:'object',properties:{number:{type:'integer',minimum:1},values:{type:'array',maxItems:50,items:{type:'string'}}},required:['number','values'],additionalProperties:false}}},required:['rows'],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:true,consequentialHint:false},
    execute(input){filename=String(input.filename||'Worksheet');importSheetData({name:'Sheet1',rows:input.rows});update({table:true});return {products:rows.length,needsSizes:selected().filter(r=>!r.size).length};}
  });
  update();
})();
