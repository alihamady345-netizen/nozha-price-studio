export const offersApi = (() => {
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const fail=(code,status=422)=>{const e=new Error(code);e.status=status;throw e;};
 const database=env=>{if(!env.DB)fail('unavailable',503);return env.DB;};
 const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 const normalize=raw=>{
  const p={};for(const [key,max]of Object.entries({name:250,nameEn:250,unit:40,oldPrice:20,price:20,code:80,barcode:80,limit:40,start:10,expiry:10})){p[key]=String(raw?.[key]??'').trim();if(p[key].length>max||/[\u0000-\u001f]/.test(p[key]))fail('invalid_offer');}
  if(!p.name&&!p.nameEn)fail('invalid_offer');
  for(const key of ['price','oldPrice']){if(key==='oldPrice'&&!p[key])continue;if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(p[key]))fail('invalid_offer');p[key]=Number(p[key]).toFixed(2);}
  if(!validDate(p.start)||!validDate(p.expiry)||p.start>p.expiry)fail('offer_dates_required');
  if(p.limit&&!/^\d{1,5}$/.test(p.limit)&&!/^(حتى )?نفاذ الكمية$/.test(p.limit))fail('invalid_offer');
  return p;
 };
 const publicOffer=row=>({...JSON.parse(row.data_json),offerId:row.id,offerVersion:row.version,brand:row.brand});
 async function body(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('invalid_offer');
  if(Number(request.headers.get('Content-Length'))>300000)fail('too_many_offers',413);
  const reader=request.body?.getReader();if(!reader)fail('invalid_offer');let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>300000){await reader.cancel();fail('too_many_offers',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail('invalid_offer');}
 }
 const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 return async function(request,env){const url=new URL(request.url),day=today(),serverNow=Date.now();try{
  if(request.method==='GET'&&url.pathname==='/api/offers/clock')return json({today:day,serverNow});
  const db=database(env),brand=url.searchParams.get('brand')||'nozha';
  if(request.method==='GET'&&url.pathname==='/api/offers'){
   if(!['nozha','karaz'].includes(brand))fail('invalid_offer');
   const page=Math.max(0,Math.min(100000,Math.floor(Number(url.searchParams.get('page'))||0))),q=String(url.searchParams.get('q')||'').trim().slice(0,100),where='brand=? AND start_date<=? AND end_date>=? AND search_text LIKE ? ESCAPE \'\\\'',values=[brand,day,day,'%'+q.replace(/[\\%_]/g,'\\$&')+'%'];
   const [rows,count]=await db.batch([db.prepare(`SELECT * FROM offers WHERE ${where} ORDER BY end_date ASC,id ASC LIMIT 30 OFFSET ?`).bind(...values,page*30),db.prepare(`SELECT count(*) AS total FROM offers WHERE ${where}`).bind(...values)]);
   return json({items:rows.results.map(publicOffer),total:count.results[0].total,page,pageSize:30,today:day,serverNow});
  }
  if(request.method==='POST'&&['/api/offers/batch','/api/offers/check'].includes(url.pathname)){
   if(request.headers.get('Origin')!==url.origin&&request.headers.get('Origin')!=='https://nozha-price-studio.alihamady345.chatgpt.site')fail('access_denied',403);
   const raw=await body(request);if(!['nozha','karaz'].includes(raw.brand)||!Array.isArray(raw.items)||!raw.items.length||raw.items.length>100)fail('invalid_offer');
   const normalized=raw.items.map(normalize);
   if(url.pathname.endsWith('/check')){
    if(normalized.some(p=>p.expiry<day))fail('offer_not_active',409);
    const linked=raw.items.map((item,i)=>({item,p:normalized[i]})).filter(x=>x.item.offerId);
    if(linked.length){const results=await db.batch(linked.map(({item})=>db.prepare('SELECT * FROM offers WHERE id=? AND brand=? AND end_date>=?').bind(String(item.offerId),raw.brand,day)));
     for(let i=0;i<linked.length;i++){const row=results[i].results[0];if(!row||row.version!==linked[i].item.offerVersion||row.data_json!==JSON.stringify(linked[i].p))fail('offer_changed',409);}
    }
    return json({ok:true,today:day,serverNow});
   }
   if(normalized.some(p=>p.expiry<day))fail('offer_expired',409);
   const records=await Promise.all(normalized.map(async(p,i)=>({p,id:/^[a-f0-9]{64}$/.test(raw.items[i].offerId||'')?raw.items[i].offerId:await digest(JSON.stringify([raw.brand,p.barcode||p.code||[p.name,p.nameEn,p.unit].join('|'),p.start,p.expiry])),version:Number(raw.items[i].offerVersion)||0,json:JSON.stringify(p)})));
   if(new Set(records.map(r=>r.id)).size!==records.length)fail('duplicate_offer',409);
   const existing=await db.batch(records.map(r=>db.prepare('SELECT id,brand,version,data_json FROM offers WHERE id=?').bind(r.id)));
   for(let i=0;i<records.length;i++){const row=existing[i].results[0],r=records[i];if((row&&row.brand!==raw.brand)||(!row&&raw.items[i].offerId))fail('offer_changed',409);if(row&&row.data_json!==r.json&&row.version!==r.version)fail('offer_changed',409);}
   const now=new Date().toISOString();
   const saved=await db.batch(records.map(r=>db.prepare('INSERT INTO offers(id,brand,start_date,end_date,search_text,data_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET start_date=excluded.start_date,end_date=excluded.end_date,search_text=excluded.search_text,data_json=excluded.data_json,version=CASE WHEN offers.data_json=excluded.data_json THEN offers.version ELSE offers.version+1 END,updated_at=excluded.updated_at WHERE offers.version=? OR offers.data_json=excluded.data_json RETURNING *').bind(r.id,raw.brand,r.p.start,r.p.expiry,[r.p.name,r.p.nameEn,r.p.barcode,r.p.code].join(' '),r.json,now,now,r.version)));
   const items=saved.flatMap(r=>r.results.map(publicOffer));return json({items,complete:items.length===records.length,today:day,serverNow},items.length===records.length?200:409);
  }
  return json({code:'not_found'},404);
 }catch(error){if(error.status)return json({code:error.message,today:day,serverNow},error.status);console.error('Offers unavailable',error?.message);return json({code:'unavailable',today:day,serverNow},503);}}
})();
