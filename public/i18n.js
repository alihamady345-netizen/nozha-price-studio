'use strict';

const englishText=new Map(Object.entries({
  'يمكن طباعة صنف واحد؛ الخانات غير المعبأة تظل فارغة.':'You can print one product; unfilled label positions stay blank.',
  'استوديو بطاقات الأسعار | نزهة وكرز':'Price Label Studio | Nozha & Karaz',
  'قالب موحد لبطاقات أسعار نزهة وكرز. اختر الورق والتقسيم، أدخل الأصناف ثم اطبع بالمقاس الفعلي.':'Unified price labels for Nozha and Karaz. Choose a paper size and layout, enter products, then print at actual size.',
  'بطاقات أسعار الفروع':'Branch price labels','أسواق نزهة وكرز':'Nozha & Karaz Markets',
  'لغة الواجهة والبطاقات':'Interface and label language','نزهة وكرز':'Nozha & Karaz',
  'نزهة':'Nozha','كرز':'Karaz','شعار نزهة الأصلي':'Original Nozha logo','شعار كرز الأصلي':'Original Karaz logo',
  'تنزيل PDF':'Download PDF','طباعة الآن':'Print now','إعداد البطاقة':'Label setup','العلامة التجارية':'Brand',
  'مقاس الورق':'Paper size','اتجاه الورق':'Orientation','عمودي':'Portrait','أفقي':'Landscape',
  'تقسيم الورقة':'Labels per sheet','مقاس البطاقة':'Label size','ألوان الورقة':'Sheet colors',
  'ملوّن':'Color','أبيض وأسود':'Black & white','هوامش الطباعة وخطوط القص':'Print margins & cut lines',
  'الهامش (مم)':'Margin (mm)','الفاصل (مم)':'Gap (mm)','إظهار خطوط القص':'Show cut lines',
  'اختر مكان البطاقة، ثم اكتب صنفها.':'Select a label position, then enter its product.',
  'اختيار البطاقة':'Select label','تعريف الصنف بالعربية':'Product name in English',
  'حجم العبوة أو وحدة البيع':'Pack size or selling unit','اختياري':'Optional',
  'مثال: نادك حليب طازج كامل الدسم':'e.g. Nadec Fresh Full Fat Milk','مثال: ٢ لتر / الكيلو / الحبة':'e.g. 2 L / per kg / each',
  'إضافة وصف الصنف بالإنجليزية':'Add the Arabic product description',
  'اكتب الوصف المقابل للطباعة باللغتين. يبقى السعر والباركود موحّدين.':'Enter the other description to print in both languages. Price and barcode stay the same.',
  'تعريف الصنف بالإنجليزية':'Product name in Arabic','الحجم أو الوحدة بالإنجليزية':'Size or unit in Arabic',
  'e.g. Nadec Fresh Full Fat Milk':'مثال: نادك حليب طازج كامل الدسم','e.g. 2 L / per kg / each':'مثال: ٢ لتر / الكيلو / الحبة',
  'السعر (SR)':'Price (SR)','عدد النسخ':'Copies','رقم الباركود':'Barcode number',
  'اكتب الرقم أو امسح الباركود':'Type the number or scan the barcode',
  'مسح بالكاميرا':'Scan with camera','قارئ الكمبيوتر':'Computer scanner',
  'المسح يملأ الباركود؛ اكتب تعريف الصنف والسعر.':'Scanning fills the barcode. Enter the product name and price.',
  'نوع الباركود وخيارات التكرار':'Barcode format & copies','نوع الباركود':'Barcode format','تلقائي':'Automatic',
  'CODE128 — أرقام الأصناف الداخلية':'CODE128 — internal product codes',
  'عند زيادة عدد النسخ، يُكرَّر الصنف في الخانات الفارغة التالية.':'Extra copies fill the next empty positions without replacing other products.',
  'حفظ البطاقة والانتقال للتالية':'Save label & continue','إلغاء':'Cancel','إفراغ هذه البطاقة':'Clear this label',
  'قالب واحد لجميع الفروع':'One template for all branches','الشعار الأصلي، الاسم، السعر، الباركود':'Original logo, product, price, barcode',
  'ورقة الأسعار':'Price sheet','اضغط أي بطاقة لتعبئتها أو تعديلها':'Select any label to enter or edit its product',
  'مشاهدة مثال للتصميم':'Preview a sample','العودة لتعبئة الورقة':'Return to your labels',
  'الصفحة السابقة':'Previous sheet','الصفحة التالية':'Next sheet','＋ ورقة جديدة':'＋ New sheet',
  'عند الطباعة: اختر المقاس نفسه، ومقياس ١٠٠٪، وأوقف رؤوس الصفحات وتذييلاتها.':'When printing: select the same paper size, use 100% scale, and turn off headers and footers.',
  'بطاقات هذه الورقة':'Labels on this sheet','مسح جميع البطاقات':'Clear all labels','بطاقات الأسعار الموحدة':'Unified price labels',
  'مسح باركود الصنف':'Scan the product barcode','وجّه الكاميرا إلى الخطوط وثبّت الهاتف.':'Point the camera at the bars and hold your phone steady.',
  'إغلاق الكاميرا':'Close camera','يجري فتح الكاميرا…':'Opening the camera…','الكاميرا':'Camera','إعادة المحاولة':'Try again',
  '٠١':'01','٠٢':'02','٠':'0','١':'1','٢':'2','٤':'4','٦':'6','٨':'8','٢٠':'20',
  'تعريف الصنف':'Product description','اضغط لإدخال البيانات':'Select to enter details','اسم الصنف · السعر · الباركود':'Product · Price · Barcode',
  'تعديل غير محفوظ':'Unsaved changes','مثال توضيحي':'Sample','بطاقة فارغة':'Empty label','تعبئة':'Fill label','ر.س':'SR',
  'البيانات المعروضة مثال للتصميم ولا تدخل ضمن الطباعة':'Sample data is for preview only and is excluded from printing.',
  'احفظ التعديلات الحالية لتجهيز الطباعة':'Save your changes to prepare the sheets for printing.',
  'كل بطاقة لها صنف وسعر وباركود مستقل':'Each label has its own product, price, and barcode.',
  'هذا التقسيم صغير لعرض الاسم والسعر والباركود بوضوح. اختر ورقًا أكبر أو عدد بطاقات أقل.':'These labels are too small for a clear product name, price, and barcode. Choose larger paper or fewer labels.',
  'الباركود طويل لهذا المقاس. اختر تقسيمًا أقل أو ورقًا أكبر للحفاظ على وضوح الخطوط.':'The barcode is too long for this label size. Choose fewer labels or larger paper to keep the bars clear.',
  'تعريف الصنف أو السعر لا يتسع لهذا المقاس. اختر ورقًا أكبر أو عدد بطاقات أقل؛ لن تُطبع بيانات مقصوصة.':'The product description or price does not fit. Choose larger paper or fewer labels to print all details.',
  'أكمل تعريف الصنف بالعربية في جميع البطاقات قبل الطباعة.':'Add an English product name to every filled label before printing.',
  'تعذر تحميل مولد الباركود. أعد تحميل الصفحة.':'The barcode generator could not load. Reload the page.',
  'أدخل اسم الصنف.':'Enter a product name.','اسم الصنف أو الوحدة أطول من الحد المتاح.':'The product name or unit exceeds the available length.',
  'أدخل سعرًا صحيحًا؛ مثال: 12.95. يُسمح بمنزلتين عشريتين.':'Enter a valid price, for example 12.95. Up to two decimal places are allowed.',
  'عدد النسخ يجب أن يكون عددًا صحيحًا من ١ إلى ١٠٠٠.':'Copies must be a whole number from 1 to 1000.',
  'أدخل باركودًا صحيحًا بالأرقام أو الأحرف الإنجليزية، بحد أقصى ٤٠ حرفًا.':'Enter a valid barcode using digits or English characters, up to 40 characters.',
  'نوع الباركود غير مدعوم.':'This barcode format is not supported.',
  'تم إفراغ البطاقة مع بقاء أماكن بقية الأصناف':'Label cleared. Other product positions are unchanged.',
  'الحد في مهمة الطباعة الواحدة ١٠٠٠ بطاقة.':'A print job can contain up to 1000 labels.',
  'الحد في مهمة الطباعة الواحدة ١٠٠٠ بطاقة':'A print job can contain up to 1000 labels.',
  'هل تريد مسح جميع بطاقات الطباعة؟':'Clear all labels in this print job?',
  'احفظ بيانات البطاقات قبل الطباعة':'Save the label details before printing.',
  'تعذر تجهيز الطباعة. أعد المحاولة.':'Printing could not be prepared. Try again.',
  'لم يُسمح باستخدام الكاميرا. اسمح بالكاميرا من إعدادات المتصفح، ثم أعد المحاولة.':'Camera access was denied. Allow camera access in your browser settings, then try again.',
  'لم نجد كاميرا متاحة. جرّب جهازًا به كاميرا أو استخدم قارئ الكمبيوتر.':'No camera was found. Try a device with a camera or use your computer scanner.',
  'تعذر تشغيل الكاميرا. أغلق التطبيق الذي يستخدمها ثم أعد المحاولة.':'The camera could not start. Close any app using it, then try again.',
  'تعذر تشغيل المسح. أعد المحاولة أو أدخل رقم الباركود يدويًا.':'Scanning could not start. Try again or enter the barcode manually.',
  'تعذر استخدام هذا الباركود. أدخل الرقم يدويًا.':'This barcode could not be used. Enter the number manually.',
  'تم إدخال الباركود. أكمل تعريف الصنف والسعر، ثم احفظ البطاقة.':'Barcode entered. Complete the product name and price, then save the label.',
  'تم مسح الباركود':'Barcode scanned',
  'افتح الرابط في متصفح يدعم الكاميرا مثل Chrome أو Safari. يمكنك استخدام قارئ الكمبيوتر أو إدخال الرقم يدويًا.':'Open this link in a camera-enabled browser such as Chrome or Safari. You can also use a computer scanner or enter the number manually.',
  'تعذر تحميل قارئ الباركود. أعد تحميل الصفحة ثم جرّب مرة أخرى.':'The barcode reader could not load. Reload the page and try again.',
  'اختر البطاقة المطلوبة ثم أعد المسح':'Select the required label and scan again.',
  'لم نتمكن من تأكيد الرقم. ثبّت الكاميرا أمام الباركود وحاول مرة أخرى.':'The number could not be confirmed. Hold the camera steady in front of the barcode and try again.',
  'ضع الباركود داخل الإطار. سيُملأ الرقم بمجرد قراءته.':'Place the barcode inside the frame. The number will be filled as soon as it is read.',
  'هذا المتصفح لا يدعم نافذة الكاميرا. افتح الرابط في متصفح حديث.':'This browser does not support the camera window. Open the link in a current browser.',
  'القارئ المتصل كلوحة مفاتيح: امسح الآن وسيكتب الرقم في الحقل. تأكد أن لغة لوحة المفاتيح إنجليزية.':'For a keyboard scanner: scan now to enter the number in this field. Set your keyboard language to English.',
  'تم إدخال الرقم. أكمل تعريف الصنف والسعر، ثم احفظ البطاقة.':'Number entered. Complete the product name and price, then save the label.',
  'تعذر قراءة صور الشعار':'The logo images could not be read.',
  'تعذر تحميل الشعار. أعد المحاولة.':'The logo could not load. Try again.',
  'تعذر تجهيز نسخة الأبيض والأسود.':'The black and white version could not be prepared.',
  'يجري تجهيز ملف PDF…':'Preparing the PDF…','احفظ بيانات البطاقات قبل التنزيل.':'Save the label details before downloading.',
  'تعذر تحميل خيار التنزيل. أعد تحميل الصفحة.':'The download feature could not load. Reload the page.',
  'تعذر تجهيز صورة الورقة.':'The sheet image could not be prepared.',
  'تم تجهيز ملف PDF وإرساله إلى التنزيلات.':'The PDF is ready and has been sent to your downloads.',
  'تم تنزيل ملف PDF':'PDF downloaded','تعذر تجهيز التنزيل.':'The download could not be prepared.',
  'يمكنك استخدام «طباعة الآن» واختيار حفظ PDF.':'You can use “Print now” and choose Save as PDF.',
  'قراءة إعدادات بطاقات الأسعار':'Read price label settings','إدخال أصناف بطاقات الأسعار':'Enter price label products','تعبئة بطاقة محددة':'Fill a selected label'
}));

