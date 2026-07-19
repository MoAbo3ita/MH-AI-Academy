/* ==========================================================================
   MH AI Academy — script.js
   Vanilla ES6+ · Single global namespace (MHAcademy) · No libraries
   ========================================================================== */

const MHAcademy = (() => {
  'use strict';

  /* ==================== Configuration ==================== */
  // Google Apps Script endpoint — the single source of truth for the API URL.
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzVyXQIUzQd3TTYU6WbJ0ev_axXeCs2gP4nQboMARGSz8FYIUWYNb_AGWVoE6mJgJvePw/exec';

  // Egyptian mobile numbers: 11 digits starting with 010 / 011 / 012 / 015.
  const PHONE_PATTERN = /^01[0125]\d{8}$/;
  const MIN_NAME_LENGTH = 3;

  // Centralized Arabic UI messages.
  const MESSAGES = {
    nameRequired: 'من فضلك أدخل الاسم بالكامل.',
    nameTooShort: 'الاسم يجب ألا يقل عن ٣ أحرف.',
    phoneRequired: 'من فضلك أدخل رقم الهاتف.',
    phoneInvalid: 'أدخل رقمًا مصريًا صحيحًا مكوّنًا من 11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015.',
    gradeRequired: 'من فضلك اختر الصف الدراسي.'
  };

  // Grade → WhatsApp group mapping (memory only — never persisted).
  const GRADE_GROUPS = {
    'الصف الأول الثانوي': {
      joinText: '🚀 الانضمام إلى جروب الصف الأول الثانوي',
      url: 'https://chat.whatsapp.com/C5kl92G677i5lQENQvPwog?s=cl&p=a&mlu=0'
    },
    'الصف الثاني الثانوي': {
      joinText: '🚀 الانضمام إلى جروب الصف الثاني الثانوي',
      url: 'https://chat.whatsapp.com/KJQ2icjzhzjIJrqAW7MBNj?s=cl&p=a&mlu=0'
    }
  };

  /* ==================== State & DOM cache ==================== */
  const state = {
    isSubmitting: false,   // Guards against duplicate submissions.
    lastSubmission: null,  // Kept for the "retry" flow after a network error.
    selectedGrade: null,   // In-memory only; reset on page refresh.
    isRegistered: false
  };

  const dom = {};

  /* ==================== Utilities ==================== */
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cacheDom = () => {
    dom.header = $('#siteHeader');
    dom.navToggle = $('#navToggle');
    dom.navLinks = $('#navLinks');
    dom.navLinkItems = $$('.nav-link');
    dom.sections = $$('main section[id]');
    dom.revealItems = $$('.reveal');
    dom.backToTop = $('#backToTop');
    dom.form = $('#registrationForm');
    dom.fullName = $('#fullName');
    dom.phone = $('#phone');
    dom.grade = $('#grade');
    dom.formFields = [dom.fullName, dom.phone, dom.grade];
    dom.submitBtn = $('#submitBtn');
    dom.submitBtnLabel = $('#submitBtn .btn-label');
    dom.formSuccessMessage = $('#formSuccessMessage');
    dom.successModal = $('#successModal');
    dom.successJoinBtn = $('#successJoinBtn');
    dom.errorModal = $('#errorModal');
    dom.retryBtn = $('#retryBtn');
    dom.modalOverlays = $$('.modal-overlay');
    dom.whatsappSection = $('#whatsapp-groups');
    dom.groupCards = $$('.group-card[data-grade]');
  };

  /* ==================== Header state + back-to-top visibility ==================== */
  let scrollTicking = false;

  const handleScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    // Batch visual updates inside rAF to avoid layout thrashing.
    requestAnimationFrame(() => {
      const offset = window.scrollY;
      dom.header.classList.toggle('scrolled', offset > 24);
      dom.backToTop.classList.toggle('visible', offset > 600);
      scrollTicking = false;
    });
  };

  const initScrollEffects = () => {
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
  };

  /* ==================== Mobile navigation ==================== */
  const closeMobileNav = () => {
    dom.navLinks.classList.remove('open');
    dom.navToggle.classList.remove('active');
    dom.navToggle.setAttribute('aria-expanded', 'false');
    dom.header.classList.remove('menu-open');
  };

  const initMobileNav = () => {
    dom.navToggle.addEventListener('click', () => {
      const isOpen = dom.navLinks.classList.toggle('open');
      dom.navToggle.classList.toggle('active', isOpen);
      dom.navToggle.setAttribute('aria-expanded', String(isOpen));
      dom.header.classList.toggle('menu-open', isOpen);
    });
  };

  /* ==================== Smooth anchor scrolling (event delegation) ==================== */
  const initSmoothScroll = () => {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute('href');
      if (hash.length < 2) return;

      const target = document.querySelector(hash);
      if (!target) return;

      // Skip hidden sections (e.g. #whatsapp-groups before registration).
      if (target.hasAttribute('hidden') || target.style.display === 'none') return;

      event.preventDefault();
      closeMobileNav();
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });
      history.replaceState(null, '', hash);
    });
  };

  /* ==================== Scroll spy (active nav highlighting) ==================== */
  const initScrollSpy = () => {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const activeHash = `#${entry.target.id}`;
        dom.navLinkItems.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === activeHash);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    dom.sections.forEach((section) => spy.observe(section));
  };

  /* ==================== Fade-up reveal on scroll ==================== */
  const initReveal = () => {
    if (prefersReducedMotion()) {
      dom.revealItems.forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        obs.unobserve(entry.target); // Reveal once — no memory or reflow overhead afterwards.
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    dom.revealItems.forEach((el) => observer.observe(el));
  };

  // Manual reveal helper for elements shown after initial page load.
  const revealElement = (el) => {
    if (!el) return;
    if (prefersReducedMotion()) {
      el.classList.add('visible');
      return;
    }
    // Force a reflow so the transition plays even if 'visible' was toggled off.
    el.classList.remove('visible');
    void el.offsetWidth;
    requestAnimationFrame(() => el.classList.add('visible'));
  };

  /* ==================== Button ripple (delegated, self-cleaning) ==================== */
  const initRipple = () => {
    document.addEventListener('pointerdown', (event) => {
      const button = event.target.closest('.btn');
      if (!button || button.disabled) return;

      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ripple = document.createElement('span');

      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

      button.appendChild(ripple);
      // Remove the node as soon as the animation ends — no DOM buildup.
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  };

  /* ==================== Cursor glow on CTA buttons ==================== */
  const initButtonGlow = () => {
    document.addEventListener('pointermove', (event) => {
      const button = event.target.closest('.btn-glow');
      if (!button) return;
      const rect = button.getBoundingClientRect();
      button.style.setProperty('--gx', `${event.clientX - rect.left}px`);
      button.style.setProperty('--gy', `${event.clientY - rect.top}px`);
    }, { passive: true });
  };

  /* ==================== Back to top ==================== */
  const initBackToTop = () => {
    dom.backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  };

  /* ==================== Form validation ==================== */
  const validators = {
    fullName(value) {
      const name = value.trim();
      if (!name) return MESSAGES.nameRequired;
      if (name.length < MIN_NAME_LENGTH) return MESSAGES.nameTooShort;
      return '';
    },
    phone(value) {
      const phone = value.trim();
      if (!phone) return MESSAGES.phoneRequired;
      if (!PHONE_PATTERN.test(phone)) return MESSAGES.phoneInvalid;
      return '';
    },
    grade(value) {
      return value ? '' : MESSAGES.gradeRequired;
    }
  };

  const showFieldError = (input, message) => {
    const group = input.closest('.form-group');
    group.classList.add('invalid');
    group.querySelector('.error-message').textContent = message;
    input.setAttribute('aria-invalid', 'true');
  };

  const clearFieldError = (input) => {
    const group = input.closest('.form-group');
    group.classList.remove('invalid');
    group.querySelector('.error-message').textContent = '';
    input.removeAttribute('aria-invalid');
  };

  const validateField = (input) => {
    const message = validators[input.name] ? validators[input.name](input.value) : '';
    if (message) {
      showFieldError(input, message);
      return false;
    }
    clearFieldError(input);
    return true;
  };

  const validateForm = () => {
    const results = dom.formFields.map(validateField);
    const firstInvalidIndex = results.indexOf(false);
    if (firstInvalidIndex !== -1) {
      dom.formFields[firstInvalidIndex].focus();
      return false;
    }
    return true;
  };

  /* ==================== API layer ==================== */
  // Sends the registration payload to Google Apps Script.
  // mode: 'no-cors' is required because Apps Script does not return CORS headers;
  // the request resolves as long as the network delivery itself succeeds.
  const sendRegistration = async ({ fullName, phone, grade }) => {
    const payload = new FormData();
    payload.append('fullName', fullName);
    payload.append('grade', grade);
    payload.append('phone', phone);

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: payload
    });
  };

  /* ==================== Submission flow ==================== */
  const setSubmitting = (isSending) => {
    dom.submitBtn.disabled = isSending;
    dom.submitBtn.classList.toggle('loading', isSending);
    dom.submitBtn.setAttribute('aria-busy', String(isSending));
    dom.formFields.forEach((field) => { field.disabled = isSending; });
  };

  // Lock the form permanently after a successful registration.
  const lockFormAsRegistered = () => {
    state.isRegistered = true;
    dom.formFields.forEach((field) => { field.disabled = true; });
    dom.submitBtn.disabled = true;
    dom.submitBtn.classList.remove('loading');
    dom.submitBtn.setAttribute('aria-busy', 'false');
    if (dom.submitBtnLabel) dom.submitBtnLabel.textContent = '✅ تم التسجيل بنجاح';
    if (dom.formSuccessMessage) {
      dom.formSuccessMessage.hidden = false;
      dom.formSuccessMessage.textContent = 'تم تسجيل بياناتك بنجاح ويمكنك الآن الانضمام إلى جروب الواتساب الخاص بك.';
    }
  };

  // Configure the Success Modal's single dynamic WhatsApp button for the selected grade.
  const configureSuccessJoinButton = (grade) => {
    const group = GRADE_GROUPS[grade];
    if (!group || !dom.successJoinBtn) return;
    dom.successJoinBtn.href = group.url;
    dom.successJoinBtn.setAttribute('target', '_blank');
    dom.successJoinBtn.setAttribute('rel', 'noopener noreferrer');
    const label = dom.successJoinBtn.querySelector('.btn-label') || dom.successJoinBtn;
    label.textContent = group.joinText;
    dom.successJoinBtn.setAttribute('aria-label', group.joinText);
  };

  const submitRegistration = async (data) => {
    if (state.isSubmitting || state.isRegistered) return; // Prevent duplicate submissions.

    state.isSubmitting = true;
    state.lastSubmission = data;
    setSubmitting(true);

    try {
      await sendRegistration(data);
      state.selectedGrade = data.grade;
      configureSuccessJoinButton(data.grade);
      lockFormAsRegistered();
      openModal(dom.successModal);
    } catch (error) {
      openModal(dom.errorModal);
    } finally {
      state.isSubmitting = false;
      // Only re-enable submit button on failure — on success the form is locked.
      if (!state.isRegistered) setSubmitting(false);
    }
  };

  const initForm = () => {
    dom.form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (state.isSubmitting || state.isRegistered || !validateForm()) return;

      submitRegistration({
        fullName: dom.fullName.value.trim(),
        phone: dom.phone.value.trim(),
        grade: dom.grade.value
      });
    });

    dom.formFields.forEach((input) => {
      // Clear the error automatically as soon as the user edits the field.
      input.addEventListener('input', () => clearFieldError(input));
      input.addEventListener('change', () => clearFieldError(input));
      // Validate on blur only when the field has content (avoids premature errors).
      input.addEventListener('blur', () => {
        if (input.value) validateField(input);
      });
    });

    // Phone field: digits only, capped at 11 characters.
    dom.phone.addEventListener('input', () => {
      dom.phone.value = dom.phone.value.replace(/\D/g, '').slice(0, 11);
    });
  };

  /* ==================== WhatsApp section reveal ==================== */
  const revealWhatsappSection = (grade) => {
    if (!dom.whatsappSection || !grade) return;

    // Reveal the section itself.
    dom.whatsappSection.hidden = false;
    dom.whatsappSection.style.display = '';

    // Show only the matching card; hide the other entirely.
    let visibleCard = null;
    dom.groupCards.forEach((card) => {
      const match = card.dataset.grade === grade;
      card.style.display = match ? '' : 'none';
      if (match) visibleCard = card;
    });

    // Play the existing fade-up animation on the section head and the visible card.
    dom.whatsappSection.querySelectorAll('.reveal').forEach((el) => {
      if (el.style.display !== 'none') revealElement(el);
    });

    // Smooth scroll to the section, then focus its Join button.
    requestAnimationFrame(() => {
      dom.whatsappSection.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });
      if (visibleCard) {
        const focusTarget = visibleCard.querySelector('.btn');
        if (focusTarget) {
          // Delay focus until the smooth scroll settles.
          setTimeout(() => focusTarget.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 500);
        }
      }
    });
  };

  /* ==================== Modals ==================== */
  let lastFocusedElement = null;

  const openModal = (modal) => {
    lastFocusedElement = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusTarget = modal.querySelector('a, button');
    if (focusTarget) focusTarget.focus();
  };

  const closeModal = (modal) => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocusedElement) lastFocusedElement.focus();
  };

  const initModals = () => {
    dom.modalOverlays.forEach((overlay) => {
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.closest('[data-close-modal]')) {
          closeModal(overlay);
        }
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      dom.modalOverlays.forEach((overlay) => {
        if (overlay.classList.contains('open')) closeModal(overlay);
      });
    });

    // Retry reuses the last submitted payload through the same guarded flow.
    dom.retryBtn.addEventListener('click', () => {
      closeModal(dom.errorModal);
      if (state.lastSubmission) submitRegistration(state.lastSubmission);
    });

    // Success Modal Join button: opens WhatsApp in a new tab, then closes the
    // modal and reveals the WhatsApp section with the selected grade's card.
    if (dom.successJoinBtn) {
      dom.successJoinBtn.addEventListener('click', () => {
        // The <a target="_blank"> opens WhatsApp natively — we only handle UI state.
        const grade = state.selectedGrade;
        // Defer closing so the browser processes the anchor navigation first.
        setTimeout(() => {
          closeModal(dom.successModal);
          revealWhatsappSection(grade);
        }, 0);
      });
    }
  };

  /* ==================== Bootstrap ==================== */
  const init = () => {
    cacheDom();
    initScrollEffects();
    initMobileNav();
    initSmoothScroll();
    initScrollSpy();
    initReveal();
    initRipple();
    initButtonGlow();
    initBackToTop();
    initForm();
    initModals();
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', MHAcademy.init);
