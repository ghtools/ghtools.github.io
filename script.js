(() => {
  'use strict';

  /* ---------- Theme toggle (persisted) ---------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('resumqr-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    root.setAttribute('data-theme', 'dark');
  }
  themeBtn?.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) {
      root.removeAttribute('data-theme');
      localStorage.setItem('resumqr-theme', 'light');
    } else {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('resumqr-theme', 'dark');
    }
  });

  /* ---------- Mobile menu ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-menu-close');
  navToggle?.addEventListener('click', () => mobileMenu.classList.add('open'));
  mobileClose?.addEventListener('click', () => mobileMenu.classList.remove('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
          other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        a.style.maxHeight = null;
        q.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- Hero device tab switcher ---------- */
  const tabs = document.querySelectorAll('.device-tab');
  const panels = document.querySelectorAll('.device-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.panel).classList.add('active');
    });
  });

  /* ---------- Live mini QR demo in hero ---------- */
  const qrInput = document.getElementById('hero-qr-input');
  const qrTarget = document.getElementById('hero-qr');
  let heroQr = null;
  function renderHeroQr() {
    if (!qrTarget || typeof QRCode === 'undefined') return;
    qrTarget.innerHTML = '';
    heroQr = new QRCode(qrTarget, {
      text: qrInput.value.trim() || 'https://resumqr.com',
      width: 148,
      height: 148,
      colorDark: '#0B1120',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }
  qrInput?.addEventListener('input', renderHeroQr);
  window.addEventListener('DOMContentLoaded', renderHeroQr);

  /* ---------- Subtle parallax on hero float elements ---------- */
  const floaters = document.querySelectorAll('.float-el');
  const hero = document.querySelector('.hero');
  hero?.addEventListener('mousemove', (e) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 2;
    const y = (e.clientY / innerHeight - 0.5) * 2;
    floaters.forEach((el, i) => {
      const depth = (i + 1) * 6;
      el.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
    });
  }, { passive: true });

  /* ---------- Newsletter form (front-end only demo) ---------- */
  const nlForm = document.getElementById('newsletter-form');
  nlForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = nlForm.querySelector('button');
    const original = btn.textContent;
    btn.textContent = 'Subscribed ✓';
    nlForm.querySelector('input').value = '';
    setTimeout(() => { btn.textContent = original; }, 2200);
  });

  /* ---------- Active nav link on scroll (simple) ---------- */
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = Array.from(navLinks).map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const navIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = '#' + entry.target.id;
        const link = document.querySelector(`.nav-links a[href="${id}"]`);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.style.color = '');
          link.style.color = 'var(--indigo)';
        }
      });
    }, { threshold: 0.5 });
    sections.forEach(s => navIo.observe(s));
  }
})();
      
