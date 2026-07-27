(() => {
  'use strict';

  /* ---------- Shared: load an external script with automatic retries ---------- */
  window.loadScriptWithRetry = function (url, retries = 3, delayMs = 1200) {
    return new Promise((resolve, reject) => {
      let attempt = 0;
      function tryLoad() {
        attempt++;
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => {
          script.remove();
          if (attempt < retries) {
            setTimeout(tryLoad, delayMs);
          } else {
            reject(new Error('Failed to load ' + url + ' after ' + retries + ' attempts'));
          }
        };
        document.head.appendChild(script);
      }
      tryLoad();
    });
  };

  /* ---------- Theme toggle (persisted) ---------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  try {
    const savedTheme = localStorage.getItem('resumqr-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      root.setAttribute('data-theme', 'dark');
    }
  } catch (err) {
    /* localStorage/matchMedia blocked by browser privacy settings — safe to ignore */
  }
  themeBtn?.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) {
      root.removeAttribute('data-theme');
      try { localStorage.setItem('resumqr-theme', 'light'); } catch (err) {}
    } else {
      root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('resumqr-theme', 'dark'); } catch (err) {}
    }
  });

  /* ---------- Mobile menu ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-menu-close');
  navToggle?.addEventListener('click', () => mobileMenu?.classList.add('open'));
  mobileClose?.addEventListener('click', () => mobileMenu?.classList.remove('open'));
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
  }

  /* ---------- Scroll reveal (progressive enhancement) ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    revealEls.forEach(el => el.classList.add('will-animate'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
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

  /* ---------- Hero tool tabs (QR Generator / Resume Builder inside hero) ---------- */
  const heroTabs = document.querySelectorAll('.hero-tool-tabs button');
  const heroPanels = document.querySelectorAll('.hero-tool-panel');
  function activateHeroTab(name) {
    heroTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    heroPanels.forEach(p => p.classList.toggle('active', p.id === 'hero-tab-' + name));
  }
  heroTabs.forEach(tab => tab.addEventListener('click', () => activateHeroTab(tab.dataset.tab)));

  document.querySelectorAll('[data-switch-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activateHeroTab(btn.dataset.switchTab);
      document.getElementById('hero-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

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
