'use strict';
(() => {
  let installPrompt = null;
  const button = document.getElementById('installApp');
  const dialog = document.getElementById('installDialog');
  const confirm = document.getElementById('confirmInstall');
  const standalone = matchMedia('(display-mode: standalone)');
  const en = () => document.documentElement.lang === 'en';
  function render() {
    button.hidden = standalone.matches || navigator.standalone === true;
    button.textContent = en() ? 'Install app' : 'تثبيت التطبيق';
    document.getElementById('closeInstall').setAttribute('aria-label', en() ? 'Close' : 'إغلاق');
    document.getElementById('installIntro').textContent = en() ? 'Your pricing studio, on your desktop.' : 'استوديو الأسعار والعروض على سطح المكتب.';
    document.getElementById('installInstructions').textContent = installPrompt
      ? (en() ? 'Ready to install. Choose Install now, then confirm in your browser.' : 'جاهز للتثبيت. اضغط «تثبيت الآن»، ثم وافق في نافذة المتصفح.')
      : (en() ? 'Open this link in Chrome or Edge on your computer. From the browser menu, choose Install PriceDesk Studio (or Apps → Install this site as an app). In Safari on Mac, choose File → Add to Dock.' : 'افتح الرابط في Chrome أو Edge على الكمبيوتر. من قائمة المتصفح اختر «تثبيت PriceDesk Studio» أو «التطبيقات ← تثبيت هذا الموقع كتطبيق». في Safari على ماك اختر «ملف ← إضافة إلى شريط Dock».');
    document.getElementById('installNetwork').textContent = en() ? 'An internet connection is needed to access and update the shared product library.' : 'يلزم اتصال بالإنترنت للوصول إلى مكتبة الأصناف المشتركة وتحديثها.';
    confirm.hidden = !installPrompt;
    confirm.textContent = en() ? 'Install now' : 'تثبيت الآن';
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    render();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    dialog.close();
    button.hidden = true;
  });
  standalone.addEventListener('change', render);
  new MutationObserver(render).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
  button.addEventListener('click', () => { render(); dialog.showModal(); });
  document.getElementById('closeInstall').addEventListener('click', () => dialog.close());
  confirm.addEventListener('click', async () => {
    if (!installPrompt) return;
    const pending = installPrompt;
    installPrompt = null;
    confirm.disabled = true;
    try { await pending.prompt(); await pending.userChoice; }
    catch { /* The browser menu remains available if prompting is unsupported. */ }
    finally { confirm.disabled = false; render(); }
  });
  render();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache:'none' }).catch(() => {});
    });
  }
})();
