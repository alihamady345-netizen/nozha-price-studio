'use strict';
const pdfAssetCache=new Map();

function blobDataUrl(blob){
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error(tr('تعذر قراءة صور الشعار')));reader.readAsDataURL(blob);});
}

function pdfAssetDataUrl(url){
  if(!pdfAssetCache.has(url))pdfAssetCache.set(url,fetch(url).then(response=>{if(!response.ok)throw new Error(tr('تعذر تحميل الشعار. أعد المحاولة.'));return response.blob();}).then(blobDataUrl).catch(error=>{pdfAssetCache.delete(url);throw error;}));
  return pdfAssetCache.get(url);
}

function grayscaleCanvas(canvas){
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw new Error(tr('تعذر تجهيز نسخة الأبيض والأسود.'));
  const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4){const gray=Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);data[i]=gray;data[i+1]=gray;data[i+2]=gray;}
  context.putImageData(pixels,0,0);
  return canvas;
}

let pricePdfBusy=false;
let pricePrintPreview;
function showPricePrintPreview(blob,filename,pages){
  pricePrintPreview?.close();
  const url=URL.createObjectURL(blob),dialog=document.createElement('dialog');
  dialog.className='price-print-preview';dialog.setAttribute('aria-labelledby','pricePrintTitle');
  dialog.innerHTML=`<div class="price-print-toolbar"><div><h2 id="pricePrintTitle">${tr('نسخة الطباعة بدون رابط أو تاريخ')}</h2><p class="price-print-size"></p><p>${tr('اختر الحجم الفعلي 100%، وورقة واحدة في كل صفحة. لا تستخدم ملاءمة الصفحة.')}</p></div><div class="output-actions"><button type="button" class="print-button" data-pdf-print>${tr('فتح نافذة الطباعة')}</button><a class="download-button" data-pdf-download>${tr('تنزيل PDF')}</a><button type="button" class="secondary" data-pdf-close>${tr('إغلاق')}</button></div></div><iframe title="${tr('معاينة ملف الطباعة')}" class="price-print-document"></iframe>`;
  dialog.querySelector('.price-print-size').textContent=pages.map(page=>`${parseFloat(page.style.width)} × ${parseFloat(page.style.height)} mm`).filter((size,i,all)=>all.indexOf(size)===i).join(' · ');
  const download=dialog.querySelector('[data-pdf-download]'),frame=dialog.querySelector('iframe');
  download.href=url;download.download=filename;
  const print=()=>{try{frame.contentWindow.focus();frame.contentWindow.print();}catch{toast(tr('اطبع من شريط ملف PDF أو نزّل الملف واطبعه بالحجم الفعلي.'));}};
  dialog.querySelector('[data-pdf-print]').addEventListener('click',print);
  dialog.querySelector('[data-pdf-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{frame.src='about:blank';dialog.remove();URL.revokeObjectURL(url);if(pricePrintPreview===dialog)pricePrintPreview=null;},{once:true});
  document.body.append(dialog);pricePrintPreview=dialog;
  frame.addEventListener('load',print,{once:true});frame.src=url;
  dialog.showModal();
}

async function downloadPricePdf({print=false}={}){
  if(pricePdfBusy||document.body.classList.contains('exporting'))return;
  pricePdfBusy=true;
  const status=$('downloadStatus'),root=$('printRoot'),main=document.querySelector('.workspace');
  let originalRootStyle,originalInert;
  let snapshot=[];
  try{
    status.textContent=tr('يجري تجهيز ملف PDF…');
    await document.fonts.ready;
    if(!preparePrint()){status.textContent=lastIssues[0]||tr('احفظ بيانات البطاقات قبل التنزيل.');return;}
    await window.StudioAssets.pdf();
    const Pdf=window.jspdf?.jsPDF;
    if(!Pdf||typeof window.html2canvas!=='function')throw new Error(tr('تعذر تحميل خيار التنزيل. أعد تحميل الصفحة.'));
    const pages=Array.from(root.children),width=parseFloat(pages[0].style.width),height=parseFloat(pages[0].style.height),mono=state.outputMode==='bw';
    let filename=state.language==='en'?`Price_labels_${state.brand==='nozha'?'Nozha':'Karaz'}_${state.paper}_${state.count}-labels_EN_${mono?'BW':'Color'}.pdf`:`بطاقات_${state.brand==='nozha'?'نزهة':'كرز'}_${state.paper}_${state.count}-صنف_AR_${mono?'أبيض_وأسود':'ملون'}.pdf`;
    if(window.priceImport?.active)filename=`Price_labels_${state.brand}_Excel_MixedSizes_${mono?'BW':'Color'}.pdf`;
    if(labelTemplate==='check')filename=filename.replace(/\.pdf$/u,state.language==='en'?'_Check.pdf':'_علامة_صح.pdf');
    if(labelTemplate==='price-frame')filename=filename.replace(/\.pdf$/u,state.language==='en'?'_Price_Frame.pdf':'_صح_حول_السعر.pdf');
    if(isShelfTemplate())filename=`Shelf_${state.brand}_80x35mm_A4_${mono?'BW':'Color'}.pdf`;
    if(labelTemplate==='special-offer'||labelTemplate==='wholesale')filename=`${labelTemplate==='wholesale'?'Wholesale_Price':'Special_Offer'}_${state.brand}_A4_${state.language.toUpperCase()}_BW.pdf`;
    document.body.classList.add('exporting');
    originalInert=main.inert;main.inert=true;
    snapshot=Array.from(document.querySelectorAll('button,input,select,textarea')).map(element=>[element,element.disabled]);
    for(const [element]of snapshot)element.disabled=true;
    originalRootStyle=root.getAttribute('style');
    Object.assign(root.style,{display:'block',position:'fixed',left:'0',top:'0',zIndex:'-1',pointerEvents:'none'});
    const images=Array.from(root.querySelectorAll('svg image,img.riyal-symbol'));
    await Promise.all(images.map(async image=>{const attribute=image.tagName.toLowerCase()==='img'?'src':'href',href=image.getAttribute(attribute);if(href&&!href.startsWith('data:'))image.setAttribute(attribute,await pdfAssetDataUrl(href));}));
    const orientation=width>height?'landscape':'portrait';
    const pdf=new Pdf({unit:'mm',format:[width,height],orientation,compress:true});
    pdf.viewerPreferences?.({PrintScaling:'None',PickTrayByPDFSize:true});pdf.setProperties({title:(state.language==='en'?'Price labels - ':'بطاقات أسعار ')+(state.brand==='nozha'?tr('نزهة'):tr('كرز')),subject:mono?tr('أبيض وأسود'):tr('ملوّن'),creator:tr('بطاقات أسعار الفروع')});
    const scale=300/96;
    for(let i=0;i<pages.length;i++){
      status.textContent=state.language==='en'?`Preparing sheet ${i+1} of ${pages.length}…`:`تجهيز الورقة ${arabicDigits(i+1)} من ${arabicDigits(pages.length)}…`;
      // Render one page at a time to limit memory on branch managers' phones.
      const page=pages[i],width=parseFloat(page.style.width),height=parseFloat(page.style.height);
      root.replaceChildren(page);page.style.display='grid';page.classList.add('pdf-render-page');
      // Isolate SVG geometry from inherited RTL/CSS when rasterizing barcodes.
      for(const barcode of page.querySelectorAll('svg.tag-barcode')){
        const box=barcode.getBoundingClientRect();
        const vector=barcode.cloneNode(true),image=document.createElement('img');
        vector.setAttribute('xmlns','http://www.w3.org/2000/svg');
        vector.setAttribute('width',box.width);vector.setAttribute('height',box.height);
        vector.setAttribute('fill','#000');vector.setAttribute('stroke','none');
        vector.removeAttribute('class');
        image.className='tag-barcode';image.alt=barcode.getAttribute('aria-label')||'';
        image.width=Math.round(box.width);image.height=Math.round(box.height);
        image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(vector));
        barcode.replaceWith(image);await image.decode();
      }
      const canvas=await window.html2canvas(page,{scale,backgroundColor:'#ffffff',useCORS:true,allowTaint:false,logging:false,ignoreElements:element=>element.parentElement===document.body&&element!==root,scrollX:0,scrollY:0,windowWidth:Math.max(document.documentElement.clientWidth,Math.ceil(width*96/25.4)),windowHeight:Math.max(document.documentElement.clientHeight,Math.ceil(height*96/25.4)),onclone(clone){const exportRoot=clone.getElementById('printRoot');if(exportRoot){exportRoot.style.display='block';exportRoot.style.zIndex='0';}clone.body.classList.remove('exporting');}});
      if(!canvas.width||!canvas.height)throw new Error(tr('تعذر تجهيز صورة الورقة.'));
      if(mono)grayscaleCanvas(canvas);
      if(i>0)pdf.addPage([width,height],width>height?'landscape':'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg',.98),'JPEG',0,0,width,height,undefined,'FAST');
      canvas.width=1;canvas.height=1;
    }
    if(print){
      showPricePrintPreview(pdf.output('blob'),filename,pages);
      status.textContent=tr('تم تجهيز نسخة الطباعة بدون رابط أو تاريخ.');
    }else{
      await pdf.save(filename,{returnPromise:true});
      status.textContent=tr('تم تجهيز ملف PDF وإرساله إلى التنزيلات.');
      toast(tr('تم تنزيل ملف PDF'));
    }
  }catch(error){
    status.textContent=error.message||tr('تعذر تجهيز التنزيل.');
  }finally{
    pricePdfBusy=false;
    if(originalRootStyle!==undefined){if(originalRootStyle===null)root.removeAttribute('style');else root.setAttribute('style',originalRootStyle);}
    if(originalInert!==undefined)main.inert=originalInert;
    document.body.classList.remove('exporting');
    for(const [element,disabled]of snapshot)element.disabled=disabled;
    printPrepared=false;root.replaceChildren();showLayoutIssues();
  }
}

$('downloadTop').addEventListener('click',downloadPricePdf);
$('downloadBottom').addEventListener('click',downloadPricePdf);
