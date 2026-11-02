(async function () {
  'use strict';
  const { sb, $, $$, friendlyError, PHONE_RE } = window.MH || {};
  if (!sb) return;

  const NEXT_ALLOWED = ['lessons.html', 'admin.html', 'index.html', 'register.html'];
  const nextPage = () => {
    const n = new URLSearchParams(location.search).get('next');
    return NEXT_ALLOWED.includes(n) ? n : 'lessons.html'; // قائمة مسموحة فقط: يمنع التحويل لمواقع خارجية
  };
  const forms = { login: $('#loginForm'), signup: $('#signupForm'), forgot: $('#forgotForm'), recovery: $('#recoveryForm') };
  const msg = $('#msg');
  const say = (text, type) => { msg.textContent = text || ''; msg.className = 'pf-msg' + (type ? ' ' + type : ''); };
  function show(name) {
    Object.entries(forms).forEach(([k, f]) => { f.hidden = k !== name; });
    $('#authTabs').hidden = name === 'forgot' || name === 'recovery';
    $$('#authTabs .pf-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    say('');
  }
  async function busy(form, fn) {
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try { await fn(); } finally { btn.disabled = false; }
  }

  $$('#authTabs .pf-tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
  ['#suPhone', '#suParent'].forEach((sel) => $(sel).addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11); }));
  $('#toForgot').addEventListener('click', () => show('forgot'));
  $('#backLogin').addEventListener('click', () => show('login'));
  if (new URLSearchParams(location.search).get('tab') === 'signup') show('signup');

  // استعادة كلمة المرور: الرابط اللي بيوصل بالإيميل بيرجع للصفحة دي
  const isRecovery = /type=recovery/.test(location.hash);
  sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') show('recovery'); });
  if (isRecovery) show('recovery');
  else { const { data } = await sb.auth.getSession(); if (data.session) { location.replace(nextPage()); return; } }

  forms.login.addEventListener('submit', (e) => { e.preventDefault(); busy(forms.login, async () => {
    const email = $('#loginEmail').value.trim(), password = $('#loginPass').value;
    if (!email || !password) return say('اكتب الإيميل وكلمة المرور.', 'err');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return say(friendlyError(error), 'err');
    say('تم الدخول ✅', 'ok'); location.replace(nextPage());
  }); });

  forms.signup.addEventListener('submit', (e) => { e.preventDefault(); busy(forms.signup, async () => {
    const full_name = $('#suName').value.trim(), phone = $('#suPhone').value.trim(), grade = $('#suGrade').value, parent_phone = $('#suParent').value.trim();
    const email = $('#suEmail').value.trim(), password = $('#suPass').value;
    if (full_name.length < 3) return say('اكتب اسمك بالكامل (3 أحرف على الأقل).', 'err');
    if (!PHONE_RE.test(phone)) return say('رقم الموبايل غير صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015).', 'err');
    if (!grade) return say('اختر الصف الدراسي.', 'err');
    if (!parent_phone) return say('رقم ولي الأمر إجباري.', 'err');
    if (!PHONE_RE.test(parent_phone)) return say('رقم ولي الأمر غير صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015).', 'err');
    if (!email) return say('اكتب الإيميل.', 'err');
    if (password.length < 8) return say('كلمة المرور لازم 8 أحرف على الأقل.', 'err');
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name, phone, parent_phone, grade } } });
    if (error) return say(friendlyError(error), 'err');
    if (data.session) { say('تم إنشاء الحساب ✅', 'ok'); location.replace(nextPage()); }
    else say('تم إنشاء الحساب. افتح الإيميل وأكّد حسابك ثم سجّل دخول.', 'ok');
  }); });

  forms.forgot.addEventListener('submit', (e) => { e.preventDefault(); busy(forms.forgot, async () => {
    const email = $('#fgEmail').value.trim();
    if (!email) return say('اكتب الإيميل.', 'err');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) return say(friendlyError(error), 'err');
    say('لو الإيميل مسجّل عندنا هيوصلك رابط خلال دقائق.', 'ok');
  }); });

  forms.recovery.addEventListener('submit', (e) => { e.preventDefault(); busy(forms.recovery, async () => {
    const password = $('#rcPass').value;
    if (password.length < 8) return say('كلمة المرور لازم 8 أحرف على الأقل.', 'err');
    const { error } = await sb.auth.updateUser({ password });
    if (error) return say(friendlyError(error), 'err');
    say('تم تغيير كلمة المرور ✅', 'ok'); setTimeout(() => location.replace(nextPage()), 700);
  }); });
})();
