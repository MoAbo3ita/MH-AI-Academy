# اختبار الميزات الجديدة (55 اختبار): نسيت كلمة المرور + منهج + Drive + أنواع الإتاحة + الخطط + محرر المحتوى + أرقام التواصل
import re, os, json, urllib.parse
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.environ.get('MH_ROOT','/home/claude/clean'); PUB=ROOT+'/public/'
B=os.environ.get('MH_BASE','http://localhost:8124/')
MOCK=open(HERE+'/mock-supabase.js',encoding='utf-8').read()
CFG_OTP=open(PUB+'config.js',encoding='utf-8').read().replace('OTP_RESET: false','OTP_RESET: true')
res=[]
def check(name,cond,extra=''):
    res.append((name,bool(cond))); print(('PASS' if cond else 'FAIL'),'-',name,extra)
D1='1AbCdEfGhIjKlMnOpQrStUvWxYz012345'
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={'width':1280,'height':900},locale='ar-EG')
    ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=MOCK))
    ctx.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'),lambda r:r.abort())
    def state():
        for o in ctx.storage_state()['origins']:
            for ls in o['localStorage']:
                if ls['name']=='__mockdb': return json.loads(ls['value'])
        return None
    def rest(route):                      # يحاكي REST API اللي بيستخدمه site-content.js (من غير مكتبة supabase)
        u=urllib.parse.urlparse(route.request.url); tbl=u.path.split('/')[-1]; q=urllib.parse.parse_qs(u.query); st=state()
        if st is None: return route.fulfill(status=200,headers={'access-control-allow-origin':'*','content-type':'application/json'},body='[]')
        rows=list(st.get(tbl,[]))
        for k,v in q.items():
            if k in ('select','order'): continue
            val=v[0]
            if val.startswith('eq.'):
                want=val[3:]; rows=[r for r in rows if str(r.get(k)).lower()==want.lower()]
        rows.sort(key=lambda r:(r.get('sort_order',0),r.get('created_at','')))
        route.fulfill(status=200,headers={'access-control-allow-origin':'*','content-type':'application/json'},body=json.dumps(rows))
    ctx.route('**/rest/v1/**',rest)
    ctx.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG_OTP))
    errors=[]; pg=ctx.new_page(); pg.on('pageerror',lambda e:errors.append(str(e)))
    txt=lambda sel='body': pg.inner_text(sel)
    def login(email,pw):
        pg.goto(B+'login.html'); pg.fill('#loginEmail',email); pg.fill('#loginPass',pw); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/lessons.html'); pg.wait_for_selector('.pf-card')
    def logout(): pg.goto(B+'lessons.html'); pg.wait_for_selector('.pf-card'); pg.click('text=خروج'); pg.wait_for_url('**/login.html*')
    ADMIN=('midoaboeita235@gmail.com','AdminPass-1')

    # ================= A) نسيت كلمة المرور =================
    pg.goto(B+'login.html#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'); pg.wait_for_selector('#forgotForm:not([hidden])')
    check('expired reset link → friendly message + forgot form', 'منتهي' in txt('#msg'), txt('#msg'))
    pg.goto(B+'login.html'); pg.click('#toForgot'); pg.fill('#fgEmail',ADMIN[0]); pg.click('#forgotForm button[type=submit]'); pg.wait_for_timeout(300)
    check('reset email requested with absolute redirect /login.html', any(l=='reset '+B+'login.html' for l in state()['log']), str([l for l in state()['log'] if l.startswith('reset')]))
    pg.click('#toOtp'); check('OTP form opens with email prefilled', pg.input_value('#otpEmail')==ADMIN[0])
    pg.fill('#otpCode','000000'); pg.fill('#otpPass','Brand-New-123'); pg.click('#otpForm button[type=submit]'); pg.wait_for_timeout(300); check('wrong code rejected', 'الكود غلط' in txt('#msg'))
    pg.fill('#otpCode','12ab'); pg.click('#otpForm button[type=submit]'); pg.wait_for_timeout(200); check('non-numeric code rejected client-side', 'أرقام فقط' in txt('#msg'))
    pg.fill('#otpCode','123456'); pg.fill('#otpPass','short'); pg.click('#otpForm button[type=submit]'); pg.wait_for_timeout(200); check('short new password rejected', '8 أحرف' in txt('#msg'))
    pg.fill('#otpPass','Brand-New-123'); pg.click('#otpForm button[type=submit]'); pg.wait_for_url('**/lessons.html')
    check('code reset changes password and signs in', list(state()['users'].values())[0]['password']=='Brand-New-123')
    ADMIN=(ADMIN[0],'Brand-New-123'); logout()
    pg.goto(B+'login.html?code=good'); pg.wait_for_selector('#recoveryForm:not([hidden])'); check('PKCE ?code= link opens the new-password form', True)
    pg.goto(B+'login.html?code=bad'); pg.wait_for_selector('#forgotForm:not([hidden])'); check('bad PKCE code → message + forgot form', 'غير صالح' in txt('#msg'))
    pg.evaluate("window.MH.sb.auth.signOut()")

    # ================= B) الصفحات العامة: المنهج بدون لغات برمجة =================
    pg.goto(B+'curriculum.html'); pg.wait_for_selector('.check-list')
    check('curriculum shows 13 + 7 units, no Python/code wording', pg.locator('[data-cms-list=curriculum_g1] li').count()==13 and pg.locator('[data-cms-list=curriculum_g2] li').count()==7 and not re.search(r'(?i)python|بايثون|سطر كود',pg.content()))
    check('curriculum mentions mostly-theoretical note', 'نظري' in txt('#curriculum'))
    for f in ('features','faq','index'):
        pg.goto(B+f+'.html')
        if re.search(r'(?i)python|بايثون',pg.content()): check(f'{f} has no Python mention',False)
    check('no Python mention on features/faq/index', True)

    # ================= C) الأدمن: حصة Drive + أنواع الإتاحة =================
    login(*ADMIN); pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=lessons]'); pg.wait_for_selector('.pf-card')
    check('hybrid lesson card shows combined badge', '⭐ مشتركين + شراء 85 ج' in txt('#content'))
    pg.click('text=＋ حصة جديدة'); pg.wait_for_selector('.pf-modal'); pg.fill('.pf-modal input[type=text] >> nth=0','حصة درايف')
    pg.fill('.pf-modal input[placeholder="الصق رابط الفيديو هنا"]','https://drive.google.com/drive/folders/abc'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(250)
    check('invalid Drive link (folder) rejected', 'رابط الفيديو غير صالح' in txt('.pf-modal'))
    pg.fill('.pf-modal input[placeholder="الصق رابط الفيديو هنا"]',f'https://drive.google.com/file/d/{D1}/view?usp=sharing'); check('Drive provider auto-detected', pg.input_value('.pf-modal select >> nth=1')=='drive')
    pg.select_option('.pf-modal select >> nth=2','both'); check('price enabled for hybrid', not pg.is_disabled('.pf-modal input[type=number] >> nth=1'))
    pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    L=[x for x in state()['lessons'] if x['title']=='حصة درايف']; M=[m for m in state()['lesson_media'] if L and m['lesson_id']==L[0]['id']]
    check('Drive lesson saved: provider=drive, id extracted', M and M[0]['provider']=='drive' and M[0]['video_ref']==D1, str(M))
    check('hybrid flags: for_subscribers & allow_purchase', L and L[0]['for_subscribers'] is True and L[0]['allow_purchase'] is True and L[0]['is_free'] is False)
    pg.click('.pf-card:has-text("حصة المشتركين") >> text=تعديل'); pg.wait_for_selector('.pf-modal'); check('subscribers-only lesson edit form shows its type', pg.input_value('.pf-modal select >> nth=2')=='subscribers'); pg.keyboard.press('Escape')
    pg.click('.pf-card:has-text("حصة هجينة") >> text=تعديل'); pg.wait_for_selector('.pf-modal'); check('hybrid lesson edit form shows hybrid type', pg.input_value('.pf-modal select >> nth=2')=='both'); pg.keyboard.press('Escape')
    pg.click('#tabs [data-tab=settings]'); pg.wait_for_selector('input[name=mode]')
    check('settings no longer has per-grade sub price fields', 'أسعار الاشتراك الشهري' not in txt('#content') and 'أرقام التواصل' in txt('#content'))
    pg.check('input[name=mode][value=subscription]'); pg.fill('.glass-card:has-text("أرقام التواصل") input[type=tel] >> nth=0','123'); pg.click('.pf-btn[type=submit]'); pg.wait_for_timeout(200)
    check('contact WhatsApp validated', 'رقم الواتساب' in txt('#content') and [x for x in state()['settings'] if x['key']=='registration_mode'][0]['value']=='registration')
    pg.fill('.glass-card:has-text("أرقام التواصل") input[type=tel] >> nth=0','01012345678'); pg.click('.pf-btn[type=submit]'); pg.wait_for_timeout(500)
    stt={x['key']:x['value'] for x in state()['settings']}; check('contact + mode saved (whatsapp normalized to 2010…)', stt['contact_whatsapp']=='201012345678' and stt['registration_mode']=='subscription', str(stt.get('contact_whatsapp')))
    pg.goto(B+'features.html'); pg.wait_for_function("document.querySelector('a[href*=\"wa.me/\"]').href.includes('201012345678')"); check('public pages use new WhatsApp number everywhere', pg.eval_on_selector_all('a[href*="wa.me/"]','e=>e.every(a=>a.href.includes("wa.me/201012345678"))'))

    # ================= D) الخطط =================
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=plans]'); pg.wait_for_selector('.pf-card'); check('plans tab shows 2 seeded plans', pg.locator('.pf-card').count()==2 and '150 جنيه / شهر' in txt('#content'))
    pg.click('text=＋ خطة جديدة'); pg.wait_for_selector('.pf-modal'); pg.fill('.pf-modal input[type=text] >> nth=0','اشتراك 3 شهور'); pg.fill('.pf-modal input[type=number] >> nth=0','400'); pg.fill('.pf-modal input[type=number] >> nth=1','3')
    pg.fill('.pf-modal textarea','طريقة الحصص: أونلاين\nخصم 50 جنيه\n'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    P3=[x for x in state()['plans'] if x['name']=='اشتراك 3 شهور']; check('plan created (400 EGP / 3 months)', P3 and P3[0]['price_egp']==400 and P3[0]['months']==3 and P3[0]['kind']=='subscription')
    pg.goto(B+'pricing.html'); pg.wait_for_selector('#plansGrid .price-card'); pg.wait_for_function("document.querySelectorAll('#plansGrid .price-card').length===3")
    ptxt=txt('#plansGrid'); check('pricing page renders plans from DB (incl. new one)', '400 جنيه لكل 3 شهور' in ptxt and '150 جنيه شهريًا' in ptxt and 'خصم 50 جنيه' in ptxt)
    check('subscription-mode plan button → register page', pg.eval_on_selector('#plansGrid .price-card a','a=>a.getAttribute("href")')=='register.html')
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=plans]'); pg.wait_for_selector('.pf-card'); pg.click('.pf-card:has-text("اشتراك 3 شهور") >> text=إخفاء'); pg.wait_for_timeout(400)
    pg.goto(B+'pricing.html'); pg.wait_for_timeout(900); check('hidden plan disappears from public pricing', '400 جنيه' not in txt('#plansGrid') and pg.locator('#plansGrid .price-card').count()==2)
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=plans]'); pg.wait_for_selector('.pf-card'); pg.click('.pf-card:has-text("اشتراك 3 شهور") >> text=إظهار'); pg.wait_for_timeout(400); logout()

    # ================= E) الطالب: الحصة الهجينة + اشتراك بخطة =================
    pg.goto(B+'login.html?tab=signup&next=lessons.html'); pg.fill('#suName','أحمد خالد سمير'); pg.fill('#suPhone','01277778888'); pg.select_option('#suGrade','الصف الأول الثانوي'); pg.fill('#suParent','01188889999'); pg.fill('#suEmail','ahmed@test.com'); pg.fill('#suPass','12345678')
    pg.click('#signupForm button[type=submit]'); pg.wait_for_url('**/lessons.html'); pg.wait_for_selector('.pf-card')
    hy=pg.locator('.pf-card:has-text("حصة هجينة")').first.inner_text()
    check('hybrid lesson: both badges + buy button + subscribe link', '⭐ للمشتركين' in hy and '🔒 85 ج' in hy and 'اشترِ بـ 85 ج' in hy and 'أو اشترك' in hy, hy.replace('\n',' | '))
    so=pg.locator('.pf-card:has-text("حصة المشتركين")').first.inner_text(); check('subscribers-only lesson: no buy button', 'اشترِ بـ' not in so and 'اشترك للمشاهدة' in so, so.replace('\n',' | '))
    uid=[x for x in state()['profiles'] if x['phone']=='01277778888'][0]['id']
    r=pg.evaluate("""async()=>{const {data:l}=await window.MH.sb.from('lessons').select('*').eq('title','حصة المشتركين');const r=await window.MH.sb.from('orders').insert({item_type:'lesson',item_id:l[0].id,method:'wepay',sender_phone:'01277778888',transaction_ref:'X1'});return r.error&&r.error.message}""")
    check('server blocks individual purchase of subscribers-only lesson', r and 'للمشتركين' in r, str(r))
    pg.click('.pf-card:has-text("حصة هجينة") >> text=اشترِ بـ 85 ج'); pg.wait_for_selector('.pf-modal'); pg.fill('.pf-modal input[placeholder^="اختياري"]','HY123'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    check('individual purchase of hybrid lesson works (pending)', [o for o in state()['orders'] if o['user_id']==uid and o['status']=='pending'])
    pg.goto(B+'register.html'); pg.wait_for_selector('#planBox label'); check('subscription page lists only plans for the student grade (+all)', pg.locator('#planBox label').count()==2 and '150 جنيه' in txt('#planBox') and '180 جنيه' not in txt('#planBox'), txt('#planBox').replace('\n',' | '))
    pg.click('#planBox label:has-text("اشتراك 3 شهور")'); check('amount follows selected plan', '400 جنيه' in txt('#registerRoot .pf-note'))
    pg.fill('#registerRoot input[placeholder^="اختياري"]','SUB400'); pg.click('#registerRoot button[type=submit]'); pg.wait_for_selector('text=قيد المراجعة')
    sb=[s for s in state()['subscriptions'] if s['user_id']==uid]; check('subscription request uses plan price/months from server', sb and sb[0]['amount_egp']==400 and sb[0]['months']==3 and sb[0]['plan_id']==P3[0]['id'], str(sb[:1])); logout()
    login(*ADMIN); pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=subs]'); pg.wait_for_selector('.pf-order'); check('admin sees plan name on subscription request', 'اشتراك 3 شهور' in txt('#content'))
    pg.once('dialog',lambda d:d.accept('3')); pg.click('.pf-order >> text=✓ قبول وتفعيل'); pg.wait_for_timeout(500); logout()
    days=(datetime.fromisoformat([x for x in state()['profiles'] if x['id']==uid][0]['subscribed_until'].replace('Z','+00:00'))-datetime.now(timezone.utc)).days; check('plan approval activates ~3 months', 85<=days<=95, f'{days}d')
    login('ahmed@test.com','12345678')
    hy=pg.locator('.pf-card:has-text("حصة هجينة")').first.inner_text(); check('subscriber now has hybrid lesson open', '▶ شاهد الحصة' in hy)
    pg.click('.pf-card:has-text("حصة هجينة") >> text=▶ شاهد الحصة'); pg.wait_for_selector('.pf-player iframe'); src=pg.get_attribute('.pf-player iframe','src'); sbx=pg.get_attribute('.pf-player iframe','sandbox')
    check('Drive lesson plays via /preview embed', src==f'https://drive.google.com/file/d/{D1}/preview', src); check('Drive iframe sandboxed WITHOUT popups (blocks pop-out leak)', 'allow-popups' not in sbx and pg.get_attribute('.pf-player iframe','allowfullscreen') is None, sbx); pg.keyboard.press('Escape'); logout()

    # ================= F) محرر المحتوى =================
    login(*ADMIN); pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=content]'); pg.wait_for_selector('.pf-field')
    pg.select_option('#toolbar select','features'); pg.wait_for_selector('h3:has-text("لماذا")'); n=pg.locator('#content .pf-field').count(); check('text editor lists editable texts of the page', n>=10, f'{n} fields')
    pg.fill('#toolbar input[type=search]','المفاهيم من الأساس'); vis=pg.locator('#content .pf-field:visible').count(); check('editor search filters', 1<=vis<=2, str(vis)); pg.fill('#toolbar input[type=search]','')
    fld=pg.locator('#content .pf-field:has-text("المفاهيم من الأساس") input').first; fld.fill('أساسيات المنهج بالتفصيل'); pg.click('text=💾 حفظ التعديلات'); pg.wait_for_timeout(600)
    check('text override saved to DB', any(r['value']=='أساسيات المنهج بالتفصيل' for r in state()['site_content']))
    pg.goto(B+'features.html'); pg.wait_for_function("document.body.innerText.includes('أساسيات المنهج بالتفصيل')"); check('public page shows edited text immediately', True)
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=content]'); pg.wait_for_selector('.pf-field'); pg.select_option('#toolbar select','site'); pg.wait_for_selector('h3:has-text("الفوتر")')
    pg.locator('#content .pf-field:has-text("روابط سريعة") input').first.fill('روابط مهمة'); pg.click('text=💾 حفظ التعديلات'); pg.wait_for_timeout(500)
    pg.goto(B+'faq.html'); pg.wait_for_function("document.querySelector('footer').innerText.includes('روابط مهمة')"); check('header/footer edit applies on every page', True)
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=content]'); pg.wait_for_selector('.pf-field'); pg.select_option('#toolbar select','features'); pg.wait_for_selector('h3:has-text("لماذا")')
    pg.locator('#content .pf-field:has-text("المفاهيم من الأساس") button:has-text("الأصلي")').first.click(); pg.click('text=💾 حفظ التعديلات'); pg.wait_for_timeout(500); check('reset-to-original removes the override', not any(r['value']=='أساسيات المنهج بالتفصيل' for r in state()['site_content']))
    pg.click('#toolbar >> text=❓ الأسئلة الشائعة'); pg.wait_for_selector('text=استيراد المحتوى الحالي'); pg.click('text=⬇ استيراد المحتوى الحالي'); pg.wait_for_selector('.pf-card'); nfaq=len([x for x in state()['site_items'] if x['collection']=='faq']); check('FAQ import brings all current questions', nfaq>=7, str(nfaq))
    pg.click('text=＋ إضافة'); pg.wait_for_selector('.pf-modal'); pg.fill('.pf-modal textarea >> nth=0','هل في خصم للإخوة؟'); pg.fill('.pf-modal textarea >> nth=1','أيوه، كلّمنا على واتساب.'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    pg.goto(B+'faq.html'); pg.wait_for_function("document.body.innerText.includes('هل في خصم للإخوة')"); check('new FAQ item appears on the public FAQ page', pg.locator('.faq-list details').count()==nfaq+1)
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=content]'); pg.wait_for_selector('.pf-field'); pg.click('#toolbar >> text=❓ الأسئلة الشائعة'); pg.wait_for_selector('.pf-card'); pg.once('dialog',lambda d:d.accept()); pg.click('.pf-card:has-text("هل في خصم") >> text=حذف'); pg.wait_for_timeout(500)
    check('deleting FAQ item removes it', not any(x['title'].startswith('هل في خصم') for x in state()['site_items']))
    pg.click('#toolbar >> text=🧭 منهج الصف الأول'); pg.wait_for_selector('text=استيراد المحتوى الحالي'); pg.click('text=⬇ استيراد المحتوى الحالي'); pg.wait_for_selector('.pf-card'); check('curriculum g1 import = 13 units', len([x for x in state()['site_items'] if x['collection']=='curriculum_g1'])==13)
    pg.click('text=＋ إضافة'); pg.wait_for_selector('.pf-modal'); pg.fill('.pf-modal textarea >> nth=0','وحدة جديدة: الذكاء الاصطناعي في الحياة'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    pg.goto(B+'curriculum.html'); pg.wait_for_function("document.querySelectorAll('[data-cms-list=curriculum_g1] li').length===14"); check('added curriculum unit shows on public page (g1=14, g2 untouched=7)', pg.locator('[data-cms-list=curriculum_g2] li').count()==7)
    check('no JS errors', not errors, str(errors[:3]))
    # OTP مقفول افتراضيًا (الإيميل الافتراضي في Supabase مفيهوش كود)
    c2=br.new_context(); c2.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=MOCK)); c2.route(re.compile(r'https://fonts\..*'),lambda r:r.abort())
    p2=c2.new_page(); p2.goto(B+'login.html'); p2.click('#toForgot'); check('OTP option hidden by default (OTP_RESET=false)', not p2.is_visible('#toOtp')); c2.close()

    # ================= G) الموبايل: تبويبات الأدمن الجديدة =================
    m=br.new_context(viewport={'width':390,'height':844},is_mobile=True,device_scale_factor=2); m.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=MOCK)); m.route(re.compile(r'https://fonts\..*'),lambda r:r.abort()); m.route('**/rest/v1/**',lambda r:r.fulfill(status=200,headers={'content-type':'application/json'},body='[]')); m.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG_OTP))
    mp=m.new_page(); bad=[]; mp.goto(B+'login.html'); mp.fill('#loginEmail',ADMIN[0]); mp.fill('#loginPass','AdminPass-1'); mp.click('#loginForm button[type=submit]'); mp.wait_for_url('**/lessons.html')
    for t in ('plans','content','settings','lessons'):
        mp.goto(B+'admin.html'); mp.click(f'#tabs [data-tab={t}]'); mp.wait_for_timeout(500); w=mp.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth})")
        if w['sw']>w['iw']+1: bad.append((t,w))
    mp.goto(B+'lessons.html'); mp.wait_for_selector('.pf-card'); mp.click('text=خروج'); mp.wait_for_url('**/login.html*')
    mp.click('#toForgot'); mp.click('#toOtp'); w=mp.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth})")
    if w['sw']>w['iw']+1: bad.append(('otp',w))
    check('new admin tabs + OTP form fit mobile width', not bad, str(bad[:2])); br.close()
ok=sum(1 for _,c in res if c); print(f'\n{ok}/{len(res)} passed')
