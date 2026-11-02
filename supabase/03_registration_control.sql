-- =====================================================================
-- MH AI Academy — الخطوة 3: التحكم في التسجيل + الاشتراك + رقم ولي الأمر
-- شغّله مرة واحدة بعد 01_schema.sql و 02_make_admin.sql
-- SQL Editor → New query → الصق → Run
-- آمن لإعادة التشغيل (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) أعمدة جديدة
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists parent_phone text not null default '';
alter table public.profiles add column if not exists subscribed_until timestamptz;
alter table public.profiles drop constraint if exists profiles_parent_phone_chk;
alter table public.profiles add constraint profiles_parent_phone_chk
  check (parent_phone = '' or parent_phone ~ '^01[0125][0-9]{8}$');

-- محتوى "للمشتركين فقط" (حصص وملفات)
alter table public.lessons   add column if not exists for_subscribers boolean not null default false;
alter table public.pdf_files add column if not exists for_subscribers boolean not null default false;

-- ---------------------------------------------------------------------
-- 2) إعدادات جديدة (تُعدَّل من لوحة الأدمن)
-- ---------------------------------------------------------------------
insert into public.settings (key, value) values
  ('registration_mode',           'registration'),
  ('registration_closed_message', 'التسجيل مقفول حاليًا. كلّمنا على واتساب لمعرفة موعد فتح التسجيل.'),
  ('sub_price_g1',                '150'),
  ('sub_price_g2',                '180'),
  ('group_link_g1',               'https://chat.whatsapp.com/C5kl92G677i5lQENQvPwog?s=cl&p=a&mlu=0'),
  ('group_link_g2',               'https://chat.whatsapp.com/KJQ2icjzhzjIJrqAW7MBNj?s=cl&p=a&mlu=0')
on conflict (key) do nothing;

-- حالة التسجيل: registration (تسجيل عادي) | subscription (اشتراك) | closed (مقفول)
alter table public.settings drop constraint if exists settings_mode_chk;
alter table public.settings add constraint settings_mode_chk
  check (key <> 'registration_mode' or value in ('registration','subscription','closed'));

-- ---------------------------------------------------------------------
-- 3) الدوال
-- ---------------------------------------------------------------------
create or replace function public.registration_mode()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select value from public.settings where key = 'registration_mode'), 'registration');
$$;

create or replace function public.is_subscribed()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select subscribed_until > now() from public.profiles where id = auth.uid()), false);
$$;

-- الوصول: مجاني | للمشتركين (واشتراكه ساري) | طلب مدفوع اتقبل | أدمن
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
          and (l.is_free
               or (l.for_subscribers and public.is_subscribed())
               or exists (select 1 from public.orders o
                          where o.user_id = auth.uid() and o.item_type = 'lesson'
                            and o.item_id = p_id and o.status = 'approved'))
      )
      when 'pdf' then exists (
        select 1 from public.pdf_files f
        where f.id = p_id and f.is_published
          and (f.is_free
               or (f.for_subscribers and public.is_subscribed())
               or exists (select 1 from public.orders o
                          where o.user_id = auth.uid() and o.item_type = 'pdf'
                            and o.item_id = p_id and o.status = 'approved'))
      )
      else false
    end
  );
$$;

-- إنشاء البروفايل عند التسجيل (يحفظ رقم ولي الأمر لو صحيح)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_grade  text := nullif(new.raw_user_meta_data->>'grade', '');
  v_parent text := coalesce(trim(new.raw_user_meta_data->>'parent_phone'), '');
begin
  insert into public.profiles (id, full_name, phone, parent_phone, grade)
  values (
    new.id,
    coalesce(trim(new.raw_user_meta_data->>'full_name'), ''),
    coalesce(trim(new.raw_user_meta_data->>'phone'), ''),
    case when v_parent ~ '^01[0125][0-9]{8}$' then v_parent else '' end,
    case when v_grade in ('الصف الأول الثانوي','الصف الثاني الثانوي') then v_grade else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- منع الطالب من تغيير دوره أو تاريخ اشتراكه بنفسه
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'غير مسموح بتغيير الدور';
    end if;
    if new.subscribed_until is distinct from old.subscribed_until then
      raise exception 'غير مسموح بتغيير الاشتراك';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4) جدول التسجيلات (الصفحة العامة للتسجيل) — بدل Google Sheet
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null check (char_length(trim(full_name)) between 3 and 100),
  phone        text not null check (phone ~ '^01[0125][0-9]{8}$'),
  parent_phone text not null check (parent_phone ~ '^01[0125][0-9]{8}$'),
  grade        text not null check (grade in ('الصف الأول الثانوي','الصف الثاني الثانوي')),
  created_at   timestamptz not null default now()
);
create unique index if not exists registrations_phone_grade on public.registrations (phone, grade);
create index if not exists registrations_created_idx on public.registrations (created_at desc);

