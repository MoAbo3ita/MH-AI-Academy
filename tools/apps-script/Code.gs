//=====================================================
<<<<<<< HEAD
// MH AI Academy — Mail Relay (Google Apps Script)
=======
// MH AI Academy — Mail Relay (Google Apps Script)  v2
>>>>>>> 55b4195 (update)
// Owner: Mohamed Hany
// قاعدة البيانات (Supabase) تبعت "حدث" لهنا، والسكربت يبعت الإيميلات.
// الإعدادات السرية في: Project Settings ← Script properties (مش في الكود):
//   WEBHOOK_SECRET = نفس mail_secret اللي في Supabase
//   SUPABASE_URL   = https://ikqgcciuiavelvztgkpg.supabase.co
<<<<<<< HEAD
//   SERVICE_KEY    = مفتاح Secret جديد (sb_secret_...) — لإرفاق ملفات الـ PDF بالإيميل
=======
//   SERVICE_KEY    = مفتاح Secret (sb_secret_...) — لإرفاق ملفات الـ PDF بالإيميل
>>>>>>> 55b4195 (update)
//   ADMIN_EMAIL    = (اختياري) الافتراضي midoaboeita235@gmail.com
//=====================================================

const DEFAULT_ADMIN = "midoaboeita235@gmail.com";
const BRAND = "MH AI Academy";
const MAX_ATTACH_BYTES = 20 * 1024 * 1024;
<<<<<<< HEAD
=======
const METHOD = { instapay: "إنستا باي", wepay: "WE Pay" };
>>>>>>> 55b4195 (update)

function prop_(k, d) { return PropertiesService.getScriptProperties().getProperty(k) || d || ""; }
function esc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
<<<<<<< HEAD

function doGet() { return json_({ status: "success", message: "MH AI Academy Mail API Running" }); }
=======
function doGet() { return json_({ status: "success", message: "MH AI Academy Mail API Running v2" }); }
>>>>>>> 55b4195 (update)

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    if (!prop_("WEBHOOK_SECRET") || d.secret !== prop_("WEBHOOK_SECRET")) throw new Error("unauthorized");
    const h = HANDLERS[d.event];
    if (!h) throw new Error("unknown event: " + d.event);
    h(d);
    return json_({ status: "success" });
  } catch (err) {
    console.error(err);
    return json_({ status: "error", message: String(err) });
  }
}

