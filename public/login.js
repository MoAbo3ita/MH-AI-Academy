(async function () {
  'use strict';
  const { sb, $, $$, friendlyError, PHONE_RE } = window.MH || {};
  const M_CFG = () => (window.MH || {}).CFG;
  if (!sb) return;

  const NEXT_ALLOWED = ['lessons.html', 'admin.html', 'index.html', 'register.html'];
  const nextPage = () => {
    const n = new URLSearchParams(location.search).get('next');
    return NEXT_ALLOWED.includes(n) ? n : 'lessons.html'; // قائمة مسموحة فقط: يمنع التحويل لمواقع خارجية
  };
  const OTP = !!(M_CFG() && M_CFG().OTP_RESET);
  const forms = { login: $('#loginForm'), signup: $('#signupForm'), forgot: $('#forgotForm'), otp: $('#otpForm'), recovery: $('#recoveryForm') };
  const msg = $('#msg');
  const say = (text, type) => { msg.textContent = text || ''; msg.className = 'pf-msg' + (type ? ' ' + type : ''); };
  function show(name) {
    Object.entries(forms).forEach(([k, f]) => { f.hidden = k !== name; });
    $('#authTabs').hidden = ['forgot', 'otp', 'recovery'].includes(name);
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
  if (!OTP) $('#otpLinkWrap').hidden = true;   // خيار الكود بيشتغل بس بعد ما الأدمن يفعّل SMTP مخصص
  $('#toOtp').addEventListener('click', () => { const e = $('#fgEmail').value.trim(); show('otp'); if (e) $('#otpEmail').value = e; });
  $('#backForgot').addEventListener('click', () => show('forgot'));
  if (new URLSearchParams(location.search).get('tab') === 'signup') show('signup');

  // استعادة كلمة المرور: الرابط اللي بيوصل بالإيميل بيرجع للصفحة دي (أو بيرجع بخطأ)
  const hashP = new URLSearchParams(location.hash.replace(/^#/, '')), queryP = new URLSearchParams(location.search);
  const urlErrCode = hashP.get('error_code') || queryP.get('error_code') || hashP.get('error') || queryP.get('error');
  const isRecovery = hashP.get('type') === 'recovery' || /type=recovery/.test(location.hash);
  sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') show('recovery'); });
  if (urlErrCode) {            // الرابط منتهي أو اتفتح قبل كده (برامج الإيميل ساعات بتفتحه تلقائيًا)
    show('forgot');
    say(/otp_expired|expired/i.test(urlErrCode + (hashP.get('error_description') || '')) ? 'الرابط منتهي أو اتفتح قبل كده. اطلب رابط جديد' + (OTP ? '، أو استخدم «عندي كود من الإيميل».' : '.') : 'تعذّر فتح الرابط. اطلب رابط جديد' + (OTP ? ' أو استخدم الكود.' : '.'), 'err');
    history.replaceState(null, '', location.pathname);
  } else if (queryP.get('code')) {   // مسار PKCE: الرابط بيرجع بـ ?code=
    const { error } = await sb.auth.exchangeCodeForSession(queryP.get('code'));
    if (error) { show('forgot'); say('الرابط غير صالح أو منتهي. اطلب رابط جديد' + (OTP ? ' أو استخدم الكود.' : '.'), 'err'); } else show('recovery');
    history.replaceState(null, '', location.pathname);
  } else if (isRecovery) show('recovery');
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
    // دايمًا نرجّع على /login.html بالظبط (مش مسار الصفحة الحالي) عشان يطابق Redirect URLs في Supabase
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/login.html' });
    if (error) return say(friendlyError(error), 'err');
    $('#otpEmail').value = email;
    say('لو الإيميل مسجّل عندنا هيوصلك رابط خلال دقائق (شوف الـ Spam)' + (OTP ? '. لو الرابط ما فتحش اضغط «عندي كود من الإيميل».' : '. افتح الرابط من نفس الجهاز، وطلب رابط جديد لو انتهى.'), 'ok');
  }); });

  forms.otp.addEventListener('submit', (e) => { e.preventDefault(); busy(forms.otp, async () => {
    const email = $('#otpEmail').value.trim(), token = $('#otpCode').value.replace(/\s/g, ''), password = $('#otpPass').value;
    if (!email) return say('اكتب الإيميل.', 'err');
    if (!/^\d{6,10}$/.test(token)) return say('الكود أرقام فقط (6 إلى 10 أرقام).', 'err');
    if (password.length < 8) return say('كلمة المرور لازم 8 أحرف على الأقل.', 'err');
    const v = await sb.auth.verifyOtp({ email, token, type: 'recovery' });
    if (v.error) return say(/expired|invalid/i.test(v.error.message) ? 'الكود غلط أو منتهي. اطلب كود جديد.' : friendlyError(v.error), 'err');
    const { error } = await sb.auth.updateUser({ password });
    if (error) return say(friendlyError(error), 'err');
    say('تم تغيير كلمة المرور ✅', 'ok'); setTimeout(() => location.replace(nextPage()), 700);
  }); });

  forms.recovery.addEventListener('submit', (e) => { e.preventDefault(); busy(forms.recovery, async () => {
    const password = $('#rcPass').value;
    if (password.length < 8) return say('كلمة المرور لازم 8 أحرف على الأقل.', 'err');
    const { error } = await sb.auth.updateUser({ password });
    if (error) return say(friendlyError(error), 'err');
    say('تم تغيير كلمة المرور ✅', 'ok'); setTimeout(() => location.replace(nextPage()), 700);
  }); });
})();
