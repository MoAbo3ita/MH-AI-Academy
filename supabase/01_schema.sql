-- =====================================================================
-- MH AI Academy — الخطوة 1: قاعدة البيانات والصلاحيات (Supabase / Postgres)
-- شغّله مرة واحدة من: SQL Editor → New query → Run
-- آمن لإعادة التشغيل (idempotent) في أغلب الأجزاء.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) الجداول
-- ---------------------------------------------------------------------

-- بيانات الطلاب والأدمن (مرتبطة بحسابات تسجيل الدخول)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  phone      text not null default '',
  grade      text check (grade is null or grade in ('الصف الأول الثانوي','الصف الثاني الثانوي')),
  role       text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

-- إعدادات عامة (أرقام الدفع والسعر الافتراضي)
create table if not exists public.settings (
  key   text primary key,
  value text not null
);
insert into public.settings (key, value) values
  ('instapay_number',      '01555109204'),
  ('wepay_number',         '01559160083'),
  ('default_lesson_price', '85')
on conflict (key) do nothing;

-- الحصص (البيانات العامة فقط: العنوان والسعر وهل هي مجانية)
create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null default '',
  grade            text not null default 'all' check (grade in ('all','الصف الأول الثانوي','الصف الثاني الثانوي')),
  is_free          boolean not null default false,
  price_egp        integer not null default 85 check (price_egp >= 0),
  is_published     boolean not null default false,
  sort_order       integer not null default 0,
  duration_minutes integer,
  created_at       timestamptz not null default now()
);

-- رابط/معرّف الفيديو في جدول منفصل: لا يقرأه إلا من له صلاحية (مجاني أو مدفوع أو أدمن)
create table if not exists public.lesson_media (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  provider  text not null default 'youtube' check (provider in ('youtube','vimeo','bunny','url')),
  video_ref text not null
);

-- ملفات PDF (الملف نفسه يُخزَّن في bucket خاص اسمه pdfs)
create table if not exists public.pdf_files (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  grade        text not null default 'all' check (grade in ('all','الصف الأول الثانوي','الصف الثاني الثانوي')),
  file_path    text not null unique,
  is_free      boolean not null default false,
  price_egp    integer not null default 85 check (price_egp >= 0),
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- طلبات الدفع (إنستا باي / WE Pay) — تُراجَع يدويًا من الأدمن
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_type       text not null check (item_type in ('lesson','pdf')),
  item_id         uuid not null,
  amount_egp      integer not null default 0,
  method          text not null check (method in ('instapay','wepay')),
  sender_phone    text not null check (sender_phone ~ '^01[0125][0-9]{8}$'),
  transaction_ref text not null default '',
  receipt_path    text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note      text not null default '',
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id),
  constraint orders_has_proof check (coalesce(receipt_path,'') <> '' or transaction_ref <> '')
);
-- طلب واحد معلّق فقط لكل طالب لكل عنصر، وموافقة واحدة فقط
create unique index if not exists orders_one_pending  on public.orders (user_id, item_type, item_id) where status = 'pending';
create unique index if not exists orders_one_approved on public.orders (user_id, item_type, item_id) where status = 'approved';
create index if not exists orders_status_idx on public.orders (status, created_at desc);

-- ---------------------------------------------------------------------
-- 2) الدوال
-- ---------------------------------------------------------------------

-- هل المستخدم الحالي أدمن؟ (الأدمن يُحدَّد بعمود role في قاعدة البيانات فقط)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- هل يحق للمستخدم الحالي فتح هذا العنصر؟ (مجاني ومنشور، أو دفع واتقبل، أو أدمن)
create or replace function public.has_access(p_type text, p_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_admin()
    or case p_type
      when 'lesson' then exists (
        select 1 from public.lessons l
        where l.id = p_id and l.is_published
          and (l.is_free or exists (
                select 1 from public.orders o
                where o.user_id = auth.uid() and o.item_type = 'lesson'
                  and o.item_id = p_id and o.status = 'approved'))
      )
      when 'pdf' then exists (
        select 1 from public.pdf_files f
        where f.id = p_id and f.is_published
          and (f.is_free or exists (
                select 1 from public.orders o
                where o.user_id = auth.uid() and o.item_type = 'pdf'
                  and o.item_id = p_id and o.status = 'approved'))
      )
      else false
    end
  );
$$;

