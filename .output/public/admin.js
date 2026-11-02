(async function () {
  'use strict';
  const M = window.MH; if (!M) return;
  const { sb, h, $, $$, toast, openModal, friendlyError, requireUser, renderHeader, loadSettings, normalizeVideo, detectProvider, PHONE_RE, uuid, GRADES, fmtDate, gradeLabel } = M;

  const ctx = await requireUser({ admin: true }); if (!ctx) return;
  renderHeader({ active: 'admin', profile: ctx.profile });

  const content = $('#content'), toolbar = $('#toolbar');
  let tab = 'orders', orderFilter = 'pending', subFilter = 'pending';
  let settings = {}, lessons = [], pdfs = [];

  const numberOr = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; };
  const loading = () => content.replaceChildren(h('p', { class: 'pf-loading', text: 'جارٍ التحميل…' }));
  const empty = (t) => content.replaceChildren(h('p', { class: 'pf-empty', text: t }));
  const fail = (e) => toast(friendlyError(e), 'err');
  const field = (label, input, hint) => h('div', { class: 'pf-field' }, h('label', { text: label }), input, hint ? h('small', { text: hint }) : null);
  const kv = (a, b) => h('div', { class: 'pf-kv' }, h('span', {}, a), h('span', {}, String(b)));
  const waLink = (phone) => phone ? h('a', { href: 'https://wa.me/2' + phone, target: '_blank', rel: 'noopener noreferrer', class: 'pf-link', text: phone, dir: 'ltr' }) : h('span', {}, '—');
  const chips = (list, current, set) => list.map(([k, label]) => h('button', { class: 'pf-btn sm ' + (current === k ? '' : 'ghost'), type: 'button', onclick: () => set(k) }, label));

  async function loadCatalog() {
    const [l, p, s] = await Promise.all([
      sb.from('lessons').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      sb.from('pdf_files').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      loadSettings()
    ]);
    if (l.error || p.error) fail(l.error || p.error);
    lessons = l.data || []; pdfs = p.data || []; settings = s || {};
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
    const itemTitle = (o) => { const it = (o.item_type === 'lesson' ? lessons : pdfs).find((x) => x.id === o.item_id); return it ? it.title : '(محذوف)'; };
    const st = { pending: 'معلّق ⏳', approved: 'مقبول ✓', rejected: 'مرفوض' };
    content.replaceChildren(h('div', { class: 'pf-grid' }, orders.map((o) => {
      const p = P[o.user_id] || {};
      return h('article', { class: 'pf-card glass-card pf-order' },
        h('div', { class: 'pf-meta' }, h('span', { class: 'pf-badge ' + o.status }, st[o.status]), h('span', { class: 'pf-badge off' }, o.method === 'instapay' ? 'إنستا باي' : 'WE Pay'), h('span', { class: 'pf-badge info' }, o.item_type === 'lesson' ? 'حصة' : 'ملف')),
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
        h('h3', { text: p.full_name || '—' }), kv('الصف', s.grade),
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
  const accessOf = (it) => (it.is_free ? 'free' : it.for_subscribers ? 'subscribers' : 'paid');
  function itemCard(type, it) {
    const table = type === 'lesson' ? 'lessons' : 'pdf_files';
    const patch = async (obj) => { const { error } = await sb.from(table).update(obj).eq('id', it.id); if (error) return fail(error); await loadCatalog(); render(); };
    const a = accessOf(it);
    return h('article', { class: 'pf-card glass-card' },
      h('div', { class: 'pf-meta' }, h('span', { class: 'pf-badge ' + (it.is_published ? 'ok' : 'off') }, it.is_published ? 'منشور' : 'مخفي'),
        h('span', { class: 'pf-badge ' + (a === 'free' ? 'free' : 'lock') }, a === 'free' ? 'مجاني' : a === 'subscribers' ? '⭐ للمشتركين' : `مدفوع ${it.price_egp} ج`), h('span', { class: 'pf-badge info' }, gradeLabel(it.grade))),
      h('h3', { text: it.title }), it.description ? h('p', { text: it.description }) : null,
      h('div', { class: 'pf-actions' },
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => patch({ is_published: !it.is_published }) }, it.is_published ? 'إخفاء' : 'نشر'),
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => type === 'lesson' ? lessonForm(it) : pdfForm(it) }, 'تعديل'),
        h('button', { class: 'pf-btn danger sm', type: 'button', onclick: () => removeItem(type, it) }, 'حذف')));
  }
  async function removeItem(type, it) {
    if (!confirm(`حذف "${it.title}" نهائيًا؟ لا يمكن التراجع.`)) return;
    if (type === 'pdf') await sb.storage.from('pdfs').remove([it.file_path]);
    const { error } = await sb.from(type === 'lesson' ? 'lessons' : 'pdf_files').delete().eq('id', it.id);
    if (error) return fail(error);
    toast('تم الحذف'); await loadCatalog(); render();
  }
  const basicFields = (it) => {
    const f = {
      title: h('input', { class: 'form-input', type: 'text', maxlength: '140', value: it ? it.title : '' }),
      desc: h('textarea', { class: 'form-input', maxlength: '600' }, it ? it.description : ''),
      grade: h('select', { class: 'form-input' }, h('option', { value: 'all' }, 'كل الصفوف'), ...GRADES.map((g) => h('option', { value: g }, g))),
      access: h('select', { class: 'form-input' }, h('option', { value: 'paid' }, 'مدفوع (شراء فردي)'), h('option', { value: 'subscribers' }, '⭐ للمشتركين فقط'), h('option', { value: 'free' }, 'مجاني لكل الطلاب المسجّلين')),
      pub: h('input', { type: 'checkbox' }),
      price: h('input', { class: 'form-input', type: 'number', min: '0', step: '1', value: it ? it.price_egp : numberOr(settings.default_lesson_price, 85) }),
      sort: h('input', { class: 'form-input', type: 'number', step: '1', value: it ? it.sort_order : 0 })
    };
    f.grade.value = it ? it.grade : 'all'; f.access.value = it ? accessOf(it) : 'paid'; f.pub.checked = it ? it.is_published : true;
    const sync = () => { f.price.disabled = f.access.value !== 'paid'; }; f.access.addEventListener('change', sync); sync();
    return f;
  };
  const rowFrom = (f, title) => ({ title, description: f.desc.value.trim(), grade: f.grade.value, is_free: f.access.value === 'free', for_subscribers: f.access.value === 'subscribers',
    price_egp: numberOr(f.price.value, 85), is_published: f.pub.checked, sort_order: numberOr(f.sort.value, 0) || 0 });
  const accessHint = 'مدفوع: الطالب يشتري كل حصة بسعرها. للمشتركين: تفتح لأي طالب اشتراكه ساري. مجاني: تفتح لكل الطلاب المسجّلين.';

  function renderLessons() {
    toolbar.replaceChildren(h('button', { class: 'pf-btn', type: 'button', onclick: () => lessonForm() }, '＋ حصة جديدة'));
    if (!lessons.length) return empty('لسه ما أضفتش أي حصة.');
    content.replaceChildren(h('div', { class: 'pf-grid' }, lessons.map((l) => itemCard('lesson', l))));
  }
  function lessonForm(it) {
    const f = basicFields(it);
    f.dur = h('input', { class: 'form-input', type: 'number', min: '0', value: it && it.duration_minutes ? it.duration_minutes : '' });
    f.prov = h('select', { class: 'form-input' }, ...[['youtube', 'يوتيوب (غير مدرج)'], ['vimeo', 'Vimeo'], ['bunny', 'Bunny Stream'], ['url', 'رابط ملف فيديو مباشر (mp4)']].map(([v, l]) => h('option', { value: v }, l)));
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
        if (ref) {
          const mm = await sb.from('lesson_media').upsert({ lesson_id: id, provider: f.prov.value, video_ref: ref }, { onConflict: 'lesson_id' });
          if (mm.error) { if (!it) await sb.from('lessons').delete().eq('id', id); throw mm.error; }
        } else if (it) { await sb.from('lesson_media').update({ provider: f.prov.value }).eq('lesson_id', id); }
        m.close(); toast('تم الحفظ ✅'); await loadCatalog(); render();
      } catch (err) { msg.className = 'pf-msg err'; msg.textContent = friendlyError(err); btn.disabled = false; }
    });
  }
  function renderPdfs() {
    toolbar.replaceChildren(h('button', { class: 'pf-btn', type: 'button', onclick: () => pdfForm() }, '＋ رفع ملف PDF'));
    if (!pdfs.length) return empty('لسه ما رفعتش أي ملف.');
    content.replaceChildren(h('div', { class: 'pf-grid' }, pdfs.map((p) => itemCard('pdf', p))));
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
    const { data, error } = await sb.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }).limit(2000);
    if (error) { fail(error); return empty('تعذّر تحميل الطلاب.'); }
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
          h('td', {}, h('div', { class: 'pf-actions', style: 'padding:0;margin:0' },
            h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: () => { const m = parseInt(prompt('عدد شهور الاشتراك اللي هتضيفها:', '1'), 10); if (!Number.isFinite(m)) return; if (m < 1 || m > 12) return toast('عدد الشهور بين 1 و 12', 'err'); subRpc('grant_subscription', { p_user: p.id, p_months: m }, 'تم تمديد الاشتراك ✅'); } }, '＋ اشتراك'),
            active ? h('button', { class: 'pf-btn danger sm', type: 'button', onclick: () => { if (confirm(`إلغاء اشتراك "${p.full_name}"؟`)) subRpc('revoke_subscription', { p_user: p.id }, 'تم إلغاء الاشتراك'); } }, 'إلغاء') : null)));
      }));
    };
    search.addEventListener('input', draw); draw();
    content.replaceChildren(data.length ? h('div', { class: 'pf-table-wrap' }, h('table', { class: 'pf-table', style: 'min-width:860px' }, h('thead', {}, h('tr', {}, ...['الاسم', 'الموبايل', 'ولي الأمر', 'الصف', 'الاشتراك', 'إجراءات'].map((t) => h('th', { text: t })))), tbody)) : h('p', { class: 'pf-empty', text: 'لا يوجد طلاب بحسابات بعد (التسجيل العام في تبويب "التسجيلات").' }));
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
    const p1 = inp('sub_price_g1', 'number', { min: '0' }), p2 = inp('sub_price_g2', 'number', { min: '0' });
    const g1 = inp('group_link_g1', 'text', { ltr: true, placeholder: 'https://chat.whatsapp.com/…' }), g2 = inp('group_link_g2', 'text', { ltr: true, placeholder: 'https://chat.whatsapp.com/…' });
    const insta = inp('instapay_number', 'tel', { maxlength: '11', dir: 'ltr' }), we = inp('wepay_number', 'tel', { maxlength: '11', dir: 'ltr' }), dprice = inp('default_lesson_price', 'number', { min: '0' });
    const msg = h('p', { class: 'pf-msg', role: 'alert' }), btn = h('button', { class: 'pf-btn', type: 'submit' }, 'حفظ الإعدادات');
    const WA_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(\?[^\s]*)?$/;
    const sec = (title, ...kids) => h('div', { class: 'glass-card', style: 'padding:1.4rem;margin-bottom:1.1rem' }, h('h3', { style: 'margin-bottom:1rem;font-weight:900', text: title }), ...kids);
    const form = h('form', { style: 'max-width:640px', novalidate: true },
      sec('حالة صفحة التسجيل', h('p', { class: 'pf-sub', style: 'margin-bottom:1rem' }, 'الحالة الحالية: ', h('strong', { text: (MODES.find((m) => m[0] === (settings.registration_mode || 'registration')) || MODES[0])[1] })), modeBox, field('رسالة القفل (تظهر لما التسجيل يكون مقفول)', closedMsg)),
      sec('أسعار الاشتراك الشهري', h('div', { class: 'pf-row' }, field('الصف الأول (جنيه)', p1), field('الصف الثاني (جنيه)', p2))),
      sec('جروبات الواتساب (تظهر بعد التسجيل)', field('جروب الصف الأول', g1), field('جروب الصف الثاني', g2)),
      sec('الدفع والأسعار', h('div', { class: 'pf-row' }, field('رقم إنستا باي', insta), field('رقم WE Pay', we)), field('السعر الافتراضي للحصة الجديدة (جنيه)', dprice)),
      btn, msg);
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.className = 'pf-msg err';
      if (!PHONE_RE.test(insta.value.trim()) || !PHONE_RE.test(we.value.trim())) return (msg.textContent = 'أرقام الدفع لازم تكون 11 رقم صحيح.');
      if (!(parseInt(p1.value, 10) >= 0) || !(parseInt(p2.value, 10) >= 0)) return (msg.textContent = 'اكتب سعر الاشتراك لكل صف (أرقام فقط).');
      for (const g of [g1, g2]) if (g.value.trim() && !WA_RE.test(g.value.trim())) return (msg.textContent = 'رابط جروب الواتساب غير صحيح (لازم يبدأ بـ https://chat.whatsapp.com/).');
      if (mode === 'closed' && !closedMsg.value.trim()) return (msg.textContent = 'اكتب رسالة القفل.');
      btn.disabled = true;
      const rows = [['registration_mode', mode], ['registration_closed_message', closedMsg.value.trim()], ['sub_price_g1', String(numberOr(p1.value, 150))], ['sub_price_g2', String(numberOr(p2.value, 180))],
        ['group_link_g1', g1.value.trim()], ['group_link_g2', g2.value.trim()], ['instapay_number', insta.value.trim()], ['wepay_number', we.value.trim()], ['default_lesson_price', String(numberOr(dprice.value, 85))]].map(([key, value]) => ({ key, value }));
      const { error } = await sb.from('settings').upsert(rows, { onConflict: 'key' });
      btn.disabled = false;
      if (error) { msg.textContent = friendlyError(error); return; }
      msg.className = 'pf-msg ok'; msg.textContent = 'تم الحفظ ✅ — التغيير ظاهر للطلاب فورًا.'; await loadCatalog(); renderSettings();
      const m2 = $('.pf-msg', content); if (m2) { m2.className = 'pf-msg ok'; m2.textContent = 'تم الحفظ ✅ — التغيير ظاهر للطلاب فورًا.'; }
    });
    content.replaceChildren(form);
  }

  /* =============== التنقل =============== */
  function render() {
    $$('#tabs .pf-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    ({ orders: renderOrders, subs: renderSubs, registrations: renderRegistrations, lessons: renderLessons, pdfs: renderPdfs, students: renderStudents, settings: renderSettings })[tab]();
  }
  $$('#tabs .pf-tab').forEach((t) => t.addEventListener('click', () => { tab = t.dataset.tab; render(); }));
  await loadCatalog(); refreshCounts(); render();
})();
