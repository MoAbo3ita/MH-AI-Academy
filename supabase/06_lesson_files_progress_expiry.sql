-- =====================================================================
-- MH AI Academy — الخطوة 6
--   • ملف الحصة (بيتباع من داخل الحصة ومش بيظهر في قسم «الملفات»)
--   • عدد الحصص اللي شافها كل طالب
--   • إشعارات انتهاء الاشتراك (قبل 3 أيام + يوم الانتهاء) ليك وللطالب
--   • إلغاء الاشتراك بسبب يتبعت للطالب + إيميل عند الإضافة/التمديد
--   • خانة إيميل اختيارية في التسجيل العام
-- شغّله بعد 01..05. آمن لإعادة التشغيل.
-- =====================================================================

-- 1) ملف الحصة: صف في pdf_files بس مخفي من قسم الملفات
alter table public.pdf_files add column if not exists lesson_only boolean not null default false;

-- 2) ملف الحصة يتبع الحصة: نشر/إخفاء الحصة يطبّق على ملفها، وحذف الحصة يحذف ملفها
create or replace function private.sync_lesson_file()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.pdf_id is not null then
    update public.pdf_files set is_published = new.is_published where id = new.pdf_id and lesson_only;
  end if;
  return new;
end; $$;
drop trigger if exists lessons_sync_file on public.lessons;
create trigger lessons_sync_file after update of is_published, pdf_id on public.lessons for each row execute function private.sync_lesson_file();

create or replace function private.drop_lesson_file()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if old.pdf_id is not null then delete from public.pdf_files where id = old.pdf_id and lesson_only; end if;
  return old;
end; $$;
drop trigger if exists lessons_drop_file on public.lessons;
create trigger lessons_drop_file after delete on public.lessons for each row execute function private.drop_lesson_file();

-- 3) التسجيل العام: إيميل اختياري (عشان يوصله ترحيب)
alter table public.registrations add column if not exists email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- 4) مشاهدات الحصص
create table if not exists public.lesson_views (
  user_id         uuid not null references auth.users(id) on delete cascade,
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now(),
  views           integer not null default 1,
  primary key (user_id, lesson_id)
);
alter table public.lesson_views enable row level security;
drop policy if exists "lesson_views_own_select" on public.lesson_views;
create policy "lesson_views_own_select" on public.lesson_views for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke all on public.lesson_views from anon, authenticated;
grant select on public.lesson_views to authenticated;

-- الطالب بيسجّل إنه فتح حصة (لازم يكون له وصول لها)
create or replace function public.mark_lesson_viewed(p_lesson uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_access('lesson', p_lesson) then return; end if;
  insert into public.lesson_views (user_id, lesson_id) values (auth.uid(), p_lesson)
  on conflict (user_id, lesson_id) do update set last_viewed_at = now(), views = public.lesson_views.views + 1;
end;
$$;
revoke all on function public.mark_lesson_viewed(uuid) from public, anon;
grant execute on function public.mark_lesson_viewed(uuid) to authenticated;

-- للأدمن: لكل طالب كام حصة شاف من كام حصة منشورة لصفه (الإجمالي = حصص صفه + حصص «كل الصفوف»)
create or replace function public.student_progress()
returns table (user_id uuid, watched integer, total integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'غير مسموح'; end if;
  return query
    select p.id,
           (select count(*)::int from public.lesson_views v join public.lessons l on l.id = v.lesson_id
             where v.user_id = p.id and l.is_published),
           (select count(*)::int from public.lessons l
             where l.is_published and (l.grade = 'all' or l.grade = p.grade))
      from public.profiles p where p.role = 'student';
end;
$$;
revoke all on function public.student_progress() from public, anon;
grant execute on function public.student_progress() to authenticated;

-- 5) إلغاء الاشتراك بسبب (بيتبعت للطالب) — الدالة القديمة بتفضل شغالة بدون سبب
create or replace function public.revoke_subscription(p_user uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public, private
as $$
declare v_old timestamptz;
begin
  if not public.is_admin() then raise exception 'غير مسموح'; end if;
  select subscribed_until into v_old from public.profiles where id = p_user;
  update public.profiles set subscribed_until = null where id = p_user;
  perform private.notify('sub_cancelled', jsonb_build_object(
    'student', private.student_json(p_user), 'reason', coalesce(nullif(trim(p_reason), ''), ''), 'was_until', v_old));
end;
$$;
revoke all on function public.revoke_subscription(uuid, text) from public, anon;
grant execute on function public.revoke_subscription(uuid, text) to authenticated;

-- 6) إيميل عند تفعيل/تمديد الاشتراك (قبول طلب | إضافة يدوية لطالب جديد | تمديد)
create or replace function private.on_subscribed_until()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare s public.subscriptions%rowtype; v_kind text;
begin
  if new.subscribed_until is not null and (old.subscribed_until is null or new.subscribed_until > old.subscribed_until) then
    select * into s from public.subscriptions
     where user_id = new.id and status = 'approved' and reviewed_at >= now() - interval '10 seconds'
     order by reviewed_at desc limit 1;
    v_kind := case when s.id is not null then 'approved'
                   when old.subscribed_until is not null and old.subscribed_until > now() then 'extended'
                   else 'granted' end;
    perform private.notify('sub_approved', jsonb_build_object(
      'student', private.student_json(new.id), 'until', new.subscribed_until, 'previous_until', old.subscribed_until, 'kind', v_kind,
      'subscription', case when s.id is not null then private.sub_info(s) else null end));
  end if;
  return new;
end; $$;

-- 7) التسجيل العام: بنبعت الإيميل (لو اتكتب) عشان يوصله ترحيب
create or replace function private.on_registration()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  perform private.notify('registration', jsonb_build_object('registration',
    jsonb_build_object('name', new.full_name, 'phone', new.phone, 'parent_phone', new.parent_phone, 'grade', new.grade, 'email', coalesce(new.email, ''))));
  return new;
