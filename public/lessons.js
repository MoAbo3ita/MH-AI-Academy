(async function () {
  'use strict';
  const M = window.MH; if (!M) return;
  const { sb, h, $, $$, toast, openModal, friendlyError, requireUser, renderHeader, loadSettings, buildPlayer, PHONE_RE, uuid, GRADES, fmtDate, gradeLabel, CFG } = M;

  const ctx = await requireUser(); if (!ctx) return;
  const { user, profile } = ctx;
  renderHeader({ active: 'lessons', profile });

  let settings = {}, lessons = [], allLessons = [], pdfs = [], orders = [];
  let tab = 'lessons';
  let gradeFilter = profile.grade || '';
  const content = $('#content'), toolbar = $('#toolbar');

  /* ---------- تحميل البيانات ---------- */
  async function load() {
    const [l, p, o, s] = await Promise.all([
      sb.from('lessons').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      sb.from('pdf_files').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      sb.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      loadSettings()
    ]);
    const firstErr = l.error || p.error || o.error;
    if (firstErr) toast(friendlyError(firstErr), 'err');
    // الأدمن يقرأ كل شيء (حتى المخفي) بحكم الصلاحيات؛ هنا نعرض للطالب المنشور فقط
    allLessons = l.data || []; lessons = allLessons.filter((x) => x.is_published); pdfs = (p.data || []).filter((x) => x.is_published); orders = o.data || []; settings = s || {};
    $('#subtitle').textContent = 'الحصص المجانية تفتح فورًا، والحصص المدفوعة تتفعّل بعد مراجعة الدفع.';
    renderSubBanner();
  }

  /* ---------- منطق الوصول (العرض فقط — الحماية الحقيقية في قاعدة البيانات) ---------- */
  const isSubscribed = () => !!(profile.subscribed_until && new Date(profile.subscribed_until) > new Date());
  const bundleOwned = (lessonId) => orders.some((o) => o.item_type === 'bundle' && o.item_id === lessonId && o.status === 'approved');
  const hasAccess = (type, item) => profile.role === 'admin' || item.is_free || (item.for_subscribers && isSubscribed()) || orders.some((o) => o.item_type === type && o.item_id === item.id && o.status === 'approved')
    || (type === 'lesson' && bundleOwned(item.id)) || (type === 'pdf' && allLessons.some((l) => l.pdf_id === item.id && bundleOwned(l.id)));
  // باقة (حصة + ملف): الحصة مربوطة بملف منشور غير مجاني وليها سعر باقة
  const bundleFile = (l) => (l.pdf_id && l.bundle_price_egp != null && !l.is_free && l.allow_purchase !== false) ? pdfs.find((p) => p.id === l.pdf_id && !p.is_free) || null : null;
  const pendingFor = (l) => orders.some((o) => o.status === 'pending' && o.item_id === l.id && (o.item_type === 'lesson' || o.item_type === 'bundle'));
  const latestOrder = (type, id) => orders.find((o) => o.item_type === type && o.item_id === id); // الأحدث أولًا
  const gradeOk = (it) => !gradeFilter || it.grade === 'all' || it.grade === gradeFilter;

  /* ---------- البطاقات ---------- */
  const canBuy = (item) => item.allow_purchase !== false;   // الشراء الفردي مسموح (الافتراضي)
  function badge(type, item) {
    if (item.is_free) return h('span', { class: 'pf-badge free' }, 'مجاني');
    if (hasAccess(type, item)) return h('span', { class: 'pf-badge ok' }, 'مفعّل ✓');
    return [item.for_subscribers ? h('span', { class: 'pf-badge lock' }, '⭐ للمشتركين') : null, canBuy(item) ? h('span', { class: 'pf-badge lock' }, `🔒 ${item.price_egp} ج`) : null];
  }
  function actions(type, item) {
    const open = type === 'lesson' ? () => openLesson(item) : () => openPdf(item);
    const openLabel = type === 'lesson' ? '▶ شاهد الحصة' : '⬇ فتح الملف';
    if (hasAccess(type, item)) return h('button', { class: 'pf-btn', type: 'button', onclick: open }, openLabel);
    const out = [];
    const bf = type === 'lesson' ? bundleFile(item) : null;
    if (bf && canBuy(item) && !hasAccess('pdf', bf) && !pendingFor(item)) {   // اختيار: حصة / ملف / الاتنين
      out.push(h('button', { class: 'pf-btn', type: 'button', onclick: () => openChoice(item, bf) }, `اشترِ (من ${Math.min(item.price_egp, bf.price_egp, item.bundle_price_egp)} ج)`));
    } else if (canBuy(item)) {                            // شراء فردي
      const last = type === 'lesson' ? (orders.find((o) => (o.item_type === 'lesson' || o.item_type === 'bundle') && o.item_id === item.id)) : latestOrder(type, item.id);
      if (last && last.status === 'pending') out.push(h('button', { class: 'pf-btn ghost', type: 'button', disabled: true }, '⏳ طلبك قيد المراجعة'));
      else {
        if (last && last.status === 'rejected') out.push(h('p', { class: 'pf-badge rejected', style: 'width:100%' }, 'تم رفض طلبك السابق' + (last.admin_note ? ': ' + last.admin_note : '')));
        out.push(h('button', { class: 'pf-btn', type: 'button', onclick: () => openPurchase(type, item) }, last && last.status === 'rejected' ? 'أعد المحاولة' : `اشترِ بـ ${item.price_egp} ج`));
      }
    }
    if (item.for_subscribers) {                           // أو الاشتراك
      if (settings.registration_mode === 'subscription') out.push(h('a', { class: canBuy(item) ? 'pf-btn ghost' : 'pf-btn', href: 'register.html' }, canBuy(item) ? 'أو اشترك وافتح كل المحتوى' : '⭐ اشترك للمشاهدة'));
      else if (!canBuy(item)) out.push(h('button', { class: 'pf-btn ghost', type: 'button', disabled: true }, 'متاح للمشتركين فقط'));
    }
    return out;
  }
  function card(type, item) {
    return h('article', { class: 'pf-card glass-card' },
      h('div', { class: 'pf-meta' }, badge(type, item), h('span', { class: 'pf-badge info' }, gradeLabel(item.grade)),
        item.duration_minutes ? h('span', { class: 'pf-badge off' }, `${item.duration_minutes} دقيقة`) : null),
      h('h3', { text: item.title }),
      item.description ? h('p', { text: item.description }) : null,
      h('div', { class: 'pf-actions' }, actions(type, item)));
  }

  function renderSubBanner() {
    const host = $('#subBanner'); if (!host) return;
    host.replaceChildren();
    if (profile.role === 'admin') return;
    if (isSubscribed()) host.append(h('div', { class: 'pf-note', style: 'border-color:rgba(74,222,128,.4)' }, '✅ اشتراكك ساري حتى ', h('strong', { text: fmtDate(profile.subscribed_until) })));
    else if (settings.registration_mode === 'subscription') host.append(h('div', { class: 'pf-note' }, 'لسه ما اشتركتش؟ ', h('a', { class: 'pf-link', href: 'register.html', text: 'اشترك الآن' }), ' وافتح كل المحتوى المخصص للمشتركين.'));
  }

  /* ---------- العرض ---------- */
  function renderToolbar() {
    toolbar.replaceChildren();
    if (tab === 'orders') return;
    const sel = h('select', { class: 'form-input', 'aria-label': 'تصفية بالصف', onchange: (e) => { gradeFilter = e.target.value; render(); } },
      h('option', { value: '' }, 'كل الصفوف'), ...GRADES.map((g) => h('option', { value: g }, g)));
    sel.value = gradeFilter; toolbar.append(sel);
  }
  function render() {
    $$('#tabs .pf-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    renderToolbar();
    if (tab === 'orders') return renderOrders();
    const type = tab === 'lessons' ? 'lesson' : 'pdf';
    const list = (tab === 'lessons' ? lessons : pdfs).filter(gradeOk);
    if (!list.length) return content.replaceChildren(h('p', { class: 'pf-empty', text: tab === 'lessons' ? 'لا توجد حصص متاحة لهذا الصف حاليًا. تابعنا قريبًا!' : 'لا توجد ملفات متاحة لهذا الصف حاليًا.' }));
    content.replaceChildren(h('div', { class: 'pf-grid' }, list.map((it) => card(type, it))));
  }
  function renderOrders() {
    if (!orders.length) return content.replaceChildren(h('p', { class: 'pf-empty', text: 'لسه ما عملتش أي طلب دفع.' }));
    const title = (o) => {
      if (o.item_type === 'bundle') { const l = allLessons.find((x) => x.id === o.item_id); const f = l && pdfs.find((p) => p.id === l.pdf_id); return l ? '📦 ' + l.title + (f ? ' + ' + f.title : ' + ملف') : 'باقة'; }
      const src = o.item_type === 'lesson' ? lessons : pdfs; const it = src.find((x) => x.id === o.item_id); return it ? it.title : (o.item_type === 'lesson' ? 'حصة' : 'ملف'); };
    const label = { pending: 'قيد المراجعة ⏳', approved: 'تم القبول ✓', rejected: 'مرفوض' };
    content.replaceChildren(h('div', { class: 'pf-grid' }, orders.map((o) => h('article', { class: 'pf-card glass-card' },
      h('div', { class: 'pf-meta' }, h('span', { class: 'pf-badge ' + o.status }, label[o.status] || o.status), h('span', { class: 'pf-badge off' }, o.method === 'instapay' ? 'إنستا باي' : 'WE Pay')),
      h('h3', { text: title(o) }),
      h('div', { class: 'pf-kv' }, h('span', {}, 'المبلغ'), h('span', {}, `${o.amount_egp} ج`)),
      h('div', { class: 'pf-kv' }, h('span', {}, 'التاريخ'), h('span', {}, fmtDate(o.created_at))),
      o.admin_note ? h('p', { text: 'ملاحظة الإدارة: ' + o.admin_note }) : null))));
  }

  /* ---------- مشاهدة حصة ---------- */
  async function openLesson(lesson) {
    const holder = h('div', {}, h('p', { class: 'pf-loading', text: 'جارٍ تحميل الحصة…' }));
    openModal({ title: lesson.title, body: holder, wide: true, onClose: () => holder.replaceChildren() });
    const { data, error } = await sb.from('lesson_media').select('*').eq('lesson_id', lesson.id).maybeSingle();
    if (error || !data) { holder.replaceChildren(h('p', { class: 'pf-empty', text: error ? friendlyError(error) : 'لا يوجد فيديو لهذه الحصة بعد.' })); return; }
    holder.replaceChildren(buildPlayer(data, profile), lesson.description ? h('p', { class: 'pf-sub', style: 'margin-top:1rem', text: lesson.description }) : null);
  }

  /* ---------- فتح PDF بلينك مؤقت ---------- */
  async function openPdf(pdf) {
    const win = window.open('', '_blank'); // نفتحها فورًا لتفادي حظر النوافذ
    const { data, error } = await sb.storage.from('pdfs').createSignedUrl(pdf.file_path, 120);
    if (error || !data) { if (win) win.close(); return toast(friendlyError(error || 'تعذّر فتح الملف'), 'err'); }
    if (win) { win.opener = null; win.location.href = data.signedUrl; } else location.href = data.signedUrl;
  }

  /* ---------- اختيار الباقة: الحصة / الملف / الاتنين ---------- */
  function openChoice(lesson, pdf) {
    const lOwned = hasAccess('lesson', lesson), fOwned = hasAccess('pdf', pdf);
    const sum = lesson.price_egp + pdf.price_egp, save = sum - lesson.bundle_price_egp;
    const opts = [
      { v: 'lesson', t: 'الحصة فقط', p: lesson.price_egp, off: lOwned || pendingFor(lesson) },
      { v: 'pdf', t: 'الملف فقط: ' + pdf.title, p: pdf.price_egp, off: fOwned || orders.some((o) => o.item_type === 'pdf' && o.item_id === pdf.id && o.status === 'pending') },
      { v: 'bundle', t: 'الحصة + الملف (باقة)', p: lesson.bundle_price_egp, off: lOwned || fOwned || pendingFor(lesson), note: save > 0 ? `وفّر ${save} ج` : '' }
    ];
    let pick = (opts.find((o) => !o.off) || {}).v;
    const list = h('div', { class: 'pf-pay', style: 'flex-direction:column;align-items:stretch' }, opts.map((o) => h('label', { style: o.off ? 'opacity:.5' : '' },
      h('input', { type: 'radio', name: 'choice', value: o.v, disabled: o.off, checked: o.v === pick, onchange: () => { pick = o.v; } }),
      ' ' + o.t, h('span', { class: 'pf-num', text: `${o.p} ج` }), o.note ? h('span', { class: 'pf-badge ok', text: o.note }) : null)));
    const go = h('button', { class: 'pf-btn', type: 'button', style: 'width:100%', onclick: () => {
      if (!pick) return; m.close();
      if (pick === 'lesson') openPurchase('lesson', lesson); else if (pick === 'pdf') openPurchase('pdf', pdf); else openPurchase('bundle', lesson);
    } }, 'متابعة للدفع');
    const m = openModal({ title: 'اختر اللي تشتريه', body: h('div', {}, h('p', { class: 'pf-sub', text: lesson.title }), list, go) });
  }

  /* ---------- الشراء (إنستا باي / WE Pay) ---------- */
  function openPurchase(type, item) {
    const price = type === 'bundle' ? item.bundle_price_egp : item.price_egp;
    const pf = type === 'bundle' ? pdfs.find((p) => p.id === item.pdf_id) : null;
    const numbers = { instapay: settings.instapay_number || '01555109204', wepay: settings.wepay_number || '01559160083' };
    let method = 'instapay';
    const rI = h('label', {}, h('input', { type: 'radio', name: 'method', value: 'instapay', checked: true, onchange: () => { method = 'instapay'; } }), 'إنستا باي', h('span', { class: 'pf-num', text: numbers.instapay }));
    const rW = h('label', {}, h('input', { type: 'radio', name: 'method', value: 'wepay', onchange: () => { method = 'wepay'; } }), 'WE Pay', h('span', { class: 'pf-num', text: numbers.wepay }));
    const phone = h('input', { class: 'form-input', type: 'tel', inputmode: 'numeric', maxlength: '11', dir: 'ltr', placeholder: '01xxxxxxxxx', value: profile.phone || '', required: true });
    const ref = h('input', { class: 'form-input', type: 'text', maxlength: '60', dir: 'ltr', placeholder: 'اختياري لو رفعت صورة الإيصال' });
    const file = h('input', { class: 'form-input', type: 'file', accept: 'image/jpeg,image/png,image/webp' });
    const msg = h('p', { class: 'pf-msg', role: 'alert' });
    const btn = h('button', { class: 'pf-btn', type: 'submit', style: 'width:100%' }, 'إرسال الطلب');
    const copy = h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: async () => { const n = numbers[method]; try { await navigator.clipboard.writeText(n); toast('تم نسخ الرقم'); } catch (e) { toast(n); } } }, 'نسخ رقم الدفع');
    const form = h('form', { novalidate: true },
      h('div', { class: 'pf-note' }, `${type === 'bundle' ? 'الباقة' : type === 'lesson' ? 'الحصة' : 'الملف'}: `, h('strong', { text: item.title + (pf ? ' + ' + pf.title : '') }), h('br'), `المبلغ المطلوب: `, h('strong', { text: `${price} جنيه` }), h('br'), 'حوّل المبلغ على أحد الأرقام، ثم اكتب رقم الموبايل اللي حوّلت منه وارفع صورة الإيصال. هنراجع الدفع ونفعّل لك، وهيوصلك إيميل بالتفعيل (ومعاه الملف لو اشتريته).'),
      h('div', { class: 'pf-pay' }, rI, rW), h('div', { style: 'margin-bottom:1rem' }, copy),
      h('div', { class: 'pf-field' }, h('label', { text: 'رقم الموبايل اللي حوّلت منه' }), phone),
      h('div', { class: 'pf-field' }, h('label', { text: 'رقم العملية (اختياري)' }), ref),
      h('div', { class: 'pf-field' }, h('label', { text: 'صورة الإيصال' }), file, h('small', { text: 'صورة (JPG/PNG/WEBP) حتى 5MB. لازم ترفع الصورة أو تكتب رقم العملية.' })),
      btn, msg);
    const m = openModal({ title: 'إتمام الدفع', body: form });
    phone.addEventListener('input', () => { phone.value = phone.value.replace(/\D/g, '').slice(0, 11); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.className = 'pf-msg';
      const fail = (t) => { msg.className = 'pf-msg err'; msg.textContent = t; };
      const f = file.files[0], txn = ref.value.trim();
      if (!PHONE_RE.test(phone.value.trim())) return fail('رقم الموبايل غير صحيح.');
      if (!f && !txn) return fail('ارفع صورة الإيصال أو اكتب رقم العملية.');
      if (f && !/^image\/(jpeg|png|webp)$/.test(f.type)) return fail('الإيصال لازم يكون صورة JPG أو PNG أو WEBP.');
      if (f && f.size > 5 * 1024 * 1024) return fail('حجم الصورة أكبر من 5MB.');
      btn.disabled = true; btn.textContent = 'جارٍ الإرسال…';
      let receiptPath = null;
      try {
        if (f) {
          const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[f.type];
          receiptPath = `${user.id}/${uuid()}.${ext}`;
          const up = await sb.storage.from('receipts').upload(receiptPath, f, { contentType: f.type, upsert: false });
          if (up.error) throw up.error;
        }
        const ins = await sb.from('orders').insert({ item_type: type, item_id: item.id, method, sender_phone: phone.value.trim(), transaction_ref: txn, receipt_path: receiptPath });
        if (ins.error) { if (receiptPath) await sb.storage.from('receipts').remove([receiptPath]); throw ins.error; }
        m.close(); toast('تم إرسال طلبك ✅ هنراجعه ونفعّل لك الحصة.');
        const o = await sb.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        orders = o.data || orders; tab = 'orders'; render();
      } catch (err) { fail(friendlyError(err)); btn.disabled = false; btn.textContent = 'إرسال الطلب'; }
    });
  }

  $$('#tabs .pf-tab').forEach((t) => t.addEventListener('click', () => { tab = t.dataset.tab; render(); }));
  await load(); render();
})();
