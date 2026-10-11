import { offersApi } from './offers.mjs';
import { catalogApi } from './catalog.mjs';
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/offers'))return offersApi(request,env);
  if(url.pathname.startsWith('/api/'))return catalogApi(request,env);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const path=url.pathname==='/'?'/index.html':url.pathname,asset=SITE_ASSETS[path];
  if(!asset)return new Response('Not found',{status:404});
  const headers={'Content-Type':asset.type,'Cache-Control':path.startsWith('/assets/')?'public, max-age=86400':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'};
  if(request.method==='HEAD')return new Response(null,{headers});
  return new Response(Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),{headers});
 }
};
