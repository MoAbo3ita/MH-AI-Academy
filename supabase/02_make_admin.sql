-- =====================================================================
-- الخطوة: ترقية حساب المدير لأدمن
-- شغّله بعد ما تنشئ المستخدم من: Authentication → Users → Add user
-- =====================================================================

-- لو الحساب اتعمل قبل تشغيل 01_schema.sql ومفيش له profile، ننشئه
insert into public.profiles (id, full_name)
select id, 'المدير' from auth.users where lower(email) = 'midoaboeita235@gmail.com'
on conflict (id) do nothing;

update public.profiles
   set role = 'admin',
       full_name = case when full_name = '' then 'المدير' else full_name end
 where id = (select id from auth.users where lower(email) = 'midoaboeita235@gmail.com');

-- تأكيد: لازم يظهر صف واحد بدور admin
select p.id, u.email, p.role
  from public.profiles p join auth.users u on u.id = p.id
 where p.role = 'admin';
