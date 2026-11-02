# الخطوة 1 — إعداد Supabase (قاعدة البيانات + الصلاحيات + حساب الأدمن)

الوقت المتوقع: 10–15 دقيقة. مفيش أي كود بتكتبه، كله نسخ ولصق.

## 0) إعدادات نموذج إنشاء المشروع (مهم)
- **Project name:** `mh-ai-academy`
- **Database password:** اضغط **Generate a password** وانسخه واحفظه في مكان آمن (مش هتحتاجه في الموقع).
- **Region:** Europe (ولو طلب منطقة محددة اختر **Frankfurt** أو **London**).
- **Security:**
  - ✅ **Enable Data API** — اتركه مفعّل (الموقع محتاجه).
  - ⬜ **Automatically expose new tables** — **ألغِ التفعيل** (Supabase نفسه بيوصي بكده). ملف `01_schema.sql` فيه أوامر الصلاحيات اللازمة.
  - ✅ **Enable automatic RLS** — **فعّله** كطبقة أمان إضافية.
- اضغط **Create new project**.

## 1) أنشئ المشروع
1. افتح https://supabase.com واضغط **Start your project** وسجّل (بحساب جوجل أو جيت هاب).
2. **New project**:
   - **Name:** `mh-ai-academy`
   - **Database Password:** اختر باسوورد قوي **واحفظه** (لن نحتاجه في الموقع، لكن لا تفقده).
   - **Region:** أقرب منطقة لمصر (مثلًا **Frankfurt** أو **London**).
   - **Plan:** Free للتجربة.
3. استنى دقيقتين لحد ما المشروع يجهز.

## 2) شغّل ملف قاعدة البيانات
1. من القائمة الجانبية: **SQL Editor** ← **New query**.
2. افتح الملف `01_schema.sql`، انسخ **كل** محتواه والصقه، واضغط **Run**.
3. المفروض يظهر `Success. No rows returned`.
   - لو ظهر خطأ، **صوّر الرسالة كاملة وابعتها لي** وأصلحها فورًا.
4. تأكد (اختياري): شغّل `select key, value from public.settings;` ← لازم يرجّع 3 صفوف.

## 3) أنشئ حساب الأدمن
1. **Authentication ← Users ← Add user ← Create new user**.
2. **Email:** `midoaboeita235@gmail.com`
3. **Password:** الباسوورد المؤقت اللي ببعته لك في المحادثة.
4. فعّل **Auto Confirm User** واضغط **Create user**.

## 4) ارفع الحساب لأدمن
1. **SQL Editor ← New query**، الصق محتوى `02_make_admin.sql` واضغط **Run**.
2. لازم يظهر صف واحد فيه الإيميل ودور `admin`.

## 5) إعدادات تسجيل الطلاب (للتجربة)
- **Authentication ← Sign In / Providers ← Email:**
  - عطّل **Confirm email** للتجربة (كتير من الطلاب مش بيفتحوا الإيميل). قبل الإطلاق نقرر لو نرجّعه.
- **Authentication ← URL Configuration:** اكتب في **Site URL** رابط موقعك (مثلًا `https://mh-ai-academy.vercel.app`).

## 6) ابعتلي مفتاحين فقط
من **Project Settings ← API** (أو **Data API / API Keys**):
- **Project URL** (شكله `https://xxxx.supabase.co`)
- **anon / publishable key** (مفتاح عام وآمن، يطلع في الموقع عادي).

> ⚠️ **ممنوع تبعتلي أبدًا** `service_role` / `secret key` ولا باسوورد قاعدة البيانات. دول مفاتيح سرية.

## ملاحظات مهمة
- **تغيير الباسوورد المؤقت:** من **Authentication ← Users ← ⋯ بجانب حسابك ← Send password recovery**، أو هعمل صفحة تغيير باسوورد في الموقع في الخطوة الجاية.
- **الخطة المجانية:** المشروع بيتوقف لو مفيش نشاط أسبوع، وتقدر تشغّله تاني بضغطة. حجم التخزين 1GB وأقصى ملف 50MB. للحصص الفيديو هنستخدم رابط من يوتيوب (غير مدرج) أو Bunny، مش تخزين مباشر.
- **الأدمن بيتحدد بعمود `role` في قاعدة البيانات**، مش بالإيميل، فمحدش يقدر يبقى أدمن بمجرد ما يسجل بنفس الإيميل.

---
## تحديث: الخطوة 3 — التحكم في التسجيل والاشتراك (ملف `03_registration_control.sql`)
**شغّله بعد `01_schema.sql` و`02_make_admin.sql`** (SQL Editor ← New query ← الصق ← Run). بيضيف:
- حالة صفحة التسجيل (تسجيل عادي / اشتراك / مقفول) تتحكم فيها من لوحة الأدمن.
- جدول `registrations` (بدل Google Sheet) + جدول `subscriptions` (طلبات الاشتراك).
- رقم ولي الأمر إجباري (مع التحقق في قاعدة البيانات).
- محتوى "للمشتركين فقط" (حصص وملفات) ومدة الاشتراك لكل طالب.
بعد التشغيل: `select key, value from public.settings order by key;` لازم يظهر `registration_mode = registration`.
