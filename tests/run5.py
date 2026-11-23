# اختبار: ملف الحصة، عدّاد المشاهدة، إلغاء الاشتراك بسبب، إيميل التسجيل
import re, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); B=os.environ.get('MH_BASE','http://localhost:8124/')
MOCK=open(HERE+'/mock-supabase.js',encoding='utf-8').read(); res=[]
def check(n,c,e=''): res.append(bool(c)); print(('PASS' if c else 'FAIL'),'-',n,e)
PDF=b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={'width':1280,'height':900},locale='ar-EG')
    ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=MOCK))
    ctx.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'),lambda r:r.abort())
    ctx.route('**/rest/v1/**',lambda r:r.fulfill(status=200,headers={'access-control-allow-origin':'*','content-type':'application/json'},body='[]'))
    def state():
        for o in ctx.storage_state()['origins']:
            for ls in o['localStorage']:
                if ls['name']=='__mockdb': return json.loads(ls['value'])
    errors=[]; pg=ctx.new_page(); pg.on('pageerror',lambda e:errors.append(str(e)))
    txt=lambda s='body': pg.inner_text(s)
    def login(e,pw):
        pg.goto(B+'login.html'); pg.fill('#loginEmail',e); pg.fill('#loginPass',pw); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/lessons.html'); pg.wait_for_selector('.pf-card')
    def logout(): pg.goto(B+'lessons.html'); pg.wait_for_selector('.pf-card'); pg.click('text=خروج'); pg.wait_for_url('**/login.html*')
    def signup(name,phone,email):
        pg.goto(B+'login.html?tab=signup&next=lessons.html'); pg.fill('#suName',name); pg.fill('#suPhone',phone); pg.select_option('#suGrade','الصف الأول الثانوي'); pg.fill('#suParent','01188880000'); pg.fill('#suEmail',email); pg.fill('#suPass','12345678')
        pg.click('#signupForm button[type=submit]'); pg.wait_for_url('**/lessons.html'); pg.wait_for_selector('.pf-card')
    ADMIN=('midoaboeita235@gmail.com','AdminPass-1')
    # 1) الأدمن يرفع حصة + ملفها مع بعض
    login(*ADMIN); pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=lessons]'); pg.wait_for_selector('.pf-card')
    pg.click('text=＋ حصة جديدة'); pg.wait_for_selector('.pf-modal'); pg.fill('.pf-modal input[type=text] >> nth=0','حصة بملفها')
    pg.fill('.pf-modal input[placeholder="الصق رابط الفيديو هنا"]','https://youtu.be/dQw4w9WgXcQ')
    check('bundle price disabled before any file', pg.is_disabled('.pf-modal input[placeholder="مثال: 100"]'))
    pg.set_input_files('.pf-modal input[type=file]',{'name':'w.pdf','mimeType':'application/pdf','buffer':PDF})
    check('bundle price enabled after choosing a file', not pg.is_disabled('.pf-modal input[placeholder="مثال: 100"]'))
    nums=pg.locator('.pf-modal input[type=number]'); 
    # الأرقام بالترتيب: المدة، السعر، الترتيب، سعر الملف، سعر الباقة
    pg.fill('.pf-modal input[placeholder="مثال: 100"]','100')
    pg.locator('.pf-modal input[type=number]').nth(3).fill('40')
    pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(700)
    st=state(); L=[x for x in st['lessons'] if x['title']=='حصة بملفها']; F=[x for x in st['pdf_files'] if x.get('lesson_only')]
    check('lesson saved + linked own file row (lesson_only, price 40)', L and F and L[0]['pdf_id']==F[0]['id'] and F[0]['price_egp']==40 and L[0]['bundle_price_egp']==100, str((L[:1],F[:1])))
    check('file uploaded to storage', any(k.startswith('pdfs/') and k.endswith('.pdf') and F[0]['file_path'] in k for k in st['storage']))
    check('admin lesson card shows file+bundle badges', '📎 ملف 40 ج' in txt('#content') and '📦 باقة 100 ج' in txt('#content'))
    pg.click('#tabs [data-tab=pdfs]'); pg.wait_for_timeout(300); check('lesson file hidden from admin الملفات tab', 'حصة بملفها' not in txt('#content'))
    logout()
    # 2) الطالب
    signup('ليلى حسن محمود','01277776666','laila@test.com')
    card=pg.locator('.pf-card:has-text("حصة بملفها")').first
    card.locator('text=اشترِ (من').click(); pg.wait_for_selector('.pf-modal'); t=txt('.pf-modal')
    check('chooser: lesson 85 / file-only 40 / bundle 100 saving 25', 'الحصة فقط' in t and '85 ج' in t and 'الملف فقط' in t and '40 ج' in t and '100 ج' in t and 'وفّر 25 ج' in t, t.replace('\n',' | '))
    check('file-only label has no internal title', 'ملف الحصة' not in t.split('الملف فقط')[1][:15])
    pg.check('.pf-modal input[value=pdf]'); pg.click('.pf-modal >> text=متابعة للدفع'); pg.wait_for_selector('.pf-modal:has-text("إتمام الدفع")')
    pg.fill('.pf-modal input[placeholder^="اختياري"]','FILE1'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    uid=[x for x in state()['profiles'] if x['phone']=='01277776666'][0]['id']
    check('file-only order price 40', any(o['user_id']==uid and o['item_type']=='pdf' and o['amount_egp']==40 for o in state()['orders']))
    pg.click('#tabs [data-tab=pdfs]'); pg.wait_for_timeout(300); check('student الملفات tab does NOT list lesson file', 'حصة بملفها' not in txt('#content'))
    logout()
    login(*ADMIN); pg.goto(B+'admin.html'); pg.wait_for_selector('.pf-order'); pg.once('dialog',lambda d:d.accept()); pg.click('.pf-order >> text=✓ قبول'); pg.wait_for_timeout(500); logout()
    login('laila@test.com','12345678')
    card=pg.locator('.pf-card:has-text("حصة بملفها")').first.inner_text()
    check('after buying file only: "⬇ ملف الحصة" shown, lesson still locked', '⬇ ملف الحصة' in card and '▶ شاهد الحصة' not in card, card.replace('\n',' | '))
    # 3) مشاهدة حصة مجانية → عدّاد
    free=pg.locator('.pf-card:has-text("▶ شاهد الحصة")').first
    title=free.locator('h3').inner_text(); free.locator('text=▶ شاهد الحصة').click(); pg.wait_for_timeout(600)
    check('view recorded in lesson_views', len(state().get('lesson_views',[]))==1, str(state().get('lesson_views')))
    logout()
    # 4) الأدمن: عدّاد + إضافة اشتراك + إلغاء بسبب
    login(*ADMIN); pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=students]'); pg.wait_for_selector('.pf-table tbody tr')
    row=pg.locator('.pf-table tbody tr:has-text("ليلى حسن محمود")'); check('students tab shows "شاهد 1 من N حصة"', re.search(r'شاهد 1 من \d+ حصة',row.inner_text()), row.inner_text().replace('\n',' | '))
    pg.once('dialog',lambda d:d.accept('1')); row.locator('text=＋ اشتراك').click(); pg.wait_for_timeout(600)
    row=pg.locator('.pf-table tbody tr:has-text("ليلى حسن محمود")'); check('subscription added', 'حتى' in row.inner_text())
    pg.once('dialog',lambda d:d.accept('تأخر في السداد')); row.locator('button:has-text("إلغاء")').click(); pg.wait_for_timeout(600)
    check('cancel sends reason to server', 'rpc revoke:تأخر في السداد' in state()['log'], str(state()['log'][-3:]))
    row=pg.locator('.pf-table tbody tr:has-text("ليلى حسن محمود")'); check('student now unsubscribed', 'غير مشترك' in row.inner_text())
    logout()
    # 5) التسجيل العام: خانة إيميل اختيارية
    pg.goto(B+'register.html'); pg.wait_for_selector('input[placeholder="اكتب اسمك الثلاثي"]')
    check('registration form has optional email field', pg.locator('input[placeholder^="example@gmail.com"]').count()==1)
    def reg(name,ph,email):
        pg.fill('input[placeholder="اكتب اسمك الثلاثي"]',name); pg.locator('input[placeholder="01xxxxxxxxx"]').nth(0).fill(ph); pg.locator('input[placeholder="01xxxxxxxxx"]').nth(1).fill('01099998888')
        pg.select_option('select','الصف الأول الثانوي'); pg.fill('input[placeholder^="example@gmail.com"]',email); pg.click('button:has-text("سجّل الآن")'); pg.wait_for_timeout(500)
    reg('طالب إيميل خاطئ','01211112222','not-an-email'); check('bad email rejected client-side', 'الإيميل غير صحيح' in txt() and not [r for r in state().get('registrations',[]) if r['phone']=='01211112222'])
    reg('طالب إيميل صحيح','01211112222','ok@test.com'); R=[r for r in state().get('registrations',[]) if r['phone']=='01211112222']
    check('registration saved with email', R and R[0].get('email')=='ok@test.com', str(R[:1]))
    check('no JS errors', not errors, str(errors[:3])); br.close()
print(f'\n{sum(res)}/{len(res)} passed')
