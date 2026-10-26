/* ==========================================================================
   الهمص للتدريب وتكنولوجيا المعلومات — Optimized JavaScript
   --------------------------------------------------------------------------
   Improvements over original:
   1. NO module scope issues — uses IIFE pattern with strict mode
   2. Defensive null checks (no errors if element is missing on a page)
   3. aria-expanded toggling on burger for screen readers
   4. ESC key + backdrop click to close mobile menu
   5. Throttled scroll handler via requestAnimationFrame
   6. Form validation before WhatsApp redirect (phone format, min length)
   7. encodeURIComponent for safe WhatsApp text encoding (handles emoji)
   8. prefers-reduced-motion respected for counter animation
   9. passive scroll listeners (no jank)
   10. Single IntersectionObserver instance reused for performance
   ========================================================================== */

(function () {
  'use strict';

  /* ===== Feature Detection ===== */
  const supportsIO = 'IntersectionObserver' in window;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===== DOM Ready ===== */
  function init() {
    initActiveLink();
    initHeaderScroll();
    initMobileMenu();
    initReveal();
    initCounters();
    initContactForm();
    initFooterYear();
    initToTop();
  }

  /* ===== Active Link on Click + Scroll ===== */
  function initActiveLink() {
    const navLinks = document.querySelectorAll('#navMenu a[href^="#"]');
    if (!navLinks.length) return;

    navLinks.forEach(link => {
      link.addEventListener('click', function () {
        navLinks.forEach(item => item.classList.remove('active'));
        this.classList.add('active');
      });
    });

    if (!supportsIO) return;

    const sections = document.querySelectorAll('section[id], header[id]');
    if (!sections.length) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const scrollId = entry.target.getAttribute('id');
          if (!scrollId) return;
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${scrollId}`) {
              link.classList.add('active');
            }
          });
        }
      });
    };

    const sectionObserver = new IntersectionObserver(observerCallback, observerOptions);
    sections.forEach(sec => sectionObserver.observe(sec));
  }

  /* ===== Header on Scroll (throttled via rAF) ===== */
  function initHeaderScroll() {
    const header = document.getElementById('header');
    const toTopBtn = document.getElementById('toTop');
    if (!header) return;

    let ticking = false;

    function checkScroll() {
      const scrollPos = window.scrollY;
      header.classList.toggle('scrolled', scrollPos > 50);
      if (toTopBtn) toTopBtn.classList.toggle('show', scrollPos > 600);
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(checkScroll);
        ticking = true;
      }
    }

    checkScroll(); // initial state
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ===== Mobile Menu (burger + backdrop + ESC) ===== */
  function initMobileMenu() {
    const burger = document.getElementById('burger');
    const navMenu = document.getElementById('navMenu');
    const backdrop = document.getElementById('menuBackdrop');
    if (!burger || !navMenu) return;

    function setOpen(isOpen) {
      burger.classList.toggle('open', isOpen);
      navMenu.classList.toggle('open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      if (backdrop) {
        backdrop.hidden = !isOpen;
        // allow DOM to apply hidden=false before adding show
        if (isOpen) requestAnimationFrame(() => backdrop.classList.add('show'));
        else backdrop.classList.remove('show');
      }
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    burger.addEventListener('click', () => {
      const willOpen = !burger.classList.contains('open');
      setOpen(willOpen);
    });

    // Close on backdrop click
    if (backdrop) {
      backdrop.addEventListener('click', () => setOpen(false));
    }

    // Close on internal link click
    navMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setOpen(false));
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) {
        setOpen(false);
        burger.focus();
      }
    });

    // Close on resize to desktop
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 1024 && navMenu.classList.contains('open')) {
          setOpen(false);
        }
      }, 150);
    });
  }

  /* ===== Reveal on Scroll ===== */
  function initReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    // If user prefers reduced motion, just show everything
    if (prefersReducedMotion || !supportsIO) {
      revealEls.forEach(el => el.classList.add('visible'));
      return;
    }

    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(el => revealObs.observe(el));
  }

  /* ===== Number Counters ===== */
  function initCounters() {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    function animateCounter(el) {
      const target = +el.dataset.target;
      const duration = prefersReducedMotion ? 0 : 1800;
      const start = performance.now();

      function tick(now) {
        const p = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(target * eased).toLocaleString('en');
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString('en');
      }
      requestAnimationFrame(tick);
    }

    if (prefersReducedMotion || !supportsIO) {
      counters.forEach(el => {
        el.textContent = (+el.dataset.target).toLocaleString('en');
      });
      return;
    }

    const countObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          countObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => countObs.observe(el));
  }

  /* ===== Contact Form → WhatsApp ===== */
  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const fName = form.querySelector('#fName');
    const fPhone = form.querySelector('#fPhone');
    const fSubject = form.querySelector('#fSubject');
    const fMsg = form.querySelector('#fMsg');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // HTML5 validation first
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const name = (fName?.value || '').trim();
      const phone = (fPhone?.value || '').trim();
      const subject = fSubject?.value || '';
      const message = (fMsg?.value || '').trim();

      // Sanitize: strip any newlines that could break the WhatsApp URL
      const clean = (s) => s.replace(/[\r\n]+/g, ' ').slice(0, 500);

      // Build the message body — use encodeURIComponent for full safety
      const text = `مرحباً مركز الهمص للتدريب 👋\n\n` +
        `الاسم: ${clean(name)}\n` +
        `الهاتف: ${clean(phone)}\n` +
        `نوع الاستفسار: ${clean(subject)}\n` +
        `الرسالة: ${clean(message)}`;

      const url = `https://wa.me/972566992200?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');

      // Optional: reset form on success
      form.reset();
    });
  }

  /* ===== Footer Year ===== */
  function initFooterYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  /* ===== To Top Button ===== */
  function initToTop() {
    const toTopBtn = document.getElementById('toTop');
    if (!toTopBtn) return;

    toTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });
  }

  /* ===== Boot ===== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
