//=====================================================
// MH AI Academy — Mail Relay (Google Apps Script)
// Owner: Mohamed Hany
// قاعدة البيانات (Supabase) تبعت "حدث" لهنا، والسكربت يبعت الإيميلات.
// الإعدادات السرية في: Project Settings ← Script properties (مش في الكود):
//   WEBHOOK_SECRET = نفس mail_secret اللي في Supabase
//   SUPABASE_URL   = https://ikqgcciuiavelvztgkpg.supabase.co
//   SERVICE_KEY    = مفتاح Secret جديد (sb_secret_...) — لإرفاق ملفات الـ PDF بالإيميل
//   ADMIN_EMAIL    = (اختياري) الافتراضي midoaboeita235@gmail.com
//=====================================================

const DEFAULT_ADMIN = "midoaboeita235@gmail.com";
const BRAND = "MH AI Academy";
const MAX_ATTACH_BYTES = 20 * 1024 * 1024;

function prop_(k, d) { return PropertiesService.getScriptProperties().getProperty(k) || d || ""; }
function esc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet() { return json_({ status: "success", message: "MH AI Academy Mail API Running" }); }

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
function send_(to, subject, html, attachments) {
  if (!to) return;
  const o = { to: to, subject: subject, htmlBody: html, name: BRAND, replyTo: prop_("ADMIN_EMAIL", DEFAULT_ADMIN) };
  if (attachments && attachments.length) o.attachments = attachments;
  MailApp.sendEmail(o);
}
function toAdmin_(subject, html) { send_(prop_("ADMIN_EMAIL", DEFAULT_ADMIN), subject, html); }
function adminLink_(d) { return (d.site_url || "") + "/admin.html"; }
function lessonsLink_(d) { return (d.site_url || "") + "/lessons.html"; }
function fmtDate_(iso) {
  return Utilities.formatDate(new Date(iso), "Africa/Cairo", "dd/MM/yyyy");
}
function itemsText_(items) { return (items || []).map(function (i) { return (i.kind === "lesson" ? "حصة: " : "ملف: ") + i.title; }).join(" + "); }
const METHOD = { instapay: "إنستا باي", wepay: "WE Pay" };

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

  // تسجيل من الصفحة العامة → إيميل للأدمن (زي القديم)
  registration: function (d) {
    const r = d.registration;
    toAdmin_("📩 تسجيل طالب جديد - " + BRAND, wrap_(
      "<h2>تم تسجيل طالب جديد ✅</h2>" +
      table_([row_("الاسم", r.name), row_("الصف", r.grade), row_("رقم الطالب", r.phone), row_("رقم ولي الأمر", r.parent_phone)]) +
      btn_(wa_(r.phone), "واتساب الطالب", "#25D366") + btn_(wa_(r.parent_phone), "واتساب ولي الأمر", "#128C7E")));
  },

  // حساب جديد → ترحيب للطالب + إشعار للأدمن
  signup: function (d) {
    const s = d.student;
    send_(s.email, "أهلًا بيك في " + BRAND + " 👋", wrap_(
      "<h2>أهلًا " + esc_(s.name) + "!</h2><p>تم إنشاء حسابك بنجاح. تقدر تدخل وتشوف الحصص والملفات المتاحة.</p>" +
      btn_(lessonsLink_(d), "ادخل على الحصص")));
    toAdmin_("👤 حساب طالب جديد - " + BRAND, wrap_(
      "<h2>حساب جديد ✅</h2>" +
      table_([row_("الاسم", s.name), row_("الإيميل", s.email), row_("الصف", s.grade), row_("رقم الطالب", s.phone), row_("رقم ولي الأمر", s.parent_phone)]) +
      btn_(wa_(s.phone), "واتساب الطالب", "#25D366")));
  },

  // طلب شراء جديد → للأدمن
  order_new: function (d) {
    const s = d.student, o = d.order;
    toAdmin_("🧾 طلب دفع جديد (" + o.amount + " ج) - " + BRAND, wrap_(
      "<h2>طلب دفع جديد ⏳</h2>" +
      table_([row_("الطالب", s.name), row_("الصف", s.grade), row_("المطلوب", itemsText_(d.items)), row_("المبلغ", o.amount + " ج"),
        row_("طريقة الدفع", METHOD[o.method] || o.method), row_("حوّل من رقم", o.sender_phone), row_("رقم العملية", o.txn),
        row_("إيصال مرفوع", o.has_receipt ? "نعم" : "لا"), row_("رقم الطالب", s.phone), row_("رقم ولي الأمر", s.parent_phone)]) +
      "<p>راجع التحويل في تطبيقك، وبعدين اقبل أو ارفض من لوحة الأدمن:</p>" + btn_(adminLink_(d), "فتح لوحة الأدمن") + btn_(wa_(s.phone), "واتساب الطالب", "#25D366")));
  },

  // الأدمن قبل الطلب → للطالب (+ الملف مرفق لو فيه ملف)
  order_approved: function (d) {
    const s = d.student, items = d.items || [];
    const files = items.filter(function (i) { return i.kind === "pdf" && i.path; });
    const atts = [];
    files.forEach(function (f) { const b = fetchPdf_(f.path, f.title); if (b) atts.push(b); });
    const missing = files.length > atts.length;
    const hasLesson = items.some(function (i) { return i.kind === "lesson"; });
    send_(s.email, "✅ تم تفعيل طلبك - " + BRAND, wrap_(
      "<h2>أهلًا " + esc_(s.name) + "، تم قبول طلبك ✅</h2>" +
      "<p>تم تفعيل: <strong>" + esc_(itemsText_(items)) + "</strong></p>" +
      (atts.length ? "<p>الملف مرفق مع الرسالة 📎</p>" : "") +
      (missing ? "<p>الملف متاح لك دايمًا من صفحة الحصص (تعذّر إرفاقه بالإيميل).</p>" : "") +
      (hasLesson ? "<p>تقدر تشاهد الحصة من حسابك:</p>" : "<p>تقدر تفتح الملف كمان من حسابك:</p>") +
      btn_(lessonsLink_(d), "الحصص والملفات")), atts);
  },

  order_rejected: function (d) {
    const s = d.student;
    send_(s.email, "بخصوص طلبك - " + BRAND, wrap_(
      "<h2>أهلًا " + esc_(s.name) + "</h2><p>للأسف مقدرناش نقبل طلبك لـ <strong>" + esc_(itemsText_(d.items)) + "</strong>.</p>" +
      (d.order.note ? "<p>السبب: " + esc_(d.order.note) + "</p>" : "") +
      "<p>تقدر تعيد المحاولة أو تتواصل معانا على واتساب.</p>" + btn_(lessonsLink_(d), "الحصص والملفات")));
  },

  // طلب اشتراك جديد → للأدمن
  sub_new: function (d) {
    const s = d.student, b = d.subscription;
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
  },

  sub_rejected: function (d) {
    const s = d.student;
    send_(s.email, "بخصوص طلب اشتراكك - " + BRAND, wrap_(
      "<h2>أهلًا " + esc_(s.name) + "</h2><p>للأسف مقدرناش نقبل طلب الاشتراك.</p>" +
      (d.subscription.note ? "<p>السبب: " + esc_(d.subscription.note) + "</p>" : "") + "<p>تقدر تعيد المحاولة أو تكلمنا على واتساب.</p>"));
  }
};

// اختبار سريع من داخل المحرر: شغّل testAdminMail وتأكد إن وصلك إيميل
function testAdminMail() {
  HANDLERS.registration({ registration: { name: "طالب تجريبي", phone: "01012345678", parent_phone: "01112345678", grade: "الصف الأول الثانوي" } });
}
