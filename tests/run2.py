# اختبار الرحلات الأساسية (52 اختبار): صفحات منفصلة + أبعاد الموبايل + التسجيل + الاشتراك + قفل التسجيل
# التشغيل: انظر 01-HANDOFF-AR.md (قسم "كيف تشغّل الاختبارات")
import re, os
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.environ.get('MH_ROOT','/home/claude/clean'); PUB=ROOT+'/public/'
B=os.environ.get('MH_BASE','http://localhost:8124/')
MOCK=open(HERE+'/mock-supabase.js',encoding='utf-8').read()
res=[]
def check(name,cond,extra=''):
    res.append((name,bool(cond))); print(('PASS' if cond else 'FAIL'),'-',name,extra)
def new_ctx(br,**kw):
    c=br.new_context(**kw); c.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=MOCK))
    c.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'),lambda r:r.abort()); return c
PAGES=['index','features','curriculum','notebooks','pricing','faq','register','login']
with sync_playwright() as p:
    br=p.chromium.launch()
    # ---------- A) الصفحات المنفصلة + أبعاد الموبايل ----------
    ctx=new_ctx(br,viewport={'width':390,'height':844},is_mobile=True,device_scale_factor=2); errors=[]
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errors.append(str(e)))
    for w in (360,390,414):
        pg.set_viewport_size({'width':w,'height':800}); bad=[]
        for name in PAGES:
            pg.goto(B+name+'.html'); pg.wait_for_timeout(400)
            m=pg.evaluate("({sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth,iw:innerWidth})")
            if m['sw']>m['iw']+1 or m['bw']>m['iw']+1: bad.append((name,m))
        check(f'no horizontal overflow on {len(PAGES)} pages @ {w}px', not bad, str(bad[:2]))
    broken=[]; notactive=[]
    for name in PAGES:
        pg.goto(B+name+'.html')
        for hr in pg.eval_on_selector_all('a[href]','els=>els.map(e=>e.getAttribute("href"))'):
            if re.match(r'^(https?:|tel:|mailto:|#|javascript:)',hr): continue
            if not os.path.exists(PUB+hr.split('?')[0].split('#')[0]): broken.append((name,hr))
        if name not in ('login',) and pg.eval_on_selector_all('.nav-link.active','e=>e.length')!=1: notactive.append(name)
    check('all internal links point to existing files', not broken, str(broken[:3]))
    check('exactly one active nav link per page', not notactive, str(notactive))
    sec={'features':'#features','curriculum':'#curriculum','notebooks':'#notebooks','pricing':'#pricing','faq':'#faq'}
    ok=True
    for n,sel in sec.items():
        pg.goto(B+n+'.html'); others=[s for s in sec.values() if s!=sel]
        if not pg.locator(sel).count() or any(pg.locator(o).count() for o in others): ok=False
    check('each section lives only in its own page', ok)
    pg.goto(B+'index.html'); check('home has explore cards linking to pages', pg.locator('.explore-card').count()==6)
    pg.goto(B+'features.html'); scripts=pg.eval_on_selector_all('script[src]','e=>e.map(x=>x.getAttribute("src"))'); check('marketing page loads only light scripts (no supabase lib)', not any('supabase' in x for x in scripts) and 'site.js' in scripts, str(scripts))
    pg.goto(B+'index.html'); pg.wait_for_timeout(300); pg.click('#navToggle'); pg.wait_for_timeout(300); check('mobile menu opens', pg.eval_on_selector('#navLinks','e=>e.classList.contains("open")'))
    check('no JS errors on marketing pages', not errors, str(errors[:3])); ctx.close()

    # ---------- B) التسجيل العادي ----------
    ctx=new_ctx(br,viewport={'width':1280,'height':900},locale='ar-EG'); errors=[]
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errors.append(str(e)))
    def state(): return pg.evaluate('window.__mockState()')
    def txt(sel='body'): return pg.inner_text(sel)
    pg.goto(B+'register.html'); pg.wait_for_selector('#registerRoot form')
    check('default mode shows registration form', 'سجّل' in txt('#registerRoot') and pg.locator('#registerRoot select').count()==1)
    fill=lambda n,ph,pa,g: (pg.fill('#registerRoot input >> nth=0',n), pg.fill('#registerRoot input[type=tel] >> nth=0',ph), pg.fill('#registerRoot input[type=tel] >> nth=1',pa), pg.select_option('#registerRoot select',g))
    fill('محمد علي حسن','01012345678','','الصف الأول الثانوي'); pg.click('#registerRoot button[type=submit]'); pg.wait_for_timeout(200)
    check('parent phone is mandatory (empty rejected)', 'رقم ولي الأمر إجباري' in txt('#registerRoot'))
    pg.fill('#registerRoot input[type=tel] >> nth=1','123'); pg.click('#registerRoot button[type=submit]'); pg.wait_for_timeout(200)
    check('parent phone must be valid', 'غير صحيح' in txt('#registerRoot'))
    check('registration NOT created on invalid input', len(state()['registrations'])==0)
    pg.fill('#registerRoot input[type=tel] >> nth=1','01155556666'); pg.click('#registerRoot button[type=submit]'); pg.wait_for_selector('.reg-ok')
    r=state()['registrations']; check('registration saved with parent phone', len(r)==1 and r[0]['parent_phone']=='01155556666' and r[0]['grade']=='الصف الأول الثانوي')
    check('success shows grade-1 WhatsApp group link', pg.get_attribute('#registerRoot a.btn-whatsapp','href')=='https://chat.whatsapp.com/AAA111?s=cl')
    pg.goto(B+'register.html'); pg.wait_for_selector('#registerRoot form'); fill('محمد علي حسن','01012345678','01155556666','الصف الأول الثانوي'); pg.click('#registerRoot button[type=submit]'); pg.wait_for_selector('.reg-ok')
    check('duplicate registration → "already registered" (no 2nd row)', 'مسجّل بالفعل' in txt('#registerRoot') and len(state()['registrations'])==1)
    pg.goto(B+'register.html'); pg.wait_for_selector('#registerRoot form'); pg.evaluate("document.getElementById('website').value='spam'"); fill('بوت بوت','01022223333','01033334444','الصف الثاني الثانوي'); pg.click('#registerRoot button[type=submit]'); pg.wait_for_timeout(300)
    check('honeypot blocks bots', len(state()['registrations'])==1)
    m=pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth})"); check('register page not wider than viewport (desktop)', m['sw']<=m['iw'])

    # ---------- C) الأدمن يحوّل لاشتراك ----------
    pg.goto(B+'login.html'); pg.fill('#loginEmail','midoaboeita235@gmail.com'); pg.fill('#loginPass','AdminPass-1'); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/lessons.html')
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=registrations]'); pg.wait_for_selector('.pf-table')
    check('admin registrations tab lists the registration', 'محمد علي حسن' in txt('#content') and '01155556666' in txt('#content'))
    with pg.expect_download() as dl: pg.click('text=⬇ تصدير CSV')
    csv=open(dl.value.path(),encoding='utf-8').read(); check('CSV export has BOM, name, parent phone', csv.startswith('\ufeff') and 'محمد علي حسن' in csv and '=""01155556666""' in csv, csv[:80].replace('\n',' '))
    pg.fill('#toolbar input[type=search]','zzz'); check('registrations search filters', 'محمد' not in txt('.pf-table tbody')); pg.fill('#toolbar input[type=search]','')
    pg.click('#tabs [data-tab=settings]'); pg.wait_for_selector('input[name=mode]')
    pg.fill('input[placeholder*="chat.whatsapp.com"] >> nth=0','http://evil.com'); pg.click('.pf-btn[type=submit]'); pg.wait_for_timeout(200)
    check('settings rejects non-WhatsApp group link', 'رابط جروب الواتساب غير صحيح' in txt('#content')); pg.fill('input[placeholder*="chat.whatsapp.com"] >> nth=0','https://chat.whatsapp.com/AAA111?s=cl')
    pg.check('input[name=mode][value=subscription]'); pg.click('.pf-btn[type=submit]'); pg.wait_for_timeout(500)
    check('admin switched mode to subscription', [x for x in state()['settings'] if x['key']=='registration_mode'][0]['value']=='subscription')
    pg.click('text=خروج'); pg.wait_for_url('**/login.html*')

    # ---------- D) الضيف + الطالب في وضع الاشتراك ----------
    pg.goto(B+'register.html'); pg.wait_for_selector('.reg-plans')
    check('guest sees subscription plans 150/180 + login buttons', '150 جنيه' in txt('#registerRoot') and '180 جنيه' in txt('#registerRoot') and pg.locator('#registerRoot a[href^="login.html"]').count()==2 and pg.locator('#registerRoot form').count()==0)
    blocked=pg.evaluate("""async()=>{const r=await window.MH.sb.from('registrations').insert({full_name:'اختراق اختراق',phone:'01099990000',parent_phone:'01099990001',grade:'الصف الأول الثانوي'}); return r.error&&r.error.code}""")
    check('server blocks plain registration when mode≠registration', blocked=='42501', str(blocked))
    pg.goto(B+'login.html?tab=signup&next=register.html'); pg.fill('#suName','سارة أحمد محمود'); pg.fill('#suPhone','01234567890'); pg.select_option('#suGrade','الصف الثاني الثانوي'); pg.fill('#suEmail','sara@test.com'); pg.fill('#suPass','12345678')
    pg.click('#signupForm button[type=submit]'); pg.wait_for_timeout(200); check('account signup requires parent phone', 'رقم ولي الأمر إجباري' in txt('#msg')); check('no account created without parent phone', 'sara@test.com' not in state()['users'])
    pg.fill('#suParent','01111111111'); pg.click('#signupForm button[type=submit]'); pg.wait_for_url('**/register.html'); pg.wait_for_selector('#registerRoot form')
    prof=[x for x in state()['profiles'] if x['phone']=='01234567890'][0]; check('profile stores parent phone', prof['parent_phone']=='01111111111')
    check('student sees subscription form prefilled (grade 2, price 180)', pg.input_value('#registerRoot select')=='الصف الثاني الثانوي' and '180 جنيه' in txt('#registerRoot') and pg.input_value('#registerRoot input[type=tel] >> nth=0')=='01111111111')
    pg.fill('#registerRoot input[type=tel] >> nth=0',''); pg.click('#registerRoot button[type=submit]'); pg.wait_for_timeout(200); check('subscription requires parent phone', 'رقم ولي الأمر إجباري' in txt('#registerRoot'))
    pg.fill('#registerRoot input[type=tel] >> nth=0','01111111111'); pg.click('#registerRoot button[type=submit]'); pg.wait_for_timeout(200); check('subscription requires receipt or txn ref', 'ارفع صورة الإيصال' in txt('#registerRoot'))
    pg.fill('#registerRoot input[placeholder^="اختياري"]','TX998877'); pg.click('#registerRoot input[value=wepay]'); pg.click('#registerRoot button[type=submit]'); pg.wait_for_selector('text=قيد المراجعة')
    sub=state()['subscriptions']; check('subscription request pending with server price 180', len(sub)==1 and sub[0]['status']=='pending' and sub[0]['amount_egp']==180 and sub[0]['method']=='wepay', str(sub[:1]))
    pg.goto(B+'lessons.html'); pg.wait_for_selector('.pf-card')
    check('subscribers-only lesson locked with subscribe link', 'للمشتركين' in txt('#content') and pg.locator('a:has-text("اشترك للمشاهدة")').count()==1)
    leak=pg.evaluate("""async()=>{const {data:l}=await window.MH.sb.from('lessons').select('*').eq('title','حصة المشتركين');const r=await window.MH.sb.from('lesson_media').select('*').eq('lesson_id',l[0].id).maybeSingle();return r.data}""")
    check('subscribers video NOT readable before subscription', leak is None)
    own_hack=pg.evaluate("""async()=>{const me=(await window.MH.sb.auth.getSession()).data.session.user.id;const r=await window.MH.sb.from('profiles').update({subscribed_until:'2099-01-01'}).eq('id',me);return r.error&&r.error.message}""")
    check('student cannot give himself a subscription', own_hack and 'غير مسموح' in own_hack, str(own_hack))
    pg.click('text=خروج'); pg.wait_for_url('**/login.html*')

    # ---------- E) الأدمن يقبل الاشتراك ----------
    pg.fill('#loginEmail','midoaboeita235@gmail.com'); pg.fill('#loginPass','AdminPass-1'); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/lessons.html')
    pg.goto(B+'admin.html'); pg.wait_for_selector('#pendingSubs:not([hidden])'); check('pending subscriptions counter = 1', txt('#pendingSubs').strip()=='1')
    pg.click('#tabs [data-tab=subs]'); pg.wait_for_selector('.pf-order'); check('subscription card shows student + parent phone', 'سارة أحمد محمود' in txt('#content') and '01111111111' in txt('#content'))
    pg.once('dialog',lambda d:d.accept('2')); pg.click('.pf-order >> text=✓ قبول وتفعيل'); pg.wait_for_timeout(500)
    sp=[x for x in state()['profiles'] if x['phone']=='01234567890'][0]
    days=(datetime.fromisoformat(sp['subscribed_until'].replace('Z','+00:00'))-datetime.now(timezone.utc)).days if sp['subscribed_until'] else 0
    check('approval activates ~2 months', 55<=days<=64, f'{days} days')
    pg.click('#tabs [data-tab=subs]'); pg.click('text=الكل'); pg.wait_for_selector('.pf-order'); check('approved request has no more review buttons', pg.locator('.pf-order >> text=قبول وتفعيل').count()==0)
    pg.click('#tabs [data-tab=students]'); pg.wait_for_selector('.pf-table'); check('students tab shows parent phone + active subscription', '01111111111' in txt('.pf-table') and 'حتى' in txt('.pf-table'))
    pg.once('dialog',lambda d:d.accept('3')); pg.click('.pf-table tr:has-text("سارة") >> text=＋ اشتراك'); pg.wait_for_timeout(400)
    days2=(datetime.fromisoformat([x for x in state()['profiles'] if x['phone']=='01234567890'][0]['subscribed_until'].replace('Z','+00:00'))-datetime.now(timezone.utc)).days; check('manual grant extends by +3 months', 140<=days2<=157, f'{days2} days')
    pg.click('#tabs [data-tab=lessons]'); pg.click('text=＋ حصة جديدة'); pg.wait_for_selector('.pf-modal')
    pg.fill('.pf-modal input[type=text] >> nth=0','حصة المشتركين 2'); pg.select_option('.pf-modal select >> nth=2','subscribers'); check('price disabled for non-paid access', pg.is_disabled('.pf-modal input[type=number] >> nth=1'))
    pg.fill('.pf-modal input[placeholder="الصق رابط الفيديو هنا"]','https://youtu.be/jNQXAC9IVRw'); pg.click('.pf-modal button[type=submit]'); pg.wait_for_timeout(500)
    L=[x for x in state()['lessons'] if x['title']=='حصة المشتركين 2']; check('lesson saved as subscribers-only', L and L[0]['for_subscribers'] is True and L[0]['is_free'] is False, str(L[0] if L else ''))
    pg.click('text=خروج'); pg.wait_for_url('**/login.html*')

    # ---------- F) الطالب بعد التفعيل ----------
    pg.fill('#loginEmail','sara@test.com'); pg.fill('#loginPass','12345678'); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/lessons.html'); pg.wait_for_selector('.pf-card')
    check('subscription banner shows expiry', 'اشتراكك ساري حتى' in txt('#subBanner'))
    pg.click('.pf-card:has-text("حصة المشتركين") >> nth=0 >> text=▶ شاهد الحصة'); pg.wait_for_selector('.pf-player iframe'); check('subscriber can watch subscribers lesson', 'jNQXAC9IVRw' in pg.get_attribute('.pf-player iframe','src')); pg.keyboard.press('Escape')
    pg.goto(B+'register.html'); pg.wait_for_selector('#registerRoot'); check('active subscriber sees status note on register page', 'اشتراكك ساري' in txt('#registerRoot'))
    pg.goto(B+'lessons.html'); pg.wait_for_selector('.pf-card'); pg.click('text=خروج'); pg.wait_for_url('**/login.html*')

    # ---------- G) الأدمن يقفل التسجيل ----------
    pg.fill('#loginEmail','midoaboeita235@gmail.com'); pg.fill('#loginPass','AdminPass-1'); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/lessons.html')
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=settings]'); pg.wait_for_selector('input[name=mode]'); pg.check('input[name=mode][value=closed]'); pg.click('.pf-btn[type=submit]'); pg.wait_for_timeout(400)
    pg.click('text=خروج'); pg.wait_for_url('**/login.html*'); pg.goto(B+'register.html'); pg.wait_for_selector('.reg-lead')
    check('closed mode shows admin message, no form', 'رسالة تجريبية' in txt('#registerRoot') and pg.locator('#registerRoot form').count()==0)
    blocked2=pg.evaluate("""async()=>{const r=await window.MH.sb.from('registrations').insert({full_name:'اختراق اختراق',phone:'01099990000',parent_phone:'01099990001',grade:'الصف الأول الثانوي'}); return r.error&&r.error.code}""")
    check('server blocks registration when closed', blocked2=='42501')
    pg.goto(B+'login.html'); pg.fill('#loginEmail','midoaboeita235@gmail.com'); pg.fill('#loginPass','AdminPass-1'); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/lessons.html')
    pg.goto(B+'admin.html'); pg.click('#tabs [data-tab=settings]'); pg.wait_for_selector('input[name=mode]'); pg.check('input[name=mode][value=registration]'); pg.click('.pf-btn[type=submit]'); pg.wait_for_timeout(400)
    pg.click('text=خروج'); pg.wait_for_url('**/login.html*'); pg.goto(B+'register.html'); pg.wait_for_selector('#registerRoot form'); check('mode back to registration → form returns', True)
    check('no JS errors in flows', not errors, str(errors[:3])); ctx.close()

    # ---------- H) أبعاد الموبايل في صفحات المنصة ----------
    ctx=new_ctx(br,viewport={'width':390,'height':844},is_mobile=True,device_scale_factor=2); pg=ctx.new_page(); bad=[]
    pg.goto(B+'login.html'); pg.fill('#loginEmail','midoaboeita235@gmail.com'); pg.fill('#loginPass','AdminPass-1'); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/lessons.html'); pg.wait_for_selector('.pf-card')
    def ov(label):
        m=pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth})")
        if m['sw']>m['iw']+1: bad.append((label,m))
    ov('lessons')
    for t in ('orders','subs','registrations','lessons','pdfs','students','settings'):
        pg.goto(B+'admin.html'); pg.click(f'#tabs [data-tab={t}]'); pg.wait_for_timeout(350); ov('admin:'+t)
    pg.click('#tabs [data-tab=lessons]'); pg.click('text=＋ حصة جديدة'); pg.wait_for_selector('.pf-modal'); ov('lesson form')
    check('platform pages (lessons + 7 admin tabs + form) fit mobile width', not bad, str(bad[:2])); ctx.close(); br.close()
ok=sum(1 for _,c in res if c); print(f'\n{ok}/{len(res)} passed')
