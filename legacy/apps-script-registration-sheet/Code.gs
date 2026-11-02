/**
 * MH AI Academy — Registration endpoint (Google Apps Script, v2)
 *
 * ما الجديد في هذه النسخة:
 *  - يرد برد JSON واضح {status:'success' | 'duplicate' | 'error'} فيعرف الموقع نجاح الإرسال فعليًا.
 *  - يمنع التكرار (نفس رقم الطالب + نفس الصف، أو نفس requestId).
 *  - يحفظ رقم الهاتف كنص (لا يضيع الصفر الأول).
 *  - يحفظ رقم ولي الأمر (اختياري).
 *  - يتحقق من البيانات في السيرفر (وليس في المتصفح فقط).
 *  - إيميل إشعار فوري لك عند كل تسجيل جديد (اختياري).
 *
 * طريقة التركيب: اقرأ README-AR.md في نفس المجلد.
 */

// ✏️ اسم الورقة داخل الشيت (تُنشأ تلقائيًا لو غير موجودة)
const SHEET_NAME = 'Registrations';
// ✏️ اكتب إيميلك لتصلك رسالة عند كل تسجيل جديد. اتركه فارغًا لإلغاء الإشعارات.
const OWNER_EMAIL = '';

const PHONE_PATTERN = /^01[0125]\d{8}$/;
const GRADES = ['الصف الأول الثانوي', 'الصف الثاني الثانوي'];
const HEADERS = ['التاريخ', 'الاسم', 'رقم الهاتف', 'رقم ولي الأمر', 'الصف', 'requestId'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // يمنع تداخل تسجيلين في نفس اللحظة
    const p = (e && e.parameter) || {};
    const name = String(p.fullName || '').trim();
    const phone = String(p.phone || '').trim();
    const parent = String(p.parentPhone || '').trim();
    const grade = String(p.grade || '').trim();
    const requestId = String(p.requestId || '').trim();

    // --- التحقق في السيرفر ---
    if (name.length < 3) return reply_({ status: 'error', message: 'invalid_name' });
    if (!PHONE_PATTERN.test(phone)) return reply_({ status: 'error', message: 'invalid_phone' });
    if (parent && !PHONE_PATTERN.test(parent)) return reply_({ status: 'error', message: 'invalid_parent_phone' });
    if (GRADES.indexOf(grade) === -1) return reply_({ status: 'error', message: 'invalid_grade' });

    const sheet = getSheet_();

    // --- منع التكرار ---
    const last = sheet.getLastRow();
    if (last > 1) {
      const rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
      const duplicate = rows.some(function (r) {
        return (requestId && String(r[5]) === requestId) ||
               (String(r[2]) === phone && String(r[4]) === grade);
      });
      if (duplicate) return reply_({ status: 'duplicate' });
    }

    // --- الحفظ (أعمدة الهاتف كنص عشان ما يضيع الصفر) ---
    const row = sheet.getLastRow() + 1;
    sheet.getRange(row, 3, 1, 2).setNumberFormat('@');
    sheet.getRange(row, 1, 1, HEADERS.length).setValues([[new Date(), name, phone, parent, grade, requestId]]);

    notifyOwner_(name, phone, parent, grade);
    return reply_({ status: 'success' });
  } catch (err) {
    return reply_({ status: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* ignore */ }
  }
}

// يستخدمه الموقع لفحص الاتصال فقط
function doGet() {
  return reply_({ status: 'ok' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function notifyOwner_(name, phone, parent, grade) {
  if (!OWNER_EMAIL) return;
  try {
    MailApp.sendEmail(
      OWNER_EMAIL,
      'تسجيل جديد: ' + name + ' — ' + grade,
      'الاسم: ' + name + '\nالهاتف: ' + phone + '\nولي الأمر: ' + (parent || '—') + '\nالصف: ' + grade
    );
  } catch (err) { /* الإشعار اختياري، لا نُفشل التسجيل بسببه */ }
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