Object.entries({
  'سعر الطباعة':'Print price','حفظ التعديل':'Save changes',
  'لهذه الطباعة فقط':'This print job only','تحديث الصنف في المكتبة':'Update product in library',
  'تجهيز البطاقة للطباعة':'Prepare label for printing',
  'الصنف الجديد يُحفظ في المكتبة ليكون متاحًا للجميع.':'New products are saved to the shared library for everyone to reuse.',
  'سيتم تحديث بيانات الصنف وسعره في المكتبة المشتركة.':'This will update the product details and price in the shared library.',
  'السعر المحفوظ:':'Library price:',
  'التعديل لهذه الطباعة فقط؛ بيانات المكتبة تبقى كما هي.':'Changes apply to this print job only; the library stays unchanged.',
  'تم تجهيز البطاقة بسعر هذه الطباعة فقط':'Label prepared with this print job’s price',
  'حفظ الأصناف الجديدة في المكتبة':'Save new products to library',
  'أصناف الورقة موجودة في المكتبة؛ أسعار الطباعة محفوظة في البطاقات فقط.':'The sheet’s products are already in the library; print prices stay on the labels only.',
  'تعديل بيانات المكتبة':'Edit library details',
  'الجودة':'Quality','السعر':'Price','الخدمة':'Service',
  '٥':'5','حفظ الصنف والبطاقة':'Save product & label',
  'مكتبة الأصناف المشتركة':'Shared product library',
  'ابحث عن الصنف وأضفه للطباعة دون إعادة إدخال بياناته.':'Find a saved product and add it to your sheet without entering its details again.',
  'تحديث المكتبة':'Refresh library','البحث بالاسم أو الباركود':'Search by name or barcode',
  'اسم الصنف أو رقم الباركود':'Product name or barcode number','مسح البحث':'Clear search',
  'السابق':'Previous','التالي':'Next','حفظ أصناف الورقة في المكتبة':'Save sheet products to library',
  'آخر تعديل:':'Last updated:','إضافة للطباعة':'Add to sheet','تعديل الصنف':'Edit product',
  'تحميل بيانات الصنف المحفوظ':'Load saved product details','يجري تحميل الأصناف…':'Loading products…',
  'لا توجد نتائج. جرّب جزءًا من الاسم أو الباركود.':'No matches. Try part of the name or barcode.',
  'المكتبة فارغة. احفظ أول صنف من بيانات البطاقة ليصبح متاحًا للجميع.':'The library is empty. Save your first product using the label form to make it available to everyone.',
  'تعذر الاتصال بمكتبة الأصناف. بياناتك باقية؛ أعد المحاولة.':'The product library is unavailable. Your input is preserved; try again.',
  'تم تعديل الصنف من جهاز آخر. حمّل أحدث بياناته قبل حفظ تعديلك.':'Someone updated this product from another device. Load its latest details before saving your changes.',
  'هذا الباركود محفوظ لصنف موجود. حمّل بياناته لتعديله دون إنشاء نسخة مكررة.':'This barcode belongs to a saved product. Load its details to edit it without creating a duplicate.',
  'راجع اسم الصنف والوحدة قبل الحفظ.':'Check the product name and unit before saving.',
  'راجع رقم الباركود ونوعه قبل الحفظ.':'Check the barcode number and format before saving.',
  'لم يعد الصنف متاحًا. حدّث المكتبة.':'The product is no longer available. Refresh the library.',
  'تعذر السماح بالحفظ. افتح الموقع مباشرة وأعد المحاولة.':'Saving could not be authorized. Open the site directly and try again.',
  'تم تحميل الصنف. عدّل بياناته ثم احفظه.':'Product loaded. Edit its details and save.',
  'تمت إضافة الصنف المحفوظ للطباعة':'Saved product added to the sheet',
  'تم حفظ الصنف في المكتبة والبطاقة':'Product and label saved',
  'تم حفظ أصناف الورقة في المكتبة':'Sheet products saved to the library',
  'يوجد أكثر من تعريف أو سعر لنفس الباركود في الورقة. وحّد بياناته قبل حفظ المكتبة.':'This sheet has different names or prices for the same barcode. Make them consistent before saving to the library.'
}).forEach(([ar,en])=>englishText.set(ar,en));

