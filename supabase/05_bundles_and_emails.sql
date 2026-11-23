-- =====================================================================
-- MH AI Academy — الخطوة 5: الباقة (حصة + ملف) + إشعارات الإيميل
-- شغّله بعد 01 و02 و03 و04: SQL Editor → New query → الصق → Run
-- آمن لإعادة التشغيل (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) الباقة: الحصة تتربط بملف وسعر باقة (الطالب يختار: الحصة / الملف / الاتنين)
-- ---------------------------------------------------------------------
alter table public.lessons add column if not exists pdf_id uuid references public.pdf_files(id) on delete set null;
alter table public.lessons add column if not exists bundle_price_egp integer check (bundle_price_egp is null or bundle_price_egp >= 0);

alter table public.orders drop constraint if exists orders_item_type_check;
alter table public.orders add constraint orders_item_type_check check (item_type in ('lesson','pdf','bundle'));

-- السيرفر يحدد السعر: bundle = سعر الباقة (item_id = رقم الحصة)
create or replace function public.orders_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_price integer; v_free boolean; v_pub boolean; v_allow boolean; v_pdf uuid; v_pdf_pub boolean;
begin
  if new.item_type = 'lesson' then
    select price_egp, is_free, is_published, allow_purchase into v_price, v_free, v_pub, v_allow from public.lessons where id = new.item_id;
  elsif new.item_type = 'pdf' then
    select price_egp, is_free, is_published, allow_purchase into v_price, v_free, v_pub, v_allow from public.pdf_files where id = new.item_id;
  else
    select l.bundle_price_egp, l.is_free, l.is_published, l.allow_purchase, l.pdf_id into v_price, v_free, v_pub, v_allow, v_pdf
      from public.lessons l where l.id = new.item_id;
    if v_pdf is null or v_price is null then raise exception 'لا توجد باقة لهذه الحصة'; end if;
    select is_published into v_pdf_pub from public.pdf_files where id = v_pdf;
    if not coalesce(v_pdf_pub, false) then raise exception 'ملف الباقة غير متاح'; end if;
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

-- الوصول: مجاني | للمشتركين | طلب اتقبل (فردي أو باقة) | أدمن
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
                          where o.user_id = auth.uid() and o.status = 'approved'
                            and o.item_type in ('lesson','bundle') and o.item_id = p_id))
      )
      when 'pdf' then exists (
        select 1 from public.pdf_files f
        where f.id = p_id and f.is_published
          and (f.is_free
               or (f.for_subscribers and public.is_subscribed())
               or exists (select 1 from public.orders o
                          where o.user_id = auth.uid() and o.item_type = 'pdf'
                            and o.item_id = p_id and o.status = 'approved')
               or exists (select 1 from public.orders o join public.lessons l on l.id = o.item_id
                          where o.user_id = auth.uid() and o.item_type = 'bundle'
                            and o.status = 'approved' and l.pdf_id = p_id))
      )
      else false
    end
  );
$$;

-- ---------------------------------------------------------------------
-- 2) إشعارات الإيميل عبر Google Apps Script
--    الداتابيز بتبعت "حدث" (HTTP) لسكربت جوجل، والسكربت هو اللي يبعت الإيميل.
--    الإعدادات السرية في جدول خاص (مش ظاهر لأي API).
-- ---------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.config (key text primary key, value text not null);
revoke all on private.config from public, anon, authenticated;
insert into private.config (key, value) values ('site_url', 'https://mh-ai-academy.vercel.app')
on conflict (key) do nothing;
-- بعد ما تنشر السكربت، شغّل (مرة واحدة) السطرين دول بقيمك:
--   insert into private.config (key, value) values ('mail_webhook_url', 'https://script.google.com/macros/s/XXXX/exec')
--     on conflict (key) do update set value = excluded.value;
--   insert into private.config (key, value) values ('mail_secret', 'اكتب-كلمة-سر-طويلة-عشوائية')
--     on conflict (key) do update set value = excluded.value;

-- إرسال حدث: لو الإعدادات ناقصة أو حصل خطأ، ما بيوقّفش العملية الأصلية (تسجيل/طلب/قبول)
create or replace function private.notify(p_event text, p_payload jsonb)
returns void
language plpgsql security definer set search_path = public, private, extensions
as $$
declare v_url text; v_secret text; v_site text;
begin
  select value into v_url    from private.config where key = 'mail_webhook_url';
  select value into v_secret from private.config where key = 'mail_secret';
  select value into v_site   from private.config where key = 'site_url';
  if coalesce(v_url,'') = '' or coalesce(v_secret,'') = '' then return; end if;
  perform net.http_post(
    url := v_url,
    body := p_payload || jsonb_build_object('event', p_event, 'secret', v_secret, 'site_url', coalesce(v_site,'')),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 8000);
exception when others then
  raise warning 'notify failed: %', sqlerrm;
end;
$$;
revoke all on function private.notify(text, jsonb) from public, anon, authenticated;

create or replace function private.student_json(p_user uuid)
returns jsonb
language sql stable security definer set search_path = public, private
as $$
  select jsonb_build_object('name', coalesce(p.full_name,''), 'phone', coalesce(p.phone,''),
                            'parent_phone', coalesce(p.parent_phone,''), 'grade', coalesce(p.grade,''),
                            'email', coalesce(u.email,''))
    from auth.users u left join public.profiles p on p.id = u.id where u.id = p_user;
$$;
revoke all on function private.student_json(uuid) from public, anon, authenticated;

