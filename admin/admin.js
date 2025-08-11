(function(){
  const tBody = document.querySelector('#productsTable tbody');
  const form = document.getElementById('productForm');
  const productId = document.getElementById('productId');
  const nameEl = document.getElementById('name');
  const priceEl = document.getElementById('price');
  const stockEl = document.getElementById('stock');
  const parentCategoryIdEl = document.getElementById('parentCategoryId');
  const subcategoryIdEl = document.getElementById('subcategoryId');
  const imageEl = document.getElementById('image');
  const descEl = document.getElementById('description');

  // عناصر إدارة التصنيفات
  const catForm = document.getElementById('categoryForm');
  const catIdEl = document.getElementById('catId');
  const catNameEl = document.getElementById('catName');
  const catImageEl = document.getElementById('catImage');
  const catImageUrlEl = document.getElementById('catImageUrl');
  const catsTBody = document.querySelector('#categoriesTable tbody');
  // عناصر إدارة الفئات
  const subcatForm = document.getElementById('subcategoryForm');
  const subcatIdEl = document.getElementById('subcatId');
  const subcatNameEl = document.getElementById('subcatName');
  const subcatParentIdEl = document.getElementById('subcatParentId');
  const subcatsTBody = document.querySelector('#subcategoriesTable tbody');
  // عناصر إدارة سلايدر الهيرو
  const heroForm = document.getElementById('heroForm');
  const heroIdEl = document.getElementById('heroId');
  const heroTitleEl = document.getElementById('heroTitle');
  const heroSubtitleEl = document.getElementById('heroSubtitle');
  const heroBtnTextEl = document.getElementById('heroBtnText');
  const heroBtnLinkEl = document.getElementById('heroBtnLink');
  const heroSortEl = document.getElementById('heroSort');
  const heroActiveEl = document.getElementById('heroActive');
  const heroImageEl = document.getElementById('heroImage');
  const heroImageUrlEl = document.getElementById('heroImageUrl');
  const heroTBody = document.querySelector('#heroTable tbody');

  async function loadCategories(){
    const { data, error } = await sb.from('categories').select('id,name').order('name');
    if(error){ console.error(error); return; }
    const opts = '<option value="">اختر التصنيف الأب</option>' + (data||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    if(parentCategoryIdEl) parentCategoryIdEl.innerHTML = opts;
    if(subcatParentIdEl) subcatParentIdEl.innerHTML = opts;
  }

  // إدارة سلايدر الهيرو (CRUD)
  async function listHero(){
    if(!heroTBody) return;
    const { data, error } = await sb
      .from('hero_slides')
      .select('id,title,subtitle,btn_text,btn_link,image_url,sort_order,active')
      .order('sort_order', { ascending:true })
      .order('created_at', { ascending:false });
    if(error){ console.error(error); return; }
    heroTBody.innerHTML = (data||[]).map(s=>`<tr data-id="${s.id}" draggable="true">
      <td><span class="drag-handle" title="سحب لإعادة الترتيب" style="cursor:grab">↕</span> ${s.image_url?`<img src="${s.image_url}" style="width:72px;height:48px;object-fit:cover;border-radius:8px;margin-inline-start:6px" />`:''}</td>
      <td><div>${s.title||''}</div><div style="font-size:12px;color:#6b3b52">${s.subtitle||''}</div></td>
      <td>${s.btn_text?`<a href="${s.btn_link||'#'}" target="_blank">${s.btn_text}</a>`:''}</td>
      <td>${typeof s.sort_order==='number'? s.sort_order : 0}</td>
      <td>${s.active? 'نعم' : 'لا'}</td>
      <td>
        <button data-id="${s.id}" data-act="edit-hero">تعديل</button>
        <button data-id="${s.id}" data-act="del-hero" style="color:#f66">حذف</button>
      </td>
    </tr>`).join('');

    heroTBody.querySelectorAll('button').forEach(b=>{
      const id = b.dataset.id; const act = b.dataset.act;
      b.onclick = async ()=>{
        if(act==='edit-hero'){
          const { data, error } = await sb.from('hero_slides').select('*').eq('id', id).single();
          if(error){ alert('تعذر تحميل الشريحة'); return; }
          heroIdEl.value = data.id;
          heroTitleEl.value = data.title||'';
          heroSubtitleEl.value = data.subtitle||'';
          heroBtnTextEl.value = data.btn_text||'';
          heroBtnLinkEl.value = data.btn_link||'';
          heroSortEl.value = typeof data.sort_order==='number'? data.sort_order : 0;
          heroActiveEl.checked = !!data.active;
          heroImageUrlEl.value = data.image_url||'';
          if(heroImageEl){ heroImageEl.value=''; heroImageEl.removeAttribute('required'); }
          window.scrollTo({ top:0, behavior:'smooth' });
        } else if(act==='del-hero'){
          if(!confirm('حذف الشريحة؟')) return;
          const { error } = await sb.from('hero_slides').delete().eq('id', id);
          if(error){ alert('فشل الحذف'); console.error(error); return; }
          await listHero();
        }
      };
    });

    enableHeroDragAndDrop();
  }

  function enableHeroDragAndDrop(){
    if(!heroTBody) return;
    let dragSrcEl = null;
    let dragOverEl = null;

    const rows = Array.from(heroTBody.querySelectorAll('tr[draggable="true"]'));
    rows.forEach(row=>{
      row.addEventListener('dragstart', (e)=>{
        dragSrcEl = row;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', row.dataset.id || '');
        row.style.opacity = '0.6';
      });
      row.addEventListener('dragend', ()=>{
        row.style.opacity = '';
        dragSrcEl = null;
        dragOverEl = null;
      });
      row.addEventListener('dragover', (e)=>{
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.currentTarget;
        if(!target || target === dragSrcEl) return;
        const rect = target.getBoundingClientRect();
        const halfway = rect.top + rect.height / 2;
        if(e.clientY < halfway){
          heroTBody.insertBefore(dragSrcEl, target);
        } else {
          heroTBody.insertBefore(dragSrcEl, target.nextSibling);
        }
      });
      row.addEventListener('drop', (e)=>{
        e.preventDefault();
        persistHeroOrder();
      });
    });
  }

  async function persistHeroOrder(){
    const rows = Array.from(heroTBody.querySelectorAll('tr[draggable="true"]'));
    // حدّث sort_order بحسب ترتيب الصفوف الجديد (0..n-1)
    const updates = rows.map((tr, i)=> sb.from('hero_slides').update({ sort_order: i }).eq('id', tr.dataset.id));
    try{
      // نفّذ بالتوازي لتسريع العملية
      const results = await Promise.all(updates);
      const error = results.find(r=>r.error)?.error;
      if(error) throw error;
      // إعادة التحميل لتحديث الأرقام المعروضة
      await listHero();
    }catch(err){
      console.error('فشل تحديث الترتيب', err);
      alert('تعذر حفظ ترتيب الشرائح');
    }
  }

  heroForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      title: heroTitleEl.value.trim(),
      subtitle: heroSubtitleEl.value.trim() || null,
      btn_text: heroBtnTextEl.value.trim() || null,
      btn_link: heroBtnLinkEl.value.trim() || null,
      sort_order: Math.max(0, Number(heroSortEl.value||0)),
      active: !!heroActiveEl.checked
    };
    try{
      if(heroImageEl.files && heroImageEl.files[0]){
        payload.image_url = await uploadImage(heroImageEl.files[0]);
      } else if(heroImageUrlEl.value){
        payload.image_url = heroImageUrlEl.value;
      }
    }catch(err){ alert('فشل رفع الصورة'); console.error(err); return; }

    if(heroIdEl.value){
      const { error } = await sb.from('hero_slides').update(payload).eq('id', heroIdEl.value);
      if(error){ alert('فشل التحديث'); console.error(error); return; }
    } else {
      const { error } = await sb.from('hero_slides').insert(payload);
      if(error){ alert('فشل الإضافة'); console.error(error); return; }
    }
    document.getElementById('resetHeroForm').click();
    await listHero();
    alert('تم حفظ الشريحة');
  });

  document.getElementById('resetHeroForm')?.addEventListener('click', ()=>{
    heroIdEl.value=''; heroTitleEl.value=''; heroSubtitleEl.value=''; heroBtnTextEl.value=''; heroBtnLinkEl.value=''; heroSortEl.value='0'; heroActiveEl.checked=true; heroImageUrlEl.value=''; if(heroImageEl){ heroImageEl.value=''; heroImageEl.setAttribute('required',''); }
  });

  document.getElementById('refreshHero')?.addEventListener('click', listHero);

  async function loadSubcategoriesForParent(parentId){
    if(!subcategoryIdEl) return;
    if(!parentId){ subcategoryIdEl.innerHTML = '<option value="">اختر الفئة</option>'; return; }
    const { data, error } = await sb.from('subcategories').select('id,name').eq('category_id', parentId).order('name');
    if(error){ console.error(error); return; }
    subcategoryIdEl.innerHTML = '<option value="">اختر الفئة</option>' + (data||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  }

  async function listCats(){
    const { data, error } = await sb.from('categories').select('id,name,image_url').order('name');
    if(error){ console.error(error); return; }
    catsTBody.innerHTML = (data||[]).map(c=>`<tr>
      <td>${c.image_url?`<img src="${c.image_url}" style="width:56px;height:56px;object-fit:cover;border-radius:8px" />`:''}</td>
      <td>${c.name}</td>
      <td>
        <button data-id="${c.id}" data-act="edit-cat">تعديل</button>
        <button data-id="${c.id}" data-act="del-cat" style="color:#f66">حذف</button>
      </td>
    </tr>`).join('');

    catsTBody.querySelectorAll('button').forEach(b=>{
      const id = b.dataset.id; const act = b.dataset.act;
      b.onclick = async ()=>{
        if(act==='edit-cat'){
          const { data, error } = await sb.from('categories').select('*').eq('id', id).single();
          if(error){ alert('تعذر تحميل التصنيف'); return; }
          catIdEl.value = data.id; catNameEl.value = data.name; catImageUrlEl.value = data.image_url || '';
          if(catImageEl){
            catImageEl.value = '';
            if(data.image_url){ catImageEl.removeAttribute('required'); }
            else { catImageEl.setAttribute('required',''); }
          }
          window.scrollTo({ top:0, behavior:'smooth' });
        } else if(act==='del-cat'){
          if(!confirm('حذف التصنيف؟ سيؤثر على المنتجات المرتبطة.')) return;
          const { error } = await sb.from('categories').delete().eq('id', id);
          if(error){ alert('فشل حذف التصنيف'); console.error(error); return; }
          await listCats();
          await loadCategories();
        }
      }
    });
  }

  async function list(){
    const { data, error } = await sb.from('products').select('id,name,price,stock,category_id,subcategory_id,image_url').order('created_at',{ascending:false}).limit(200);
    if(error){ console.error(error); return; }
    const catIds = [...new Set((data||[]).map(p=>p.category_id).filter(Boolean))];
    const subIds = [...new Set((data||[]).map(p=>p.subcategory_id).filter(Boolean))];
    let cats = [];
    if(catIds.length){ const { data: c } = await sb.from('categories').select('id,name').in('id', catIds); cats = c||[]; }
    let subs = [];
    if(subIds.length){ const { data: s } = await sb.from('subcategories').select('id,name').in('id', subIds); subs = s||[]; }
    tBody.innerHTML = (data||[]).map(p=>{
      const cat = cats.find(c=>c.id===p.category_id)?.name || '';
      const sub = subs.find(sc=>sc.id===p.subcategory_id)?.name || '';
      return `<tr>
        <td>${p.image_url?`<img src="${p.image_url}" style="width:56px;height:56px;object-fit:cover;border-radius:8px" />`:''}</td>
        <td>${p.name}<div style="color:#6b3b52;font-size:12px">${cat}${sub?` • ${sub}`:''}</div></td>
        <td>${Number(p.price).toFixed(2)} ر.س</td>
        <td>${typeof p.stock==='number' ? p.stock : '-'}</td>
        <td>${sub || cat}</td>
        <td>
          <button data-id="${p.id}" data-act="edit">تعديل</button>
          <button data-id="${p.id}" data-act="del" style="color:#f66">حذف</button>
        </td>
      </tr>`;
    }).join('');

    tBody.querySelectorAll('button').forEach(b=>{
      const id = b.dataset.id; const act = b.dataset.act;
      b.onclick = async ()=>{
        if(act==='edit'){
          const { data, error } = await sb.from('products').select('*').eq('id', id).single();
          if(error){ alert('تعذر تحميل المنتج'); return; }
          productId.value = data.id; nameEl.value = data.name; priceEl.value = data.price; stockEl.value = (typeof data.stock==='number'? data.stock : 0); descEl.value = data.description||'';
          imageEl.value = '';
          // ضبط التصنيف والفئة
          parentCategoryIdEl.value = data.category_id || '';
          await loadSubcategoriesForParent(parentCategoryIdEl.value);
          subcategoryIdEl.value = data.subcategory_id || '';
          window.scrollTo({ top:0, behavior:'smooth' });
        } else if(act==='del'){
          if(!confirm('حذف المنتج؟')) return;
          const { error } = await sb.from('products').delete().eq('id', id);
          if(error){ alert('فشل الحذف'); console.error(error); }
          await list();
        }
      }
    });
  }

  async function uploadImage(file){
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await sb.storage
      .from(window.SUPABASE_CONFIG.bucket)
      .upload(path, file, { upsert:false, cacheControl:'3600', contentType: file.type || 'application/octet-stream' });
    if(error){ throw error; }
    const { data: pub } = sb.storage.from(window.SUPABASE_CONFIG.bucket).getPublicUrl(path);
    return pub.publicUrl;
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      name: nameEl.value.trim(),
      price: Number(priceEl.value||0),
      stock: Math.max(0, Number(stockEl.value||0)),
      category_id: parentCategoryIdEl.value ? Number(parentCategoryIdEl.value) : null,
      subcategory_id: subcategoryIdEl.value ? Number(subcategoryIdEl.value) : null,
      description: descEl.value.trim() || null
    };
    try{
      if(imageEl.files && imageEl.files[0]){
        payload.image_url = await uploadImage(imageEl.files[0]);
      }
    }catch(err){
      alert('فشل رفع الصورة'); console.error(err); return;
    }

    if(productId.value){
      const { error } = await sb.from('products').update(payload).eq('id', productId.value);
      if(error){ alert('فشل التحديث'); console.error(error); return; }
    } else {
      const { error } = await sb.from('products').insert(payload);
      if(error){ alert('فشل الإضافة'); console.error(error); return; }
    }

    document.getElementById('resetForm').click();
    await list();
    alert('تم الحفظ بنجاح');
  });

  document.getElementById('resetForm').onclick = ()=>{
    productId.value=''; nameEl.value=''; priceEl.value=''; stockEl.value=''; parentCategoryIdEl.value=''; subcategoryIdEl.innerHTML = '<option value="">اختر الفئة</option>'; descEl.value=''; imageEl.value='';
  };

  document.getElementById('refresh').onclick = list;

  // معالجة نموذج التصنيف
  catForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = catNameEl.value.trim();
    if(!name){ alert('أدخل اسم التصنيف'); return; }
    // إجبار وجود صورة
    const file = catImageEl?.files?.[0];
    if(!catIdEl.value && !file){ alert('الصورة مطلوبة'); return; }
    let image_url = catImageUrlEl.value || null;
    if(file){
      try{
        image_url = await uploadImage(file); // تستخدم نفس دالة رفع صور المنتجات
      }catch(err){ console.error(err); alert('فشل رفع الصورة'); return; }
    }
    if(catIdEl.value){
      const payload = { name };
      if(image_url) payload.image_url = image_url;
      const { error } = await sb.from('categories').update(payload).eq('id', catIdEl.value);
      if(error){ alert('فشل التحديث'); console.error(error); return; }
    } else {
      const { error } = await sb.from('categories').insert({ name, image_url });
      if(error){ alert('فشل الإضافة'); console.error(error); return; }
    }
    document.getElementById('resetCatForm').click();
    await listCats();
    alert('تم الحفظ');
  });

  document.getElementById('resetCatForm').addEventListener('click', ()=>{
    catIdEl.value=''; catNameEl.value=''; catImageUrlEl.value=''; if(catImageEl){ catImageEl.value=''; catImageEl.setAttribute('required',''); }
  });

  document.getElementById('refreshCats')?.addEventListener('click', listCats);

  // تحميل الفئات عند اختيار التصنيف الأب في نموذج المنتج
  parentCategoryIdEl?.addEventListener('change', (e)=>{
    loadSubcategoriesForParent(e.target.value);
  });

  // إدارة الفئات (CRUD)
  async function listSubcats(){
    const { data, error } = await sb
      .from('subcategories')
      .select('id,name,category_id')
      .order('name');
    if(error){ console.error(error); return; }
    // اجلب أسماء التصنيفات للأب
    const catIds = [...new Set((data||[]).map(s=>s.category_id).filter(Boolean))];
    let cats = [];
    if(catIds.length){ const { data: c } = await sb.from('categories').select('id,name').in('id', catIds); cats = c||[]; }
    subcatsTBody.innerHTML = (data||[]).map(s=>{
      const cat = cats.find(c=>c.id===s.category_id)?.name || '';
      return `<tr>
        <td>${s.name}</td>
        <td>${cat}</td>
        <td>
          <button data-id="${s.id}" data-act="edit-sub">تعديل</button>
          <button data-id="${s.id}" data-act="del-sub" style="color:#f66">حذف</button>
        </td>
      </tr>`;
    }).join('');

    subcatsTBody.querySelectorAll('button').forEach(b=>{
      const id = b.dataset.id; const act = b.dataset.act;
      b.onclick = async ()=>{
        if(act==='edit-sub'){
          const { data, error } = await sb.from('subcategories').select('*').eq('id', id).single();
          if(error){ alert('تعذر تحميل الفئة'); return; }
          subcatIdEl.value = data.id; subcatNameEl.value = data.name; subcatParentIdEl.value = data.category_id || '';
          window.scrollTo({ top:0, behavior:'smooth' });
        } else if(act==='del-sub'){
          if(!confirm('حذف الفئة؟')) return;
          const { error } = await sb.from('subcategories').delete().eq('id', id);
          if(error){ alert('فشل حذف الفئة'); console.error(error); return; }
          await listSubcats();
          await loadSubcategoriesForParent(parentCategoryIdEl.value);
        }
      };
    });
  }

  subcatForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = subcatNameEl.value.trim();
    const catId = subcatParentIdEl.value ? Number(subcatParentIdEl.value) : null;
    if(!name || !catId){ alert('اختر التصنيف الأب وأدخل اسم الفئة'); return; }
    if(subcatIdEl.value){
      const { error } = await sb.from('subcategories').update({ name, category_id: catId }).eq('id', subcatIdEl.value);
      if(error){ alert('فشل تحديث الفئة'); console.error(error); return; }
    } else {
      const { error } = await sb.from('subcategories').insert({ name, category_id: catId });
      if(error){ alert('فشل إضافة الفئة'); console.error(error); return; }
    }
    document.getElementById('resetSubcatForm').click();
    await listSubcats();
    // تحديث قوائم الفئات حسب التصنيف الأب الحالي في نموذج المنتج
    if(parentCategoryIdEl.value){ await loadSubcategoriesForParent(parentCategoryIdEl.value); }
  });

  document.getElementById('resetSubcatForm')?.addEventListener('click', ()=>{
    subcatIdEl.value=''; subcatNameEl.value=''; subcatParentIdEl.value='';
  });

  document.getElementById('refreshSubcats')?.addEventListener('click', listSubcats);

  (async function init(){
    await loadCategories();
    await listCats();
    await listSubcats();
    await listHero();
    await list();
  })();
})();
