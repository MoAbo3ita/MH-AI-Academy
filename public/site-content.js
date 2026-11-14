/* MH AI Academy — يطبّق تعديلات لوحة الأدمن على الصفحات العامة (نصوص، أسئلة، منهج، خطط، أرقام التواصل).
   خفيف عمدًا: بدون مكتبة Supabase، مجرد fetch على الـ REST API. لو فشل أي طلب، الصفحة تفضل بمحتواها الافتراضي. */
(function () {
  'use strict';
  const C = window.MH_CONFIG;
  if (!C || !C.SUPABASE_URL || !C.SUPABASE_KEY) return;
  const CACHE = 'mh_cms_v1', DEFAULT_WA = '201555109204';
  const HEAD = { apikey: C.SUPABASE_KEY, Authorization: 'Bearer ' + C.SUPABASE_KEY };
  const get = (path) => Promise.race([
    fetch(C.SUPABASE_URL + '/rest/v1/' + path, { headers: HEAD, cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    new Promise((_, rej) => setTimeout(() => rej('timeout'), 6000))]);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const waUrl = (num, msg) => `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;

  /* ---------- نصوص ---------- */
  function applyTexts(map) {
    $$('[data-k]').forEach((el) => { const v = map[el.getAttribute('data-k')]; if (typeof v === 'string' && v !== el.textContent) el.textContent = v; });
  }

  /* ---------- أرقام التواصل ---------- */
  function applyContact(s) {
    const wa = (s.contact_whatsapp || '').replace(/\D/g, ''), ph = (s.contact_phone || '').replace(/\D/g, '');
    if (/^2?01[0125]\d{8}$/.test(wa)) {
      const intl = wa.startsWith('2') ? wa : '2' + wa;
      $$('a[href*="wa.me/"]').forEach((a) => { a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + intl); const n = a.querySelector('.num'); if (n) n.textContent = intl.slice(1); });
    }
    if (/^01[0125]\d{8}$/.test(ph)) $$('a[href^="tel:"]').forEach((a) => { a.href = 'tel:+2' + ph.slice(1); const n = a.querySelector('.num'); if (n) n.textContent = ph; });
  }

  /* ---------- القوائم ---------- */
  const lists = {
    faq(box, rows) {
      box.replaceChildren(...rows.map((r) => { const d = mk('details', 'faq-item glass-card visible'); d.append(mk('summary', '', r.title), mk('p', '', r.body)); return d; }));
    },
    curriculum(box, rows) {
      box.replaceChildren(...rows.map((r) => { const li = mk('li'); const img = mk('img'); img.src = 'assets/icons/check.svg'; img.alt = ''; img.width = 20; img.height = 20; li.append(img, mk('span', '', r.title)); return li; }));
    },
    plans(box, rows, s) {
      const wa = (s.contact_whatsapp || DEFAULT_WA).replace(/\D/g, '');
      box.replaceChildren(...rows.map((p) => {
        const card = mk('article', 'glass-card price-card visible');
        const badge = mk('span', 'hero-badge'); badge.append(mk('span', 'dot'), document.createTextNode(' ' + p.name)); card.append(badge);
        const priceTxt = p.price_egp === 0 ? 'مجانًا' : (p.months === 1 ? `${p.price_egp} جنيه شهريًا` : `${p.price_egp} جنيه لكل ${p.months} شهور`);
        const dl = mk('dl', 'info-list'); const row = (a, b) => { const d = mk('div'); d.append(mk('dt', '', a), mk('dd', '', b)); dl.append(d); };
        row('السعر', priceTxt);
        const bullets = [];
        String(p.details || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
          const i = line.search(/[:：]/); if (i > 0 && i < line.length - 1) row(line.slice(0, i).trim(), line.slice(i + 1).trim()); else bullets.push(line);
        });
        card.append(dl);
        if (bullets.length) { const ul = mk('ul', 'check-list'); bullets.forEach((b) => { const li = mk('li'); const img = mk('img'); img.src = 'assets/icons/check.svg'; img.alt = ''; img.width = 20; img.height = 20; li.append(img, mk('span', '', b)); ul.append(li); }); card.append(ul); }
        const sub = p.kind === 'subscription' && s.registration_mode === 'subscription';
        const a = mk('a', 'btn btn-glow btn-block ' + (sub ? 'btn-primary' : 'btn-whatsapp'));
        if (sub) { a.href = 'register.html'; a.textContent = p.cta_label || 'اشترك الآن'; }
        else { a.href = waUrl(wa, `السلام عليكم، عايز أستفسر عن خطة: ${p.name}`); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = p.cta_label || 'تواصل معنا للاتفاق'; }
        card.append(a); return card;
      }));
    }
  };

  /* ---------- التشغيل ---------- */
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) { /* ignore */ }
  if (cached) { applyTexts(cached.content || {}); applyContact(cached.settings || {}); }

  const boxes = $$('[data-cms-list]');
  Promise.allSettled([get('site_content?select=key,value'), get('settings?select=key,value')]).then(async ([c, s]) => {
    const content = {}, settings = {};
    if (c.status === 'fulfilled') c.value.forEach((r) => { content[r.key] = r.value; });
    if (s.status === 'fulfilled') s.value.forEach((r) => { settings[r.key] = r.value; });
    if (c.status === 'fulfilled') applyTexts(content);
    if (s.status === 'fulfilled') applyContact(settings);
    if (c.status === 'fulfilled' && s.status === 'fulfilled') { try { localStorage.setItem(CACHE, JSON.stringify({ content, settings, at: Date.now() })); } catch (e) { /* private mode */ } }
    for (const box of boxes) {
      const name = box.getAttribute('data-cms-list');
      try {
        if (name === 'plans') {
          const rows = await get('plans?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc');
          if (rows.length) lists.plans(box, rows, settings);
        } else {
          const rows = await get(`site_items?select=title,body&collection=eq.${encodeURIComponent(name)}&is_visible=eq.true&order=sort_order.asc,created_at.asc`);
          if (rows.length) lists[name.startsWith('curriculum') ? 'curriculum' : name](box, rows);
        }
      } catch (e) { /* نفضل على المحتوى الافتراضي */ }
    }
  });
})();
