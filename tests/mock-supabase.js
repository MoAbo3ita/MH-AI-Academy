/* Fake @supabase/supabase-js for UI testing ONLY.
   يحاكي قواعد الصلاحيات (RLS) الموجودة في ملفات SQL بشكل مبسّط، عشان نختبر الواجهة بدون Supabase حقيقي.
   الحالة بتتخزن في localStorage (المفتاح __mockdb) عشان تفضل بين الصفحات. */
(function () {
  const KEY = '__mockdb';
  const uid = () => crypto.randomUUID();
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  let S = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!S) {
    const adminId = uid(), L1 = uid(), L2 = uid(), L3 = uid(), L4 = uid(), L5 = uid(), P1 = uid(), P2 = uid();
    const now = () => new Date().toISOString();
    S = { session: null, users: { 'midoaboeita235@gmail.com': { id: adminId, password: 'AdminPass-1', meta: {} } }, storage: {}, log: [],
      profiles: [{ id: adminId, full_name: 'المدير', phone: '', parent_phone: '', subscribed_until: null, grade: null, role: 'admin', created_at: now() }],
      settings: [{ key: 'instapay_number', value: '01555109204' }, { key: 'wepay_number', value: '01559160083' }, { key: 'default_lesson_price', value: '85' },
        { key: 'registration_mode', value: 'registration' }, { key: 'registration_closed_message', value: 'التسجيل مقفول حاليًا (رسالة تجريبية).' },
        { key: 'sub_price_g1', value: '150' }, { key: 'sub_price_g2', value: '180' },
        { key: 'group_link_g1', value: 'https://chat.whatsapp.com/AAA111?s=cl' }, { key: 'group_link_g2', value: 'https://chat.whatsapp.com/BBB222?s=cl' },
        { key: 'contact_whatsapp', value: '201555109204' }, { key: 'contact_phone', value: '01559160083' }],
      registrations: [], subscriptions: [], site_content: [], site_items: [],
      plans: [{ id: uid(), name: 'الصف الأول الثانوي', grade: 'الصف الأول الثانوي', kind: 'subscription', price_egp: 150, months: 1, details: 'نوع المجموعات: برايفت (حسب الاتفاق)\nالمواعيد: حسب الاتفاق', cta_label: '', is_active: true, sort_order: 1, created_at: now() },
        { id: uid(), name: 'الصف الثاني الثانوي', grade: 'الصف الثاني الثانوي', kind: 'subscription', price_egp: 180, months: 1, details: 'نوع المجموعات: برايفت (حسب الاتفاق)', cta_label: '', is_active: true, sort_order: 2, created_at: now() }],
      lessons: [
        { id: L1, title: 'مقدمة في البرمجة (مجانية)', description: 'أول حصة', grade: 'all', is_free: true, price_egp: 85, is_published: true, sort_order: 1, duration_minutes: 30, created_at: now() },
        { id: L2, title: 'الشروط والحلقات', description: 'if و loops', grade: 'الصف الأول الثانوي', is_free: false, price_egp: 85, is_published: true, sort_order: 2, duration_minutes: 45, created_at: now() },
        { id: L5, title: 'حصة هجينة', description: 'شراء فردي أو اشتراك', grade: 'all', is_free: false, for_subscribers: true, allow_purchase: true, price_egp: 85, is_published: true, sort_order: 5, duration_minutes: 25, created_at: now() },
        { id: L4, title: 'حصة المشتركين', description: 'للمشتركين فقط', grade: 'all', is_free: false, for_subscribers: true, allow_purchase: false, price_egp: 85, is_published: true, sort_order: 4, duration_minutes: 20, created_at: now() },
        { id: L3, title: 'حصة مخفية', description: '', grade: 'all', is_free: false, price_egp: 85, is_published: false, sort_order: 3, duration_minutes: null, created_at: now() }],
      lesson_media: [{ lesson_id: L1, provider: 'youtube', video_ref: 'dQw4w9WgXcQ' }, { lesson_id: L2, provider: 'youtube', video_ref: 'aqz-KE-bpKQ' }, { lesson_id: L3, provider: 'youtube', video_ref: 'aqz-KE-bpKQ' },
        { lesson_id: L4, provider: 'youtube', video_ref: 'jNQXAC9IVRw' }, { lesson_id: L5, provider: 'drive', video_ref: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345' }],
      pdf_files: [{ id: P1, title: 'ملخص الدرس الأول (مجاني)', description: '', grade: 'all', file_path: 'free.pdf', is_free: true, price_egp: 85, is_published: true, sort_order: 1, created_at: now() },
        { id: P2, title: 'تدريبات متقدمة', description: '', grade: 'all', file_path: 'paid.pdf', is_free: false, price_egp: 85, is_published: true, sort_order: 2, created_at: now() }],
      orders: [] };
  }
  const save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const listeners = [];
  const me = () => (S.session ? S.session.user.id : null);
  const isAdmin = () => { const p = S.profiles.find((x) => x.id === me()); return !!(p && p.role === 'admin'); };
  const setting = (k) => { const r = S.settings.find((x) => x.key === k); return r ? r.value : null; };
  const mode = () => setting('registration_mode') || 'registration';
  const subscribed = () => { const p = S.profiles.find((x) => x.id === me()); return !!(p && p.subscribed_until && new Date(p.subscribed_until) > new Date()); };
  const PH = /^01[0125][0-9]{8}$/, GR = ['الصف الأول الثانوي', 'الصف الثاني الثانوي'];
  const rlsErr = () => ({ message: 'new row violates row-level security policy', code: '42501' });
  const hasAccess = (type, id) => {
    if (!me()) return false; if (isAdmin()) return true;
    const it = (type === 'lesson' ? S.lessons : S.pdf_files).find((x) => x.id === id);
    if (!it || !it.is_published) return false;
    const ap = (o) => o.user_id === me() && o.status === 'approved';
    return it.is_free || (it.for_subscribers && subscribed()) || S.orders.some((o) => ap(o) && o.item_type === type && o.item_id === id)
      || (type === 'lesson' && S.orders.some((o) => ap(o) && o.item_type === 'bundle' && o.item_id === id))
      || (type === 'pdf' && S.orders.some((o) => ap(o) && o.item_type === 'bundle' && (S.lessons.find((l) => l.id === o.item_id) || {}).pdf_id === id));
  };
  const canRead = { profiles: (r) => r.id === me() || isAdmin(), settings: () => true, lessons: (r) => r.is_published || isAdmin(), pdf_files: (r) => r.is_published || isAdmin(),
    lesson_media: (r) => hasAccess('lesson', r.lesson_id), orders: (r) => r.user_id === me() || isAdmin(), registrations: () => isAdmin(),
    subscriptions: (r) => r.user_id === me() || isAdmin(), plans: (r) => r.is_active || isAdmin(), site_content: () => true, site_items: (r) => r.is_visible || isAdmin() };
  const adminOnlyWrite = ['lessons', 'lesson_media', 'pdf_files', 'settings', 'plans', 'site_content', 'site_items'];

  class Q {
    constructor(t) { this.t = t; this.op = 'select'; this.f = []; this.ord = []; this.lim = null; this.single_ = null; this.head = false; this.cnt = false; this.payload = null; this.opts = {}; }
    select(c, o) { if (this.op === 'select') this.op = 'select'; else this.ret = true; if (o && o.head) this.head = true; if (o && o.count) this.cnt = true; return this; }
    insert(p) { this.op = 'insert'; this.payload = p; return this; } update(p) { this.op = 'update'; this.payload = p; return this; }
    upsert(p, o) { this.op = 'upsert'; this.payload = p; this.opts = o || {}; return this; } delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.f.push((r) => r[c] === v); return this; } in(c, a) { this.f.push((r) => a.includes(r[c])); return this; }
    order(c, o) { this.ord.push([c, !(o && o.ascending === false)]); return this; } limit(n) { this.lim = n; return this; }
    single() { this.single_ = 'single'; return this; } maybeSingle() { this.single_ = 'maybe'; return this; }
    then(res, rej) { return Promise.resolve(this.run()).then(res, rej); }
    run() {
      const T = S[this.t]; const flt = (r) => this.f.every((fn) => fn(r));
      if (['insert', 'update', 'upsert', 'delete'].includes(this.op) && adminOnlyWrite.includes(this.t) && !isAdmin()) return { data: null, error: rlsErr() };
      if (this.t === 'profiles' && this.op === 'update' && !isAdmin() && ('role' in this.payload || 'subscribed_until' in this.payload)) return { data: null, error: { message: 'غير مسموح بتغيير الدور' } };
      if (this.t === 'settings' && ['upsert', 'insert', 'update'].includes(this.op)) { const rows = [].concat(this.payload); if (rows.some((r) => r.key === 'registration_mode' && !['registration', 'subscription', 'closed'].includes(r.value))) return { data: null, error: { message: 'violates check constraint "settings_mode_chk"', code: '23514' } }; }
      let out = [], error = null;
      if (this.op === 'select') {
        out = T.filter(canRead[this.t]).filter(flt);
        this.ord.forEach(([c, asc]) => out.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)).slice());
        if (this.lim) out = out.slice(0, this.lim);
        if (this.head) return { data: null, count: out.length, error: null };
      } else if (this.op === 'insert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        for (const r0 of rows) {
          const r = { id: uid(), created_at: new Date().toISOString(), ...r0 };
          if (this.t === 'registrations') {
            if (mode() !== 'registration') return { data: null, error: rlsErr() };
            if (String(r.full_name || '').trim().length < 3 || !PH.test(r.phone || '') || !PH.test(r.parent_phone || '') || !GR.includes(r.grade)) return { data: null, error: { message: 'violates check constraint', code: '23514' } };
            if (S.registrations.some((x) => x.phone === r.phone && x.grade === r.grade)) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
          }
          if (this.t === 'subscriptions') {
            if (!me()) return { data: null, error: rlsErr() };
            if (mode() !== 'subscription' && !isAdmin()) return { data: null, error: { message: 'الاشتراك غير متاح حاليًا' } };
            if (!(r.receipt_path || r.transaction_ref)) return { data: null, error: { message: 'violates check constraint "subscriptions_has_proof"', code: '23514' } };
            if (S.subscriptions.some((x) => x.user_id === me() && x.status === 'pending')) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
            const plan = S.plans.find((x) => x.id === r.plan_id); if (!plan || plan.kind !== 'subscription' || (!plan.is_active && !isAdmin())) return { data: null, error: { message: 'الخطة غير متاحة' } };
            if (plan.grade !== 'all' && plan.grade !== r.grade && !isAdmin()) return { data: null, error: { message: 'هذه الخطة مخصصة لصف آخر' } };
            Object.assign(r, { user_id: me(), amount_egp: plan.price_egp, months: plan.months, status: 'pending', admin_note: '' });
          }
          if (this.t === 'orders') {
            const it = (r.item_type === 'pdf' ? S.pdf_files : S.lessons).find((x) => x.id === r.item_id);
            if (r.item_type === 'bundle' && (!it || !it.pdf_id || it.bundle_price_egp == null)) return { data: null, error: { message: 'لا توجد باقة لهذه الحصة' } };
            if (!it || !it.is_published) return { data: null, error: { message: 'العنصر غير متاح' } };
            if (it.is_free) return { data: null, error: { message: 'هذا العنصر مجاني ولا يحتاج دفع' } };
            if (it.allow_purchase === false && !isAdmin()) return { data: null, error: { message: 'هذا المحتوى متاح للمشتركين فقط' } };
            if (!me()) return { data: null, error: rlsErr() };
            if (!(r.receipt_path || r.transaction_ref)) return { data: null, error: { message: 'violates check constraint "orders_has_proof"', code: '23514' } };
            if (S.orders.some((o) => o.user_id === me() && o.item_type === r.item_type && o.item_id === r.item_id && o.status === 'pending')) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
            Object.assign(r, { user_id: me(), amount_egp: r.item_type === 'bundle' ? it.bundle_price_egp : it.price_egp, status: 'pending', admin_note: '' });
          }
          T.push(r); out.push(r);
        }
        S.log.push('insert ' + this.t); save();
      } else if (this.op === 'upsert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload]; const k = this.opts.onConflict;
        rows.forEach((r) => { const ex = T.find((x) => x[k] === r[k]); if (ex) { Object.assign(ex, r); out.push(ex); } else { T.push({ ...r }); out.push(r); } }); save();
      } else if (this.op === 'update') {
        if (['orders', 'subscriptions', 'registrations'].includes(this.t) && !isAdmin()) return { data: null, error: rlsErr() };
        T.filter(canRead[this.t]).filter(flt).forEach((r) => { Object.assign(r, this.payload); out.push(r); });
        S.log.push('update ' + this.t); save();
      } else if (this.op === 'delete') {
        if (['orders', 'subscriptions', 'registrations'].includes(this.t) && !isAdmin()) return { data: null, error: rlsErr() };
        const keep = T.filter((r) => !(canRead[this.t](r) && flt(r))); S[this.t] = keep; save();
      }
      if (this.single_) {
        if (out.length === 1) return { data: out[0], error: null };
        if (!out.length && this.single_ === 'maybe') return { data: null, error: null };
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
      }
      return { data: out, error, count: this.cnt ? out.length : undefined };
    }
  }
  const emit = (ev) => listeners.forEach((cb) => cb(ev, S.session));
  const auth = {
    getSession: async () => ({ data: { session: S.session }, error: null }),
    onAuthStateChange: (cb) => { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: async ({ email, password }) => { const u = S.users[email.toLowerCase()]; if (!u || u.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
      S.session = { user: { id: u.id, email } }; save(); emit('SIGNED_IN'); return { data: { session: S.session }, error: null }; },
    signUp: async ({ email, password, options }) => { email = email.toLowerCase(); if (S.users[email]) return { data: {}, error: { message: 'User already registered' } };
      if (password.length < 6) return { data: {}, error: { message: 'Password should be at least 6 characters' } };
      const id = uid(); S.users[email] = { id, password, meta: options.data };
      const g = options.data.grade; S.profiles.push({ id, full_name: options.data.full_name || '', phone: options.data.phone || '', parent_phone: PH.test(options.data.parent_phone || '') ? options.data.parent_phone : '', subscribed_until: null, grade: GR.includes(g) ? g : null, role: 'student', created_at: new Date().toISOString() });
      S.session = { user: { id, email } }; save(); return { data: { user: { id }, session: S.session }, error: null }; },
    signOut: async () => { S.session = null; save(); emit('SIGNED_OUT'); return { error: null }; },
    updateUser: async ({ password }) => { if (password.length < 6) return { data: {}, error: { message: 'Password should be at least 6 characters' } }; const u = Object.values(S.users).find((x) => x.id === me()); u.password = password; save(); return { data: {}, error: null }; },
    resetPasswordForEmail: async (email, o) => { S.log.push('reset ' + (o && o.redirectTo)); S.otp = S.otp || {}; S.otp[email.toLowerCase()] = '123456'; save(); return { data: {}, error: null }; },
    verifyOtp: async ({ email, token, type }) => { const u = S.users[String(email).toLowerCase()]; if (type !== 'recovery' || !u || !S.otp || S.otp[String(email).toLowerCase()] !== token) return { data: {}, error: { message: 'Token has expired or is invalid' } };
      S.session = { user: { id: u.id, email } }; save(); emit('SIGNED_IN'); return { data: { session: S.session }, error: null }; },
    exchangeCodeForSession: async (code) => { if (code !== 'good') return { data: {}, error: { message: 'invalid flow state' } }; const u = Object.values(S.users)[0]; S.session = { user: { id: u.id, email: 'x' } }; save(); emit('PASSWORD_RECOVERY'); return { data: {}, error: null }; }
  };
  const storage = { from: (b) => ({
    upload: async (path, file) => { if (b === 'pdfs' && !isAdmin()) return { data: null, error: rlsErr() };
      if (b === 'receipts' && path.split('/')[0] !== me()) return { data: null, error: rlsErr() };
      S.storage[b + '/' + path] = { size: file.size, type: file.type }; S.log.push('upload ' + b); save(); return { data: { path }, error: null }; },
    createSignedUrl: async (path) => { S.log.push('sign ' + b + '/' + path); save();
      if (b === 'pdfs') { const f = S.pdf_files.find((x) => x.file_path === path); if (!isAdmin() && !(f && hasAccess('pdf', f.id))) return { data: null, error: { message: 'Object not found' } }; }
      return { data: { signedUrl: PNG }, error: null }; },
    remove: async (paths) => { paths.forEach((p) => delete S.storage[b + '/' + p]); save(); return { data: [], error: null }; } }) };
  const rpc = async (fn, a) => {
    const err = (m) => ({ data: null, error: { message: m } });
<<<<<<< HEAD
=======
    if (fn === 'mark_lesson_viewed') { S.lesson_views = S.lesson_views || []; if (me() && hasAccess('lesson', a.p_lesson) && !S.lesson_views.some((v) => v.user_id === me() && v.lesson_id === a.p_lesson)) S.lesson_views.push({ user_id: me(), lesson_id: a.p_lesson }); save(); return { data: null, error: null }; }
>>>>>>> 55b4195 (update)
    if (!isAdmin()) return err('غير مسموح');
    const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x.toISOString(); };
    const extend = (uid_, m) => { const p = S.profiles.find((x) => x.id === uid_); const base = p.subscribed_until && new Date(p.subscribed_until) > new Date() ? p.subscribed_until : new Date().toISOString(); p.subscribed_until = addMonths(base, m); };
    if (fn === 'review_subscription') {
      const s = S.subscriptions.find((x) => x.id === a.p_id); if (!s) return err('الطلب غير موجود'); if (s.status !== 'pending') return err('تمت مراجعة هذا الطلب من قبل');
      const m = a.p_months || s.months; if (m < 1 || m > 12) return err('عدد الشهور غير صحيح');
      s.status = a.p_status; s.admin_note = a.p_note || ''; s.months = m; s.reviewed_at = new Date().toISOString();
      if (a.p_status === 'approved') { extend(s.user_id, m); const p = S.profiles.find((x) => x.id === s.user_id); p.grade = p.grade || s.grade; }
      S.log.push('rpc review_subscription ' + a.p_status); save(); return { data: null, error: null };
    }
    if (fn === 'grant_subscription') { if (a.p_months < 1 || a.p_months > 12) return err('عدد الشهور غير صحيح'); extend(a.p_user, a.p_months); S.log.push('rpc grant'); save(); return { data: null, error: null }; }
<<<<<<< HEAD
    if (fn === 'revoke_subscription') { S.profiles.find((x) => x.id === a.p_user).subscribed_until = null; S.log.push('rpc revoke'); save(); return { data: null, error: null }; }
=======
    if (fn === 'revoke_subscription') { S.profiles.find((x) => x.id === a.p_user).subscribed_until = null; S.log.push('rpc revoke:' + (a.p_reason || '')); save(); return { data: null, error: null }; }
    if (fn === 'student_progress') {
      if (!isAdmin()) return err('غير مسموح'); S.lesson_views = S.lesson_views || [];
      const pub = S.lessons.filter((l) => l.is_published);
      return { data: S.profiles.filter((p) => p.role === 'student').map((p) => ({ user_id: p.id, watched: S.lesson_views.filter((v) => v.user_id === p.id && pub.some((l) => l.id === v.lesson_id)).length, total: pub.filter((l) => l.grade === 'all' || l.grade === p.grade).length })), error: null };
    }
>>>>>>> 55b4195 (update)
    return err('unknown rpc');
  };
  window.supabase = { createClient: () => ({ auth, from: (t) => new Q(t), storage, rpc }) };
  window.__mockState = () => S;
  window.__mutate = (fn) => { fn(S); save(); };
})();
