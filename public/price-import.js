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
  const root=document.createElement('section');root.className='price-import';root.setAttribute('aria-labelledby','priceImportHeading');
  root.innerHTML=`<div class="price-import-heading"><div><span class="price-import-eyebrow">EXCEL → PRINT</span><h2 id="priceImportHeading">من الإكسيل إلى بطاقات الأسعار</h2><p id="priceImportIntro">ارفع الملف، اختر مقاس البطاقة، ثم اطبع جميع الأصناف.</p></div><label class="price-import-upload"><span id="priceImportUploadLabel">رفع إكسيل الأسعار</span><input id="priceImportFile" type="file" accept=".xlsx,.xls,.csv,.tsv"></label></div><div class="price-import-sheet" hidden><label for="priceImportSheet">ورقة العمل</label><select id="priceImportSheet"></select></div><p id="priceImportStatus" role="status" aria-live="polite">يدعم اسم الصنف، الوحدة، سعر التجزئة، والباركود أو رقم الصنف.</p><div class="price-import-bottom"><div><strong id="priceImportSizeLabel">مقاس البطاقة</strong><span id="priceImportSizeHint">توزيع تلقائي على ورق A4 مع هوامش الطباعة.</span></div><div class="price-import-sizes" role="group" aria-labelledby="priceImportSizeLabel">${['A4','A5','A6','A7','A8','A9'].map((s,i)=>`<button type="button" data-price-size="${s}" aria-pressed="false"><b>${s}</b><small>${[1,2,4,8,16,32][i]} / A4</small></button>`).join('')}</div></div><p id="priceImportSummary" class="price-import-summary" role="status"></p>`;
  document.querySelector('.workspace .main-surface').prepend(root);
  const status=$('priceImportStatus'),input=$('priceImportFile'),sheetSelect=$('priceImportSheet');
  let workbook=null,filename='',busy=false,needsSize=false,imported=false,summary='';
  const L=(ar,en)=>state.language==='en'?en:ar;
  const sizes={A4:[1,'portrait'],A5:[2,'landscape'],A6:[4,'portrait'],A7:[8,'landscape'],A8:[16,'portrait'],A9:[32,'portrait']};
  function update(){
    input.disabled=busy;sheetSelect.disabled=busy;
    root.querySelectorAll('[data-price-size]').forEach(b=>{const [count,orientation]=sizes[b.dataset.priceSize],active=!needsSize&&state.paper==='A4'&&state.count===count&&state.orientation===orientation;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.disabled=busy;});
    $('priceImportSummary').textContent=imported?needsSize?L('تم إدخال الأصناف. اختر مقاس البطاقة لتجهيز الطباعة.','Products imported. Choose a label size to prepare printing.'):L(`${filledCount()} بطاقة · ${pageCount()} ورقة للطباعة`,`${filledCount()} labels · ${pageCount()} sheets to print`):'';
    showLayoutIssues();
  }
  function applySize(size){
    [state.count,state.orientation]=sizes[size];state.paper='A4';state.page=0;state.selected=0;state.sample=false;
    $('paper').value=state.paper;$('orientation').value=state.orientation;
    document.querySelectorAll('[data-count]').forEach(b=>{const active=Number(b.dataset.count)===state.count;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    needsSize=false;trimGrid();loadForm();render();update();
  }
  async function importSheet(index){
    const sheet=await workbook.sheet(index),config=window.PriceImportData.detect(sheet);
    const result=window.PriceImportData.extract(sheet,config,validateProduct);
    needsSize=true;replaceProducts(result.products);imported=true;
    summary=L(`تم إدخال ${result.products.length} صنفًا من «${filename}» · ${sheet.name} · العناوين في الصف ${config.header}.`,`Imported ${result.products.length} products from “${filename}” · ${sheet.name} · header row ${config.header}.`);
    if(result.roundedRows.length)summary+=L(` تم تقريب ${result.roundedRows.length} سعر إلى منزلتين عشريتين (الصفوف: ${result.roundedRows.join('، ')}).`,` ${result.roundedRows.length} price(s) rounded to two decimals (rows: ${result.roundedRows.join(', ')}).`);
    status.textContent=summary;status.classList.remove('is-error');
  }
  async function run(action){
    busy=true;status.textContent=L('جارٍ قراءة الإكسيل والتحقق من الأصناف…','Reading workbook and validating products…');update();
    try{await action();}catch(error){status.textContent=error.message;status.classList.add('is-error');}
    finally{busy=false;update();}
  }
  input.addEventListener('change',()=>{const file=input.files[0];if(!file)return;input.value='';run(async()=>{
    if(file.size>20*1024*1024)throw new Error('حجم الملف أكبر من ٢٠ ميجابايت. قسّم الملف.');
    const next=await window.OfferWorkbook.read(await file.arrayBuffer(),file.name);
    let best=-1,bestCount=-1;
    for(let i=0;i<next.sheets.length;i++){if(next.sheets[i].hidden)continue;const config=window.PriceImportData.detect(await next.sheet(i));if(config&&config.count>bestCount){best=i;bestCount=config.count;}}
    if(best<0)throw new Error('لم أجد ورقة بها اسم الصنف وسعر التجزئة. راجع عناوين الأعمدة.');
    workbook=next;filename=file.name;sheetSelect.replaceChildren(...next.sheets.map((s,i)=>new Option(s.name,i)));sheetSelect.value=String(best);sheetSelect.parentElement.hidden=next.sheets.length<2;
    await importSheet(best);
  });});
  sheetSelect.addEventListener('change',()=>run(()=>importSheet(Number(sheetSelect.value))));
  root.querySelectorAll('[data-price-size]').forEach(b=>b.addEventListener('click',()=>applySize(b.dataset.priceSize)));
  for(const element of [$('paper'),$('orientation'),...document.querySelectorAll('[data-count]')])element.addEventListener(element.tagName==='BUTTON'?'click':'change',()=>{needsSize=false;update();});
  document.addEventListener('pricing:mode',update);
  document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>{
    $('priceImportHeading').textContent=L('من الإكسيل إلى بطاقات الأسعار','Excel to price labels');
    $('priceImportIntro').textContent=L('ارفع الملف، اختر مقاس البطاقة، ثم اطبع جميع الأصناف.','Upload a workbook, choose a label size, then print all products.');
    $('priceImportUploadLabel').textContent=L('رفع إكسيل الأسعار','Upload price workbook');
    $('priceImportSizeLabel').textContent=L('مقاس البطاقة','Label size');
    $('priceImportSizeHint').textContent=L('توزيع تلقائي على ورق A4 مع هوامش الطباعة.','Automatic layout on A4 paper with print margins.');update();
  }));
  window.priceImport={get blocksPrint(){return busy||needsSize;},get message(){return busy?L('جارٍ التحقق من ملف الإكسيل.','Validating workbook.'):L('اختر مقاس البطاقة بعد رفع الإكسيل.','Choose a label size after importing.');}};
  // Keep the imported job summary accurate when cards are edited or removed.
  new MutationObserver(()=>{if(imported&&!needsSize)$('priceImportSummary').textContent=L(`${filledCount()} بطاقة · ${pageCount()} ورقة للطباعة`,`${filledCount()} labels · ${pageCount()} sheets to print`);}).observe($('copiesSummary'),{childList:true});
  update();
})();
