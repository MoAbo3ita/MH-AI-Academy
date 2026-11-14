-- =====================================================================
-- MH AI Academy — الخطوة 4: التحكم الكامل في الموقع + الخطط + الحصة الهجينة + فيديو Drive
-- شغّله بعد 01 و02 و03: SQL Editor → New query → الصق → Run
-- آمن لإعادة التشغيل (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) الحصة الهجينة: تُشترى فرديًا ومفتوحة للمشتركين في نفس الوقت
--    allow_purchase = هل يقدر الطالب يشتريها لوحدها؟ (مع for_subscribers = مفتوحة للمشتركين)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lessons' and column_name = 'allow_purchase') then
    alter table public.lessons add column allow_purchase boolean not null default true;
    update public.lessons set allow_purchase = false where for_subscribers;   -- اللي كانت "للمشتركين فقط" تفضل كده
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pdf_files' and column_name = 'allow_purchase') then
    alter table public.pdf_files add column allow_purchase boolean not null default true;
    update public.pdf_files set allow_purchase = false where for_subscribers;
  end if;
end $$;

-- السيرفر يمنع شراء المحتوى المخصص للمشتركين فقط
create or replace function public.orders_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_price integer; v_free boolean; v_pub boolean; v_allow boolean;
begin
  if new.item_type = 'lesson' then
    select price_egp, is_free, is_published, allow_purchase into v_price, v_free, v_pub, v_allow from public.lessons where id = new.item_id;
  else
    select price_egp, is_free, is_published, allow_purchase into v_price, v_free, v_pub, v_allow from public.pdf_files where id = new.item_id;
  end if;

  if v_price is null or not v_pub then raise exception 'العنصر غير متاح'; end if;
  if v_free then raise exception 'هذا العنصر مجاني ولا يحتاج دفع'; end if;
  if not v_allow and not public.is_admin() then raise exception 'هذا المحتوى متاح للمشتركين فقط'; end if;

  new.amount_egp := v_price;
  if not public.is_admin() then
    new.user_id     := auth.uid();
    new.status      := 'pending';
    new.admin_note  := '';
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) فيديوهات Google Drive
-- ---------------------------------------------------------------------
alter table public.lesson_media drop constraint if exists lesson_media_provider_check;
alter table public.lesson_media add constraint lesson_media_provider_check
  check (provider in ('youtube','vimeo','bunny','drive','url'));

-- ---------------------------------------------------------------------
-- 3) الخطط (أسعار الاشتراك وأي باقات تعرضها في صفحة الأسعار)
--    kind = subscription: الطالب يقدر يشتريها من صفحة الاشتراك | info: عرض فقط (تواصل واتساب)
-- ---------------------------------------------------------------------
create table if not exists public.plans (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 2 and 80),
  grade      text not null default 'all' check (grade in ('all','الصف الأول الثانوي','الصف الثاني الثانوي')),
  kind       text not null default 'subscription' check (kind in ('subscription','info')),
  price_egp  integer not null default 0 check (price_egp >= 0),
  months     integer not null default 1 check (months between 1 and 12),
  details    text not null default '' check (char_length(details) <= 1500),
  cta_label  text not null default '' check (char_length(cta_label) <= 60),
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;
drop policy if exists "plans_select" on public.plans;
create policy "plans_select" on public.plans for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "plans_admin_write" on public.plans;
create policy "plans_admin_write" on public.plans for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- خطط افتراضية (مرة واحدة فقط لو الجدول فاضي) بنفس الأسعار الحالية
insert into public.plans (name, grade, kind, price_egp, months, details, sort_order)
select x.* from (values
  ('الصف الأول الثانوي', 'الصف الأول الثانوي', 'subscription', 150, 1,
    E'نوع المجموعات: برايفت (حسب الاتفاق)\nطريقة الحصص: أونلاين أو أوفلاين حسب الاتفاق\nالمواعيد: حسب الاتفاق', 1),
  ('الصف الثاني الثانوي', 'الصف الثاني الثانوي', 'subscription', 180, 1,
    E'نوع المجموعات: برايفت (حسب الاتفاق)\nطريقة الحصص: أونلاين أو أوفلاين حسب الاتفاق\nالمواعيد: حسب الاتفاق', 2)
) as x(name, grade, kind, price_egp, months, details, sort_order)
where not exists (select 1 from public.plans);

