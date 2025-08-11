// يعتمد على تحميل CDN لـ supabase-js v2 قبل هذا الملف
// يعرّف عميل Supabase على window.sb لاستخدامه في باقي الملفات
(function(){
  if (!window.supabase || !window.SUPABASE_CONFIG) {
    console.error("Supabase CDN or config missing");
    return;
  }
  window.sb = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );
})();
