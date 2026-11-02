/* صفحة التسجيل — المحتوى يتغيّر حسب "حالة التسجيل" اللي بيحددها الأدمن:
   registration → نموذج تسجيل عادي | subscription → صفحة اشتراك مدفوع | closed → رسالة قفل */
(async function () {
  'use strict';
  const M = window.MH;
  const root = document.getElementById('registerRoot');
  if (!M || !root) return;
  const { sb, h, toast, friendlyError, PHONE_RE, GRADES, uuid, fmtDate, getUser, getProfile, CFG } = M;
  const WA = (CFG && CFG.WHATSAPP) || '201555109204';
  const S = {}; // الإعدادات العامة

  const price = (g) => parseInt(g === GRADES[0] ? S.sub_price_g1 : S.sub_price_g2, 10) || 0;
  const groupLink = (g) => (g === GRADES[0] ? S.group_link_g1 : S.group_link_g2) || '';
  const view = (...n) => root.replaceChildren(...n);
  const card = (...k) => h('div', { class: 'glass-card reg-card' }, ...k);
  const heading = (a, accent, desc) => h('div', { class: 'section-head' },
    h('h1', { class: 'section-title' }, a + ' ', h('span', { class: 'gradient-text', text: accent })), desc ? h('p', { class: 'section-desc', text: desc }) : null);
  const waBtn = (text, msg) => h('a', { class: 'btn btn-whatsapp btn-glow', target: '_blank', rel: 'noopener noreferrer', href: `https://wa.me/${WA}?text=${encodeURIComponent(msg || 'السلام عليكم')}` },
    h('img', { src: 'assets/icons/whatsapp.svg', alt: '', width: '20', height: '20' }), text);
  const digits = (input) => input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 11); });
  const field = (label, input, hint) => h('div', { class: 'pf-field' }, h('label', { text: label }), input, hint ? h('small', { text: hint }) : null);
  const say = (el, text, type) => { el.textContent = text || ''; el.className = 'pf-msg' + (type ? ' ' + type : ''); };

  async function loadSettings() {
    const { data, error } = await sb.from('settings').select('key,value');
    if (error) throw error;
    (data || []).forEach((r) => { S[r.key] = r.value; });
  }

  /* ---------- 1) التسجيل مقفول ---------- */
  function renderClosed() {
    view(heading('التسجيل', 'مقفول حاليًا'), card(
      h('p', { class: 'reg-lead', text: S.registration_closed_message || 'التسجيل مقفول حاليًا.' }),
      h('div', { class: 'pf-actions', style: 'justify-content:center' }, waBtn('اسأل عن موعد فتح التسجيل', 'السلام عليكم، عايز أعرف موعد فتح التسجيل في MH AI Academy'),
        h('a', { class: 'pf-btn ghost', href: 'index.html' }, 'الرئيسية'))));
  }

  /* ---------- 2) التسجيل العادي ---------- */
  function renderSuccess(grade, already) {
    const link = groupLink(grade);
    view(card(
      h('div', { class: 'reg-ok', 'aria-hidden': 'true' }, '✓'),
      h('h2', { class: 'reg-title', text: already ? 'أنت مسجّل بالفعل' : 'تم تسجيل بياناتك بنجاح' }),
      h('p', { class: 'reg-lead', text: already ? 'بياناتك عندنا من قبل. يمكنك الانضمام إلى جروب الواتساب الخاص بصفك.' : 'شكرًا لتسجيلك في MH AI Academy. انضم الآن إلى جروب الواتساب الخاص بصفك لتصلك مواعيد الحصص والواجبات.' }),
      h('div', { class: 'pf-actions', style: 'justify-content:center' },
        link ? h('a', { class: 'btn btn-whatsapp btn-glow', href: link, target: '_blank', rel: 'noopener noreferrer' }, h('img', { src: 'assets/icons/whatsapp.svg', alt: '', width: '20', height: '20' }), 'انضم لجروب ' + grade) : waBtn('تواصل معنا'),
        h('a', { class: 'pf-btn ghost', href: 'index.html' }, 'الرئيسية'))));
  }

  function renderRegistration() {
    const name = h('input', { class: 'form-input', type: 'text', autocomplete: 'name', maxlength: '100', placeholder: 'اكتب اسمك الثلاثي' });
    const phone = h('input', { class: 'form-input', type: 'tel', inputmode: 'numeric', maxlength: '11', dir: 'ltr', placeholder: '01xxxxxxxxx', autocomplete: 'tel' });
    const parent = h('input', { class: 'form-input', type: 'tel', inputmode: 'numeric', maxlength: '11', dir: 'ltr', placeholder: '01xxxxxxxxx', autocomplete: 'off' });
    const grade = h('select', { class: 'form-input' }, h('option', { value: '' }, 'اختر الصف الدراسي'), ...GRADES.map((g) => h('option', { value: g }, g)));
    const hp = h('input', { type: 'text', tabindex: '-1', autocomplete: 'off', name: 'website', id: 'website' });
    const msg = h('p', { class: 'pf-msg', role: 'alert' });
    const btn = h('button', { class: 'pf-btn', type: 'submit', style: 'width:100%' }, 'سجّل الآن');
    digits(phone); digits(parent);
    const form = h('form', { novalidate: true },
      field('الاسم بالكامل', name), field('رقم هاتف الطالب', phone), field('رقم ولي الأمر (إجباري)', parent, 'لازم رقم صحيح من 11 رقم — هنتواصل معاه بخصوص متابعة مستواك.'),
      field('الصف الدراسي', grade), h('div', { class: 'hp-field', 'aria-hidden': 'true' }, h('label', { for: 'website', text: 'اترك هذا الحقل فارغًا' }), hp),
      btn, msg, h('p', { class: 'form-note', text: 'نستخدم بياناتك فقط للتواصل معك بخصوص الاشتراك.' }));
    view(heading('سجّل', 'الآن', 'املأ البيانات التالية، وبعد نجاح التسجيل هيظهر لك جروب الواتساب الخاص بصفك.'), card(form));

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (hp.value) return; // Honeypot
      const v = { full_name: name.value.trim(), phone: phone.value.trim(), parent_phone: parent.value.trim(), grade: grade.value };
      if (v.full_name.length < 3) return say(msg, 'اكتب اسمك بالكامل (3 أحرف على الأقل).', 'err');
      if (!PHONE_RE.test(v.phone)) return say(msg, 'رقم هاتف الطالب غير صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015).', 'err');
      if (!v.parent_phone) return say(msg, 'رقم ولي الأمر إجباري.', 'err');
      if (!PHONE_RE.test(v.parent_phone)) return say(msg, 'رقم ولي الأمر غير صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015).', 'err');
      if (!v.grade) return say(msg, 'اختر الصف الدراسي.', 'err');
      btn.disabled = true; btn.textContent = 'جارٍ التسجيل…'; say(msg, '');
      const { error } = await sb.from('registrations').insert(v);
      if (!error) return renderSuccess(v.grade, false);
      if (error.code === '23505') return renderSuccess(v.grade, true); // نفس الرقم والصف مسجّل قبل كده
      btn.disabled = false; btn.textContent = 'سجّل الآن';
      if (error.code === '42501') { // الأدمن قفل التسجيل أثناء ما كان الطالب بيملأ النموذج
        toast('التسجيل اتغيّر حاليًا. جارٍ تحديث الصفحة…', 'err'); await init(); return;
      }
      say(msg, error.code === '23514' ? 'تأكد من صحة البيانات المدخلة.' : friendlyError(error), 'err');
    });
  }

  /* ---------- 3) الاشتراك (مدفوع) ---------- */
  function planList() {
    return h('div', { class: 'reg-plans' }, GRADES.map((g) => h('div', { class: 'reg-plan' }, h('strong', { text: g }), h('span', { class: 'reg-price', text: `${price(g)} جنيه / شهر` }))));
  }
  async function renderSubscription() {
    const user = await getUser();
    if (!user) {
      return view(heading('الاشتراك في', 'المنصة', 'سجّل دخول أو أنشئ حسابك أولًا، وبعدها اختر خطتك وادفع بإنستا باي أو WE Pay.'), card(
        planList(), h('p', { class: 'reg-lead', text: 'الاشتراك الساري بيفتح لك المحتوى المخصص للمشتركين (حصص وملفات) طوال مدة الاشتراك.' }),
        h('div', { class: 'pf-actions', style: 'justify-content:center' },
          h('a', { class: 'pf-btn', href: 'login.html?next=register.html' }, 'تسجيل الدخول'),
          h('a', { class: 'pf-btn ghost', href: 'login.html?tab=signup&next=register.html' }, 'إنشاء حساب جديد'))));
    }
    const [profile, subs] = await Promise.all([getProfile(user), sb.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })]);
    const latest = (subs.data || [])[0];
    const active = profile.subscribed_until && new Date(profile.subscribed_until) > new Date();
    const pending = latest && latest.status === 'pending';

    const status = [];
    if (active) status.push(h('div', { class: 'pf-note ok-note' }, '✅ اشتراكك ساري حتى ', h('strong', { text: fmtDate(profile.subscribed_until) }), ' ',
      h('a', { href: 'lessons.html', class: 'pf-link', text: 'افتح الحصص والملفات' }), groupLink(profile.grade) ? [' · ', h('a', { href: groupLink(profile.grade), target: '_blank', rel: 'noopener noreferrer', class: 'pf-link', text: 'جروب الواتساب' })] : null));
    if (pending) status.push(h('div', { class: 'pf-note' }, '⏳ طلب الاشتراك الأخير قيد المراجعة. هنفعّله أول ما نراجع الدفع.'));
    if (latest && latest.status === 'rejected' && !pending) status.push(h('div', { class: 'pf-note err-note' }, '❌ تم رفض طلبك السابق' + (latest.admin_note ? ': ' + latest.admin_note : '') + '. تقدر تحاول مرة تانية.'));

    if (pending) return view(heading('الاشتراك في', 'المنصة'), card(...status, h('div', { class: 'pf-actions', style: 'justify-content:center' }, waBtn('تواصل معنا'), h('a', { class: 'pf-btn ghost', href: 'lessons.html' }, 'الحصص'))));

    const numbers = { instapay: S.instapay_number || '01555109204', wepay: S.wepay_number || '01559160083' };
    let method = 'instapay';
    const grade = h('select', { class: 'form-input' }, ...GRADES.map((g) => h('option', { value: g }, g)));
    grade.value = profile.grade || GRADES[0];
    const amount = h('strong', { text: `${price(grade.value)} جنيه` });
    grade.addEventListener('change', () => { amount.textContent = `${price(grade.value)} جنيه`; });
    const parent = h('input', { class: 'form-input', type: 'tel', inputmode: 'numeric', maxlength: '11', dir: 'ltr', value: profile.parent_phone || '', placeholder: '01xxxxxxxxx' });
    const sender = h('input', { class: 'form-input', type: 'tel', inputmode: 'numeric', maxlength: '11', dir: 'ltr', value: profile.phone || '', placeholder: '01xxxxxxxxx' });
    const ref = h('input', { class: 'form-input', type: 'text', maxlength: '60', dir: 'ltr', placeholder: 'اختياري لو رفعت صورة الإيصال' });
    const file = h('input', { class: 'form-input', type: 'file', accept: 'image/jpeg,image/png,image/webp' });
    digits(parent); digits(sender);
    const rI = h('label', {}, h('input', { type: 'radio', name: 'method', value: 'instapay', checked: true, onchange: () => { method = 'instapay'; } }), 'إنستا باي', h('span', { class: 'pf-num', text: numbers.instapay }));
    const rW = h('label', {}, h('input', { type: 'radio', name: 'method', value: 'wepay', onchange: () => { method = 'wepay'; } }), 'WE Pay', h('span', { class: 'pf-num', text: numbers.wepay }));
    const copy = h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(numbers[method]); toast('تم نسخ الرقم'); } catch (e) { toast(numbers[method]); } } }, 'نسخ رقم الدفع');
    const msg = h('p', { class: 'pf-msg', role: 'alert' });
    const btn = h('button', { class: 'pf-btn', type: 'submit', style: 'width:100%' }, 'إرسال طلب الاشتراك');
    const form = h('form', { novalidate: true },
      h('div', { class: 'pf-note' }, 'قيمة الاشتراك الشهري: ', amount, '. حوّل المبلغ على أحد الأرقام ثم ارفع صورة الإيصال، وهنفعّل اشتراكك بعد مراجعة الدفع.'),
      field('الصف', grade), field('رقم ولي الأمر (إجباري)', parent),
      h('div', { class: 'pf-pay' }, rI, rW), h('div', { style: 'margin-bottom:1rem' }, copy),
      field('رقم الموبايل اللي حوّلت منه', sender), field('رقم العملية (اختياري)', ref),
      field('صورة الإيصال', file, 'صورة JPG/PNG/WEBP حتى 5MB. لازم ترفع الصورة أو تكتب رقم العملية.'), btn, msg);
    view(heading('الاشتراك في', 'المنصة', active ? 'تقدر تجدّد أو تمدّد اشتراكك من هنا.' : 'اختر صفّك وادفع لتفعيل اشتراكك.'), card(...status, form));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = file.files[0], txn = ref.value.trim(), pPhone = parent.value.trim();
      if (!pPhone) return say(msg, 'رقم ولي الأمر إجباري.', 'err');
      if (!PHONE_RE.test(pPhone)) return say(msg, 'رقم ولي الأمر غير صحيح.', 'err');
      if (!PHONE_RE.test(sender.value.trim())) return say(msg, 'رقم الموبايل المحوَّل منه غير صحيح.', 'err');
      if (!f && !txn) return say(msg, 'ارفع صورة الإيصال أو اكتب رقم العملية.', 'err');
      if (f && !/^image\/(jpeg|png|webp)$/.test(f.type)) return say(msg, 'الإيصال لازم يكون صورة JPG أو PNG أو WEBP.', 'err');
      if (f && f.size > 5 * 1024 * 1024) return say(msg, 'حجم الصورة أكبر من 5MB.', 'err');
      btn.disabled = true; btn.textContent = 'جارٍ الإرسال…'; say(msg, '');
      let receiptPath = null;
      try {
        if (pPhone !== profile.parent_phone || grade.value !== profile.grade) {
          const up = await sb.from('profiles').update({ parent_phone: pPhone, grade: grade.value }).eq('id', user.id);
          if (up.error) throw up.error;
        }
        if (f) {
          const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[f.type];
          receiptPath = `${user.id}/${uuid()}.${ext}`;
          const r = await sb.storage.from('receipts').upload(receiptPath, f, { contentType: f.type, upsert: false });
          if (r.error) throw r.error;
        }
        const ins = await sb.from('subscriptions').insert({ grade: grade.value, method, sender_phone: sender.value.trim(), transaction_ref: txn, receipt_path: receiptPath });
        if (ins.error) { if (receiptPath) await sb.storage.from('receipts').remove([receiptPath]); throw ins.error; }
        toast('تم إرسال طلب الاشتراك ✅'); await renderSubscription();
      } catch (err) { say(msg, err && err.code === '23505' ? 'عندك طلب اشتراك قيد المراجعة بالفعل.' : friendlyError(err), 'err'); btn.disabled = false; btn.textContent = 'إرسال طلب الاشتراك'; }
    });
  }

  /* ---------- التشغيل ---------- */
  async function init() {
    view(h('p', { class: 'pf-loading', text: 'جارٍ التحميل…' }));
    try { await loadSettings(); }
    catch (e) {
      return view(card(h('p', { class: 'reg-lead', text: 'تعذّر تحميل صفحة التسجيل. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.' }),
        h('div', { class: 'pf-actions', style: 'justify-content:center' }, h('button', { class: 'pf-btn', type: 'button', onclick: init }, 'إعادة المحاولة'), waBtn('تواصل معنا'))));
    }
    const mode = S.registration_mode || 'registration';
    if (mode === 'subscription') return renderSubscription();
    if (mode === 'closed') return renderClosed();
    return renderRegistration();
  }
  await init();
})();
