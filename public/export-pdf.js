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

async function downloadPricePdf(){
  if(document.body.classList.contains('exporting'))return;
  const status=$('downloadStatus'),root=$('printRoot'),main=document.querySelector('.workspace');
  let originalRootStyle,originalInert;
  let snapshot=[];
  try{
    status.textContent=tr('يجري تجهيز ملف PDF…');
    await document.fonts.ready;
    if(!preparePrint()){status.textContent=lastIssues[0]||tr('احفظ بيانات البطاقات قبل التنزيل.');return;}
    const Pdf=window.jspdf?.jsPDF;
    if(!Pdf||typeof window.html2canvas!=='function')throw new Error(tr('تعذر تحميل خيار التنزيل. أعد تحميل الصفحة.'));
    const pages=Array.from(root.children),width=currentLayout.w,height=currentLayout.h,mono=state.outputMode==='bw';
    const filename=state.language==='en'?`Price_labels_${state.brand==='nozha'?'Nozha':'Karaz'}_${state.paper}_EN_${mono?'BW':'Color'}.pdf`:`بطاقات_${state.brand==='nozha'?'نزهة':'كرز'}_${state.paper}_AR_${mono?'أبيض_وأسود':'ملون'}.pdf`;
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
    pdf.setProperties({title:(state.language==='en'?'Price labels - ':'بطاقات أسعار ')+(state.brand==='nozha'?tr('نزهة'):tr('كرز')),subject:mono?tr('أبيض وأسود'):tr('ملوّن'),creator:tr('بطاقات أسعار الفروع')});
    const scale=300/96;
    for(let i=0;i<pages.length;i++){
      status.textContent=state.language==='en'?`Preparing sheet ${i+1} of ${pages.length}…`:`تجهيز الورقة ${arabicDigits(i+1)} من ${arabicDigits(pages.length)}…`;
      // Render one page at a time to limit memory on branch managers' phones.
      for(const page of pages)page.style.display='none';
      const page=pages[i];page.style.display='grid';page.classList.add('pdf-render-page');
      const canvas=await window.html2canvas(page,{scale,backgroundColor:'#ffffff',useCORS:true,allowTaint:false,logging:false,scrollX:0,scrollY:0,windowWidth:Math.max(document.documentElement.clientWidth,Math.ceil(width*96/25.4)),windowHeight:Math.max(document.documentElement.clientHeight,Math.ceil(height*96/25.4)),onclone(clone){const exportRoot=clone.getElementById('printRoot');if(exportRoot){exportRoot.style.display='block';exportRoot.style.zIndex='0';}clone.body.classList.remove('exporting');}});
      if(!canvas.width||!canvas.height)throw new Error(tr('تعذر تجهيز صورة الورقة.'));
      if(mono)grayscaleCanvas(canvas);
      if(i>0)pdf.addPage([width,height],orientation);
      pdf.addImage(canvas,'PNG',0,0,width,height,undefined,'FAST');
      canvas.width=1;canvas.height=1;
    }
    await pdf.save(filename,{returnPromise:true});
    status.textContent=tr('تم تجهيز ملف PDF وإرساله إلى التنزيلات.');
    toast(tr('تم تنزيل ملف PDF'));
  }catch(error){
    status.textContent=(error.message||tr('تعذر تجهيز التنزيل.'))+' '+tr('يمكنك استخدام «طباعة الآن» واختيار حفظ PDF.');
  }finally{
    if(originalRootStyle!==undefined){if(originalRootStyle===null)root.removeAttribute('style');else root.setAttribute('style',originalRootStyle);}
    if(originalInert!==undefined)main.inert=originalInert;
    document.body.classList.remove('exporting');
    for(const [element,disabled]of snapshot)element.disabled=disabled;
    printPrepared=false;root.replaceChildren();showLayoutIssues();
  }
}

$('downloadTop').addEventListener('click',downloadPricePdf);
$('downloadBottom').addEventListener('click',downloadPricePdf);
