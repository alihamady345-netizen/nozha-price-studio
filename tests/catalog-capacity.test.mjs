import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {catalogApi} from '../worker/catalog.mjs';
const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('../drizzle/0000_woozy_psylocke.sql',import.meta.url),'utf8'));
const insert=sql.prepare('INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
sql.exec('BEGIN');
for(let i=1;i<=30000;i++){const id='00000000-0000-4000-8000-'+String(i).padStart(12,'0'),name='صنف تجريبي '+i,barcode='TEST'+String(i).padStart(8,'0');insert.run(id,name,'Product '+i,'حبة','each','19.95',barcode,'CODE128','صنف تجريبي '+i+' product '+i+' حبه each '+barcode.toLowerCase(),1,'2026-10-15T00:00:00.000Z',new Date(Date.UTC(2026,9,15,0,0,i)).toISOString());}
sql.exec('COMMIT');
const db={prepare(query){return {bind(...values){return {async first(){return sql.prepare(query).get(...values)||null},query,values};}}},async batch(statements){return statements.map(s=>({results:sql.prepare(s.query).all(...s.values)}));}};
async function check(path,expect){const started=performance.now(),r=await catalogApi(new Request('https://test.invalid'+path),{DB:db}),data=await r.json();if(r.status!==200||!expect(data))throw new Error('Capacity check failed: '+path);return {path,ms:Math.round((performance.now()-started)*10)/10,rows:data.products?.length??(data.product?1:0),total:data.total};}
const results=[];
results.push(await check('/api/products?page=0',d=>d.total===30000&&d.products.length===30));
results.push(await check('/api/products?page=899',d=>d.total===30000&&d.products.length===30));
results.push(await check('/api/products?page=999',d=>d.total===30000&&d.products.length===30));
results.push(await check('/api/products?q='+encodeURIComponent('صنف تجريبي 27000'),d=>d.products.some(p=>p.barcode==='TEST00027000')));
results.push(await check('/api/products/by-barcode?barcode=TEST00027000',d=>d.product?.name==='صنف تجريبي 27000'));
const extra={name:'إضافة بعد ثلاثين ألف صنف',unit:'حبة',price:'12.95',barcode:'CAPACITY-30001',format:'CODE128'};
const created=await catalogApi(new Request('https://test.invalid/api/products',{method:'POST',headers:{origin:'https://test.invalid','content-type':'application/json'},body:JSON.stringify(extra)}),{DB:db});if(created.status!==201)throw new Error('Saving beyond 30,000 failed');const saved=await created.json();
const duplicate=await catalogApi(new Request('https://test.invalid/api/products',{method:'POST',headers:{origin:'https://test.invalid','content-type':'application/json'},body:JSON.stringify(extra)}),{DB:db});if(duplicate.status!==200)throw new Error('Idempotent duplicate save failed');
const count=sql.prepare('SELECT count(*) AS n FROM products').get().n;if(count!==30001)throw new Error('Duplicate row or new item missing');
const updated=await catalogApi(new Request('https://test.invalid/api/products/'+saved.product.id,{method:'PUT',headers:{origin:'https://test.invalid','content-type':'application/json'},body:JSON.stringify({...extra,price:'13.95',version:1})}),{DB:db});if(updated.status!==200||(await updated.json()).product.version!==2)throw new Error('Versioned update failed');
const conflict=await catalogApi(new Request('https://test.invalid/api/products/'+saved.product.id,{method:'PUT',headers:{origin:'https://test.invalid','content-type':'application/json'},body:JSON.stringify({...extra,price:'15.95',version:1})}),{DB:db});if(conflict.status!==409)throw new Error('Version conflict protection failed');
results.push({saveBeyond30000:true,duplicateSafe:true,versionedUpdates:true,conflictProtected:true});
console.log(JSON.stringify({dataset:30000,isolated:true,estimatedDatabaseBytes:sql.prepare('PRAGMA page_count').get().page_count*sql.prepare('PRAGMA page_size').get().page_size,checks:results},null,2));
