const columns='id,name,name_en,unit,unit_en,price,barcode,format,version,created_at,updated_at';
function db(env){if(!env.DB)throw new Error('Catalog database unavailable');return env.DB;}
const latin=v=>String(v??'').replace(/[٠-٩۰-۹]/g,d=>String((d.charCodeAt(0)-0x660)%16));
function fold(v){return latin(v).normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().replace(/\s+/g,' ').trim();}
function publicProduct(row){return row?{id:row.id,name:row.name,nameEn:row.name_en,unit:row.unit,unitEn:row.unit_en,price:row.price,barcode:row.barcode,format:row.format,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at}:null;}
class ApiError extends Error{constructor(status,code,current=null){super(code);this.status=status;this.code=code;this.current=current;}}
function validate(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ApiError(422,'invalid_product');
 const text=(field,max)=>{const v=String(raw[field]??'').trim();if(v.length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v))throw new ApiError(422,'invalid_product');return v;};
 const p={name:text('name',100),nameEn:text('nameEn',100),unit:text('unit',35),unitEn:text('unitEn',35)};
 if(!p.name&&!p.nameEn)throw new ApiError(422,'invalid_product');
 const price=latin(raw.price).trim().replace(/[٫,]/g,'.');
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(price))throw new ApiError(422,'invalid_price');
 p.price=Number(price).toFixed(2);p.barcode=latin(raw.barcode).trim();
 if(!p.barcode||p.barcode.length>40||!/^[\x20-\x7E]+$/.test(p.barcode))throw new ApiError(422,'invalid_barcode');
 p.format=raw.format||'AUTO';
 if(p.format==='AUTO')p.format=/^\d{13}$/.test(p.barcode)?'EAN13':/^\d{12}$/.test(p.barcode)?'UPC':/^\d{8}$/.test(p.barcode)?'EAN8':'CODE128';
 const lengths={EAN13:13,EAN8:8,UPC:12};
 if(p.format!=='CODE128'){
  const length=lengths[p.format];if(!length||!new RegExp('^\\d{'+length+'}$').test(p.barcode))throw new ApiError(422,'invalid_barcode');
  let sum=0;for(let i=length-2,weight=3;i>=0;i--,weight=weight===3?1:3)sum+=Number(p.barcode[i])*weight;
  if((10-sum%10)%10!==Number(p.barcode.at(-1)))throw new ApiError(422,'invalid_barcode');
 }
 p.searchText=fold([p.name,p.nameEn,p.unit,p.unitEn,p.barcode].join(' '));return p;
}
const same=(a,b)=>['name','nameEn','unit','unitEn','price','barcode','format'].every(k=>a[k]===b[k]);
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
async function readBody(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new ApiError(415,'invalid_product');
 if(Number(request.headers.get('Content-Length'))>8192)throw new ApiError(413,'invalid_product');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(422,'invalid_product');
 let length=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();throw new ApiError(413,'invalid_product');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new ApiError(422,'invalid_product');}
}
async function byBarcode(env,barcode){return publicProduct(await db(env).prepare(`SELECT ${columns} FROM products WHERE barcode=?`).bind(barcode).first());}
async function byId(env,id){return publicProduct(await db(env).prepare(`SELECT ${columns} FROM products WHERE id=?`).bind(id).first());}
export async function catalogApi(request,env){
 const url=new URL(request.url),path=url.pathname;
 try{
  if(request.method==='GET'&&path==='/api/products/by-barcode'){
   const barcode=latin(url.searchParams.get('barcode')).trim();if(barcode.length>40)throw new ApiError(422,'invalid_barcode');
   return json({product:await byBarcode(env,barcode)});
  }
  if(request.method==='GET'&&path==='/api/products'){
   const q=fold(url.searchParams.get('q')||'').slice(0,100),page=Math.max(0,Math.min(100000,Number(url.searchParams.get('page'))||0)),size=30;
   const tokens=q.split(' ').filter(Boolean).slice(0,10),values=tokens.map(t=>'%'+t.replace(/[\\%_]/g,'\\$&')+'%');
   const where=tokens.length?' WHERE '+tokens.map(()=>"search_text LIKE ? ESCAPE '\\'").join(' AND '):'';
   const statements=[db(env).prepare(`SELECT ${columns} FROM products${where} ORDER BY CASE WHEN barcode=? THEN 0 ELSE 1 END,updated_at DESC,id ASC LIMIT ? OFFSET ?`).bind(...values,latin(url.searchParams.get('q')||'').trim(),size,Math.floor(page)*size),db(env).prepare(`SELECT count(*) AS total FROM products${where}`).bind(...values)];
   const [rows,total]=await db(env).batch(statements);
   return json({products:rows.results.map(publicProduct),total:total.results[0].total,page:Math.floor(page),pageSize:size});
  }
  const match=path.match(/^\/api\/products\/([a-f\d-]{36})$/i);
  if(request.method==='GET'&&match)return json({product:await byId(env,match[1])});
  if((request.method==='POST'&&path==='/api/products')||(request.method==='PUT'&&match)){
   const origin=request.headers.get('Origin');
   if(origin!==url.origin&&origin!=='https://nozha-price-studio.alihamady345.chatgpt.site')throw new ApiError(403,'access_denied');
   const raw=await readBody(request),p=validate(raw),now=new Date().toISOString();
   const current=match?await byId(env,match[1]):await byBarcode(env,p.barcode);
   if(request.method==='PUT'){
    if(!current)throw new ApiError(404,'not_found');
    if(!Number.isInteger(raw.version)||raw.version<1)throw new ApiError(422,'invalid_product');
    if(same(current,p)&&raw.version<=current.version)return json({product:current});
    if(raw.version!==current.version)throw new ApiError(409,'conflict',current);
    const duplicate=await byBarcode(env,p.barcode);if(duplicate&&duplicate.id!==current.id)throw new ApiError(409,'duplicate',duplicate);
    try{
     const row=await db(env).prepare(`UPDATE products SET name=?,name_en=?,unit=?,unit_en=?,price=?,barcode=?,format=?,search_text=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING ${columns}`).bind(p.name,p.nameEn,p.unit,p.unitEn,p.price,p.barcode,p.format,p.searchText,now,current.id,raw.version).first();
     if(!row)throw new ApiError(409,'conflict',await byId(env,current.id));
     return json({product:publicProduct(row)});
    }catch(error){if(error instanceof ApiError)throw error;if(/unique/i.test(error.message))throw new ApiError(409,'duplicate',await byBarcode(env,p.barcode));throw error;}
   }
   if(current){if(same(current,p))return json({product:current});throw new ApiError(409,'duplicate',current);}
   const id=crypto.randomUUID();
   try{
    const row=await db(env).prepare(`INSERT INTO products(id,name,name_en,unit,unit_en,price,barcode,format,search_text,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?) RETURNING ${columns}`).bind(id,p.name,p.nameEn,p.unit,p.unitEn,p.price,p.barcode,p.format,p.searchText,now,now).first();
    return json({product:publicProduct(row)},201);
   }catch(error){if(/unique/i.test(error.message)){const found=await byBarcode(env,p.barcode);if(found&&same(found,p))return json({product:found});throw new ApiError(409,'duplicate',found);}throw error;}
  }
  return json({code:'not_found'},404);
 }catch(error){if(error instanceof ApiError)return json({code:error.code,current:error.current},error.status);console.error('Product catalog unavailable',error?.message);return json({code:'unavailable'},503);}
}
