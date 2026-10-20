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
async function downloadPricePdf(){
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
      const page=pages[i],width=parseFloat(page.style.width),height=parseFloat(page.style.height);
      root.replaceChildren(page);page.style.display='grid';page.classList.add('pdf-render-page');
      const canvas=await window.html2canvas(page,{scale,backgroundColor:'#ffffff',useCORS:true,allowTaint:false,logging:false,ignoreElements:element=>element.parentElement===document.body&&element!==root,scrollX:0,scrollY:0,windowWidth:Math.max(document.documentElement.clientWidth,Math.ceil(width*96/25.4)),windowHeight:Math.max(document.documentElement.clientHeight,Math.ceil(height*96/25.4)),onclone(clone){const exportRoot=clone.getElementById('printRoot');if(exportRoot){exportRoot.style.display='block';exportRoot.style.zIndex='0';}clone.body.classList.remove('exporting');}});
      if(!canvas.width||!canvas.height)throw new Error(tr('تعذر تجهيز صورة الورقة.'));
      if(mono)grayscaleCanvas(canvas);
      if(i>0)pdf.addPage([width,height],width>height?'landscape':'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg',.98),'JPEG',0,0,width,height,undefined,'FAST');
      canvas.width=1;canvas.height=1;
    }
    await pdf.save(filename,{returnPromise:true});
    status.textContent=tr('تم تجهيز ملف PDF وإرساله إلى التنزيلات.');
    toast(tr('تم تنزيل ملف PDF'));
  }catch(error){
    status.textContent=(error.message||tr('تعذر تجهيز التنزيل.'))+' '+tr('يمكنك استخدام «طباعة الآن» واختيار حفظ PDF.');
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
