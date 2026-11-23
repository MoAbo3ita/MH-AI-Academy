(async function () {
  'use strict';
  const M = window.MH; if (!M) return;
  const { sb, h, $, $$, toast, openModal, friendlyError, requireUser, renderHeader, loadSettings, normalizeVideo, detectProvider, PHONE_RE, uuid, GRADES, fmtDate, gradeLabel } = M;

  const ctx = await requireUser({ admin: true }); if (!ctx) return;
  renderHeader({ active: 'admin', profile: ctx.profile });

  const content = $('#content'), toolbar = $('#toolbar');
  let tab = 'orders', orderFilter = 'pending', subFilter = 'pending';
  let settings = {}, lessons = [], pdfs = [], plans = [];

  const numberOr = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; };
  const loading = () => content.replaceChildren(h('p', { class: 'pf-loading', text: 'جارٍ التحميل…' }));
  const empty = (t) => content.replaceChildren(h('p', { class: 'pf-empty', text: t }));
  const fail = (e) => toast(friendlyError(e), 'err');
  const field = (label, input, hint) => h('div', { class: 'pf-field' }, h('label', { text: label }), input, hint ? h('small', { text: hint }) : null);
  const kv = (a, b) => h('div', { class: 'pf-kv' }, h('span', {}, a), h('span', {}, String(b)));
  const waLink = (phone) => phone ? h('a', { href: 'https://wa.me/2' + phone, target: '_blank', rel: 'noopener noreferrer', class: 'pf-link', text: phone, dir: 'ltr' }) : h('span', {}, '—');
  const chips = (list, current, set) => list.map(([k, label]) => h('button', { class: 'pf-btn sm ' + (current === k ? '' : 'ghost'), type: 'button', onclick: () => set(k) }, label));

  async function loadCatalog() {
    const [l, p, s, pl] = await Promise.all([
      sb.from('lessons').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      sb.from('pdf_files').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      loadSettings(),
      sb.from('plans').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    ]);
    if (l.error || p.error) fail(l.error || p.error);
    lessons = l.data || []; pdfs = p.data || []; settings = s || {}; plans = (pl && pl.data) || [];
  }
  async function refreshCounts() {
    const [o, s] = await Promise.all([
      sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    ]);
    [['#pendingCount', o.count], ['#pendingSubs', s.count]].forEach(([sel, n]) => { const b = $(sel); b.textContent = n || 0; b.hidden = !n; });
  }
  async function profilesFor(ids) {
    const { data } = await sb.from('profiles').select('*').in('id', [...new Set(ids)]);
    return Object.fromEntries((data || []).map((p) => [p.id, p]));
  }
  async function showReceipt(path) {
    const { data, error } = await sb.storage.from('receipts').createSignedUrl(path, 300);
    if (error || !data) return fail(error || 'تعذّر فتح الإيصال');
    openModal({ title: 'إيصال الدفع', wide: true, body: h('img', { class: 'pf-receipt', src: data.signedUrl, alt: 'إيصال الدفع' }) });
  }

  /* =============== طلبات الدفع (حصص/ملفات) =============== */
  async function renderOrders() {
    toolbar.replaceChildren(...chips([['pending', 'معلّقة'], ['approved', 'مقبولة'], ['rejected', 'مرفوضة'], ['all', 'الكل']], orderFilter, (k) => { orderFilter = k; render(); }));
    loading();
    let q = sb.from('orders').select('*').order('created_at', { ascending: false }).limit(300);
    if (orderFilter !== 'all') q = q.eq('status', orderFilter);
    const { data: orders, error } = await q;
    if (error) { fail(error); return empty('تعذّر تحميل الطلبات.'); }
    refreshCounts();
    if (!orders.length) return empty('لا توجد طلبات في هذه القائمة.');
    const P = await profilesFor(orders.map((o) => o.user_id));
    const itemTitle = (o) => {
      if (o.item_type === 'bundle') { const l = lessons.find((x) => x.id === o.item_id); const f = l && pdfs.find((p) => p.id === l.pdf_id); return l ? '📦 ' + l.title + ' + ' + (f ? f.title : 'ملف') : '(محذوف)'; }
      const it = (o.item_type === 'lesson' ? lessons : pdfs).find((x) => x.id === o.item_id); return it ? it.title : '(محذوف)'; };
    const st = { pending: 'معلّق ⏳', approved: 'مقبول ✓', rejected: 'مرفوض' };
    content.replaceChildren(h('div', { class: 'pf-grid' }, orders.map((o) => {
      const p = P[o.user_id] || {};
      return h('article', { class: 'pf-card glass-card pf-order' },
        h('div', { class: 'pf-meta' }, h('span', { class: 'pf-badge ' + o.status }, st[o.status]), h('span', { class: 'pf-badge off' }, o.method === 'instapay' ? 'إنستا باي' : 'WE Pay'), h('span', { class: 'pf-badge info' }, o.item_type === 'lesson' ? 'حصة' : o.item_type === 'bundle' ? 'باقة' : 'ملف')),
        h('h3', { text: itemTitle(o) }), kv('الطالب', p.full_name || '—'), kv('الصف', p.grade || '—'),
        h('div', { class: 'pf-kv' }, h('span', {}, 'تليفون الطالب'), waLink(p.phone)), h('div', { class: 'pf-kv' }, h('span', {}, 'ولي الأمر'), waLink(p.parent_phone)),
        kv('المبلغ المطلوب', `${o.amount_egp} ج`), kv('حوّل من رقم', o.sender_phone), kv('رقم العملية', o.transaction_ref || '—'), kv('التاريخ', fmtDate(o.created_at)), o.admin_note ? kv('ملاحظة', o.admin_note) : null,
        h('div', { class: 'pf-actions' },
          o.receipt_path ? h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => showReceipt(o.receipt_path) }, '🖼 الإيصال') : null,
          o.status !== 'approved' ? h('button', { class: 'pf-btn ok sm', type: 'button', onclick: () => reviewOrder(o, 'approved') }, '✓ قبول') : null,
          o.status !== 'rejected' ? h('button', { class: 'pf-btn danger sm', type: 'button', onclick: () => reviewOrder(o, 'rejected') }, '✕ رفض') : null));
    })));
  }
  async function reviewOrder(o, status) {
    let note = '';
    if (status === 'approved') { if (!confirm(`تأكد إنك راجعت التحويل في تطبيقك قبل القبول.\nقبول الطلب (${o.amount_egp} ج)؟`)) return; }
    else { const r = prompt('سبب الرفض (يظهر للطالب):', ''); if (r === null) return; note = r.trim(); }
    const { error } = await sb.from('orders').update({ status, admin_note: note }).eq('id', o.id);
    if (error) return fail(error);
    toast(status === 'approved' ? 'تم قبول الطلب وتفعيل المحتوى ✅' : 'تم رفض الطلب'); render();
  }

  /* =============== طلبات الاشتراك =============== */
  async function renderSubs() {
    toolbar.replaceChildren(...chips([['pending', 'معلّقة'], ['approved', 'مقبولة'], ['rejected', 'مرفوضة'], ['all', 'الكل']], subFilter, (k) => { subFilter = k; render(); }));
    loading();
    let q = sb.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(300);
    if (subFilter !== 'all') q = q.eq('status', subFilter);
    const { data: subs, error } = await q;
    if (error) { fail(error); return empty('تعذّر تحميل طلبات الاشتراك. تأكد إنك شغّلت ملف 03_registration_control.sql.'); }
    refreshCounts();
    if (!subs.length) return empty('لا توجد طلبات اشتراك في هذه القائمة.');
    const P = await profilesFor(subs.map((s) => s.user_id));
    const st = { pending: 'معلّق ⏳', approved: 'مقبول ✓', rejected: 'مرفوض' };
    content.replaceChildren(h('div', { class: 'pf-grid' }, subs.map((s) => {
      const p = P[s.user_id] || {};
      return h('article', { class: 'pf-card glass-card pf-order' },
        h('div', { class: 'pf-meta' }, h('span', { class: 'pf-badge ' + s.status }, st[s.status]), h('span', { class: 'pf-badge off' }, s.method === 'instapay' ? 'إنستا باي' : 'WE Pay'), h('span', { class: 'pf-badge info' }, 'اشتراك')),
        h('h3', { text: p.full_name || '—' }), kv('الخطة', (plans.find((x) => x.id === s.plan_id) || {}).name || '—'), kv('الصف', s.grade),
        h('div', { class: 'pf-kv' }, h('span', {}, 'تليفون الطالب'), waLink(p.phone)), h('div', { class: 'pf-kv' }, h('span', {}, 'ولي الأمر'), waLink(p.parent_phone)),
        kv('المبلغ', `${s.amount_egp} ج`), kv('الشهور', s.months), kv('حوّل من رقم', s.sender_phone), kv('رقم العملية', s.transaction_ref || '—'), kv('التاريخ', fmtDate(s.created_at)),
        p.subscribed_until ? kv('اشتراكه الحالي حتى', fmtDate(p.subscribed_until)) : null, s.admin_note ? kv('ملاحظة', s.admin_note) : null,
        h('div', { class: 'pf-actions' },
          s.receipt_path ? h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => showReceipt(s.receipt_path) }, '🖼 الإيصال') : null,
          s.status === 'pending' ? h('button', { class: 'pf-btn ok sm', type: 'button', onclick: () => reviewSub(s, 'approved') }, '✓ قبول وتفعيل') : null,
          s.status === 'pending' ? h('button', { class: 'pf-btn danger sm', type: 'button', onclick: () => reviewSub(s, 'rejected') }, '✕ رفض') : null));
    })));
  }
  async function reviewSub(s, status) {
    let note = '', months = null;
    if (status === 'approved') {
      const m = prompt(`تأكد إنك راجعت التحويل (${s.amount_egp} ج) في تطبيقك.\nعدد شهور الاشتراك اللي هتتفعّل:`, String(s.months));
      if (m === null) return; months = parseInt(m, 10);
      if (!Number.isFinite(months) || months < 1 || months > 12) return toast('عدد الشهور لازم بين 1 و 12', 'err');
    } else { const r = prompt('سبب الرفض (يظهر للطالب):', ''); if (r === null) return; note = r.trim(); }
    const { error } = await sb.rpc('review_subscription', { p_id: s.id, p_status: status, p_note: note, p_months: months });
    if (error) return fail(error);
    toast(status === 'approved' ? 'تم تفعيل الاشتراك ✅' : 'تم رفض الطلب'); render();
  }

  /* =============== التسجيلات (الصفحة العامة) =============== */
  function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  function exportCsv(rows) {
    const phone = (p) => csvCell('="' + p + '"'); // يحافظ على الصفر في Excel
    const lines = [['الاسم', 'رقم الطالب', 'رقم ولي الأمر', 'الصف', 'تاريخ التسجيل'].map(csvCell).join(',')]
      .concat(rows.map((r) => [csvCell(r.full_name), phone(r.phone), phone(r.parent_phone), csvCell(r.grade), csvCell(fmtDate(r.created_at))].join(',')));
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'registrations.csv' }); document.body.append(a); a.click(); a.remove();
  }
  async function renderRegistrations() {
    toolbar.replaceChildren(); loading();
    const { data, error } = await sb.from('registrations').select('*').order('created_at', { ascending: false }).limit(3000);
    if (error) { fail(error); return empty('تعذّر تحميل التسجيلات. تأكد إنك شغّلت ملف 03_registration_control.sql.'); }
    const search = h('input', { class: 'form-input', type: 'search', placeholder: 'بحث بالاسم أو الرقم…', 'aria-label': 'بحث' });
    const gsel = h('select', { class: 'form-input', 'aria-label': 'الصف' }, h('option', { value: '' }, 'كل الصفوف'), ...GRADES.map((g) => h('option', { value: g }, g)));
    let view = data;
    toolbar.replaceChildren(search, gsel, h('span', { class: 'pf-badge info', id: 'regCount' }), h('span', { class: 'pf-spacer' }),
      h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => exportCsv(view) }, '⬇ تصدير CSV'));
    const tbody = h('tbody');
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      view = data.filter((r) => (!gsel.value || r.grade === gsel.value) && (!q || r.full_name.toLowerCase().includes(q) || r.phone.includes(q) || r.parent_phone.includes(q)));
      $('#regCount').textContent = `${view.length} من ${data.length}`;
      tbody.replaceChildren(...view.map((r) => h('tr', {}, h('td', { text: r.full_name }), h('td', {}, waLink(r.phone)), h('td', {}, waLink(r.parent_phone)), h('td', { text: r.grade }), h('td', { text: fmtDate(r.created_at) }),
        h('td', {}, h('button', { class: 'pf-btn danger sm', type: 'button', onclick: async () => { if (!confirm(`حذف تسجيل "${r.full_name}"؟`)) return; const d = await sb.from('registrations').delete().eq('id', r.id); if (d.error) return fail(d.error); toast('تم الحذف'); render(); } }, 'حذف')))));
    };
    search.addEventListener('input', draw); gsel.addEventListener('change', draw); draw();
    content.replaceChildren(data.length ? h('div', { class: 'pf-table-wrap' }, h('table', { class: 'pf-table' }, h('thead', {}, h('tr', {}, ...['الاسم', 'رقم الطالب', 'ولي الأمر', 'الصف', 'التاريخ', ''].map((t) => h('th', { text: t })))), tbody)) : h('p', { class: 'pf-empty', text: 'لا توجد تسجيلات بعد.' }));
  }

  /* =============== الحصص والملفات =============== */
  const accessOf = (it) => (it.is_free ? 'free' : it.for_subscribers ? (it.allow_purchase === false ? 'subscribers' : 'both') : 'paid');
  function itemCard(type, it) {
    const table = type === 'lesson' ? 'lessons' : 'pdf_files';
    const patch = async (obj) => { const { error } = await sb.from(table).update(obj).eq('id', it.id); if (error) return fail(error); await loadCatalog(); render(); };
    const a = accessOf(it);
    return h('article', { class: 'pf-card glass-card' },
      h('div', { class: 'pf-meta' }, h('span', { class: 'pf-badge ' + (it.is_published ? 'ok' : 'off') }, it.is_published ? 'منشور' : 'مخفي'),
        h('span', { class: 'pf-badge ' + (a === 'free' ? 'free' : 'lock') }, a === 'free' ? 'مجاني' : a === 'subscribers' ? '⭐ للمشتركين فقط' : a === 'both' ? `⭐ مشتركين + شراء ${it.price_egp} ج` : `مدفوع ${it.price_egp} ج`), h('span', { class: 'pf-badge info' }, gradeLabel(it.grade))),
      h('h3', { text: it.title }), it.description ? h('p', { text: it.description }) : null,
      h('div', { class: 'pf-actions' },
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => patch({ is_published: !it.is_published }) }, it.is_published ? 'إخفاء' : 'نشر'),
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => type === 'lesson' ? lessonForm(it) : pdfForm(it) }, 'تعديل'),
        h('button', { class: 'pf-btn danger sm', type: 'button', onclick: () => removeItem(type, it) }, 'حذف')));
  }
  async function removeItem(type, it) {
    if (!confirm(`حذف "${it.title}" نهائيًا؟ لا يمكن التراجع.`)) return;
    if (type === 'pdf') await sb.storage.from('pdfs').remove([it.file_path]);
    if (type === 'lesson' && it.pdf_id) { const own = pdfs.find((p) => p.id === it.pdf_id && p.lesson_only); if (own) await sb.storage.from('pdfs').remove([own.file_path]); }
    const { error } = await sb.from(type === 'lesson' ? 'lessons' : 'pdf_files').delete().eq('id', it.id);
    if (error) return fail(error);
    toast('تم الحذف'); await loadCatalog(); render();
  }
  const basicFields = (it) => {
    const f = {
      title: h('input', { class: 'form-input', type: 'text', maxlength: '140', value: it ? it.title : '' }),
      desc: h('textarea', { class: 'form-input', maxlength: '600' }, it ? it.description : ''),
      grade: h('select', { class: 'form-input' }, h('option', { value: 'all' }, 'كل الصفوف'), ...GRADES.map((g) => h('option', { value: g }, g))),
      access: h('select', { class: 'form-input' }, h('option', { value: 'paid' }, 'مدفوع (شراء فردي فقط)'), h('option', { value: 'both' }, '⭐ شراء فردي + مفتوح للمشتركين'), h('option', { value: 'subscribers' }, '⭐ للمشتركين فقط (بدون شراء فردي)'), h('option', { value: 'free' }, 'مجاني لكل الطلاب المسجّلين')),
      pub: h('input', { type: 'checkbox' }),
      price: h('input', { class: 'form-input', type: 'number', min: '0', step: '1', value: it ? it.price_egp : numberOr(settings.default_lesson_price, 85) }),
      sort: h('input', { class: 'form-input', type: 'number', step: '1', value: it ? it.sort_order : 0 })
    };
    f.grade.value = it ? it.grade : 'all'; f.access.value = it ? accessOf(it) : 'paid'; f.pub.checked = it ? it.is_published : true;
    const sync = () => { f.price.disabled = !['paid', 'both'].includes(f.access.value); }; f.access.addEventListener('change', sync); sync();
    return f;
  };
  const rowFrom = (f, title) => ({ title, description: f.desc.value.trim(), grade: f.grade.value, is_free: f.access.value === 'free', for_subscribers: ['subscribers', 'both'].includes(f.access.value), allow_purchase: ['paid', 'both', 'free'].includes(f.access.value),
    price_egp: numberOr(f.price.value, 85), is_published: f.pub.checked, sort_order: numberOr(f.sort.value, 0) || 0 });
  const accessHint = 'مدفوع: يشتريها الطالب بسعرها. شراء فردي + مشتركين: يقدر يشتريها أي طالب لوحدها، وتفتح تلقائيًا لأي مشترك اشتراكه ساري. للمشتركين فقط: ما تتباعش لوحدها. مجاني: تفتح لكل الطلاب المسجّلين.';

  function renderLessons() {
    toolbar.replaceChildren(h('button', { class: 'pf-btn', type: 'button', onclick: () => lessonForm() }, '＋ حصة جديدة'));
    if (!lessons.length) return empty('لسه ما أضفتش أي حصة.');
    content.replaceChildren(h('div', { class: 'pf-grid' }, lessons.map((l) => itemCard('lesson', l))));
  }
  function lessonForm(it) {
    const f = basicFields(it);
    f.dur = h('input', { class: 'form-input', type: 'number', min: '0', value: it && it.duration_minutes ? it.duration_minutes : '' });
    f.prov = h('select', { class: 'form-input' }, ...[['youtube', 'يوتيوب (غير مدرج)'], ['drive', 'Google Drive (لازم الملف يكون متاح لأي حد معاه الرابط)'], ['vimeo', 'Vimeo'], ['bunny', 'Bunny Stream'], ['url', 'رابط ملف فيديو مباشر (mp4)']].map(([v, l]) => h('option', { value: v }, l)));
    f.video = h('input', { class: 'form-input', type: 'text', dir: 'ltr', placeholder: 'الصق رابط الفيديو هنا' });
    f.video.addEventListener('input', () => { const d = detectProvider(f.video.value); if (d) f.prov.value = d; });
    const msg = h('p', { class: 'pf-msg', role: 'alert' }), btn = h('button', { class: 'pf-btn', type: 'submit', style: 'width:100%' }, 'حفظ');
    const form = h('form', { novalidate: true },
      field('عنوان الحصة', f.title), field('الوصف (اختياري)', f.desc), h('div', { class: 'pf-row' }, field('الصف', f.grade), field('المدة بالدقائق', f.dur)),
      h('div', { class: 'pf-row' }, field('مصدر الفيديو', f.prov), field('رابط/معرّف الفيديو', f.video, it ? 'اتركه فارغًا للإبقاء على الفيديو الحالي' : null)),
      field('نوع الإتاحة', f.access, accessHint), h('div', { class: 'pf-row' }, field('السعر (جنيه)', f.price), field('الترتيب', f.sort, 'الأصغر يظهر أولًا')),
      h('label', { class: 'pf-check' }, f.pub, 'منشورة (ظاهرة للطلاب)'), h('br'), btn, msg);
    if (it) sb.from('lesson_media').select('*').eq('lesson_id', it.id).maybeSingle().then(({ data }) => { if (data) f.prov.value = data.provider; });
    const m = openModal({ title: it ? 'تعديل حصة' : 'حصة جديدة', body: form, wide: true });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.className = 'pf-msg err';
      const title = f.title.value.trim(); if (title.length < 3) return (msg.textContent = 'اكتب عنوانًا للحصة.');
      const raw = f.video.value.trim(); let ref = null;
      if (raw || !it) { ref = normalizeVideo(f.prov.value, raw); if (!ref) return (msg.textContent = 'رابط الفيديو غير صالح لهذا المصدر. تأكد من اللينك أو اختر المصدر الصحيح.'); }
      const row = { ...rowFrom(f, title), duration_minutes: f.dur.value ? numberOr(f.dur.value, null) : null };
      btn.disabled = true; msg.className = 'pf-msg'; msg.textContent = 'جارٍ الحفظ…';
      try {
        let id = it && it.id;
        if (it) { const r = await sb.from('lessons').update(row).eq('id', id); if (r.error) throw r.error; }
        else { const r = await sb.from('lessons').insert(row).select().single(); if (r.error) throw r.error; id = r.data.id; }
        // لو الأدمن حذف ملف الحصة أو بدّله بملف من القسم: امسح القديم
        if (own && (f.pdf.value === '__none' || f.pdf.value)) { await sb.from('pdf_files').delete().eq('id', own.id); await sb.storage.from('pdfs').remove([own.file_path]); }
        if (oldOwnPath) await sb.storage.from('pdfs').remove([oldOwnPath]);
        if (ref) {
          const mm = await sb.from('lesson_media').upsert({ lesson_id: id, provider: f.prov.value, video_ref: ref }, { onConflict: 'lesson_id' });
          if (mm.error) { if (!it) await sb.from('lessons').delete().eq('id', id); throw mm.error; }
        } else if (it) { await sb.from('lesson_media').update({ provider: f.prov.value }).eq('lesson_id', id); }
        m.close(); toast('تم الحفظ ✅'); await loadCatalog(); render();
      } catch (err) {
        if (newPdfId) await sb.from('pdf_files').delete().eq('id', newPdfId);
        if (newPath) await sb.storage.from('pdfs').remove([newPath]);
        msg.className = 'pf-msg err'; msg.textContent = friendlyError(err); btn.disabled = false; }
    });
  }
  function renderPdfs() {
    toolbar.replaceChildren(h('button', { class: 'pf-btn', type: 'button', onclick: () => pdfForm() }, '＋ رفع ملف PDF'));
    const lib = pdfs.filter((p) => !p.lesson_only);   // ملفات الحصص بتظهر جوه الحصة بس
    if (!lib.length) return empty('لسه ما رفعتش أي ملف.');
    content.replaceChildren(h('div', { class: 'pf-grid' }, lib.map((p) => itemCard('pdf', p))));
  }
  function pdfForm(it) {
    const f = basicFields(it);
    f.file = h('input', { class: 'form-input', type: 'file', accept: 'application/pdf' });
    const msg = h('p', { class: 'pf-msg', role: 'alert' }), btn = h('button', { class: 'pf-btn', type: 'submit', style: 'width:100%' }, 'حفظ');
    const form = h('form', { novalidate: true },
      field('عنوان الملف', f.title), field('الوصف (اختياري)', f.desc), field(it ? 'استبدال الملف (اختياري)' : 'ملف PDF', f.file, 'حتى 50MB'),
      h('div', { class: 'pf-row' }, field('الصف', f.grade), field('الترتيب', f.sort)), field('نوع الإتاحة', f.access, accessHint), field('السعر (جنيه)', f.price),
      h('label', { class: 'pf-check' }, f.pub, 'منشور (ظاهر للطلاب)'), h('br'), btn, msg);
    const m = openModal({ title: it ? 'تعديل ملف' : 'رفع ملف PDF', body: form });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.className = 'pf-msg err';
      const title = f.title.value.trim(); if (title.length < 3) return (msg.textContent = 'اكتب عنوانًا للملف.');
      const file = f.file.files[0];
      if (!it && !file) return (msg.textContent = 'اختر ملف PDF.');
      if (file && file.type !== 'application/pdf') return (msg.textContent = 'الملف لازم يكون PDF.');
      if (file && file.size > 50 * 1024 * 1024) return (msg.textContent = 'حجم الملف أكبر من 50MB.');
      const row = rowFrom(f, title);
      btn.disabled = true; msg.className = 'pf-msg'; msg.textContent = file ? 'جارٍ رفع الملف…' : 'جارٍ الحفظ…';
      let newPath = null;
      try {
        if (file) { newPath = `${uuid()}.pdf`; const up = await sb.storage.from('pdfs').upload(newPath, file, { contentType: 'application/pdf', upsert: false }); if (up.error) throw up.error; row.file_path = newPath; }
        if (it) { const r = await sb.from('pdf_files').update(row).eq('id', it.id); if (r.error) throw r.error; if (newPath) await sb.storage.from('pdfs').remove([it.file_path]); }
        else { const r = await sb.from('pdf_files').insert(row); if (r.error) throw r.error; }
        m.close(); toast('تم الحفظ ✅'); await loadCatalog(); render();
      } catch (err) { if (newPath) await sb.storage.from('pdfs').remove([newPath]); msg.className = 'pf-msg err'; msg.textContent = friendlyError(err); btn.disabled = false; }
    });
  }

  /* =============== الطلاب =============== */
  async function renderStudents() {
    toolbar.replaceChildren(); loading();
    const [pr, prog] = await Promise.all([sb.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }).limit(2000), sb.rpc('student_progress')]);
    const { data, error } = pr;
    if (error) { fail(error); return empty('تعذّر تحميل الطلاب.'); }
    const progress = {}; ((prog && prog.data) || []).forEach((r) => { progress[r.user_id] = r; });
    const search = h('input', { class: 'form-input', type: 'search', placeholder: 'بحث بالاسم أو الرقم…', 'aria-label': 'بحث' });
    toolbar.replaceChildren(search, h('span', { class: 'pf-badge info', text: `${data.length} طالب` }));
    const tbody = h('tbody');
    const subRpc = async (fn, args, ok) => { const r = await sb.rpc(fn, args); if (r.error) return fail(r.error); toast(ok); render(); };
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      tbody.replaceChildren(...data.filter((p) => !q || (p.full_name || '').toLowerCase().includes(q) || (p.phone || '').includes(q) || (p.parent_phone || '').includes(q)).map((p) => {
        const active = p.subscribed_until && new Date(p.subscribed_until) > new Date();
        return h('tr', {}, h('td', { text: p.full_name || '—' }), h('td', {}, waLink(p.phone)), h('td', {}, waLink(p.parent_phone)), h('td', { text: p.grade || '—' }),
          h('td', {}, active ? h('span', { class: 'pf-badge ok', text: 'حتى ' + new Date(p.subscribed_until).toLocaleDateString('ar-EG-u-nu-latn') }) : h('span', { class: 'pf-badge off', text: 'غير مشترك' })),
          h('td', {}, progress[p.id] ? h('span', { class: 'pf-badge info', text: `شاهد ${progress[p.id].watched} من ${progress[p.id].total} حصة` }) : h('span', { class: 'pf-badge off', text: '—' })),
          h('td', {}, h('div', { class: 'pf-actions', style: 'padding:0;margin:0' },
            h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => { const m = parseInt(prompt('عدد شهور الاشتراك اللي هتضيفها:', '1'), 10); if (!Number.isFinite(m)) return; if (m < 1 || m > 12) return toast('عدد الشهور بين 1 و 12', 'err'); subRpc('grant_subscription', { p_user: p.id, p_months: m }, 'تم تمديد الاشتراك ✅'); } }, '＋ اشتراك'),
            active ? h('button', { class: 'pf-btn danger sm', type: 'button', onclick: () => { const why = prompt(`سبب إلغاء اشتراك "${p.full_name}" (هيوصله على الإيميل):`, ''); if (why === null) return; subRpc('revoke_subscription', { p_user: p.id, p_reason: why.trim() }, 'تم إلغاء الاشتراك وإبلاغ الطالب'); } }, 'إلغاء') : null)));
      }));
    };
    search.addEventListener('input', draw); draw();
    content.replaceChildren(data.length ? h('div', { class: 'pf-table-wrap' }, h('table', { class: 'pf-table', style: 'min-width:860px' }, h('thead', {}, h('tr', {}, ...['الاسم', 'الموبايل', 'ولي الأمر', 'الصف', 'الاشتراك', 'الحصص المشاهَدة', 'إجراءات'].map((t) => h('th', { text: t })))), tbody)) : h('p', { class: 'pf-empty', text: 'لا يوجد طلاب بحسابات بعد (التسجيل العام في تبويب "التسجيلات").' }));
  }

  /* =============== الإعدادات (وفيها التحكم في حالة التسجيل) =============== */
  const MODES = [
    ['registration', '📝 تسجيل عادي', 'نموذج بسيط (الاسم، رقم الطالب، رقم ولي الأمر، الصف) وبعده يظهر جروب الواتساب. مناسب لأول السنة.'],
    ['subscription', '⭐ اشتراك', 'التسجيل العادي يتقفل، وتظهر صفحة اشتراك مدفوعة (إنستا باي / WE Pay) للطلاب بحسابات. مناسب لباقي السنة.'],
    ['closed', '⛔ مقفول', 'لا تسجيل ولا اشتراك. بتظهر رسالة القفل اللي تكتبها تحت.']];
  function renderSettings() {
    toolbar.replaceChildren();
    let mode = settings.registration_mode || 'registration';
    const modeBox = h('div', { class: 'pf-pay' }, MODES.map(([k, t, d]) => h('label', { style: 'align-items:flex-start' },
      h('input', { type: 'radio', name: 'mode', value: k, checked: k === mode, onchange: () => { mode = k; } }), h('span', {}, h('strong', { text: t }), h('br'), h('small', { style: 'color:var(--text-secondary);font-weight:600', text: d })))));
    const inp = (k, type = 'text', extra = {}) => h('input', { class: 'form-input', type, dir: type === 'text' && extra.ltr ? 'ltr' : null, value: settings[k] || '', ...extra });
    const closedMsg = h('textarea', { class: 'form-input', maxlength: '300' }, settings.registration_closed_message || '');
    const wa = h('input', { class: 'form-input', type: 'tel', dir: 'ltr', maxlength: '12', value: settings.contact_whatsapp ? String(settings.contact_whatsapp).replace(/^20/, '0') : '' });
    const ph = inp('contact_phone', 'tel', { maxlength: '11', dir: 'ltr' });
    const g1 = inp('group_link_g1', 'text', { ltr: true, placeholder: 'https://chat.whatsapp.com/…' }), g2 = inp('group_link_g2', 'text', { ltr: true, placeholder: 'https://chat.whatsapp.com/…' });
    const insta = inp('instapay_number', 'tel', { maxlength: '11', dir: 'ltr' }), we = inp('wepay_number', 'tel', { maxlength: '11', dir: 'ltr' }), dprice = inp('default_lesson_price', 'number', { min: '0' });
    const msg = h('p', { class: 'pf-msg', role: 'alert' }), btn = h('button', { class: 'pf-btn', type: 'submit' }, 'حفظ الإعدادات');
    const WA_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(\?[^\s]*)?$/;
    const sec = (title, ...kids) => h('div', { class: 'glass-card', style: 'padding:1.4rem;margin-bottom:1.1rem' }, h('h3', { style: 'margin-bottom:1rem;font-weight:900', text: title }), ...kids);
    const form = h('form', { style: 'max-width:640px', novalidate: true },
      sec('حالة صفحة التسجيل', h('p', { class: 'pf-sub', style: 'margin-bottom:1rem' }, 'الحالة الحالية: ', h('strong', { text: (MODES.find((m) => m[0] === (settings.registration_mode || 'registration')) || MODES[0])[1] })), modeBox, field('رسالة القفل (تظهر لما التسجيل يكون مقفول)', closedMsg)),
      sec('أرقام التواصل (تتطبق على كل لينكات الواتساب والاتصال في الموقع)', h('div', { class: 'pf-row' }, field('رقم الواتساب', wa), field('رقم الاتصال', ph)), h('p', { class: 'pf-sub', style: 'margin:0', text: 'أسعار الاشتراك والخطط بتتعدل من تبويب «الخطط».' })),
      sec('جروبات الواتساب (تظهر بعد التسجيل)', field('جروب الصف الأول', g1), field('جروب الصف الثاني', g2)),
      sec('الدفع والأسعار', h('div', { class: 'pf-row' }, field('رقم إنستا باي', insta), field('رقم WE Pay', we)), field('السعر الافتراضي للحصة الجديدة (جنيه)', dprice)),
      btn, msg);
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.className = 'pf-msg err';
      if (!PHONE_RE.test(insta.value.trim()) || !PHONE_RE.test(we.value.trim())) return (msg.textContent = 'أرقام الدفع لازم تكون 11 رقم صحيح.');
      const waNum = (wa.value || '').replace(/\D/g, '').replace(/^0/, '20'); // 01xxxxxxxxx → 201xxxxxxxxx
      if (!/^201[0125]\d{8}$/.test(waNum)) return (msg.textContent = 'رقم الواتساب لازم يكون رقم موبايل مصري صحيح (11 رقم).');
      if (!PHONE_RE.test(ph.value.trim())) return (msg.textContent = 'رقم الاتصال لازم يكون 11 رقم صحيح.');
      for (const g of [g1, g2]) if (g.value.trim() && !WA_RE.test(g.value.trim())) return (msg.textContent = 'رابط جروب الواتساب غير صحيح (لازم يبدأ بـ https://chat.whatsapp.com/).');
      if (mode === 'closed' && !closedMsg.value.trim()) return (msg.textContent = 'اكتب رسالة القفل.');
      btn.disabled = true;
      const rows = [['registration_mode', mode], ['registration_closed_message', closedMsg.value.trim()], ['contact_whatsapp', waNum], ['contact_phone', ph.value.trim()],
        ['group_link_g1', g1.value.trim()], ['group_link_g2', g2.value.trim()], ['instapay_number', insta.value.trim()], ['wepay_number', we.value.trim()], ['default_lesson_price', String(numberOr(dprice.value, 85))]].map(([key, value]) => ({ key, value }));
      const { error } = await sb.from('settings').upsert(rows, { onConflict: 'key' });
      btn.disabled = false;
      if (error) { msg.textContent = friendlyError(error); return; }
      msg.className = 'pf-msg ok'; msg.textContent = 'تم الحفظ ✅ — التغيير ظاهر للطلاب فورًا.'; await loadCatalog(); renderSettings();
      const m2 = $('.pf-msg', content); if (m2) { m2.className = 'pf-msg ok'; m2.textContent = 'تم الحفظ ✅ — التغيير ظاهر للطلاب فورًا.'; }
    });
    content.replaceChildren(form);
  }

  /* =============== الخطط =============== */
  const planTxt = (p) => (p.price_egp === 0 ? 'مجانًا' : `${p.price_egp} جنيه` + (p.months === 1 ? ' / شهر' : ` / ${p.months} شهور`));
  function renderPlans() {
    toolbar.replaceChildren(h('button', { class: 'pf-btn', type: 'button', onclick: () => planForm() }, '＋ خطة جديدة'),
      h('span', { class: 'pf-sub', style: 'margin:0', text: 'خطط «اشتراك» الطالب بيشتريها من صفحة الاشتراك. خطط «عرض فقط» بتظهر في صفحة الأسعار بزر تواصل.' }));
    if (!plans.length) return empty('لا توجد خطط. اضغط «خطة جديدة».');
    content.replaceChildren(h('div', { class: 'pf-grid' }, plans.map((p) => h('article', { class: 'pf-card glass-card' },
      h('div', { class: 'pf-meta' }, h('span', { class: 'pf-badge ' + (p.is_active ? 'ok' : 'off') }, p.is_active ? 'ظاهرة' : 'مخفية'),
        h('span', { class: 'pf-badge ' + (p.kind === 'subscription' ? 'lock' : 'info') }, p.kind === 'subscription' ? '⭐ اشتراك' : 'عرض فقط'), h('span', { class: 'pf-badge info' }, gradeLabel(p.grade))),
      h('h3', { text: p.name }), h('p', { style: 'font-weight:900;color:var(--color-accent);font-size:1.15rem', text: planTxt(p) }),
      p.details ? h('p', { style: 'white-space:pre-line', text: p.details }) : null,
      h('div', { class: 'pf-actions' },
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: async () => { const r = await sb.from('plans').update({ is_active: !p.is_active }).eq('id', p.id); if (r.error) return fail(r.error); await loadCatalog(); render(); } }, p.is_active ? 'إخفاء' : 'إظهار'),
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => planForm(p) }, 'تعديل'),
        h('button', { class: 'pf-btn danger sm', type: 'button', onclick: async () => { if (!confirm(`حذف خطة "${p.name}"؟ طلبات الاشتراك القديمة هتفضل محفوظة.`)) return; const r = await sb.from('plans').delete().eq('id', p.id); if (r.error) return fail(r.error); toast('تم الحذف'); await loadCatalog(); render(); } }, 'حذف'))))));
  }
  function planForm(it) {
    const f = {
      name: h('input', { class: 'form-input', type: 'text', maxlength: '80', value: it ? it.name : '' }),
      grade: h('select', { class: 'form-input' }, h('option', { value: 'all' }, 'كل الصفوف'), ...GRADES.map((g) => h('option', { value: g }, g))),
      kind: h('select', { class: 'form-input' }, h('option', { value: 'subscription' }, '⭐ اشتراك (الطالب بيشتريه من صفحة الاشتراك)'), h('option', { value: 'info' }, 'عرض فقط (زر تواصل)')),
      price: h('input', { class: 'form-input', type: 'number', min: '0', step: '1', value: it ? it.price_egp : 150 }),
      months: h('input', { class: 'form-input', type: 'number', min: '1', max: '12', step: '1', value: it ? it.months : 1 }),
      details: h('textarea', { class: 'form-input', maxlength: '1500', style: 'min-height:120px' }, it ? it.details : ''),
      cta: h('input', { class: 'form-input', type: 'text', maxlength: '60', value: it ? it.cta_label : '' }),
      sort: h('input', { class: 'form-input', type: 'number', step: '1', value: it ? it.sort_order : plans.length + 1 }),
      active: h('input', { type: 'checkbox' })
    };
    f.grade.value = it ? it.grade : 'all'; f.kind.value = it ? it.kind : 'subscription'; f.active.checked = it ? it.is_active : true;
    const msg = h('p', { class: 'pf-msg', role: 'alert' }), btn = h('button', { class: 'pf-btn', type: 'submit', style: 'width:100%' }, 'حفظ');
    const form = h('form', { novalidate: true }, field('اسم الخطة', f.name), h('div', { class: 'pf-row' }, field('الصف', f.grade), field('النوع', f.kind)),
      h('div', { class: 'pf-row' }, field('السعر (جنيه)', f.price), field('المدة بالشهور', f.months)),
      field('التفاصيل (سطر لكل نقطة)', f.details, 'اكتب «العنوان: القيمة» وهتظهر كصف في الكارت، مثال: طريقة الحصص: أونلاين. أي سطر من غير «:» بيظهر كنقطة.'),
      h('div', { class: 'pf-row' }, field('نص الزر (اختياري)', f.cta), field('الترتيب', f.sort)), h('label', { class: 'pf-check' }, f.active, 'ظاهرة للطلاب'), h('br'), btn, msg);
    const m = openModal({ title: it ? 'تعديل خطة' : 'خطة جديدة', body: form, wide: true });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.className = 'pf-msg err';
      const name = f.name.value.trim(); if (name.length < 2) return (msg.textContent = 'اكتب اسم الخطة.');
      const price = parseInt(f.price.value, 10), months = parseInt(f.months.value, 10);
      if (!(price >= 0)) return (msg.textContent = 'اكتب سعرًا صحيحًا.'); if (!(months >= 1 && months <= 12)) return (msg.textContent = 'المدة من 1 إلى 12 شهر.');
      const row = { name, grade: f.grade.value, kind: f.kind.value, price_egp: price, months, details: f.details.value.trim(), cta_label: f.cta.value.trim(), sort_order: numberOr(f.sort.value, 0) || 0, is_active: f.active.checked };
      btn.disabled = true;
      const r = it ? await sb.from('plans').update(row).eq('id', it.id) : await sb.from('plans').insert(row);
      if (r.error) { msg.textContent = friendlyError(r.error); btn.disabled = false; return; }
      m.close(); toast('تم الحفظ ✅'); await loadCatalog(); render();
    });
  }

  /* =============== المحتوى (نصوص + قوائم) =============== */
  const PAGES = [['site', 'الهيدر والفوتر (كل الصفحات)', 'index.html'], ['index', 'الرئيسية', 'index.html'], ['features', 'المميزات', 'features.html'], ['curriculum', 'المنهج', 'curriculum.html'],
    ['notebooks', 'المذكرات', 'notebooks.html'], ['pricing', 'الأسعار', 'pricing.html'], ['faq', 'الأسئلة الشائعة', 'faq.html'], ['register', 'التسجيل', 'register.html']];
  let contentView = 'texts', contentPage = 'index';
  const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  async function fetchPage(file) { const r = await fetch(file + '?_=' + Date.now()); if (!r.ok) throw new Error('page'); return new DOMParser().parseFromString(await r.text(), 'text/html'); }

  function renderContent() {
    const views = [['texts', '✏️ نصوص الصفحات'], ['faq', '❓ الأسئلة الشائعة'], ['curriculum_g1', '🧭 منهج الصف الأول'], ['curriculum_g2', '🧭 منهج الصف الثاني']];
    const bar = chips(views, contentView, (k) => { contentView = k; render(); });
    if (contentView === 'texts') return renderTexts(bar);
    return renderItems(contentView, bar);
  }
  async function renderTexts(bar) {
    toolbar.replaceChildren(...bar); loading();
    const pageSel = h('select', { class: 'form-input', 'aria-label': 'الصفحة' }, PAGES.map(([k, l]) => h('option', { value: k }, l))); pageSel.value = contentPage;
    pageSel.addEventListener('change', () => { contentPage = pageSel.value; render(); });
    let doc, ov;
    try { [doc, ov] = await Promise.all([fetchPage(PAGES.find((p) => p[0] === contentPage)[2]), sb.from('site_content').select('key,value')]); } catch (e) { return empty('تعذّر تحميل الصفحة.'); }
    if (ov.error) { fail(ov.error); return empty('تعذّر تحميل التعديلات. تأكد إنك شغّلت ملف 04_cms_plans_drive.sql.'); }
    const OV = Object.fromEntries((ov.data || []).map((r) => [r.key, r.value]));
    const root = contentPage === 'site' ? Array.from(doc.querySelectorAll('header [data-k], footer [data-k]')) : Array.from(doc.querySelectorAll('main [data-k]'));
    const seen = new Set(), rows = [];
    root.forEach((el) => {
      const key = el.getAttribute('data-k'); if (seen.has(key)) return; seen.add(key);
      const sec = el.closest('section'); const secTitle = sec ? norm((sec.querySelector('h1,h2') || {}).textContent) : (el.closest('footer') ? 'الفوتر' : el.closest('header') ? 'الهيدر' : 'عام');
      rows.push({ key, def: norm(el.textContent), group: secTitle || 'عام', inline: el.tagName === 'SPAN' && el.parentElement && el.parentElement.tagName !== 'BODY', block: el.tagName === 'SPAN' ? el.parentElement : el });
    });
    const search = h('input', { class: 'form-input', type: 'search', placeholder: 'بحث في النصوص…', 'aria-label': 'بحث' });
    const saveBtn = h('button', { class: 'pf-btn', type: 'button' }, '💾 حفظ التعديلات');
    toolbar.replaceChildren(...bar, h('span', { class: 'pf-spacer', style: 'flex-basis:100%;height:0' }), pageSel, search, h('span', { class: 'pf-spacer' }), saveBtn);
    const inputs = [];
    let lastGroup = null, groupBlock = null, groupBox = null; const nodes = [];
    const rowsMeta = rows;
    rows.forEach((r) => {
      if (r.group !== lastGroup) { nodes.push(h('h3', { style: 'margin:1.4rem 0 .6rem;color:var(--color-accent);font-weight:900', text: r.group })); lastGroup = r.group; groupBlock = null; groupBox = null; }
      const long = r.def.length > 70;
      const input = h(long ? 'textarea' : 'input', long ? { class: 'form-input', rows: '3' } : { class: 'form-input', type: 'text' }, long ? (OV[r.key] != null ? OV[r.key] : r.def) : null);
      if (!long) input.value = OV[r.key] != null ? OV[r.key] : r.def;
      const reset = h('button', { class: 'pf-btn ghost sm', type: 'button', title: 'رجّع النص الأصلي', onclick: () => { input.value = r.def; } }, '↩ الأصلي');
      const wrap = h('div', { class: 'pf-field', 'data-search': (r.def + ' ' + (OV[r.key] || '')).toLowerCase() }, input,
        h('div', { class: 'pf-hint-row' }, h('small', {}, 'الأصلي: ' + (r.def.length > 70 ? r.def.slice(0, 70) + '…' : r.def)), reset));
      inputs.push({ r, input, wrap });
      if (r.inline) {   // أجزاء من نفس العنوان/الجملة: نجمعها في مربع واحد
        if (groupBox && r.block === groupBlock) groupBox.append(wrap);
        else { groupBlock = r.block; groupBox = h('div', { class: 'pf-fieldgroup' }, h('span', { class: 'pf-hint', text: 'أجزاء من نفس العنوان/الجملة — عدّل كل جزء لوحده:' }), wrap); nodes.push(groupBox); }
      } else { groupBlock = null; groupBox = null; nodes.push(wrap); }
    });
    search.addEventListener('input', () => { const q = search.value.trim().toLowerCase(); inputs.forEach(({ wrap }) => { wrap.style.display = !q || wrap.getAttribute('data-search').includes(q) ? '' : 'none'; }); });
    saveBtn.addEventListener('click', async () => {
      const up = [], del = [];
      inputs.forEach(({ r, input }) => { const v = input.value.trim(); if (!v || norm(v) === r.def) { if (r.key in OV) del.push(r.key); } else if (OV[r.key] !== v) up.push({ key: r.key, value: v, updated_at: new Date().toISOString() }); });
      if (!up.length && !del.length) return toast('مفيش تغييرات للحفظ');
      saveBtn.disabled = true;
      if (up.length) { const r = await sb.from('site_content').upsert(up, { onConflict: 'key' }); if (r.error) { saveBtn.disabled = false; return fail(r.error); } }
      for (const k of del) { const r = await sb.from('site_content').delete().eq('key', k); if (r.error) { saveBtn.disabled = false; return fail(r.error); } }
      saveBtn.disabled = false; toast(`تم الحفظ ✅ (${up.length} تعديل، ${del.length} رجوع للأصلي) — ظاهر في الموقع فورًا`); render();
    });
    content.replaceChildren(h('div', { class: 'pf-note' }, 'عدّل أي نص وبعدين «حفظ التعديلات». النص بيتطبق على الموقع فورًا لكل الزوار. (نص عادي بدون HTML)'), ...nodes);
  }
  async function renderItems(coll, bar) {
    toolbar.replaceChildren(...bar); loading();
    const { data, error } = await sb.from('site_items').select('*').eq('collection', coll).order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) { fail(error); return empty('تعذّر تحميل القائمة. تأكد إنك شغّلت ملف 04_cms_plans_drive.sql.'); }
    const isFaq = coll === 'faq';
    toolbar.replaceChildren(...bar, h('span', { class: 'pf-spacer' }), h('button', { class: 'pf-btn', type: 'button', onclick: () => itemForm(coll, null, data.length) }, '＋ إضافة'));
    if (!data.length) return content.replaceChildren(h('div', { class: 'pf-empty' }, h('p', { text: 'القائمة فاضية، والموقع بيعرض المحتوى الافتراضي. تقدر تستورده هنا وتعدّل عليه وتضيف وتحذف.' }), h('br'), h('button', { class: 'pf-btn', type: 'button', onclick: () => importDefaults(coll) }, '⬇ استيراد المحتوى الحالي')));
    content.replaceChildren(h('div', { class: 'pf-grid' }, data.map((it) => h('article', { class: 'pf-card glass-card' },
      h('div', { class: 'pf-meta' }, h('span', { class: 'pf-badge ' + (it.is_visible ? 'ok' : 'off') }, it.is_visible ? 'ظاهر' : 'مخفي'), h('span', { class: 'pf-badge info' }, 'ترتيب ' + it.sort_order)),
      h('h3', { text: it.title }), isFaq && it.body ? h('p', { text: it.body }) : null,
      h('div', { class: 'pf-actions' },
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: async () => { const r = await sb.from('site_items').update({ is_visible: !it.is_visible }).eq('id', it.id); if (r.error) return fail(r.error); render(); } }, it.is_visible ? 'إخفاء' : 'إظهار'),
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => itemForm(coll, it, data.length) }, 'تعديل'),
        h('button', { class: 'pf-btn danger sm', type: 'button', onclick: async () => { if (!confirm('حذف العنصر؟')) return; const r = await sb.from('site_items').delete().eq('id', it.id); if (r.error) return fail(r.error); toast('تم الحذف'); render(); } }, 'حذف'))))));
  }
  function itemForm(coll, it, count) {
    const isFaq = coll === 'faq';
    const title = h('textarea', { class: 'form-input', maxlength: '300', style: 'min-height:70px' }, it ? it.title : '');
    const body = h('textarea', { class: 'form-input', maxlength: '3000', style: 'min-height:120px' }, it ? it.body : '');
    const sort = h('input', { class: 'form-input', type: 'number', step: '1', value: it ? it.sort_order : (count + 1) * 10 });
    const vis = h('input', { type: 'checkbox' }); vis.checked = it ? it.is_visible : true;
    const msg = h('p', { class: 'pf-msg', role: 'alert' }), btn = h('button', { class: 'pf-btn', type: 'submit', style: 'width:100%' }, 'حفظ');
    const form = h('form', { novalidate: true }, field(isFaq ? 'السؤال' : 'النص', title), isFaq ? field('الإجابة', body) : null, field('الترتيب', sort, 'الأصغر يظهر أولًا'), h('label', { class: 'pf-check' }, vis, 'ظاهر في الموقع'), h('br'), btn, msg);
    const m = openModal({ title: it ? 'تعديل' : 'إضافة', body: form, wide: true });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.className = 'pf-msg err';
      if (!title.value.trim()) return (msg.textContent = 'اكتب النص.'); if (isFaq && !body.value.trim()) return (msg.textContent = 'اكتب الإجابة.');
      const row = { collection: coll, title: title.value.trim(), body: isFaq ? body.value.trim() : '', sort_order: parseInt(sort.value, 10) || 0, is_visible: vis.checked };
      btn.disabled = true;
      const r = it ? await sb.from('site_items').update(row).eq('id', it.id) : await sb.from('site_items').insert(row);
      if (r.error) { msg.textContent = friendlyError(r.error); btn.disabled = false; return; }
      m.close(); toast('تم الحفظ ✅'); render();
    });
  }
  async function importDefaults(coll) {
    try {
      let items = [];
      if (coll === 'faq') { const d = await fetchPage('faq.html'); items = Array.from(d.querySelectorAll('.faq-item')).map((x) => ({ title: norm((x.querySelector('summary') || {}).textContent), body: norm((x.querySelector('p') || {}).textContent) })); }
      else { const d = await fetchPage('curriculum.html'); items = Array.from(d.querySelectorAll(`[data-cms-list="${coll}"] li`)).map((x) => ({ title: norm(x.textContent), body: '' })); }
      items = items.filter((x) => x.title);
      if (!items.length) return toast('ما لقيتش محتوى افتراضي للاستيراد', 'err');
      const r = await sb.from('site_items').insert(items.map((x, i) => ({ collection: coll, title: x.title, body: x.body, sort_order: (i + 1) * 10, is_visible: true })));
      if (r.error) return fail(r.error);
      toast(`تم استيراد ${items.length} عنصر ✅`); render();
    } catch (e) { fail(e); }
  }

  /* =============== التنقل =============== */
  function render() {
    $$('#tabs .pf-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    ({ orders: renderOrders, subs: renderSubs, registrations: renderRegistrations, lessons: renderLessons, pdfs: renderPdfs, plans: renderPlans, content: renderContent, students: renderStudents, settings: renderSettings })[tab]();
  }
  $$('#tabs .pf-tab').forEach((t) => t.addEventListener('click', () => { tab = t.dataset.tab; render(); }));
  await loadCatalog(); refreshCounts(); render();
})();