-- طلب الاشتراك يتربط بخطة، والسيرفر هو اللي يحدد السعر والمدة من الخطة
alter table public.subscriptions add column if not exists plan_id uuid references public.plans(id) on delete set null;

create or replace function public.subscriptions_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_plan public.plans%rowtype; v_price integer; v_months integer;
begin
  if new.plan_id is not null then
    select * into v_plan from public.plans where id = new.plan_id;
    if not found or v_plan.kind <> 'subscription' then raise exception 'الخطة غير متاحة'; end if;
    if not public.is_admin() then
      if not v_plan.is_active then raise exception 'الخطة غير متاحة'; end if;
      if v_plan.grade <> 'all' and v_plan.grade <> new.grade then raise exception 'هذه الخطة مخصصة لصف آخر'; end if;
    end if;
    v_price := v_plan.price_egp; v_months := v_plan.months;
  else
    if not public.is_admin() then raise exception 'اختر خطة اشتراك'; end if;
    select nullif(value, '')::integer into v_price from public.settings
     where key = case when new.grade = 'الصف الأول الثانوي' then 'sub_price_g1' else 'sub_price_g2' end;
    v_months := new.months;
    v_price := coalesce(v_price, 0) * v_months;
  end if;

  new.amount_egp := v_price;
  new.months := v_months;
  if not public.is_admin() then
    if public.registration_mode() <> 'subscription' then raise exception 'الاشتراك غير متاح حاليًا'; end if;
    new.user_id := auth.uid();
    new.status := 'pending'; new.admin_note := ''; new.reviewed_at := null; new.reviewed_by := null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4) محتوى الموقع القابل للتعديل
--    site_content: نصوص الصفحات (مفتاح ← نص) | site_items: قوائم (الأسئلة الشائعة، المنهج)
-- ---------------------------------------------------------------------
create table if not exists public.site_content (
  key        text primary key check (char_length(key) <= 120),
  value      text not null check (char_length(value) <= 5000),
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
drop policy if exists "site_content_select" on public.site_content;
create policy "site_content_select" on public.site_content for select to anon, authenticated using (true);
drop policy if exists "site_content_admin_write" on public.site_content;
create policy "site_content_admin_write" on public.site_content for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.site_items (
  id         uuid primary key default gen_random_uuid(),
  collection text not null check (collection in ('faq','curriculum_g1','curriculum_g2')),
  title      text not null check (char_length(trim(title)) between 1 and 300),
  body       text not null default '' check (char_length(body) <= 3000),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists site_items_coll_idx on public.site_items (collection, sort_order);
alter table public.site_items enable row level security;
drop policy if exists "site_items_select" on public.site_items;
create policy "site_items_select" on public.site_items for select to anon, authenticated using (is_visible or public.is_admin());
drop policy if exists "site_items_admin_write" on public.site_items;
create policy "site_items_admin_write" on public.site_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- أرقام التواصل (تتطبق على كل لينكات الواتساب والاتصال في الموقع)
insert into public.settings (key, value) values
  ('contact_whatsapp', '201555109204'),
  ('contact_phone',    '01559160083')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 5) صلاحيات الـ Data API
-- ---------------------------------------------------------------------
grant select on public.plans, public.site_content, public.site_items to anon;
grant select, insert, update, delete on public.plans, public.site_content, public.site_items to authenticated;

-- فحص سريع (اختياري، شغّله لوحده):
--   select name, price_egp, months from public.plans order by sort_order;   -- لازم يظهر خطتين 150 و180
