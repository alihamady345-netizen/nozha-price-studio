const origin = 'https://nozha-price-studio.alihamady345.chatgpt.site';
const allowed = /^\/api\/(?:products(?:\/by-barcode|\/[a-f\d-]{36})?|offers(?:\/clock|\/batch|\/check)?)$/i;
export const config = { maxDuration: 30 };
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/bridge') {
      url.pathname = '/api/' + (url.searchParams.get('__path') || '');
    }
    url.searchParams.delete('__path');
    if (!allowed.test(url.pathname)) return Response.json({code:'not_found'}, {status:404});
    if (!['GET','HEAD','POST','PUT'].includes(request.method)) return Response.json({code:'method_not_allowed'}, {status:405});
    const mutating = ['POST','PUT'].includes(request.method);
    if (mutating && request.headers.get('origin') !== url.origin) return Response.json({code:'access_denied'}, {status:403});
    const headers = new Headers({accept:'application/json'});
    if (mutating) {
      headers.set('origin', origin);
      headers.set('content-type', request.headers.get('content-type') || '');
    }
    try {
      const body = mutating ? await request.arrayBuffer() : undefined;
      if (body && body.byteLength > 300000) return Response.json({code:'too_many_offers'}, {status:413});
      const upstream = await fetch(origin + url.pathname + url.search, {method:request.method,headers,body,redirect:'error',signal:AbortSignal.timeout(25000)});
      if (!upstream.headers.get('content-type')?.includes('application/json')) throw new Error('Unexpected upstream response');
      return new Response(upstream.body,{status:upstream.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
    } catch (error) {
      console.error('Shared catalog connection failed:',error.name);
      return Response.json({code:'unavailable'},{status:503,headers:{'cache-control':'no-store'}});
    }
  }
};