//-----------------------------------------------------
<<<<<<< HEAD
// قوالب
//-----------------------------------------------------
function wa_(phone) { return "https://wa.me/2" + String(phone || "").replace(/\D/g, ""); }
function row_(k, v) { return "<tr><th style='text-align:right;background:#f1f5f9'>" + esc_(k) + "</th><td>" + esc_(v || "—") + "</td></tr>"; }
function table_(rows) {
  return "<table border='1' cellpadding='10' cellspacing='0' style='border-collapse:collapse;min-width:280px'>" + rows.join("") + "</table>";
}
function btn_(href, label, color) {
  return "<p><a href='" + esc_(href) + "' style='background:" + (color || "#0b3fd1") + ";color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block'>" + esc_(label) + "</a></p>";
}
function wrap_(inner) {
  return "<div dir='rtl' style='font-family:Cairo,Tahoma,sans-serif;line-height:1.9;color:#0f172a'>" + inner +
    "<hr style='border:none;border-top:1px solid #e2e8f0'><p style='color:#64748b;font-size:13px'>" + BRAND + " — إعداد المهندس / محمد هاني</p></div>";
}
=======
// التصميم: هيدر بلون العلامة + كارت + شريط حالة ملوّن + زرار
//-----------------------------------------------------
const TONE = {
  success: { c: "#16a34a", bg: "#ecfdf5", icon: "✅" },
  info:    { c: "#0b3fd1", bg: "#eff6ff", icon: "ℹ️" },
  warn:    { c: "#d97706", bg: "#fffbeb", icon: "⏳" },
  danger:  { c: "#dc2626", bg: "#fef2f2", icon: "⚠️" }
};
function layout_(tone, title, intro, bodyHtml, buttons, preheader) {
  const t = TONE[tone] || TONE.info;
  const btns = (buttons || []).map(function (b) {
    return "<a href='" + esc_(b.href) + "' style='display:inline-block;margin:6px 4px;background:" + (b.color || t.c) + ";color:#ffffff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px'>" + esc_(b.label) + "</a>";
  }).join("");
  return "<!doctype html><html dir='rtl' lang='ar'><body style='margin:0;padding:0;background:#eef2f7'>" +
    "<span style='display:none;max-height:0;overflow:hidden;opacity:0'>" + esc_(preheader || title) + "</span>" +
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background:#eef2f7;padding:24px 10px'><tr><td align='center'>" +
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Cairo,Tahoma,Arial,sans-serif;color:#0f172a;box-shadow:0 6px 24px rgba(15,23,42,.10)'>" +
    // الهيدر
    "<tr><td style='background:#0b1b3f;background-image:linear-gradient(135deg,#0b1b3f 0%,#1d3a9e 60%,#6d5df6 100%);padding:26px 28px;text-align:right'>" +
      "<div style='font-size:13px;color:#9db4ff;letter-spacing:.5px'>MH AI ACADEMY</div>" +
      "<div style='font-size:22px;font-weight:800;color:#ffffff;margin-top:4px'>أكاديمية MH للذكاء الاصطناعي</div></td></tr>" +
    // شريط الحالة
    "<tr><td style='background:" + t.bg + ";border-bottom:3px solid " + t.c + ";padding:18px 28px;text-align:right'>" +
      "<span style='font-size:26px;vertical-align:middle'>" + t.icon + "</span> " +
      "<span style='font-size:20px;font-weight:800;color:" + t.c + ";vertical-align:middle'>" + esc_(title) + "</span></td></tr>" +
    // المحتوى
    "<tr><td style='padding:26px 28px;font-size:16px;line-height:1.95;text-align:right'>" +
      (intro ? "<p style='margin:0 0 16px'>" + intro + "</p>" : "") + bodyHtml +
      (btns ? "<div style='text-align:center;margin:26px 0 6px'>" + btns + "</div>" : "") + "</td></tr>" +
    // الفوتر
    "<tr><td style='background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;text-align:center;font-size:12.5px;color:#64748b'>" +
      "MH AI Academy — إعداد المهندس / محمد هاني<br>لو محتاج مساعدة ردّ على الرسالة دي مباشرة.</td></tr>" +
    "</table></td></tr></table></body></html>";
}
// جدول تفاصيل منسّق
function rows_(pairs) {
  const tr = pairs.filter(function (p) { return p && p[1] !== undefined && p[1] !== null && p[1] !== ""; }).map(function (p, i) {
    return "<tr style='background:" + (i % 2 ? "#f8fafc" : "#ffffff") + "'><td style='padding:10px 14px;color:#475569;width:38%;border-bottom:1px solid #e2e8f0'>" + esc_(p[0]) +
      "</td><td style='padding:10px 14px;font-weight:700;border-bottom:1px solid #e2e8f0'>" + esc_(p[1]) + "</td></tr>";
  }).join("");
  return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;overflow:hidden;margin:12px 0'>" + tr + "</table>";
}
function note_(label, text, tone) {
  const t = TONE[tone] || TONE.info;
  return "<div style='background:" + t.bg + ";border-right:4px solid " + t.c + ";padding:12px 16px;border-radius:8px;margin:14px 0'><strong style='color:" + t.c + "'>" + esc_(label) + "</strong><br>" + esc_(text) + "</div>";
}
function big_(label, value, tone) {
  const t = TONE[tone] || TONE.info;
  return "<div style='text-align:center;background:" + t.bg + ";border:1px dashed " + t.c + ";border-radius:12px;padding:16px;margin:16px 0'><div style='color:#475569;font-size:14px'>" + esc_(label) + "</div><div style='font-size:26px;font-weight:800;color:" + t.c + "'>" + esc_(value) + "</div></div>";
}