function tr(ar){return state.language==='en'?(englishText.get(ar)??ar):ar;}
function displayDigits(value){return state.language==='en'?latinDigits(value):arabicDigits(value);}
function displayPrice(value){return latinDigits(value).replace('٫','.');}
function productText(product,field='name'){return String(product?.[state.language==='en'?field+'En':field]||'');}

let interfaceBindings;
function translateInterface(){
  if(!interfaceBindings){
    interfaceBindings=[];
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode,original=node.nodeValue,ar=original.trim();
      if(node.parentElement?.closest('[translate="no"]'))continue;
      if(englishText.has(ar))interfaceBindings.push({node,ar:original,en:original.replace(ar,englishText.get(ar))});
    }
    for(const element of document.querySelectorAll('*'))for(const attribute of ['aria-label','placeholder','alt','title']){
      const ar=element.getAttribute(attribute);if(ar&&englishText.has(ar))interfaceBindings.push({element,attribute,ar,en:englishText.get(ar)});
    }
  }
  for(const binding of interfaceBindings){
    const value=state.language==='en'?binding.en:binding.ar;
    if(binding.node?.isConnected)binding.node.nodeValue=value;
    if(binding.element?.isConnected)binding.element.setAttribute(binding.attribute,value);
  }
  const english=state.language==='en';document.documentElement.lang=state.language;document.documentElement.dir=english?'ltr':'rtl';
  document.title='PriceDesk Studio | '+(state.language==='en'?'Nozha & Karaz':'نزهة وكرز');
  document.querySelector('meta[name="description"]').content=tr('قالب موحد لبطاقات أسعار نزهة وكرز. اختر الورق والتقسيم، أدخل الأصناف ثم اطبع بالمقاس الفعلي.');
  for(const id of ['productName','productUnit'])document.getElementById(id).dir=english?'ltr':'rtl';
  for(const id of ['productNameOther','productUnitOther'])document.getElementById(id).dir=english?'rtl':'ltr';
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===state.language)));
}
