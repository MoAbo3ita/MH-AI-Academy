/* MH AI Academy — سلوكيات مشتركة لكل الصفحات التسويقية (خفيف عمدًا) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const header = $('#siteHeader'), toggle = $('#navToggle'), links = $('#navLinks'), toTop = $('#backToTop');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // حالة الهيدر + زر الرجوع للأعلى
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (header) header.classList.toggle('scrolled', y > 24);
      if (toTop) toTop.classList.toggle('visible', y > 600);
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  // قائمة الموبايل
  if (toggle && links && header) {
    const close = () => { links.classList.remove('open'); toggle.classList.remove('active'); toggle.setAttribute('aria-expanded', 'false'); header.classList.remove('menu-open'); };
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.classList.toggle('active', open); toggle.setAttribute('aria-expanded', String(open)); header.classList.toggle('menu-open', open);
    });
    links.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('click', (e) => { if (links.classList.contains('open') && !e.target.closest('#navLinks, #navToggle')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 860) close(); });
  }

  // ظهور العناصر عند التمرير (مرة واحدة)
  const items = Array.from(document.querySelectorAll('.reveal'));
  if (reduced || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('visible')); return; }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
  // أمان: لو لسبب ما الـ observer ما اشتغلش، اظهر كل شيء بعد ثانيتين
  setTimeout(() => items.forEach((el) => el.classList.add('visible')), 2500);
})();
