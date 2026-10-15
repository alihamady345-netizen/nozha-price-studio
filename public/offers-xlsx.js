'use strict';
// Read XLSX values and cached formula results locally. Never execute workbook formulas.
window.OfferWorkbook=(()=>{
  const norm=s=>String(s??'').normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/(?:\(اختياري\)|\(optional\))/gi,'').replace(/[\sـ_\-\u200e\u200f\ufeff:：()\[\]\/]+/g,'').toLowerCase();
  const text=s=>String(s??'').trim();
  const nodes=(root,name)=>Array.from(root.getElementsByTagNameNS('*',name));
  const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('Invalid workbook XML');return d;};
  const col=s=>{let n=0;for(const c of s.replace(/\d/g,''))n=n*26+c.charCodeAt(0)-64;return n-1;};
  const letter=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
  const aliases={name:['اسم الصنف','تعريف الصنف','الصنف','product name','description','item name','name','arabic name'],nameEn:['اسم الصنف بالانجليزية','english name','description en','name en'],unit:['الوحدة','وحدة البيع','unit','uom'],oldPrice:['السعر الافتراضي','السعر القديم','قبل العرض','السعر قبل الخصم','regular price','old price','original price'],price:['السعر','سعر العرض','السعر الجديد','بعد العرض','offer price','sale price','new price','price'],code:['رقم الصنف','كود الصنف','item code','sku','product code'],barcode:['رقم الباركود','الباركود','باركود','barcode','ean'],limit:['كمية لكل عميل','الحد الاقصى','max per customer','customer limit'],expiry:['تنتهي يوم','تاريخ نهاية العرض','تاريخ الانتهاء','expiry','end date','offer end'],copies:['عدد النسخ','copies','print copies']};
  aliases.start=['بداية العرض','تاريخ بداية العرض','تاريخ البداية','يبدأ يوم','يسري من','ساري من','من تاريخ','start date','startdate','offer start','valid from','from date'];
  aliases.expiry.push('نهاية العرض','يسري إلى','ساري إلى','إلى تاريخ','حتى تاريخ','enddate','valid to','to date');
  aliases.limit.push('حد العميل','عدد الحبات لكل عميل','عدد الحبات','عدد الحبة','عدد الحبه','الحد الأقصى لكل عميل','الكمية لكل عميل','كمية العميل','الحد الأقصى للعميل','الحد الاقصي العميل','maximum per customer','max quantity per customer','customer quantity limit');
  aliases.name.push('اسم المنتج','وصف الصنف','وصف المنتج','تعريف','التعريف','اسم المادة','المادة','بيان الصنف','الاسم','اسم الصنف عربي','product','item description','item','article','arabic description');
  aliases.nameEn.push('الاسم بالانجليزي','اسم الصنف انجليزي','الوصف بالانجليزي','english description','description english');
  aliases.price.push('سعر المجلة','سعر مجلة','سعر العرض شامل الضريبة','سعر التخفيض','سعر البيع بعد الخصم','السعر بعد','السعر بعد الخصم','السعر الجديد شامل الضريبة','بعد','السعر الحالي','السعر النهائي','السعر المخفض','السعر الخاص','promotion price','promo price','discount price','price after','final price','offer','sale');
  aliases.oldPrice.push('السعر قبل','السعر قبل العرض','سعر قبل','السعر العادي','السعر الأساسي','سعر البيع','قبل','سعر البيع قبل الخصم','السعر قبل شامل الضريبة','before price','price before','normal price','retail price','list price');
  aliases.code.push('كود','الكود','كود المنتج','رمز الصنف','رقم المادة','item number','product id','code');
  aliases.unit.push('وحدة الصنف','نوع العبوة','وحدة المنتج','الحبة','الحبه','الحجم','المقاس','العبوة','نوع الوحدة','وحده','size','pack','pack size');
  aliases.paper=['مقاس الورق','مقاس الورقة','مقاس الطباعة','paper','paper size','print size'];
  aliases.count=['بطاقات في الورقة','عدد البطاقات في الورقة','تقسيم الورقة','labels per sheet','cards per sheet','division'];
  const recognized=new Map();for(const [field,list]of Object.entries(aliases))for(const a of list)recognized.set(norm(a),field);
  async function readXlsx(buffer){
    if(typeof JSZip==='undefined')throw new Error('XLSX reader unavailable');
    const zip=await JSZip.loadAsync(buffer);
    async function get(path,optional=false){const f=zip.file(path);if(!f){if(optional)return '';throw new Error('Missing workbook part: '+path);}const s=await f.async('string');if(s.length>45000000)throw new Error('Workbook sheet is too large');return s;}
    const wb=xml(await get('xl/workbook.xml')),rels=xml(await get('xl/_rels/workbook.xml.rels'));
    const targets=new Map(nodes(rels,'Relationship').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
    const shared=await get('xl/sharedStrings.xml',true),strings=shared?nodes(xml(shared),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[];
    const styles=await get('xl/styles.xml',true),formats=new Map(),styleFormats=[];
    if(styles){const d=xml(styles);for(const n of nodes(d,'numFmt'))formats.set(Number(n.getAttribute('numFmtId')),n.getAttribute('formatCode'));const xfs=nodes(d,'cellXfs')[0];if(xfs)for(const n of Array.from(xfs.children))styleFormats.push(Number(n.getAttribute('numFmtId')));}
    const date1904=['1','true'].includes(nodes(wb,'workbookPr')[0]?.getAttribute('date1904'));
    const sheets=nodes(wb,'sheet').map(s=>{const id=s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||s.getAttribute('r:id'),target=targets.get(id)||'';const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');return {name:s.getAttribute('name'),path,hidden:s.getAttribute('state')==='hidden'};});
    const cache=new Map(),sharedReferences=new Map(),referenceSheets=new Set();
    function recordReference(formula){const reference=formula.match(/^[+=]*(?:'((?:[^']|'')+)'|([^'!]+))!\$([A-Z]+)\$(\d+)$/);if(reference){const key=JSON.stringify([reference[1]?.replace(/''/g,"'")||reference[2],reference[3],Number(reference[4])]);sharedReferences.set(key,(sharedReferences.get(key)||0)+1);}}
    async function sheet(index){if(cache.has(index))return cache.get(index);const info=sheets[index];if(!info)throw new Error('Unknown worksheet');const d=xml(await get(info.path)),rows=[];let cells=0;
      for(const row of nodes(d,'row')){const values=[];for(const c of nodes(row,'c')){if(++cells>750000)throw new Error('Too many workbook cells');const i=col(c.getAttribute('r')||'A1'),type=c.getAttribute('t'),v=nodes(c,'v')[0]?.textContent;let value='';
          if(type==='s')value=strings[Number(v)]??'';else if(type==='inlineStr')value=nodes(c,'t').map(t=>t.textContent).join('');else if(type==='b')value=v==='1'?'1':'0';else value=v??(nodes(c,'f').length?'#NO_CACHED_VALUE':'');
          // Identifier formatting such as 000000 preserves leading zeroes.
          const fmt=formats.get(styleFormats[Number(c.getAttribute('s')||0)]);
          if((!type||type==='n')&&/^\d+$/.test(value)&&/^0{2,}$/.test(fmt||''))value=value.padStart(fmt.length,'0');
          values[i]=value;
          if(!referenceSheets.has(index))recordReference(nodes(c,'f')[0]?.textContent||'');
        }if(values.some(v=>text(v)))rows.push({number:Number(row.getAttribute('r'))||rows.length+1,values});}
      referenceSheets.add(index);const result={...info,rows,date1904};cache.set(index,result);return result;
    }
    async function scanReferences(){for(let index=0;index<sheets.length;index++){if(referenceSheets.has(index))continue;const source=await get(sheets[index].path);for(const match of source.matchAll(/<f(?:\s[^>]*)?>([^<]*)<\/f>/g)){const formula=match[1].replace(/&(amp|lt|gt|quot|apos);/g,(_,entity)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[entity]));recordReference(formula);}referenceSheets.add(index);}}
    function sharedValue(index,column){const info=sheets[index],refs=Array.from(sharedReferences).filter(([key,count])=>{const [name,c]=JSON.parse(key);return name===info.name&&c===letter(column)&&count>=2;});if(refs.length!==1)return null;const [name,c,row]=JSON.parse(refs[0][0]),source=cache.get(index)?.rows.find(r=>r.number===row);return source?{value:source.values[column],row}:null;}
    return {sheets,sheet,sharedValue,scanReferences};
  }
  function fieldOf(value){const exact=recognized.get(norm(value));if(exact)return exact;const part=String(value??'').split(/[\n\r|]+/).map(v=>recognized.get(norm(v))).filter(Boolean);return new Set(part).size===1?part[0]:undefined;}
  function detect(sheet){let best={score:0,header:sheet.rows[0]?.number||1,hasHeader:false,mapping:{}};
    // Price/name headers can be separated by empty columns. Keep auxiliary tables after a second name header separate.
    for(const row of sheet.rows.slice(0,80)){const entries=row.values.map((v,i)=>({i,field:fieldOf(v)})).filter(e=>e.field),names=entries.filter(e=>e.field==='name'||e.field==='nameEn');
      for(const anchor of names){const previous=names.filter(e=>e.i<anchor.i&&e.field===anchor.field).at(-1),next=names.find(e=>e.i>anchor.i&&e.field===anchor.field);const left=previous?anchor.i:0,right=next?next.i:row.values.length,mapping={};for(const e of entries)if(e.i>=left&&e.i<right&&mapping[e.field]===undefined)mapping[e.field]=e.i;
        // A second SKU/barcode header marks a separate lookup table, even without another product-name header.
        const identifiers=entries.filter(e=>e.i>=left&&e.i<right&&(e.field==='code'||e.field==='barcode')),seen=new Set();let boundary=right;for(const e of identifiers){if(seen.has(e.field)&&e.i>anchor.i){boundary=e.i;break;}seen.add(e.field);}if(boundary<right){for(const field of Object.keys(mapping))if(mapping[field]>=boundary)delete mapping[field];}
        const below=sheet.rows.filter(r=>r.number>row.number).slice(0,40),count=below.filter(r=>text(r.values[mapping.name??mapping.nameEn])&&text(r.values[mapping.price])).length;
        const score=(mapping.name!==undefined||mapping.nameEn!==undefined?5:0)+(mapping.price!==undefined?5:0)+(mapping.oldPrice!==undefined?2:0)+(mapping.unit!==undefined?1:0);
        if(score>best.score||score===best.score&&count>(best.dataCount||0))best={score,header:row.number,hasHeader:true,mapping,dataCount:count};}}
    if(best.score>=10)return best;
    const latin=v=>text(v).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/٫/g,'.'),numeric=v=>/^\d+(?:\.\d+)?$/.test(latin(v)),description=v=>!numeric(v)&&!fieldOf(v)&&text(v).length>=4&&!/^\d{4}[-/]\d/.test(latin(v))&&!/^(?:piece|pieces|carton|kilogram|pack|حبة|حبه|كرتون|كيلو|كيلوجرام|كجم|علبة|علبه|عبوة|عبوه)$/i.test(text(v)),rows=sheet.rows.filter(r=>r.number>=(best.hasHeader?best.header+1:best.header));
    const maxCol=Math.min(100,Math.max(0,...rows.slice(0,80).map(r=>r.values.length))),known=best.mapping;let nameColumn=known.name??known.nameEn;
    if(nameColumn===undefined){let score=0;for(let c=0;c<maxCol;c++){const values=rows.slice(0,80).map(r=>text(r.values[c])).filter(Boolean),descriptions=values.filter(description);const candidate=descriptions.length*2+descriptions.filter(v=>/\s/.test(v)).length;if(descriptions.length>=2&&descriptions.length>=values.length*.65&&candidate>score){score=candidate;nameColumn=c;}}}
    if(nameColumn===undefined)return best;
    // Preserve an established headerless five-column export: name, unit, pack, before, after.
    const first=rows.find(r=>description(r.values[nameColumn]));
    if(!best.hasHeader&&nameColumn===0&&first&&text(first.values[1])&&!numeric(first.values[1])&&numeric(first.values[3])&&numeric(first.values[4]))return {score:8,header:first.number,hasHeader:false,mapping:{name:0,unit:1,oldPrice:3,price:4},inferred:true};
    const mapping={...known};if(mapping.name===undefined&&mapping.nameEn===undefined)mapping.name=nameColumn;
    // Only infer an unlabelled price when exactly one numeric non-identifier column remains. Ambiguity stays visible for review.
    if(mapping.price===undefined){const excluded=new Set(Object.entries(mapping).filter(([key])=>key!=='price').map(([,v])=>v)),candidates=[];for(let c=0;c<maxCol;c++){if(excluded.has(c)||c===nameColumn)continue;const values=rows.slice(0,80).filter(r=>description(r.values[nameColumn])).map(r=>text(r.values[c])).filter(Boolean);if(values.length>=2&&values.every(v=>numeric(v)&&Number(latin(v))<100000)&&values.some(v=>/[.٫]/.test(v)))candidates.push(c);}if(candidates.length===1)mapping.price=candidates[0];}
    return {...best,score:mapping.price===undefined?5:8,header:best.hasHeader?best.header:first?.number||best.header,mapping,inferred:true};
  }
  function lookup(sheet){const result=new Map();for(const row of sheet.rows.slice(0,80)){const codes=row.values.map((v,i)=>fieldOf(v)==='code'?i:-1).filter(i=>i>=0);for(let n=0;n<codes.length;n++){const code=codes[n],end=codes[n+1]??row.values.length,barcode=row.values.findIndex((v,i)=>i>code&&i<end&&fieldOf(v)==='barcode');if(barcode<0)continue;
      for(const r of sheet.rows){if(r.number<=row.number)continue;const k=text(r.values[code]),v=text(r.values[barcode]);if(k&&v&&!v.startsWith('#')){if(!result.has(k))result.set(k,v);else if(result.get(k)!==v)result.set(k,'');}}}}
    return result;
  }
  function extract(sheet,config){const join=lookup(sheet),result=[];for(const r of sheet.rows){if(r.number<config.header||(config.hasHeader&&r.number===config.header))continue;const item={sourceRow:r.number,selected:true};
      for(const field of Object.keys(aliases)){const column=config.mapping[field];item[field]=column===undefined||column<0?'':text(r.values[column]);}
      if(fieldOf(item.name)==='name'||fieldOf(item.nameEn)==='nameEn')continue;
      if(!['name','nameEn','price','oldPrice','code','barcode'].some(k=>item[k]))continue;
      if(!item.barcode&&item.code&&join.has(item.code))item.barcode=join.get(item.code);
      item.copies=item.copies||'1';item.date1904=sheet.date1904;result.push(item);
    }return result;}
  async function readCompatible(buffer,filename){await window.StudioAssets.load('xlsx');if(typeof XLSX==='undefined')throw new Error('Spreadsheet reader unavailable');let input=buffer,type='array';if(/\.(csv|tsv)$/i.test(filename)){const bytes=new Uint8Array(buffer);input=bytes[0]===255&&bytes[1]===254?new TextDecoder('utf-16le').decode(bytes):bytes[0]===254&&bytes[1]===255?new TextDecoder('utf-16be').decode(bytes):new TextDecoder('utf-8').decode(bytes);if(input.includes('\ufffd'))input=new TextDecoder('windows-1256').decode(bytes);type='string';}
    const wb=XLSX.read(input,{type,raw:true,cellNF:true,cellText:true,cellDates:false}),cache=new Map(),references=new Map(),sheets=wb.SheetNames.map((name,index)=>({name,hidden:!!wb.Workbook?.Sheets?.[index]?.Hidden}));
    async function sheet(index){if(cache.has(index))return cache.get(index);const info=sheets[index],source=wb.Sheets[info?.name];if(!source)throw new Error('Unknown worksheet');const rows=new Map();let count=0;for(const [address,cell]of Object.entries(source)){if(address.startsWith('!'))continue;if(++count>750000)throw new Error('Too many workbook cells');const {r,c}=XLSX.utils.decode_cell(address);let value=cell.v===undefined?(cell.f?'#NO_CACHED_VALUE':''):String(cell.v);if(cell.t==='n'&&/^0{2,}$/.test(cell.z||''))value=value.padStart(cell.z.length,'0');if(!rows.has(r+1))rows.set(r+1,[]);rows.get(r+1)[c]=value;}
      const result={...info,date1904:!!wb.Workbook?.WBProps?.date1904,rows:Array.from(rows,([number,values])=>({number,values})).filter(row=>row.values.some(text)).sort((a,b)=>a.number-b.number)};cache.set(index,result);return result;}
    async function scanReferences(){if(references.size)return;for(const name of wb.SheetNames)for(const cell of Object.values(wb.Sheets[name]))if(cell?.f){const match=cell.f.match(/^[+=]*(?:'((?:[^']|'')+)'|([^'!]+))!\$([A-Z]+)\$(\d+)$/);if(match){const key=JSON.stringify([match[1]?.replace(/''/g,"'")||match[2],match[3],Number(match[4])]);references.set(key,(references.get(key)||0)+1);}}}
    function sharedValue(index,column){const refs=Array.from(references).filter(([key,count])=>{const [name,c]=JSON.parse(key);return name===sheets[index].name&&c===letter(column)&&count>=2;});if(refs.length!==1)return null;const [,c,row]=JSON.parse(refs[0][0]);return {row,value:wb.Sheets[sheets[index].name][c+row]?.v};}
    return {sheets,sheet,sharedValue,scanReferences};
  }
  async function read(buffer,filename=''){const bytes=new Uint8Array(buffer);if(bytes[0]===80&&bytes[1]===75){try{await window.StudioAssets.load('zip');return await readXlsx(buffer);}catch(error){/* Try the compatibility reader for other workbook formats. */}}return readCompatible(buffer,filename);}
  return {read,detect,extract,letter,aliases};
})();
