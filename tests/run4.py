# اختبار الباقة (حصة + ملف): الأدمن يربط ملف وسعر باقة، والطالب يختار حصة/ملف/الاتنين
import re, os, json, urllib.parse
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.environ.get('MH_ROOT',os.path.dirname(HERE)); B=os.environ.get('MH_BASE','http://localhost:8124/')
MOCK=open(HERE+'/mock-supabase.js',encoding='utf-8').read(); res=[]
def check(n,c,e=''): res.append(bool(c)); print(('PASS' if c else 'FAIL'),'-',n,e)
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
    ADMIN=('midoaboeita235@gmail.com','AdminPass-1')
    # --- الأدمن ينشئ حصة بباقة ---
    login(*ADMIN); pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=lessons]'); pg.wait_for_selector('.pf-card')
    pg.click('text=＋ حصة جديدة'); pg.wait_for_selector('.pf-modal'); pg.fill('.pf-modal input[type=text] >> nth=0','حصة الباقة')
    pg.fill('.pf-modal input[placeholder="الصق رابط الفيديو هنا"]','https://youtu.be/dQw4w9WgXcQ')
    check('bundle price disabled until a file is linked', pg.is_disabled('.pf-modal input[placeholder="مثال: 100"]'))
    pg.select_option('.pf-modal select >> nth=3',label='تدريبات متقدمة'); check('bundle price enabled after linking a file', not pg.is_disabled('.pf-modal input[placeholder="مثال: 100"]'))
    pg.fill('.pf-modal input[placeholder="مثال: 100"]','100'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    L=[x for x in state()['lessons'] if x['title']=='حصة الباقة']; P2=[x for x in state()['pdf_files'] if x['title']=='تدريبات متقدمة'][0]
    check('lesson saved with pdf_id + bundle_price_egp=100', L and L[0]['pdf_id']==P2['id'] and L[0]['bundle_price_egp']==100, str(L[:1]))
    check('admin card shows bundle badge', '📦 باقة 100 ج' in txt('#content'))
    logout()
    # --- الطالب ---
    pg.goto(B+'login.html?tab=signup&next=lessons.html'); pg.fill('#suName','سارة محمود علي'); pg.fill('#suPhone','01299990000'); pg.select_option('#suGrade','الصف الأول الثانوي'); pg.fill('#suParent','01188880000'); pg.fill('#suEmail','sara@test.com'); pg.fill('#suPass','12345678')
    pg.click('#signupForm button[type=submit]'); pg.wait_for_url('**/lessons.html'); pg.wait_for_selector('.pf-card')
    uid=[x for x in state()['profiles'] if x['phone']=='01299990000'][0]['id']
    card=pg.locator('.pf-card:has-text("حصة الباقة")').first
    check('bundle lesson shows single "اشترِ (من 85 ج)" button', 'اشترِ (من 85 ج)' in card.inner_text(), card.inner_text().replace('\n',' | '))
    card.locator('text=اشترِ (من').click(); pg.wait_for_selector('.pf-modal')
    t=txt('.pf-modal'); check('chooser lists lesson / file / bundle with prices + saving', 'الحصة فقط' in t and 'تدريبات متقدمة' in t and 'الحصة + الملف' in t and '100 ج' in t and 'وفّر 70 ج' in t, t.replace('\n',' | '))
    pg.check('.pf-modal input[value=bundle]'); pg.click('.pf-modal >> text=متابعة للدفع'); pg.wait_for_selector('.pf-modal:has-text("إتمام الدفع")')
    pt=txt('.pf-modal'); check('payment modal shows bundle title + 100 جنيه + email note', 'الباقة' in pt and 'تدريبات متقدمة' in pt and '100 جنيه' in pt and 'إيميل' in pt)
    pg.fill('.pf-modal input[placeholder^="اختياري"]','BUN1'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    O=[o for o in state()['orders'] if o['user_id']==uid]; check('bundle order created, server price=100', O and O[0]['item_type']=='bundle' and O[0]['amount_egp']==100 and O[0]['status']=='pending', str(O[:1]))
    check('"my orders" tab shows bundle title', '📦 حصة الباقة + تدريبات متقدمة' in txt('#content'))
    pg.click('#tabs [data-tab=lessons]'); card=pg.locator('.pf-card:has-text("حصة الباقة")').first
    check('after ordering: pending state, no second buy button', 'قيد المراجعة' in card.inner_text() and 'اشترِ' not in card.inner_text())
    logout()
    # --- الأدمن يقبل ---
    login(*ADMIN); pg.goto(B+'admin.html'); pg.wait_for_selector('.pf-order'); check('admin order card says باقة + both titles', 'باقة' in txt('.pf-order') and 'حصة الباقة + تدريبات متقدمة' in txt('.pf-order'))
    pg.once('dialog',lambda d:d.accept()); pg.click('.pf-order >> text=✓ قبول'); pg.wait_for_timeout(500); logout()
    # --- الطالب بعد القبول: الاتنين مفتوحين ---
    login('sara@test.com','12345678')
    lc=pg.locator('.pf-card:has-text("حصة الباقة")').first.inner_text(); check('lesson opened by bundle', '▶ شاهد الحصة' in lc, lc.replace('\n',' | '))
    pg.click('#tabs [data-tab=pdfs]'); pc=pg.locator('.pf-card:has-text("تدريبات متقدمة")').first.inner_text(); check('file opened by bundle', '⬇ فتح الملف' in pc, pc.replace('\n',' | '))
    # --- ملف فقط: لا يفتح الحصة ---
    logout(); pg.goto(B+'login.html?tab=signup&next=lessons.html'); pg.fill('#suName','كريم أحمد حسن'); pg.fill('#suPhone','01233334444'); pg.select_option('#suGrade','الصف الأول الثانوي'); pg.fill('#suParent','01144445555'); pg.fill('#suEmail','karim@test.com'); pg.fill('#suPass','12345678')
    pg.click('#signupForm button[type=submit]'); pg.wait_for_url('**/lessons.html'); pg.wait_for_selector('.pf-card')
    pg.locator('.pf-card:has-text("حصة الباقة")').first.locator('text=اشترِ (من').click(); pg.wait_for_selector('.pf-modal'); pg.check('.pf-modal input[value=pdf]'); pg.click('.pf-modal >> text=متابعة للدفع'); pg.wait_for_selector('.pf-modal:has-text("إتمام الدفع")')
    pg.fill('.pf-modal input[placeholder^="اختياري"]','PDF1'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    kid=[x for x in state()['profiles'] if x['phone']=='01233334444'][0]['id']; ko=[o for o in state()['orders'] if o['user_id']==kid]
    check('file-only order: type=pdf, price=85', ko and ko[0]['item_type']=='pdf' and ko[0]['amount_egp']==85)
    check('no JS errors', not errors, str(errors[:3])); br.close()
print(f'\n{sum(res)}/{len(res)} passed')
