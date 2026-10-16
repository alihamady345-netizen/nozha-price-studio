'use strict';

(() => {
  const dialog=$('scannerDialog'),video=$('scannerVideo'),status=$('cameraStatus');
  let generation=0,stream=null,controls=null,scanSlot=null,opening=false;

  function stopMedia(){
    ++generation;opening=false;
    if(controls){try{Promise.resolve(controls.stop()).catch(()=>{});}catch{}controls=null;}
    if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
    try{video.pause();}catch{}
    video.srcObject=null;
  }

  function closeScanner(){stopMedia();if(dialog.open)dialog.close();}

  function cameraMessage(message,error=false){
    status.textContent=message;status.classList.toggle('error',error);
    $('retryScanner').hidden=!error;
  }

  function errorMessage(error){
    if(error?.name==='NotAllowedError'||error?.name==='SecurityError')return tr('لم يُسمح باستخدام الكاميرا. اسمح بالكاميرا من إعدادات المتصفح، ثم أعد المحاولة.');
    if(error?.name==='NotFoundError'||error?.name==='OverconstrainedError')return tr('لم نجد كاميرا متاحة. جرّب جهازًا به كاميرا أو استخدم قارئ الكمبيوتر.');
    if(error?.name==='NotReadableError'||error?.name==='AbortError')return tr('تعذر تشغيل الكاميرا. أغلق التطبيق الذي يستخدمها ثم أعد المحاولة.');
    return tr('تعذر تشغيل المسح. أعد المحاولة أو أدخل رقم الباركود يدويًا.');
  }

  function focusAfterScan(){
    const target=!$('productName').value.trim()?$('productName'):!$('productPrice').value.trim()?$('productPrice'):$('productBarcode');
    target.focus();
  }

  function acceptBarcode(text,format='AUTO'){
    const barcode=latinDigits(text).trim();
    if(!barcode||barcode.length>40||!/^[\x20-\x7E]+$/.test(barcode))throw new Error(tr('تعذر استخدام هذا الباركود. أدخل الرقم يدويًا.'));
    const resolved=resolveBarcodeFormat(barcode,format);
    barcodeData(barcode,resolved);
    $('productBarcode').value=barcode;$('barcodeType').value=resolved;
    $('productBarcode').dispatchEvent(new Event('input',{bubbles:true}));
    $('productBarcode').dispatchEvent(new Event('change',{bubbles:true}));
    $('scannerHint').textContent=tr('تم إدخال الباركود. أكمل تعريف الصنف والسعر، ثم احفظ البطاقة.');
    $('scannerHint').classList.remove('scan-ready');
    focusAfterScan();toast(tr('تم مسح الباركود'));
  }

  async function updateCameraChoices(token){
    try{
      const devices=await navigator.mediaDevices.enumerateDevices();
      if(token!==generation||!dialog.open)return;
      const cameras=devices.filter(device=>device.kind==='videoinput');
      const select=$('cameraSelect');select.replaceChildren();
      for(const [index,camera]of cameras.entries()){
        const option=document.createElement('option');option.value=camera.deviceId;option.textContent=camera.label||(state.language==='en'?`Camera ${index+1}`:`كاميرا ${arabicDigits(index+1)}`);select.append(option);
      }
      const active=stream?.getVideoTracks()[0]?.getSettings?.().deviceId;
      if(active)select.value=active;
      $('cameraChoice').hidden=cameras.length<2;
    }catch{$('cameraChoice').hidden=true;}
  }

  async function startCamera(deviceId=''){
    stopMedia();const token=generation;opening=true;
    cameraMessage(tr('يجري فتح الكاميرا…'));$('cameraChoice').hidden=true;
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){opening=false;cameraMessage(tr('افتح الرابط في متصفح يدعم الكاميرا مثل Chrome أو Safari. يمكنك استخدام قارئ الكمبيوتر أو إدخال الرقم يدويًا.'),true);return;}
    let acquired;
    try{
      await window.StudioAssets.load('camera');
      if(token!==generation||!dialog.open)return;
      acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
      if(token!==generation||!dialog.open){acquired.getTracks().forEach(track=>track.stop());return;}
      stream=acquired;
      const ZX=window.ZXingBrowser;
      const reader=new ZX.BrowserMultiFormatReader(undefined,{delayBetweenScanAttempts:120,delayBetweenScanSuccess:500,tryPlayVideoTimeout:7000});
      reader.possibleFormats=[ZX.BarcodeFormat.EAN_13,ZX.BarcodeFormat.EAN_8,ZX.BarcodeFormat.UPC_A,ZX.BarcodeFormat.CODE_128];
      const formats=new Map([[ZX.BarcodeFormat.EAN_13,'EAN13'],[ZX.BarcodeFormat.EAN_8,'EAN8'],[ZX.BarcodeFormat.UPC_A,'UPC'],[ZX.BarcodeFormat.CODE_128,'CODE128']]);
      const activeControls=await reader.decodeFromStream(acquired,video,(result,error,callbackControls)=>{
        if(token!==generation||!dialog.open)return;
        if(!result)return;
        // The modal keeps this result attached to the card selected when it opened.
        if(state.selected!==scanSlot){closeScanner();toast(tr('اختر البطاقة المطلوبة ثم أعد المسح'));return;}
        const format=formats.get(result.getBarcodeFormat());
        if(!format)return;
        try{
          const barcode=result.getText();barcodeData(barcode,format);
          try{Promise.resolve(callbackControls?.stop()).catch(()=>{});}catch{}
          closeScanner();acceptBarcode(barcode,format);
        }catch{cameraMessage(tr('لم نتمكن من تأكيد الرقم. ثبّت الكاميرا أمام الباركود وحاول مرة أخرى.'));}
      });
      if(token!==generation||!dialog.open){try{await activeControls.stop();}catch{}acquired.getTracks().forEach(track=>track.stop());return;}
      controls=activeControls;opening=false;
      cameraMessage(tr('ضع الباركود داخل الإطار. سيُملأ الرقم بمجرد قراءته.'));
      await updateCameraChoices(token);
    }catch(error){
      if(acquired)acquired.getTracks().forEach(track=>track.stop());
      if(token!==generation)return;
      stopMedia();cameraMessage(errorMessage(error),true);
    }
  }

  $('scanCamera').addEventListener('click',()=>{
    if(dialog.open||opening)return;
    if(typeof dialog.showModal!=='function'){toast(tr('هذا المتصفح لا يدعم نافذة الكاميرا. افتح الرابط في متصفح حديث.'));return;}
    scanSlot=state.selected;dialog.showModal();startCamera();
  });
  $('closeScanner').addEventListener('click',closeScanner);
  $('cancelScanner').addEventListener('click',closeScanner);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeScanner();});
  dialog.addEventListener('close',()=>{if(!dialog.open)stopMedia();});
  $('retryScanner').addEventListener('click',()=>startCamera($('cameraSelect').value));
  $('cameraSelect').addEventListener('change',()=>startCamera($('cameraSelect').value));
  window.addEventListener('pagehide',stopMedia);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open)closeScanner();});

  $('scanDesktop').addEventListener('click',()=>{
    $('scannerHint').textContent=tr('القارئ المتصل كلوحة مفاتيح: امسح الآن وسيكتب الرقم في الحقل. تأكد أن لغة لوحة المفاتيح إنجليزية.');
    $('scannerHint').classList.add('scan-ready');
    $('productBarcode').focus();$('productBarcode').select();
  });
  $('productBarcode').addEventListener('keydown',event=>{
    if(event.key!=='Enter')return;
    event.preventDefault();event.stopPropagation();
    if(!$('productBarcode').value.trim())return;
    // Keyboard-wedge scanners often end with Enter; it must never submit a partial card.
    $('productBarcode').value=latinDigits($('productBarcode').value).trim();
    $('productBarcode').dispatchEvent(new Event('change',{bubbles:true}));
    $('scannerHint').textContent=tr('تم إدخال الرقم. أكمل تعريف الصنف والسعر، ثم احفظ البطاقة.');
    $('scannerHint').classList.remove('scan-ready');focusAfterScan();
  });
})();
