'use strict';
// Optional tools are fetched only when their feature is used. Concurrent calls
// share a single download; failed downloads can be retried on the next action.
window.StudioAssets = (() => {
  const pending = new Map();
  const tools = {
    canvas: ['/assets/html2canvas.min.js', () => typeof window.html2canvas === 'function'],
    pdf: ['/assets/jspdf.umd.min.js', () => !!window.jspdf?.jsPDF],
    camera: ['/assets/zxing-browser.min.js', () => !!window.ZXingBrowser?.BrowserMultiFormatReader],
    zip: ['/assets/jszip.min.js', () => !!window.JSZip],
    xlsx: ['/assets/xlsx.full.min.js', () => !!window.XLSX]
  };
  function load(name) {
    const tool = tools[name];
    if (!tool) return Promise.reject(new Error('Unknown app tool'));
    if (tool[1]()) return Promise.resolve();
    if (pending.has(name)) return pending.get(name);
    const task = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const finish = error => {
        clearTimeout(timeout);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); } else resolve();
      };
      const fail = () => finish(new Error(document.documentElement.lang === 'en'
        ? 'Could not load this tool. Check your connection and try again.'
        : 'تعذر تحميل الأداة. تحقّق من الإنترنت وأعد المحاولة.'));
      const timeout = setTimeout(fail, 20000);
      script.src = tool[0];
      script.async = true;
      script.onload = () => tool[1]() ? finish() : fail();
      script.onerror = fail;
      document.head.append(script);
    }).catch(error => { pending.delete(name); throw error; });
    pending.set(name, task);
    return task;
  }
  return { load, pdf: () => Promise.all([load('canvas'), load('pdf')]) };
})();