end; $$;

-- 8) متابعة انتهاء الاشتراكات (بتشتغل يوميًا): تنبيه قبل 3 أيام + إشعار يوم الانتهاء، مرة واحدة لكل تاريخ انتهاء
alter table public.profiles add column if not exists expiry_warned_for  timestamptz;
alter table public.profiles add column if not exists expiry_notified_for timestamptz;

create or replace function private.run_expiry_checks()
returns integer
language plpgsql security definer set search_path = public, private
as $$
declare r record; n integer := 0;
begin
  -- قبل الانتهاء بـ 3 أيام (بتوقيت القاهرة)
  for r in select id, subscribed_until from public.profiles
            where role = 'student' and subscribed_until is not null and subscribed_until > now()
              and (subscribed_until at time zone 'Africa/Cairo')::date - (now() at time zone 'Africa/Cairo')::date <= 3
              and expiry_warned_for is distinct from subscribed_until
  loop
    update public.profiles set expiry_warned_for = r.subscribed_until where id = r.id;
    perform private.notify('sub_expiring', jsonb_build_object('student', private.student_json(r.id), 'until', r.subscribed_until,
      'days_left', (r.subscribed_until at time zone 'Africa/Cairo')::date - (now() at time zone 'Africa/Cairo')::date));
    n := n + 1;
  end loop;
  -- اتنهى (آخر 7 أيام بس، عشان ما نبعتش على اشتراكات قديمة)
  for r in select id, subscribed_until from public.profiles
            where role = 'student' and subscribed_until is not null
              and subscribed_until <= now() and subscribed_until > now() - interval '7 days'
              and expiry_notified_for is distinct from subscribed_until
  loop
    update public.profiles set expiry_notified_for = r.subscribed_until where id = r.id;
    perform private.notify('sub_expired', jsonb_build_object('student', private.student_json(r.id), 'until', r.subscribed_until));
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function private.run_expiry_checks() from public, anon, authenticated;

-- جدولة يومية 7:00 UTC (9 صباحًا بتوقيت القاهرة تقريبًا). لو pg_cron مش متفعّل بيطلع تحذير بس.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'mh-expiry-checks';
  perform cron.schedule('mh-expiry-checks', '0 7 * * *', 'select private.run_expiry_checks()');
exception when others then
  raise warning 'pg_cron مش متاح: فعّله من Database ← Extensions ثم أعد تشغيل الملف (%).', sqlerrm;
end $$;