-- محتويات الطلب: حصة و/أو ملف (مع مسار الملف عشان السكربت يرفقه)
create or replace function private.order_items(p_type text, p_item uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, private
as $$
declare v_l public.lessons%rowtype; v_f public.pdf_files%rowtype; r jsonb := '[]'::jsonb;
begin
  if p_type in ('lesson','bundle') then
    select * into v_l from public.lessons where id = p_item;
    if found then r := r || jsonb_build_array(jsonb_build_object('kind','lesson','title',v_l.title)); end if;
    if p_type = 'bundle' and v_l.pdf_id is not null then
      select * into v_f from public.pdf_files where id = v_l.pdf_id;
      if found then r := r || jsonb_build_array(jsonb_build_object('kind','pdf','title',v_f.title,'path',v_f.file_path)); end if;
    end if;
  else
    select * into v_f from public.pdf_files where id = p_item;
    if found then r := jsonb_build_array(jsonb_build_object('kind','pdf','title',v_f.title,'path',v_f.file_path)); end if;
  end if;
  return r;
end;
$$;
revoke all on function private.order_items(text, uuid) from public, anon, authenticated;

-- (أ) تسجيل جديد من صفحة التسجيل العامة → إيميل للأدمن
create or replace function private.on_registration()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  perform private.notify('registration', jsonb_build_object('registration',
    jsonb_build_object('name', new.full_name, 'phone', new.phone, 'parent_phone', new.parent_phone, 'grade', new.grade)));
  return new;
end; $$;
drop trigger if exists notify_registration on public.registrations;
create trigger notify_registration after insert on public.registrations for each row execute function private.on_registration();

-- (ب) حساب جديد → إيميل ترحيب للطالب + إشعار للأدمن
create or replace function private.on_signup()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.role = 'student' then
    perform private.notify('signup', jsonb_build_object('student', private.student_json(new.id)));
  end if;
  return new;
end; $$;
drop trigger if exists notify_signup on public.profiles;
create trigger notify_signup after insert on public.profiles for each row execute function private.on_signup();

-- (ج) طلب شراء جديد → إيميل للأدمن | قبول → إيميل للطالب (+ الملف مرفق) | رفض → إيميل للطالب
create or replace function private.on_order_insert()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'pending' then
    perform private.notify('order_new', jsonb_build_object(
      'student', private.student_json(new.user_id),
      'order', jsonb_build_object('id', new.id, 'type', new.item_type, 'amount', new.amount_egp, 'method', new.method,
                                  'sender_phone', new.sender_phone, 'txn', new.transaction_ref, 'has_receipt', coalesce(new.receipt_path,'') <> ''),
      'items', private.order_items(new.item_type, new.item_id)));
  end if;
  return new;
end; $$;
drop trigger if exists notify_order_insert on public.orders;
create trigger notify_order_insert after insert on public.orders for each row execute function private.on_order_insert();

create or replace function private.on_order_update()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
    perform private.notify(case when new.status = 'approved' then 'order_approved' else 'order_rejected' end, jsonb_build_object(
      'student', private.student_json(new.user_id),
      'order', jsonb_build_object('id', new.id, 'type', new.item_type, 'amount', new.amount_egp, 'note', new.admin_note),
      'items', private.order_items(new.item_type, new.item_id)));
  end if;
  return new;
end; $$;
drop trigger if exists notify_order_update on public.orders;
create trigger notify_order_update after update on public.orders for each row execute function private.on_order_update();

-- (د) طلب اشتراك جديد → إيميل للأدمن | رفض → إيميل للطالب
create or replace function private.sub_info(s public.subscriptions)
returns jsonb language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object('id', s.id, 'months', s.months, 'amount', s.amount_egp, 'method', s.method,
         'sender_phone', s.sender_phone, 'txn', s.transaction_ref, 'has_receipt', coalesce(s.receipt_path,'') <> '',
         'grade', s.grade, 'note', s.admin_note,
         'plan', coalesce((select name from public.plans where id = s.plan_id), ''));
$$;
revoke all on function private.sub_info(public.subscriptions) from public, anon, authenticated;

create or replace function private.on_sub_insert()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'pending' then
    perform private.notify('sub_new', jsonb_build_object('student', private.student_json(new.user_id), 'subscription', private.sub_info(new)));
  end if;
  return new;
end; $$;
drop trigger if exists notify_sub_insert on public.subscriptions;
create trigger notify_sub_insert after insert on public.subscriptions for each row execute function private.on_sub_insert();

create or replace function private.on_sub_update()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    perform private.notify('sub_rejected', jsonb_build_object('student', private.student_json(new.user_id), 'subscription', private.sub_info(new)));
  end if;
  return new;
end; $$;
drop trigger if exists notify_sub_update on public.subscriptions;
create trigger notify_sub_update after update on public.subscriptions for each row execute function private.on_sub_update();

-- (هـ) اشتراك اتفعّل/اتمدّد (قبول طلب أو منح يدوي) → إيميل للطالب بالمدة وتاريخ الانتهاء
create or replace function private.on_subscribed_until()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare s public.subscriptions%rowtype;
begin
  if new.subscribed_until is not null and (old.subscribed_until is null or new.subscribed_until > old.subscribed_until) then
    select * into s from public.subscriptions
     where user_id = new.id and status = 'approved' and reviewed_at >= now() - interval '10 seconds'
     order by reviewed_at desc limit 1;
    perform private.notify('sub_approved', jsonb_build_object(
      'student', private.student_json(new.id),
      'until', new.subscribed_until,
      'subscription', case when s.id is not null then private.sub_info(s) else null end));
  end if;
  return new;
end; $$;
drop trigger if exists notify_subscribed_until on public.profiles;
create trigger notify_subscribed_until after update of subscribed_until on public.profiles for each row execute function private.on_subscribed_until();