-- إنشاء صف profile تلقائيًا عند تسجيل أي حساب جديد (الدور دائمًا student)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_grade text := nullif(new.raw_user_meta_data->>'grade', '');
begin
  insert into public.profiles (id, full_name, phone, grade)
  values (
    new.id,
    coalesce(trim(new.raw_user_meta_data->>'full_name'), ''),
    coalesce(trim(new.raw_user_meta_data->>'phone'), ''),
    case when v_grade in ('الصف الأول الثانوي','الصف الثاني الثانوي') then v_grade else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- منع أي طالب من ترقية نفسه لأدمن (التغيير مسموح فقط من SQL Editor أو من أدمن)
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'غير مسموح بتغيير الدور';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- عند إنشاء طلب: السيرفر هو من يحدد المبلغ والحالة (الطالب لا يتحكم فيهم)
create or replace function public.orders_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_price integer; v_free boolean; v_pub boolean;
begin
  if new.item_type = 'lesson' then
    select price_egp, is_free, is_published into v_price, v_free, v_pub from public.lessons where id = new.item_id;
  else
    select price_egp, is_free, is_published into v_price, v_free, v_pub from public.pdf_files where id = new.item_id;
  end if;

  if v_price is null or not v_pub then
    raise exception 'العنصر غير متاح';
  end if;
  if v_free then
    raise exception 'هذا العنصر مجاني ولا يحتاج دفع';
  end if;

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

drop trigger if exists orders_before_insert on public.orders;
create trigger orders_before_insert
  before insert on public.orders
  for each row execute function public.orders_before_insert();

-- عند تغيير حالة الطلب: سجّل وقت ومن راجعه
create or replace function public.orders_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_before_update on public.orders;
create trigger orders_before_update
  before update on public.orders
  for each row execute function public.orders_before_update();

-- ---------------------------------------------------------------------
-- 3) صلاحيات الصفوف (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.settings     enable row level security;
alter table public.lessons      enable row level security;
alter table public.lesson_media enable row level security;
alter table public.pdf_files    enable row level security;
alter table public.orders       enable row level security;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- settings: قراءة للجميع، تعديل للأدمن فقط
drop policy if exists "settings_select" on public.settings;
create policy "settings_select" on public.settings for select to anon, authenticated using (true);
drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write" on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- lessons: المنشور يظهر للجميع (بدون الفيديو)، والأدمن يرى ويعدّل كل شيء
drop policy if exists "lessons_select" on public.lessons;
create policy "lessons_select" on public.lessons for select to anon, authenticated
  using (is_published or public.is_admin());
drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write" on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- lesson_media: الفيديو لا يُقرأ إلا لمن له صلاحية
drop policy if exists "media_select" on public.lesson_media;
create policy "media_select" on public.lesson_media for select to authenticated
  using (public.has_access('lesson', lesson_id));
drop policy if exists "media_admin_write" on public.lesson_media;
create policy "media_admin_write" on public.lesson_media for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- pdf_files: بياناتها العامة تظهر للجميع، والملف نفسه محمي في Storage
drop policy if exists "pdf_select" on public.pdf_files;
create policy "pdf_select" on public.pdf_files for select to anon, authenticated
  using (is_published or public.is_admin());
drop policy if exists "pdf_admin_write" on public.pdf_files;
create policy "pdf_admin_write" on public.pdf_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- orders: الطالب يرى ويُنشئ طلباته فقط، والأدمن يرى ويراجع الكل
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4) التخزين (Storage): مخزن PDF ومخزن إيصالات الدفع — الاتنين خاص
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('pdfs',     'pdfs',     false, 52428800, array['application/pdf']),
  ('receipts', 'receipts', false, 5242880,  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- pdfs: القراءة لمن له صلاحية على الملف، والكتابة للأدمن فقط
drop policy if exists "pdfs_read" on storage.objects;
create policy "pdfs_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'pdfs' and (
      public.is_admin() or exists (
        select 1 from public.pdf_files f
        where f.file_path = storage.objects.name and public.has_access('pdf', f.id)
      )
    )
  );
drop policy if exists "pdfs_admin_insert" on storage.objects;
create policy "pdfs_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'pdfs' and public.is_admin());
drop policy if exists "pdfs_admin_update" on storage.objects;
create policy "pdfs_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'pdfs' and public.is_admin()) with check (bucket_id = 'pdfs' and public.is_admin());
drop policy if exists "pdfs_admin_delete" on storage.objects;
create policy "pdfs_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pdfs' and public.is_admin());

-- receipts: الطالب يرفع ويقرأ إيصالاته فقط (داخل فولدر باسم رقم حسابه)، والأدمن يقرأ الكل
drop policy if exists "receipts_insert_own" on storage.objects;
create policy "receipts_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "receipts_read" on storage.objects;
create policy "receipts_read" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "receipts_admin_delete" on storage.objects;
create policy "receipts_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_admin());

-- ---------------------------------------------------------------------
-- 5) صلاحيات الـ Data API
--    (لأن خيار "Automatically expose new tables" متعطّل عند إنشاء المشروع، نمنح الصلاحيات يدويًا.
--     الحماية الفعلية تأتي من سياسات RLS بالأعلى؛ هذه الأوامر فقط تسمح للـ API بالوصول للجداول.)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- الزائر غير المسجل: يقرأ فقط (والسياسات تحدد المنشور فقط)
grant select on public.settings, public.lessons, public.pdf_files to anon;

-- المسجّل (طالب أو أدمن): والسياسات تمنع الطالب من أي كتابة غير مسموحة
grant select, insert, update, delete on
  public.settings, public.lessons, public.lesson_media, public.pdf_files, public.orders
  to authenticated;
grant select, update on public.profiles to authenticated;

grant execute on function public.is_admin(), public.has_access(text, uuid) to anon, authenticated;

-- =====================================================================
-- فحص سريع بعد التشغيل (اختياري، شغّله لوحده):
--   select key, value from public.settings;          -- لازم يرجّع 3 صفوف
--   select id, public from storage.buckets;          -- pdfs و receipts، public = false
-- =====================================================================
