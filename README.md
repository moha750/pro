-- إضافة عمود صورة للتصنيفات إذا لم يكن موجودًا
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='categories' and column_name='image_url'
  ) then
    alter table public.categories add column image_url text;
  end if;
end $$;
# متجر العطور والشنط ومستحضرات التجميل (HTML/CSS/JS + Supabase)

واجهة عربية (RTL) مع لوحة تحكم وربط Supabase لإدارة المنتجات والطلبات. يعمل كصفحات ثابتة بدون أي باك-إند.

## المتطلبات
- حساب Supabase ومشروع مفعّل.
- إنشاء Bucket للتخزين باسم: `product-images` (لصور المنتجات).
- مفاتيح Supabase:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY

ضع المفاتيح في `config/config.js` (تم تهيئته مسبقًا).

## تشغيل محلي
- افتح `index.html` مباشرة في المتصفح أو عبر أي خادم محلي بسيط.
- لوحة التحكم على: `admin/index.html`.

## إعداد Supabase
1) إنشاء الجداول/الأعمدة التالية عبر SQL في Supabase (SQL Editor):

```sql
-- جدول التصنيفات
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  image_url text
);

-- جدول المنتجات
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  category_id bigint references public.categories(id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_created_at on public.products(created_at desc);

-- جدول الفئات (فرعي تحت التصنيف الأب)
create table if not exists public.subcategories (
  id bigint generated always as identity primary key,
  name text not null,
  category_id bigint not null references public.categories(id) on delete cascade,
  unique(name, category_id)
);

create index if not exists idx_subcategories_category on public.subcategories(category_id);

-- إضافة عمود الربط للفئات الفرعية على المنتجات (اختياري)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='subcategory_id'
  ) then
    alter table public.products add column subcategory_id bigint references public.subcategories(id) on delete set null;
    create index if not exists idx_products_subcategory on public.products(subcategory_id);
  end if;
end $$;

-- جدول الطلبات
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  customer_name text,
  phone text,
  total numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamp with time zone default now()
);

-- عناصر الطلب
create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete restrict,
  quantity int not null default 1,
  unit_price numeric(10,2) not null default 0
);

create index if not exists idx_order_items_order on public.order_items(order_id);
```

2) التخزين (Storage):
- أنشئ Bucket باسم `product-images`.
- فعّل الوصول العام للقراءة (Public) أو استخدم سياسة RLS مناسبة.
- تُرفع صور المنتجات والتصنيفات إلى نفس الـ Bucket (`product-images`).

3) سياسات RLS (اختياري للتجربة السريعة):
- يمكنك إبقاء الجداول بدون RLS أثناء التطوير أو إضافة سياسات تسمح بالقراءة العامة والكتابة لبعض الجداول في الوضع التجريبي. في الإنتاج يجب تضييق الصلاحيات.

أمثلة سياسات تطوير سريعة:

```sql
-- تفعيل RLS
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;

-- تصنيفات (categories)
drop policy if exists "Public select categories" on public.categories;
drop policy if exists "Anon insert categories" on public.categories;
drop policy if exists "Anon update categories" on public.categories;
drop policy if exists "Anon delete categories" on public.categories;
create policy "Public select categories" on public.categories for select to public using (true);
create policy "Anon insert categories" on public.categories for insert to anon with check (true);
create policy "Anon update categories" on public.categories for update to anon using (true) with check (true);
create policy "Anon delete categories" on public.categories for delete to anon using (true);

-- الفئات الفرعية (subcategories)
drop policy if exists "Public select subcategories" on public.subcategories;
drop policy if exists "Anon insert subcategories" on public.subcategories;
drop policy if exists "Anon update subcategories" on public.subcategories;
drop policy if exists "Anon delete subcategories" on public.subcategories;
create policy "Public select subcategories" on public.subcategories for select to public using (true);
create policy "Anon insert subcategories" on public.subcategories for insert to anon with check (true);
create policy "Anon update subcategories" on public.subcategories for update to anon using (true) with check (true);
create policy "Anon delete subcategories" on public.subcategories for delete to anon using (true);

-- المنتجات (products)
drop policy if exists "Public select products" on public.products;
drop policy if exists "Anon insert products" on public.products;
drop policy if exists "Anon update products" on public.products;
drop policy if exists "Anon delete products" on public.products;
create policy "Public select products" on public.products for select to public using (true);
create policy "Anon insert products" on public.products for insert to anon with check (true);
create policy "Anon update products" on public.products for update to anon using (true) with check (true);
create policy "Anon delete products" on public.products for delete to anon using (true);
```

## البنية
- `index.html`: الصفحة الرئيسية لعرض المنتجات والتصنيفات والبحث.
  - تشمل مرشح التصنيف الأب ومرشح الفئة.
- `product.html`: صفحة تفاصيل المنتج.
- `cart.html`: سلة المشتريات (localStorage).
- `assets/css/styles.css`: الأنماط مع دعم RTL وتصميم متجاوب.
- `assets/js/app.js`: منطق الواجهة للمتجر.
- `assets/js/cart.js`: إدارة السلة وحساب الإجمالي.
- `assets/js/supabaseClient.js`: تهيئة عميل Supabase.
- `config/config.js`: مفاتيح Supabase.
- `admin/index.html`: لوحة التحكم لإدارة التصنيفات والفئات والمنتجات.
- `admin/admin.js`: وظائف CRUD للتصنيفات والفئات والمنتجات ورفع الصور إلى Storage.

## ملاحظات
- السكربتات تستخدم CDN لـ `@supabase/supabase-js@2`.
- عند رفع صورة منتج من لوحة التحكم، يتم رفعها إلى `product-images` وإسناد `image_url` للمنتج.
- السلة لا تنشئ طلبات فعلية في قاعدة البيانات في هذا الإصدار. يمكن إضافة إنشاء Order و Order Items لاحقًا.
