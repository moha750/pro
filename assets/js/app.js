(function(){
  const grid = document.getElementById('productsGrid');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const categoryFilter = document.getElementById('categoryFilter');
  const subcategoryFilter = document.getElementById('subcategoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const categoriesList = document.getElementById('categoriesList');

  async function loadCategories(){
    const { data: cats, error } = await sb.from('categories').select('id,name,image_url').order('name');
    if(error){ console.warn('categories error', error); return; }
    // تعبئة مرشح التصنيفات
    for(const c of (cats||[])){
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name; categoryFilter.appendChild(opt);
    }
    // عرض قائمة التصنيفات فقط إن وجدت الحاوية
    if(categoriesList){
      categoriesList.innerHTML = '';
      if(!cats || !cats.length){
        categoriesList.innerHTML = '<span>لا توجد تصنيفات بعد.</span>';
        return;
      }
      for(const c of cats){
        // بطاقة تصنيف بصورة وعنوان
        const card = document.createElement('div');
        card.className = 'card';
        card.style.width = '120px';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <img src="${c.image_url || ''}" alt="${c.name}" />
          <div class="content">
            <h4 style="margin:0;font-size:14px;text-align:center">${c.name}</h4>
          </div>
        `;
        card.onclick = async ()=>{
          if(categoryFilter){ categoryFilter.value = c.id; }
          if(subcategoryFilter){ subcategoryFilter.value = ''; }
          categoryFilter?.dispatchEvent(new Event('change'));
          await load();
          categoriesList.scrollIntoView({behavior:'smooth', block:'start'});
        };
        categoriesList.appendChild(card);
      }
    }
  }

  async function loadSubcategories(parentId){
    if(!subcategoryFilter) return;
    subcategoryFilter.innerHTML = '<option value="">كل الفئات</option>';
    if(!parentId) return;
    const { data, error } = await sb.from('subcategories').select('id,name').eq('category_id', parentId).order('name');
    if(error){ console.warn('subcategories error', error); return; }
    for(const s of (data||[])){
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name; subcategoryFilter.appendChild(opt);
    }
  }

  function renderProducts(list){
    grid.innerHTML = '';
    if(!list || !list.length){ grid.innerHTML = '<p>لا توجد منتجات.</p>'; return; }
    for(const p of list){
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <img src="${p.image_url || ''}" alt="${p.name}" />
        <div class="content">
          <div class="badge">${[p.category_name, p.subcategory_name].filter(Boolean).join(' • ')}</div>
          <h3>${p.name}</h3>
          <div class="price">${Number(p.price).toFixed(2)} ر.س</div>
          <div class="actions">
            <a class="btn outline" href="product.html?id=${p.id}">التفاصيل</a>
            <button class="btn primary" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-img="${p.image_url || ''}" data-stock="${typeof p.stock==='number'? p.stock : ''}">أضف للسلة</button>
          </div>
        </div>`;
      grid.appendChild(el);
      // عطّل الزر إذا المخزون صفر
      const btn = el.querySelector('button.btn.primary');
      const stock = typeof p.stock==='number' ? p.stock : null;
      if(stock === 0){ btn.disabled = true; btn.textContent = 'غير متوفر'; }
    }
    grid.querySelectorAll('button.btn.primary').forEach(btn=>{
      btn.onclick = ()=>{
        const stock = btn.dataset.stock === '' ? null : Number(btn.dataset.stock);
        if(stock === 0){ alert('المنتج غير متوفر حالياً'); return; }
        const item = { id: btn.dataset.id, name: btn.dataset.name, price: Number(btn.dataset.price), image: btn.dataset.img, qty:1, stock };
        const cart = JSON.parse(localStorage.getItem('cart')||'[]');
        const existing = cart.find(i=>String(i.id)===String(item.id));
        if(existing){
          const currentStock = typeof existing.stock==='number' ? existing.stock : stock;
          if(typeof currentStock === 'number' && existing.qty >= currentStock){
            alert('لا يمكن إضافة كمية أكثر من المتوفر في المخزون');
            return;
          }
          existing.qty += 1;
          if(existing.stock == null && stock != null) existing.stock = stock;
        } else {
          cart.push(item);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        alert('تمت الإضافة للسلة');
      };
    });
  }

  function buildQuery(){
    let query = sb.from('products').select('id,name,price,stock,image_url,category_id,subcategory_id');
    const term = (searchInput?.value||'').trim();
    const cat = categoryFilter?.value;
    const sub = subcategoryFilter?.value;
    const sort = sortFilter?.value || 'new';
    if(term){
      query = query.ilike('name', `%${term}%`);
    }
    if(cat){
      query = query.eq('category_id', cat);
    }
    if(sub){
      query = query.eq('subcategory_id', sub);
    }
    if(sort==='price_asc') query = query.order('price', {ascending:true});
    else if(sort==='price_desc') query = query.order('price', {ascending:false});
    else query = query.order('created_at', {ascending:false});
    return query;
  }

  async function load(){
    const { data, error } = await buildQuery();
    if(error){ console.error(error); grid.innerHTML = '<p>حدث خطأ في جلب المنتجات</p>'; return; }
    // جلب أسماء التصنيفات والفئات في دفعة واحدة
    const catIds = [...new Set((data||[]).map(p=>p.category_id).filter(Boolean))];
    const subIds = [...new Set((data||[]).map(p=>p.subcategory_id).filter(Boolean))];
    let cats = [];
    if(catIds.length){
      const { data: c } = await sb.from('categories').select('id,name').in('id', catIds);
      cats = c||[];
    }
    let subs = [];
    if(subIds.length){
      const { data: s } = await sb.from('subcategories').select('id,name').in('id', subIds);
      subs = s||[];
    }
    const withNames = (data||[]).map(p=>({
      ...p,
      category_name: cats.find(c=>c.id===p.category_id)?.name || '',
      subcategory_name: subs.find(sc=>sc.id===p.subcategory_id)?.name || ''
    }));
    renderProducts(withNames);
  }

  searchBtn?.addEventListener('click', load);
  searchInput?.addEventListener('keydown', e=>{ if(e.key==='Enter') load(); });
  categoryFilter?.addEventListener('change', load);
  categoryFilter?.addEventListener('change', (e)=>{
    loadSubcategories(e.target.value);
    // إعادة ضبط الفئة عند تغيير التصنيف
    if(subcategoryFilter){ subcategoryFilter.value = ''; }
  });
  subcategoryFilter?.addEventListener('change', load);
  sortFilter?.addEventListener('change', load);

  (async function init(){
    await loadCategories();
    await loadSubcategories(categoryFilter?.value);
    await load();
  })();
})();

// سلايدر الهيرو بسيط وخفيف مع تحميل ديناميكي من Supabase
(async function(){
  const hero = document.querySelector('.hero');
  if(!hero) return;
  const slidesWrap = hero.querySelector('.hero-slides');
  // تحميل الشرائح من قاعدة البيانات إن وجدت
  try{
    if(window.sb){
      const { data, error } = await sb
        .from('hero_slides')
        .select('id,title,subtitle,btn_text,btn_link,image_url,sort_order,active')
        .eq('active', true)
        .order('sort_order', { ascending:true })
        .order('created_at', { ascending:false });
      if(!error && data && data.length){
        slidesWrap.innerHTML = data.map((s, i)=>`
          <div class="hero-slide${i===0? ' is-active':''}">
            <img src="${s.image_url || ''}" alt="${(s.title||'شريحة الهيرو')}" />
            <div class="hero-caption">
              ${s.title?`<h2>${s.title}</h2>`:''}
              ${s.subtitle?`<p>${s.subtitle}</p>`:''}
              ${(s.btn_text && (s.btn_link||'#'))?`<a class="btn primary" href="${s.btn_link}">${s.btn_text}</a>`:''}
            </div>
          </div>
        `).join('');
      }
    }
  }catch(err){ console.warn('hero slides fetch failed', err); }

  const slides = Array.from(hero.querySelectorAll('.hero-slide'));
  const prevBtn = hero.querySelector('.hero-nav.prev');
  const nextBtn = hero.querySelector('.hero-nav.next');
  const dotsWrap = hero.querySelector('.hero-dots');
  if(slides.length === 0){
    // لا توجد شرائح حالياً
    prevBtn?.classList.add('hidden');
    nextBtn?.classList.add('hidden');
    dotsWrap && (dotsWrap.innerHTML = '');
    return; // لا تتابع التهيئة
  }
  let index = Math.max(0, slides.findIndex(s=>s.classList.contains('is-active')));
  if(index < 0) index = 0;
  let timer = null;

  function buildDots(){
    dotsWrap.innerHTML = '';
    if(slides.length <= 1){
      // لا حاجة للنقاط
      return;
    }
    slides.forEach((_, i)=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role','tab');
      b.setAttribute('aria-label', `الذهاب إلى الشريحة ${i+1}`);
      if(i===index) b.setAttribute('aria-current','true');
      b.addEventListener('click', ()=> goTo(i));
      dotsWrap.appendChild(b);
    });
  }

  function updateActive(){
    slides.forEach((s,i)=>{
      if(i===index) s.classList.add('is-active'); else s.classList.remove('is-active');
    });
    Array.from(dotsWrap.children).forEach((d,i)=>{
      if(i===index) d.setAttribute('aria-current','true'); else d.removeAttribute('aria-current');
    });
  }

  function goTo(i){
    index = (i + slides.length) % slides.length;
    updateActive();
    restart();
  }

  function next(){ goTo(index+1); }
  function prev(){ goTo(index-1); }

  function start(){
    stop();
    if(slides.length > 1){
      timer = setInterval(next, 5000);
    }
  }
  function stop(){ if(timer){ clearInterval(timer); timer=null; } }
  function restart(){ start(); }

  // أحداث
  if(slides.length > 1){
    nextBtn?.addEventListener('click', next);
    prevBtn?.addEventListener('click', prev);
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
  } else {
    // إخفاء عناصر التحكم إن لم تكن هناك سوى شريحة واحدة
    prevBtn?.classList.add('hidden');
    nextBtn?.classList.add('hidden');
  }

  buildDots();
  updateActive();
  start();
})();
