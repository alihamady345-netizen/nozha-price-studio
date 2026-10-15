'use strict';
(() => {
 const catalog={items:[],total:0,page:0,pageSize:30,loading:false,error:'',notice:'',query:'',currentMatch:null};
 const countText=n=>new Intl.NumberFormat(state.language==='en'?'en-US':'ar-SA').format(n);
 const jump=document.createElement('form');jump.id='catalogJump';jump.className='catalog-jump';jump.innerHTML='<label for="catalogJumpPage" id="catalogJumpLabel">انتقال إلى صفحة</label><input id="catalogJumpPage" type="number" min="1" step="1" inputmode="numeric" value="1" required><button type="submit" class="secondary" id="catalogJumpGo">انتقال</button>';$('catalogPage').closest('.catalog-pages').after(jump);
 let controller,queryTimer,barcodeTimer,barcodeController,bulkSaving=false;
 const messages={unavailable:'تعذر الاتصال بمكتبة الأصناف. بياناتك باقية؛ أعد المحاولة.',conflict:'تم تعديل الصنف من جهاز آخر. حمّل أحدث بياناته قبل حفظ تعديلك.',duplicate:'هذا الباركود محفوظ لصنف موجود. حمّل بياناته لتعديله دون إنشاء نسخة مكررة.',invalid_product:'راجع اسم الصنف والوحدة قبل الحفظ.',invalid_price:'أدخل سعرًا صحيحًا؛ مثال: 12.95. يُسمح بمنزلتين عشريتين.',invalid_barcode:'راجع رقم الباركود ونوعه قبل الحفظ.',not_found:'لم يعد الصنف متاحًا. حدّث المكتبة.',access_denied:'تعذر السماح بالحفظ. افتح الموقع مباشرة وأعد المحاولة.'};
 const intoCard=p=>({...p,copies:1,catalogId:p.id,catalogVersion:p.version,catalogPrice:p.price});
 const same=(a,b)=>['name','nameEn','unit','unitEn','price','barcode','format'].every(k=>(a[k]||'')===(b[k]||''));
 async function request(path,options={}){
  let response,data;
  try{response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});data=await response.json();}
  catch(error){if(error.name==='AbortError')throw error;throw new Error(tr(messages.unavailable));}
  if(!response.ok){const error=new Error(tr(messages[data.code]||messages.unavailable));error.current=data.current;error.code=data.code;throw error;}
  return data;
 }
 function productName(p){return productText(p)||p.name||p.nameEn;}
 function dateText(value){try{return new Intl.DateTimeFormat(state.language==='en'?'en-GB':'ar-SA',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',numberingSystem:'latn',calendar:'gregory',timeZone:'Asia/Riyadh'}).format(new Date(value));}catch{return '';}}
 function showMatch(product,error=''){
  catalog.currentMatch=product;
  const el=$('catalogMatch');el.hidden=!product&&!error;
  el.innerHTML=product?`<strong>${escapeHtml(productName(product))}</strong><span dir="ltr">${escapeHtml(product.barcode)} · ${riyalMarkup()}${escapeHtml(product.price)}</span>${error?`<p>${escapeHtml(error)}</p>`:''}<button type="button" class="secondary" data-load-catalog-match>${tr('تحميل بيانات الصنف المحفوظ')}</button>`:error?`<p>${escapeHtml(error)}</p>`:'';
 }
 function draw(){
  $('catalogResults').innerHTML=catalog.items.map(p=>`<article class="catalog-result"><div class="catalog-product"><h3>${escapeHtml(productName(p))}</h3><p>${escapeHtml(productText(p,'unit')||p.unit||p.unitEn||'')} <b dir="ltr">${escapeHtml(p.barcode)}</b></p><small>${tr('آخر تعديل:')} ${escapeHtml(dateText(p.updatedAt))}</small></div><div class="catalog-price" dir="ltr">${riyalMarkup()}${escapeHtml(p.price)}</div><div class="catalog-actions"><button type="button" class="catalog-use" data-use-product="${escapeHtml(p.id)}">${tr('إضافة للطباعة')}</button><button type="button" class="secondary" data-edit-product="${escapeHtml(p.id)}">${tr('تعديل بيانات المكتبة')}</button></div></article>`).join('');
  $('catalogStatus').textContent=catalog.loading?tr('يجري تحميل الأصناف…'):catalog.error||catalog.notice||(!catalog.total?(catalog.query?tr('لا توجد نتائج. جرّب جزءًا من الاسم أو الباركود.'):tr('المكتبة فارغة. احفظ أول صنف من بيانات البطاقة ليصبح متاحًا للجميع.')):state.language==='en'?`${countText(catalog.total)} products · showing ${countText(catalog.page*catalog.pageSize+1)}–${countText(Math.min(catalog.total,(catalog.page+1)*catalog.pageSize))}`:`${countText(catalog.total)} صنف · عرض ${countText(catalog.page*catalog.pageSize+1)}–${countText(Math.min(catalog.total,(catalog.page+1)*catalog.pageSize))}`);
  const pages=Math.max(1,Math.ceil(catalog.total/catalog.pageSize));
  $('catalogPage').textContent=state.language==='en'?`${catalog.page+1} / ${pages}`:`${displayDigits(catalog.page+1)} / ${displayDigits(pages)}`;
  jump.hidden=pages<=1;$('catalogJumpPage').max=String(pages);$('catalogJumpPage').value=String(catalog.page+1);$('catalogJumpPage').disabled=catalog.loading;$('catalogJumpGo').disabled=catalog.loading;$('catalogJumpLabel').textContent=state.language==='en'?'Go to page':'انتقال إلى صفحة';$('catalogJumpGo').textContent=state.language==='en'?'Go':'انتقال';
  $('catalogPrev').disabled=catalog.loading||catalog.page===0;
  $('catalogNext').disabled=catalog.loading||(catalog.page+1)*catalog.pageSize>=catalog.total;
  $('refreshCatalog').disabled=catalog.loading;
  $('saveSheetCatalog').disabled=bulkSaving||!filledCount()||Object.keys(state.drafts).length>0;
  if(catalog.currentMatch)showMatch(catalog.currentMatch);
 }
 async function load(){
  controller?.abort();controller=new AbortController();const active=controller;
  catalog.loading=true;catalog.error='';draw();
  try{
   const data=await request('/api/products?q='+encodeURIComponent(catalog.query)+'&page='+catalog.page,{signal:active.signal});
   if(active!==controller)return;catalog.items=data.products;catalog.total=data.total;catalog.pageSize=data.pageSize;
   const lastPage=Math.max(0,Math.ceil(catalog.total/catalog.pageSize)-1);if(catalog.page>lastPage){catalog.page=lastPage;return load();}
  }catch(error){if(error.name==='AbortError')return;if(active===controller){catalog.items=[];catalog.error=error.message;}}
  finally{if(active===controller){catalog.loading=false;draw();}}
 }
 function vacantSlot(){
  if(!state.cards[state.selected]&&!state.drafts[state.selected])return state.selected;
  let index=state.cards.findIndex((p,i)=>i>state.selected&&!p&&!state.drafts[i]);
  if(index<0)index=state.cards.findIndex((p,i)=>!p&&!state.drafts[i]);
  if(index<0){if(filledCount()>=1000)throw new Error(tr('الحد في مهمة الطباعة الواحدة ١٠٠٠ بطاقة.'));index=state.cards.length;growCards(index+1);}
  return index;
 }
 function loadIntoForm(p,index=state.selected,saveDestination='print'){
  selectSlot(index);state.drafts[index]={...intoCard(p),saveDestination};loadForm();render();showMatch(null);$('productName').focus();
  toast(tr('تم تحميل الصنف. عدّل بياناته ثم احفظه.'));
 }
 function reuse(p){
  const index=vacantSlot();saveCurrentCard(intoCard(p),index);selectSlot(index);showMatch(null);draw();toast(tr('تمت إضافة الصنف المحفوظ للطباعة'));
 }
 async function saveProduct(raw,{refresh=true}={}){
  const p=validateProduct(raw),existing=raw.catalogId;
  const payload={...p,version:raw.catalogVersion};
  try{
   const data=await request(existing?'/api/products/'+encodeURIComponent(existing):'/api/products',{method:existing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   if(refresh){catalog.notice='';load();}showMatch(null);return intoCard(data.product);
  }catch(error){if(error.current)showMatch(error.current,error.message);throw error;}
 }
 async function lookupBarcode(){
  const barcode=latinDigits($('productBarcode').value).trim(),slot=state.selected;
  barcodeController?.abort();barcodeController=new AbortController();const active=barcodeController;
  if(!barcode){showMatch(null);return;}
  try{
   const data=await request('/api/products/by-barcode?barcode='+encodeURIComponent(barcode),{signal:active.signal});
   if(active!==barcodeController||slot!==state.selected||latinDigits($('productBarcode').value).trim()!==barcode)return;
   showMatch(data.product);
  }catch(error){if(error.name!=='AbortError'&&active===barcodeController&&slot===state.selected)showMatch(null,error.message);}
 }
 async function saveSheet(){
  if(bulkSaving||Object.keys(state.drafts).length)return;
  let saved=0;
  try{
   const unique=new Map();
   for(const card of state.cards.filter(c=>c&&!c.catalogId)){
    const p=validateProduct(card),old=unique.get(p.barcode);
    if(old&&!same(old,p))throw new Error(tr('يوجد أكثر من تعريف أو سعر لنفس الباركود في الورقة. وحّد بياناته قبل حفظ المكتبة.'));
    if(!old)unique.set(p.barcode,{...p,catalogId:card.catalogId,catalogVersion:card.catalogVersion});
   }
    if(!unique.size){catalog.notice=tr('أصناف الورقة موجودة في المكتبة؛ أسعار الطباعة محفوظة في البطاقات فقط.');draw();return;}bulkSaving=true;draw();
   for(const p of unique.values()){
    const item=await saveProduct(p,{refresh:false});saved++;
    state.cards=state.cards.map(c=>c&&c.barcode===item.barcode?{...c,catalogId:item.catalogId,catalogVersion:item.catalogVersion,catalogPrice:item.price}:c);
    $('catalogStatus').textContent=state.language==='en'?`Saved ${saved} of ${unique.size} products`:`تم حفظ ${displayDigits(saved)} من ${displayDigits(unique.size)} صنف`;
   }
   catalog.notice=tr('تم حفظ أصناف الورقة في المكتبة');toast(catalog.notice);render();
  }catch(error){catalog.notice=(saved?(state.language==='en'?`${saved} products saved. `:`تم حفظ ${displayDigits(saved)} صنف. `):'')+error.message;$('catalogStatus').textContent=catalog.notice;toast(error.message);}
  finally{bulkSaving=false;load();}
 }
 $('catalogSearch').addEventListener('input',()=>{clearTimeout(queryTimer);queryTimer=setTimeout(()=>{catalog.query=$('catalogSearch').value.trim();catalog.notice='';catalog.page=0;load();},250);});
 $('catalogSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(queryTimer);catalog.query=$('catalogSearch').value.trim();catalog.notice='';catalog.page=0;load();}});
 $('clearCatalogSearch').addEventListener('click',()=>{clearTimeout(queryTimer);$('catalogSearch').value='';catalog.query='';catalog.notice='';catalog.page=0;load();$('catalogSearch').focus();});
 $('refreshCatalog').addEventListener('click',()=>{clearTimeout(queryTimer);catalog.query=$('catalogSearch').value.trim();catalog.notice='';catalog.page=0;load();});
 jump.addEventListener('submit',e=>{e.preventDefault();if(catalog.loading)return;const pages=Math.max(1,Math.ceil(catalog.total/catalog.pageSize)),page=Number(latinDigits($('catalogJumpPage').value));if(!Number.isInteger(page)||page<1||page>pages){$('catalogJumpPage').reportValidity();return;}catalog.page=page-1;load();});
 $('catalogPrev').addEventListener('click',()=>{catalog.page=Math.max(0,catalog.page-1);load();});
 $('catalogNext').addEventListener('click',()=>{catalog.page++;load();});
 $('catalogResults').addEventListener('click',async e=>{
  const add=e.target.closest('[data-use-product]'),edit=e.target.closest('[data-edit-product]'),id=add?.dataset.useProduct||edit?.dataset.editProduct;
  const product=catalog.items.find(p=>p.id===id);if(!product)return;
  try{const latest=await request('/api/products/'+encodeURIComponent(product.id));if(!latest.product)throw new Error(tr(messages.not_found));if(add)reuse(latest.product);else loadIntoForm(latest.product,vacantSlot(),'library');}catch(error){toast(error.message);}
 });
 $('catalogMatch').addEventListener('click',e=>{if(e.target.closest('[data-load-catalog-match]')&&catalog.currentMatch)loadIntoForm(catalog.currentMatch);});
 $('saveSheetCatalog').addEventListener('click',saveSheet);
 $('productBarcode').addEventListener('input',()=>{clearTimeout(barcodeTimer);barcodeTimer=setTimeout(lookupBarcode,350);});
 $('productBarcode').addEventListener('change',()=>{clearTimeout(barcodeTimer);lookupBarcode();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
 const observed=new MutationObserver(()=>{$('saveSheetCatalog').disabled=bulkSaving||!filledCount()||Object.keys(state.drafts).length>0;});observed.observe($('productList'),{childList:true});
 window.addEventListener('pagehide',()=>{controller?.abort();barcodeController?.abort();observed.disconnect();clearTimeout(queryTimer);clearTimeout(barcodeTimer);},{once:true});
 window.priceCatalog={saveProduct,refreshLabels(){catalog.error='';catalog.notice='';draw();},clearMatch(){barcodeController?.abort();showMatch(null);},load,lookupBarcode};
 load();
})();