>>>>>>> 55b4195 (update)
function send_(to, subject, html, attachments) {
  if (!to) return;
  const o = { to: to, subject: subject, htmlBody: html, name: BRAND, replyTo: prop_("ADMIN_EMAIL", DEFAULT_ADMIN) };
  if (attachments && attachments.length) o.attachments = attachments;
  MailApp.sendEmail(o);
}
function toAdmin_(subject, html) { send_(prop_("ADMIN_EMAIL", DEFAULT_ADMIN), subject, html); }
<<<<<<< HEAD
function adminLink_(d) { return (d.site_url || "") + "/admin.html"; }
function lessonsLink_(d) { return (d.site_url || "") + "/lessons.html"; }
function fmtDate_(iso) {
  return Utilities.formatDate(new Date(iso), "Africa/Cairo", "dd/MM/yyyy");
}
function itemsText_(items) { return (items || []).map(function (i) { return (i.kind === "lesson" ? "حصة: " : "ملف: ") + i.title; }).join(" + "); }
const METHOD = { instapay: "إنستا باي", wepay: "WE Pay" };
=======
function wa_(phone) { return "https://wa.me/2" + String(phone || "").replace(/\D/g, ""); }
function adminLink_(d) { return (d.site_url || "") + "/admin.html"; }
function lessonsLink_(d) { return (d.site_url || "") + "/lessons.html"; }
function fmtDate_(iso) { return Utilities.formatDate(new Date(iso), "Africa/Cairo", "dd/MM/yyyy"); }
function itemsText_(items) { return (items || []).map(function (i) { return (i.kind === "lesson" ? "حصة: " : "ملف: ") + i.title; }).join(" + "); }
function studentRows_(s) { return [["الطالب", s.name], ["الصف", s.grade], ["رقم الطالب", s.phone], ["رقم ولي الأمر", s.parent_phone], ["الإيميل", s.email]]; }
>>>>>>> 55b4195 (update)