alter table public.registrations enable row level security;
drop policy if exists "registrations_insert_open" on public.registrations;
create policy "registrations_insert_open" on public.registrations for insert to anon, authenticated
  with check (public.registration_mode() = 'registration');
drop policy if exists "registrations_admin_all" on public.registrations;
create policy "registrations_admin_all" on public.registrations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 5) طلبات الاشتراك (تُراجَع يدويًا من الأدمن)
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  grade           text not null check (grade in ('الصف الأول الثانوي','الصف الثاني الثانوي')),
  months          integer not null default 1 check (months between 1 and 12),
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
  constraint subscriptions_has_proof check (coalesce(receipt_path,'') <> '' or transaction_ref <> '')
);
create unique index if not exists subscriptions_one_pending on public.subscriptions (user_id) where status = 'pending';
create index if not exists subscriptions_status_idx on public.subscriptions (status, created_at desc);

-- السعر والحالة يحددهم السيرفر (الطالب لا يتحكم فيهم)
create or replace function public.subscriptions_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_price integer;
begin
  select nullif(value, '')::integer into v_price from public.settings
   where key = case when new.grade = 'الصف الأول الثانوي' then 'sub_price_g1' else 'sub_price_g2' end;
  if v_price is null then raise exception 'سعر الاشتراك غير محدد'; end if;
  new.amount_egp := v_price * new.months;
  if not public.is_admin() then
    if public.registration_mode() <> 'subscription' then
      raise exception 'الاشتراك غير متاح حاليًا';
    end if;
    new.user_id := auth.uid();
    new.months := 1;
    new.amount_egp := v_price;
    new.status := 'pending'; new.admin_note := ''; new.reviewed_at := null; new.reviewed_by := null;
  end if;
  return new;
end;
$$;
drop trigger if exists subscriptions_before_insert on public.subscriptions;
create trigger subscriptions_before_insert before insert on public.subscriptions
  for each row execute function public.subscriptions_before_insert();

alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "subscriptions_insert" on public.subscriptions;
create policy "subscriptions_insert" on public.subscriptions for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write" on public.subscriptions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "subscriptions_admin_delete" on public.subscriptions;
create policy "subscriptions_admin_delete" on public.subscriptions for delete to authenticated
  using (public.is_admin());

-- مراجعة طلب اشتراك: القبول بيمدّ اشتراك الطالب تلقائيًا (مرة واحدة فقط لكل طلب)
create or replace function public.review_subscription(p_id uuid, p_status text, p_note text default '', p_months integer default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare s public.subscriptions%rowtype; m integer;
begin
  if not public.is_admin() then raise exception 'غير مسموح'; end if;
  if p_status not in ('approved','rejected') then raise exception 'حالة غير صحيحة'; end if;
  select * into s from public.subscriptions where id = p_id for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  if s.status <> 'pending' then raise exception 'تمت مراجعة هذا الطلب من قبل'; end if;
  m := coalesce(p_months, s.months);
  if m < 1 or m > 12 then raise exception 'عدد الشهور غير صحيح'; end if;
  update public.subscriptions
     set status = p_status, admin_note = coalesce(p_note, ''), months = m, reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_id;
  if p_status = 'approved' then
    update public.profiles
       set subscribed_until = greatest(coalesce(subscribed_until, now()), now()) + make_interval(months => m),
           grade = coalesce(grade, s.grade)
     where id = s.user_id;
  end if;
end;
$$;

-- منح/تمديد اشتراك يدويًا (مثلًا دفع كاش)، وإلغاؤه
create or replace function public.grant_subscription(p_user uuid, p_months integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'غير مسموح'; end if;
  if p_months < 1 or p_months > 12 then raise exception 'عدد الشهور غير صحيح'; end if;
  update public.profiles
     set subscribed_until = greatest(coalesce(subscribed_until, now()), now()) + make_interval(months => p_months)
   where id = p_user;
end;
$$;

create or replace function public.revoke_subscription(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'غير مسموح'; end if;
  update public.profiles set subscribed_until = null where id = p_user;
end;
$$;

-- ---------------------------------------------------------------------
-- 6) صلاحيات الـ Data API
-- ---------------------------------------------------------------------
grant insert on public.registrations to anon, authenticated;
grant select, update, delete on public.registrations to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant execute on function public.registration_mode(), public.is_subscribed() to anon, authenticated;
grant execute on function public.review_subscription(uuid, text, text, integer),
                          public.grant_subscription(uuid, integer),
                          public.revoke_subscription(uuid) to authenticated;

-- فحص سريع (اختياري، شغّله لوحده):
--   select key, value from public.settings order by key;     -- لازم يظهر registration_mode = registration
--   select public.registration_mode();
