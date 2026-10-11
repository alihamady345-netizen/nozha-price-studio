'use strict';
window.OfferValidity=(()=>{
 let serverBase=0,clockBase=0,syncedAt=0,pending=null;
 const setClock=result=>{if(Number.isFinite(result?.serverNow)){serverBase=result.serverNow;clockBase=performance.now();syncedAt=performance.now();}};
 const today=()=>serverBase?new Date(serverBase+performance.now()-clockBase+10800000).toISOString().slice(0,10):'';
 const isActive=item=>!!today()&&!!item.start&&!!item.expiry&&item.start<=today()&&item.expiry>=today();
 // Upcoming offers can be prepared before launch; expiry still blocks printing.
 const canPrint=item=>!!today()&&!!item.start&&!!item.expiry&&item.start<=item.expiry&&item.expiry>=today();
 async function sync(){if(pending)return pending;pending=fetch('/api/offers/clock',{cache:'no-store',credentials:'same-origin'}).then(async r=>{if(!r.ok)throw new Error('clock unavailable');setClock(await r.json());return today();}).finally(()=>pending=null);return pending;}
 function status(item){if(!item.start||!item.expiry)return 'dates';const day=today();return !day?'clock':item.expiry<day?'expired':item.start>day?'scheduled':'active';}
 return {today,isActive,canPrint,status,sync,setClock,get ready(){return !!serverBase;},get stale(){return !serverBase||performance.now()-syncedAt>60000;}};
})();