// تنزيل PDF من التخزين الخاص (بمفتاح السيرفر المحفوظ في Script properties)
function fetchPdf_(path, title) {
  const base = prop_("SUPABASE_URL"), key = prop_("SERVICE_KEY");
  if (!base || !key) return null;
  const url = base + "/storage/v1/object/pdfs/" + String(path).split("/").map(encodeURIComponent).join("/");
  // مفتاح Secret الجديد (sb_secret_...) يتبعت في apikey بس. المفتاح القديم (JWT) يتبعت في الاتنين.
  const headers = key.indexOf("sb_") === 0 ? { apikey: key } : { Authorization: "Bearer " + key, apikey: key };
  const r = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) { console.error("pdf fetch failed", r.getResponseCode(), path); return null; }
  const blob = r.getBlob();
  if (blob.getBytes().length > MAX_ATTACH_BYTES) return null;
  return blob.setName(String(title || "file").replace(/[\\/:*?"<>|]/g, " ") + ".pdf");
}

//-----------------------------------------------------
// الأحداث
//-----------------------------------------------------
const HANDLERS = {

<<<<<<< HEAD
  // تسجيل من الصفحة العامة → إيميل للأدمن (زي القديم)
  registration: function (d) {
    const r = d.registration;
    toAdmin_("📩 تسجيل طالب جديد - " + BRAND, wrap_(
      "<h2>تم تسجيل طالب جديد ✅</h2>" +
      table_([row_("الاسم", r.name), row_("الصف", r.grade), row_("رقم الطالب", r.phone), row_("رقم ولي الأمر", r.parent_phone)]) +
      btn_(wa_(r.phone), "واتساب الطالب", "#25D366") + btn_(wa_(r.parent_phone), "واتساب ولي الأمر", "#128C7E")));
=======
  // تسجيل من الصفحة العامة → إيميل للأدمن + ترحيب للطالب لو كتب إيميل
  registration: function (d) {
    const r = d.registration;
    toAdmin_("📩 تسجيل طالب جديد - " + r.name, layout_("info", "تسجيل طالب جديد", "وصل تسجيل جديد من صفحة التسجيل:",
      rows_([["الاسم", r.name], ["الصف", r.grade], ["رقم الطالب", r.phone], ["رقم ولي الأمر", r.parent_phone], ["الإيميل", r.email]]),
      [{ label: "واتساب الطالب", href: wa_(r.phone), color: "#25D366" }, { label: "واتساب ولي الأمر", href: wa_(r.parent_phone), color: "#128C7E" }]));
    if (r.email) send_(r.email, "تم استلام تسجيلك ✅ - " + BRAND, layout_("success", "تم استلام تسجيلك",
      "أهلًا <strong>" + esc_(r.name) + "</strong>، شكرًا لتسجيلك في أكاديمية MH.",
      "<p>هنتواصل معاك قريبًا بخصوص المواعيد وجروب الواتساب الخاص بـ <strong>" + esc_(r.grade) + "</strong>.</p>",
      [{ label: "زيارة الموقع", href: (d.site_url || "") + "/index.html" }]));
>>>>>>> 55b4195 (update)
  },

  // حساب جديد → ترحيب للطالب + إشعار للأدمن
  signup: function (d) {
    const s = d.student;
<<<<<<< HEAD
    send_(s.email, "أهلًا بيك في " + BRAND + " 👋", wrap_(
      "<h2>أهلًا " + esc_(s.name) + "!</h2><p>تم إنشاء حسابك بنجاح. تقدر تدخل وتشوف الحصص والملفات المتاحة.</p>" +
      btn_(lessonsLink_(d), "ادخل على الحصص")));
    toAdmin_("👤 حساب طالب جديد - " + BRAND, wrap_(
      "<h2>حساب جديد ✅</h2>" +
      table_([row_("الاسم", s.name), row_("الإيميل", s.email), row_("الصف", s.grade), row_("رقم الطالب", s.phone), row_("رقم ولي الأمر", s.parent_phone)]) +
      btn_(wa_(s.phone), "واتساب الطالب", "#25D366")));
=======
    send_(s.email, "أهلًا بيك في " + BRAND + " 👋", layout_("success", "أهلًا بيك في الأكاديمية",
      "أهلًا <strong>" + esc_(s.name) + "</strong>، تم إنشاء حسابك بنجاح.",
      "<p>تقدر دلوقتي تدخل وتشوف الحصص والملفات المتاحة، وتشترك أو تشتري اللي يناسبك.</p>",
      [{ label: "ادخل على الحصص", href: lessonsLink_(d) }]));
    toAdmin_("👤 حساب طالب جديد - " + s.name, layout_("info", "حساب طالب جديد", "طالب جديد أنشأ حساب على المنصة:",
      rows_(studentRows_(s)), [{ label: "واتساب الطالب", href: wa_(s.phone), color: "#25D366" }]));
>>>>>>> 55b4195 (update)
  },

  // طلب شراء جديد → للأدمن
  order_new: function (d) {
    const s = d.student, o = d.order;
<<<<<<< HEAD
    toAdmin_("🧾 طلب دفع جديد (" + o.amount + " ج) - " + BRAND, wrap_(
      "<h2>طلب دفع جديد ⏳</h2>" +
      table_([row_("الطالب", s.name), row_("الصف", s.grade), row_("المطلوب", itemsText_(d.items)), row_("المبلغ", o.amount + " ج"),
        row_("طريقة الدفع", METHOD[o.method] || o.method), row_("حوّل من رقم", o.sender_phone), row_("رقم العملية", o.txn),
        row_("إيصال مرفوع", o.has_receipt ? "نعم" : "لا"), row_("رقم الطالب", s.phone), row_("رقم ولي الأمر", s.parent_phone)]) +
      "<p>راجع التحويل في تطبيقك، وبعدين اقبل أو ارفض من لوحة الأدمن:</p>" + btn_(adminLink_(d), "فتح لوحة الأدمن") + btn_(wa_(s.phone), "واتساب الطالب", "#25D366")));
  },

  // الأدمن قبل الطلب → للطالب (+ الملف مرفق لو فيه ملف)
=======
    toAdmin_("🧾 طلب دفع جديد (" + o.amount + " ج) - " + s.name, layout_("warn", "طلب دفع جديد ينتظر مراجعتك", "راجع التحويل في تطبيقك وبعدين اقبل أو ارفض من لوحة الأدمن:",
      big_("المبلغ", o.amount + " جنيه", "warn") +
      rows_([["المطلوب", itemsText_(d.items)], ["طريقة الدفع", METHOD[o.method] || o.method], ["حوّل من رقم", o.sender_phone], ["رقم العملية", o.txn], ["إيصال مرفوع", o.has_receipt ? "نعم" : "لا"]].concat(studentRows_(s))),
      [{ label: "فتح لوحة الأدمن", href: adminLink_(d) }, { label: "واتساب الطالب", href: wa_(s.phone), color: "#25D366" }]));
  },

  // الأدمن قبل الطلب → للطالب (+ الملف مرفق)
>>>>>>> 55b4195 (update)
  order_approved: function (d) {
    const s = d.student, items = d.items || [];
    const files = items.filter(function (i) { return i.kind === "pdf" && i.path; });
    const atts = [];
    files.forEach(function (f) { const b = fetchPdf_(f.path, f.title); if (b) atts.push(b); });
    const missing = files.length > atts.length;
    const hasLesson = items.some(function (i) { return i.kind === "lesson"; });
<<<<<<< HEAD
    send_(s.email, "✅ تم تفعيل طلبك - " + BRAND, wrap_(
      "<h2>أهلًا " + esc_(s.name) + "، تم قبول طلبك ✅</h2>" +
      "<p>تم تفعيل: <strong>" + esc_(itemsText_(items)) + "</strong></p>" +
      (atts.length ? "<p>الملف مرفق مع الرسالة 📎</p>" : "") +
      (missing ? "<p>الملف متاح لك دايمًا من صفحة الحصص (تعذّر إرفاقه بالإيميل).</p>" : "") +
      (hasLesson ? "<p>تقدر تشاهد الحصة من حسابك:</p>" : "<p>تقدر تفتح الملف كمان من حسابك:</p>") +
      btn_(lessonsLink_(d), "الحصص والملفات")), atts);
=======
    send_(s.email, "✅ تم تفعيل طلبك - " + BRAND, layout_("success", "تم قبول طلبك وتفعيله",
      "أهلًا <strong>" + esc_(s.name) + "</strong>، دفعك اتراجع واتفعّل اللي طلبته:",
      rows_(items.map(function (i) { return [i.kind === "lesson" ? "حصة" : "ملف", i.title]; })) +
      (atts.length ? note_("📎 الملف مرفق", "الملف مرفق مع الرسالة دي، وبرضه متاح لك دايمًا من حسابك.", "success") : "") +
      (missing ? note_("ملحوظة", "تعذّر إرفاق الملف بالإيميل، لكنه متاح لك من صفحة الحصص في حسابك.", "warn") : "") +
      "<p>" + (hasLesson ? "تقدر تشاهد الحصة من حسابك دلوقتي." : "تقدر تفتح الملف من حسابك أي وقت.") + "</p>",
      [{ label: "الحصص والملفات", href: lessonsLink_(d) }]), atts);
>>>>>>> 55b4195 (update)
  },

  order_rejected: function (d) {
    const s = d.student;
<<<<<<< HEAD
    send_(s.email, "بخصوص طلبك - " + BRAND, wrap_(
      "<h2>أهلًا " + esc_(s.name) + "</h2><p>للأسف مقدرناش نقبل طلبك لـ <strong>" + esc_(itemsText_(d.items)) + "</strong>.</p>" +
      (d.order.note ? "<p>السبب: " + esc_(d.order.note) + "</p>" : "") +
      "<p>تقدر تعيد المحاولة أو تتواصل معانا على واتساب.</p>" + btn_(lessonsLink_(d), "الحصص والملفات")));
=======
    send_(s.email, "بخصوص طلبك - " + BRAND, layout_("danger", "مقدرناش نقبل طلبك",
      "أهلًا <strong>" + esc_(s.name) + "</strong>، للأسف طلبك لـ <strong>" + esc_(itemsText_(d.items)) + "</strong> اترفض.",
      (d.order.note ? note_("السبب", d.order.note, "danger") : "") + "<p>تقدر تعيد المحاولة بعد المراجعة، أو تكلمنا على واتساب لو محتاج مساعدة.</p>",
      [{ label: "الحصص والملفات", href: lessonsLink_(d) }]));
>>>>>>> 55b4195 (update)
  },

  // طلب اشتراك جديد → للأدمن
  sub_new: function (d) {
    const s = d.student, b = d.subscription;
<<<<<<< HEAD
    toAdmin_("⭐ طلب اشتراك جديد (" + b.amount + " ج) - " + BRAND, wrap_(
      "<h2>طلب اشتراك جديد ⏳</h2>" +
      table_([row_("الطالب", s.name), row_("الصف", b.grade), row_("الخطة", b.plan), row_("المدة", b.months + " شهر"), row_("المبلغ", b.amount + " ج"),
        row_("طريقة الدفع", METHOD[b.method] || b.method), row_("حوّل من رقم", b.sender_phone), row_("رقم العملية", b.txn),
        row_("إيصال مرفوع", b.has_receipt ? "نعم" : "لا"), row_("رقم الطالب", s.phone), row_("رقم ولي الأمر", s.parent_phone)]) +
      btn_(adminLink_(d), "فتح لوحة الأدمن") + btn_(wa_(s.phone), "واتساب الطالب", "#25D366")));
  },

  // الأدمن وافق على الاشتراك (أو منحه يدويًا) → للطالب بالمدة وتاريخ الانتهاء
  sub_approved: function (d) {
    const s = d.student, b = d.subscription;
    const months = b ? "<p>مدة الاشتراك اللي اخترتها: <strong>" + esc_(b.months) + " شهر</strong>" + (b.plan ? " (" + esc_(b.plan) + ")" : "") + "</p>" : "";
    send_(s.email, "✅ تم تفعيل اشتراكك - " + BRAND, wrap_(
      "<h2>أهلًا " + esc_(s.name) + "، تمت الموافقة على اشتراكك ✅</h2>" + months +
      "<p>اشتراكك ساري حتى: <strong>" + esc_(fmtDate_(d.until)) + "</strong></p>" +
      "<p>تقدر دلوقتي تفتح كل المحتوى المخصص للمشتركين.</p>" + btn_(lessonsLink_(d), "ادخل على الحصص")));
=======
    toAdmin_("⭐ طلب اشتراك جديد (" + b.amount + " ج) - " + s.name, layout_("warn", "طلب اشتراك جديد ينتظر مراجعتك", "راجع التحويل في تطبيقك وبعدين اقبل أو ارفض من لوحة الأدمن:",
      big_("المبلغ", b.amount + " جنيه", "warn") +
      rows_([["الخطة", b.plan], ["المدة", b.months + " شهر"], ["طريقة الدفع", METHOD[b.method] || b.method], ["حوّل من رقم", b.sender_phone], ["رقم العملية", b.txn], ["إيصال مرفوع", b.has_receipt ? "نعم" : "لا"]].concat(studentRows_(s))),
      [{ label: "فتح لوحة الأدمن", href: adminLink_(d) }, { label: "واتساب الطالب", href: wa_(s.phone), color: "#25D366" }]));
  },

  // اشتراك اتفعّل: قبول طلب | إضافة يدوية | تمديد
  sub_approved: function (d) {
    const s = d.student, b = d.subscription, kind = d.kind || (b ? "approved" : "granted");
    const title = kind === "extended" ? "تم تمديد اشتراكك" : kind === "granted" ? "تم تفعيل اشتراكك" : "تمت الموافقة على اشتراكك";
    const intro = kind === "approved"
      ? "أهلًا <strong>" + esc_(s.name) + "</strong>، دفعك اتراجع وتمت الموافقة على اشتراكك" + (b && b.months ? " للمدة اللي اخترتها: <strong>" + esc_(b.months) + " شهر</strong>" : "") + "."
      : kind === "extended"
        ? "أهلًا <strong>" + esc_(s.name) + "</strong>، تم تمديد اشتراكك من طرف الإدارة."
        : "أهلًا <strong>" + esc_(s.name) + "</strong>، تم تفعيل اشتراكك من طرف الإدارة.";
    send_(s.email, "✅ " + title + " - " + BRAND, layout_("success", title, intro,
      big_("اشتراكك ساري حتى", fmtDate_(d.until), "success") +
      rows_([["الخطة", b && b.plan], ["المدة", b && b.months ? b.months + " شهر" : ""], d.previous_until && kind === "extended" ? ["كان ينتهي في", fmtDate_(d.previous_until)] : null]) +
      "<p>تقدر دلوقتي تفتح كل المحتوى المخصص للمشتركين (حصص وملفات) طوال المدة.</p>",
      [{ label: "ادخل على الحصص", href: lessonsLink_(d) }]));
>>>>>>> 55b4195 (update)
  },

  sub_rejected: function (d) {
    const s = d.student;
<<<<<<< HEAD
    send_(s.email, "بخصوص طلب اشتراكك - " + BRAND, wrap_(
      "<h2>أهلًا " + esc_(s.name) + "</h2><p>للأسف مقدرناش نقبل طلب الاشتراك.</p>" +
      (d.subscription.note ? "<p>السبب: " + esc_(d.subscription.note) + "</p>" : "") + "<p>تقدر تعيد المحاولة أو تكلمنا على واتساب.</p>"));
=======
    send_(s.email, "بخصوص طلب اشتراكك - " + BRAND, layout_("danger", "مقدرناش نقبل طلب الاشتراك",
      "أهلًا <strong>" + esc_(s.name) + "</strong>، للأسف طلب اشتراكك اترفض.",
      (d.subscription.note ? note_("السبب", d.subscription.note, "danger") : "") + "<p>تقدر تعيد المحاولة أو تكلمنا على واتساب.</p>",
      [{ label: "صفحة الاشتراك", href: (d.site_url || "") + "/register.html" }]));
  },

  // الأدمن لغى الاشتراك بسبب
  sub_cancelled: function (d) {
    const s = d.student;
    send_(s.email, "بخصوص اشتراكك - " + BRAND, layout_("danger", "تم إيقاف اشتراكك",
      "أهلًا <strong>" + esc_(s.name) + "</strong>، تم إيقاف اشتراكك من طرف الإدارة.",
      (d.reason ? note_("السبب", d.reason, "danger") : "") + "<p>لو عندك أي استفسار أو شايف إن ده حصل بالغلط، كلمنا على واتساب أو ردّ على الرسالة دي.</p>",
      [{ label: "تواصل معنا", href: wa_(prop_("ADMIN_PHONE", "01555109204")), color: "#25D366" }]));
    toAdmin_("🚫 تم إلغاء اشتراك " + s.name, layout_("info", "تم إلغاء اشتراك طالب", "تم الإلغاء بنجاح وتم إبلاغ الطالب.",
      rows_([["السبب", d.reason || "—"], ["كان ينتهي في", d.was_until ? fmtDate_(d.was_until) : ""]].concat(studentRows_(s)))));
  },

  // قبل الانتهاء بـ 3 أيام → للأدمن وللطالب
  sub_expiring: function (d) {
    const s = d.student, days = d.days_left;
    const when = days <= 0 ? "النهاردة" : days === 1 ? "بكرة" : "بعد " + days + " أيام";
    send_(s.email, "⏳ اشتراكك هينتهي " + when + " - " + BRAND, layout_("warn", "اشتراكك قرّب يخلص",
      "أهلًا <strong>" + esc_(s.name) + "</strong>، اشتراكك هينتهي <strong>" + when + "</strong>.",
      big_("تاريخ الانتهاء", fmtDate_(d.until), "warn") + "<p>جدّد اشتراكك قبل ما يخلص عشان تفضل مفتوحة لك كل الحصص والملفات من غير انقطاع.</p>",
      [{ label: "جدّد اشتراكك", href: (d.site_url || "") + "/register.html" }]));
    toAdmin_("⏳ اشتراك " + s.name + " هينتهي " + when, layout_("warn", "اشتراك قرّب ينتهي", "اشتراك الطالب ده هينتهي " + when + ":",
      big_("تاريخ الانتهاء", fmtDate_(d.until), "warn") + rows_(studentRows_(s)),
      [{ label: "واتساب الطالب", href: wa_(s.phone), color: "#25D366" }, { label: "فتح لوحة الأدمن", href: adminLink_(d) }]));
  },

  // يوم الانتهاء → للأدمن وللطالب
  sub_expired: function (d) {
    const s = d.student;
    send_(s.email, "انتهى اشتراكك - " + BRAND, layout_("danger", "انتهى اشتراكك",
      "أهلًا <strong>" + esc_(s.name) + "</strong>، اشتراكك انتهى بتاريخ <strong>" + esc_(fmtDate_(d.until)) + "</strong>.",
      "<p>المحتوى المخصص للمشتركين اتقفل لحد ما تجدّد. تقدر تجدّد في أي وقت وتكمل من مكانك.</p>",
      [{ label: "جدّد اشتراكك", href: (d.site_url || "") + "/register.html" }]));
    toAdmin_("🔚 انتهى اشتراك " + s.name, layout_("danger", "انتهى اشتراك طالب", "اشتراك الطالب ده انتهى النهاردة:",
      big_("تاريخ الانتهاء", fmtDate_(d.until), "danger") + rows_(studentRows_(s)),
      [{ label: "واتساب الطالب", href: wa_(s.phone), color: "#25D366" }, { label: "فتح لوحة الأدمن", href: adminLink_(d) }]));
>>>>>>> 55b4195 (update)
  }
};

// اختبار سريع من داخل المحرر: شغّل testAdminMail وتأكد إن وصلك إيميل
function testAdminMail() {
<<<<<<< HEAD
  HANDLERS.registration({ registration: { name: "طالب تجريبي", phone: "01012345678", parent_phone: "01112345678", grade: "الصف الأول الثانوي" } });
=======
  HANDLERS.registration({ site_url: "https://mh-ai-academy.vercel.app", registration: { name: "طالب تجريبي", phone: "01012345678", parent_phone: "01112345678", grade: "الصف الأول الثانوي", email: "" } });
}
// اختبار شكل إيميلات الطالب: بيبعتها لإيميل الأدمن (غيّر الإيميل لو عايز)
function testStudentMails() {
  const me = prop_("ADMIN_EMAIL", DEFAULT_ADMIN);
  const st = { name: "أحمد محمد", email: me, phone: "01012345678", parent_phone: "01112345678", grade: "الصف الأول الثانوي" };
  const base = { site_url: "https://mh-ai-academy.vercel.app", student: st };
  const until = new Date(Date.now() + 30 * 86400000).toISOString();
  HANDLERS.sub_approved(Object.assign({ until: until, kind: "approved", subscription: { months: 3, plan: "خطة الصف الأول" } }, base));
  HANDLERS.sub_approved(Object.assign({ until: until, kind: "extended", previous_until: new Date().toISOString() }, base));
  HANDLERS.sub_rejected(Object.assign({ subscription: { note: "رقم العملية غير صحيح" } }, base));
  HANDLERS.sub_cancelled(Object.assign({ reason: "تأخر في السداد", was_until: until }, base));
  HANDLERS.sub_expiring(Object.assign({ until: until, days_left: 3 }, base));
  HANDLERS.sub_expired(Object.assign({ until: until }, base));
>>>>>>> 55b4195 (update)
}
