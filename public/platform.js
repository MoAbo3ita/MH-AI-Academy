/* MH AI Academy — الكود المشترك لصفحات المنصة (تسجيل الدخول · الحصص · لوحة الأدمن) */
(function () {
  'use strict';
  const CFG = window.MH_CONFIG || {};

  if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.textContent = 'تعذّر تحميل المنصة. تأكد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.';
      document.body.style.cssText = 'padding:3rem;text-align:center;color:#fff;font-weight:700';
    });
    return;
  }
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);

  /* ---------- DOM helpers (نبني العناصر بـ textContent لمنع حقن HTML) ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return e;
  }

  const GRADES = ['الصف الأول الثانوي', 'الصف الثاني الثانوي'];
  const PHONE_RE = /^01[0125][0-9]{8}$/;
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const fmtDate = (s) => { try { return new Date(s).toLocaleString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const gradeLabel = (g) => (g === 'all' || !g ? 'كل الصفوف' : g);

  function toast(msg, type = 'ok') {
    let box = $('.pf-toasts');
    if (!box) { box = h('div', { class: 'pf-toasts', 'aria-live': 'polite' }); document.body.append(box); }
    const t = h('div', { class: 'pf-toast ' + type, text: msg });
    box.append(t);
    setTimeout(() => t.remove(), 4200);
  }

  function friendlyError(err) {
    const m = String((err && (err.message || err.error_description)) || err || '');
    const code = err && err.code;
    if (/Invalid login credentials/i.test(m)) return 'الإيميل أو كلمة المرور غير صحيحة.';
    if (/already registered|already been registered/i.test(m)) return 'هذا الإيميل مسجّل بالفعل. سجّل دخول بدلًا من ذلك.';
    if (/Password should be at least/i.test(m)) return 'كلمة المرور قصيرة. استخدم 8 أحرف على الأقل.';
    if (/rate limit|too many|security purposes/i.test(m)) return 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
    if (/Email not confirmed/i.test(m)) return 'لازم تأكد الإيميل أولًا من الرسالة اللي وصلتك.';
    if (code === '23505' || /duplicate key/i.test(m)) return 'عندك طلب لهذا العنصر بالفعل.';
    if (code === '23514' || /violates check constraint/i.test(m)) return 'تأكد من صحة البيانات المدخلة.';
    if (/row-level security|permission denied/i.test(m)) return 'ليس لديك صلاحية لهذه العملية.';
    if (/Failed to fetch|NetworkError|network|Load failed/i.test(m)) return 'مشكلة في الاتصال بالإنترنت. حاول مرة أخرى.';
    if (/[\u0600-\u06FF]/.test(m)) return m; // رسائل عربية صادرة من قاعدة البيانات
    return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  }

  function openModal({ title, body, wide, onClose }) {
    const prevFocus = document.activeElement;
    const overlay = h('div', { class: 'pf-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'نافذة' });
    const box = h('div', { class: 'pf-modal' + (wide ? ' wide' : '') },
      h('button', { class: 'pf-x', type: 'button', 'aria-label': 'إغلاق', onclick: () => close() }, '✕'),
      title ? h('h3', { class: 'pf-modal-title', text: title }) : null, body);
    overlay.append(box);
    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() {
      overlay.remove(); document.removeEventListener('keydown', onKey);
      if (!$('.pf-overlay')) document.body.classList.remove('pf-lock');
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (onClose) onClose();
    }
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.classList.add('pf-lock');
    document.body.append(overlay);
    const first = $('input,select,textarea,button:not(.pf-x)', box); if (first) first.focus();
    return { close, box };
  }

  /* ---------- الجلسة والصلاحيات ---------- */
  async function getUser() { const { data } = await sb.auth.getSession(); return data && data.session ? data.session.user : null; }
  async function getProfile(user) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    return data || { id: user.id, full_name: '', phone: '', grade: null, role: 'student' };
  }
  async function requireUser(opts) {
    const admin = opts && opts.admin;
    const user = await getUser();
    if (!user) {
      const page = (location.pathname.split('/').pop() || 'lessons.html').replace(/^$/, 'lessons.html');
      location.replace('login.html?next=' + encodeURIComponent(page.endsWith('.html') ? page : page + '.html'));
      return null;
    }
    let profile;
    try { profile = await getProfile(user); }
    catch (e) { toast(friendlyError(e), 'err'); profile = { id: user.id, full_name: '', phone: '', role: 'student' }; }
    if (admin && profile.role !== 'admin') { location.replace('lessons.html'); return null; }
    return { user, profile };
  }
  async function loadSettings() {
    const { data } = await sb.from('settings').select('key,value');
    const o = {}; (data || []).forEach((r) => { o[r.key] = r.value; });
    return o;
  }

  /* ---------- الهيدر + تغيير كلمة المرور ---------- */
  function passwordModal() {
    const p1 = h('input', { class: 'form-input', type: 'password', autocomplete: 'new-password', minlength: '8', required: true, placeholder: '8 أحرف على الأقل' });
    const p2 = h('input', { class: 'form-input', type: 'password', autocomplete: 'new-password', required: true, placeholder: 'أعد كتابتها' });
    const msg = h('p', { class: 'pf-msg', role: 'alert' });
    const btn = h('button', { class: 'pf-btn', type: 'submit', style: 'width:100%' }, 'حفظ كلمة المرور');
    const form = h('form', {}, h('div', { class: 'pf-field' }, h('label', { text: 'كلمة المرور الجديدة' }), p1), h('div', { class: 'pf-field' }, h('label', { text: 'تأكيد كلمة المرور' }), p2), btn, msg);
    const m = openModal({ title: 'تغيير كلمة المرور', body: form });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.className = 'pf-msg';
      if (p1.value.length < 8) { msg.className = 'pf-msg err'; msg.textContent = 'كلمة المرور لازم 8 أحرف على الأقل.'; return; }
      if (p1.value !== p2.value) { msg.className = 'pf-msg err'; msg.textContent = 'كلمتا المرور غير متطابقتين.'; return; }
      btn.disabled = true;
      const { error } = await sb.auth.updateUser({ password: p1.value });
      btn.disabled = false;
      if (error) { msg.className = 'pf-msg err'; msg.textContent = friendlyError(error); return; }
      toast('تم تغيير كلمة المرور ✅'); m.close();
    });
  }
  function renderHeader({ active, profile }) {
    const host = $('#platformHeader'); if (!host) return;
    const link = (href, label, key) => h('a', { href, class: active === key ? 'active' : '' }, label);
    host.replaceChildren(h('header', { class: 'pf-header' }, h('div', { class: 'pf-wrap' },
      h('a', { class: 'pf-brand', href: 'index.html', 'aria-label': 'MH AI Academy' }, h('img', { src: 'assets/logo.svg', alt: 'MH AI Academy', width: '150', height: '38' })),
      h('nav', { class: 'pf-nav', 'aria-label': 'التنقل' },
        link('index.html', 'الرئيسية', 'home'), link('lessons.html', 'الحصص والملفات', 'lessons'), link('register.html', 'التسجيل / الاشتراك', 'register'),
        profile && profile.role === 'admin' ? link('admin.html', 'لوحة التحكم', 'admin') : null),
      h('div', { class: 'pf-user' },
        h('span', { class: 'pf-name', text: (profile && profile.full_name) || '' }),
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: passwordModal }, 'كلمة المرور'),
        h('button', { class: 'pf-btn ghost sm', type: 'button', onclick: async () => { await sb.auth.signOut(); location.replace('login.html'); } }, 'خروج')))));
  }

  /* ---------- الفيديو: نقبل فقط مصادر معروفة ونبني الرابط بأنفسنا ---------- */
  const ID11 = /^[\w-]{11}$/;
  function youtubeId(input) {
    input = String(input || '').trim();
    if (ID11.test(input)) return input;
    try {
      const u = new URL(input);
      if (u.hostname === 'youtu.be') { const id = u.pathname.slice(1).split('/')[0]; return ID11.test(id) ? id : null; }
      if (/(^|\.)youtube(-nocookie)?\.com$/.test(u.hostname)) {
        const v = u.searchParams.get('v'); if (v && ID11.test(v)) return v;
        const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/); if (m) return m[2];
      }
    } catch (e) { /* not a URL */ }
    return null;
  }
  function vimeoId(input) { const m = String(input || '').trim().match(/^(\d{6,12})$|vimeo\.com\/(?:video\/)?(\d{6,12})/); return m ? (m[1] || m[2]) : null; }
  function normalizeVideo(provider, input) {
    input = String(input || '').trim();
    if (provider === 'youtube') return youtubeId(input);
    if (provider === 'vimeo') return vimeoId(input);
    if (provider === 'bunny') return /^https:\/\/iframe\.mediadelivery\.net\/embed\/[\w\-\/]+(\?[^\s]*)?$/.test(input) ? input : null;
    if (provider === 'url') return /^https:\/\/[^\s]+\.(mp4|webm|m3u8)(\?[^\s]*)?$/i.test(input) ? input : null;
    return null;
  }
  function detectProvider(input) {
    input = String(input || '');
    if (/youtu\.?be/.test(input)) return 'youtube';
    if (/vimeo\.com/.test(input)) return 'vimeo';
    if (/mediadelivery\.net/.test(input)) return 'bunny';
    if (/\.(mp4|webm|m3u8)(\?|$)/i.test(input)) return 'url';
    return null;
  }
  function embedUrl(provider, ref) {
    if (provider === 'youtube') { const id = youtubeId(ref); return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&fs=0` : null; }
    if (provider === 'vimeo') { const id = vimeoId(ref); return id ? `https://player.vimeo.com/video/${id}?dnt=1` : null; }
    if (provider === 'bunny') return normalizeVideo('bunny', ref);
    return null;
  }
  // المشغّل مع علامة مائية متحركة باسم الطالب ورقمه (تقلل مشاركة الحصص)
  function buildPlayer(media, profile) {
    const wrap = h('div', { class: 'pf-player' });
    let inner;
    if (media.provider === 'url') {
      const src = normalizeVideo('url', media.video_ref);
      if (!src) return h('p', { class: 'pf-empty', text: 'رابط الفيديو غير صالح. بلّغ الأدمن.' });
      inner = h('video', { src, controls: true, controlslist: 'nodownload nofullscreen', disablepictureinpicture: true, playsinline: true, preload: 'metadata' });
    } else {
      const src = embedUrl(media.provider, media.video_ref);
      if (!src) return h('p', { class: 'pf-empty', text: 'رابط الفيديو غير صالح. بلّغ الأدمن.' });
      inner = h('iframe', { src, title: 'الحصة', allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture', referrerpolicy: 'strict-origin-when-cross-origin', sandbox: 'allow-scripts allow-same-origin allow-presentation' });
    }
    const wm = h('div', { class: 'pf-wm', 'aria-hidden': 'true', text: `${(profile && profile.full_name) || ''} • ${(profile && profile.phone) || ''}` });
    const fs = h('button', { class: 'pf-fs', type: 'button', onclick: () => { if (document.fullscreenElement) document.exitFullscreen(); else if (wrap.requestFullscreen) wrap.requestFullscreen(); } }, '⛶ ملء الشاشة');
    wrap.append(inner, wm, fs);
    return wrap;
  }

  window.MH = { sb, $, $$, h, toast, openModal, friendlyError, getUser, getProfile, requireUser, loadSettings, renderHeader, passwordModal,
    normalizeVideo, detectProvider, embedUrl, buildPlayer, GRADES, PHONE_RE, uuid, fmtDate, gradeLabel, CFG };
})();
