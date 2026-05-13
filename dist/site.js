/* Shared marketing site JS — v6 */
(function () {
  document.documentElement.classList.add('js-ready');

  /* Theme */
  const theme = localStorage.getItem('br-theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  /* Language */
  const lang = localStorage.getItem('br-lang') || 'en';
  document.documentElement.setAttribute('data-lang', lang);

  /* Nav scroll */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Reveal on scroll */
  const reveals = [...document.querySelectorAll('.reveal')];
  const checkReveals = () => {
    const h = window.innerHeight || document.documentElement.clientHeight;
    for (let i = reveals.length - 1; i >= 0; i--) {
      const el = reveals[i];
      const r = el.getBoundingClientRect();
      if (r.top < h * 0.92 && r.bottom > 0) { el.classList.add('in'); reveals.splice(i, 1); }
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(checkReveals));
  window.addEventListener('scroll', checkReveals, { passive: true });
  window.addEventListener('resize', checkReveals);
  setTimeout(checkReveals, 200); setTimeout(checkReveals, 600);

  /* Count-up */
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const dur = 1400;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = target * eased;
      el.textContent = prefix + (target % 1 === 0 ? Math.round(v) : v.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.querySelectorAll('[data-count]').forEach(el => {
    const tryTrigger = () => {
      if (el._counted) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85 && r.bottom > 0) { el._counted = true; animateCount(el); }
    };
    setTimeout(tryTrigger, 200);
    window.addEventListener('scroll', tryTrigger, { passive: true });
  });

  /* ═══ Mobile nav drawer ═══ */
  const burger = document.querySelector('.nav-burger');
  const drawer = document.querySelector('.nav-drawer');
  if (burger && drawer) {
    burger.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      drawer.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
  }

  /* ═══ Theme toggle ═══ */
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('br-theme', next);
    });
  }

  /* ═══ Lang toggle ═══ */
  document.querySelectorAll('.lang-toggle button').forEach(b => {
    if (b.dataset.lang === document.documentElement.getAttribute('data-lang')) b.classList.add('on');
    b.addEventListener('click', () => {
      const l = b.dataset.lang;
      document.documentElement.setAttribute('data-lang', l);
      localStorage.setItem('br-lang', l);
      document.querySelectorAll('.lang-toggle button').forEach(x => x.classList.toggle('on', x.dataset.lang === l));
    });
  });

  /* ═══ Sticky scroll CTA — only on long pages, not on Demo/auth ═══ */
  const path = location.pathname.split('/').pop() || '';
  const suppressSticky = /demo\.html|404/i.test(path) || sessionStorage.getItem('br-sticky-dismissed') === '1';
  if (!suppressSticky && document.querySelector('.site-footer')) {
    const cta = document.createElement('div');
    cta.className = 'sticky-cta';
    cta.innerHTML = `
      <span class="sc-text">Ready to say the things that matter? <em>30-min demo, on your schedule.</em></span>
      <a class="sc-btn" href="/demo.html">Book a demo</a>
      <button class="sc-close" aria-label="Close">✕</button>
    `;
    document.body.appendChild(cta);
    let shown = false;
    const onScr = () => {
      const y = window.scrollY;
      const h = document.body.scrollHeight - window.innerHeight;
      const p = h > 0 ? y / h : 0;
      if (!shown && p > 0.35 && p < 0.92) { cta.classList.add('in'); shown = true; }
      else if (shown && (p < 0.3 || p > 0.95)) { cta.classList.remove('in'); shown = false; }
    };
    window.addEventListener('scroll', onScr, { passive: true });
    cta.querySelector('.sc-close').addEventListener('click', () => {
      cta.classList.remove('in');
      sessionStorage.setItem('br-sticky-dismissed', '1');
      setTimeout(() => cta.remove(), 400);
    });
  }

  /* ═══ Exit intent modal ═══ */
  const exitShown = sessionStorage.getItem('br-exit-shown');
  if (!exitShown && !/demo\.html/i.test(path)) {
    const modal = document.createElement('div');
    modal.className = 'exit-modal-backdrop';
    modal.innerHTML = `
      <div class="exit-modal" role="dialog">
        <button class="em-close" aria-label="Close">✕</button>
        <div style="font-size:36px;margin-bottom:12px">🍁</div>
        <h3>Don't leave <em>empty-handed.</em></h3>
        <p>Grab our Recognition Playbook — 28 pages of plain-English advice on running values-based recognition in a Canadian team. No spam, no follow-up drip.</p>
        <div class="em-row">
          <input type="email" placeholder="your@company.ca" aria-label="Email">
          <button class="btn btn-primary btn-sm">Send it</button>
        </div>
        <div class="em-meta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          One email. No sales cadence. Pinky swear.
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      sessionStorage.setItem('br-exit-shown', '1');
      modal.classList.add('in');
    };
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget && e.clientY < 20) fire();
    });
    setTimeout(() => { if (!fired) fire(); }, 45000);
    const close = () => { modal.classList.remove('in'); setTimeout(() => modal.remove(), 300); };
    modal.querySelector('.em-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('.btn').addEventListener('click', () => {
      const em = modal.querySelector('input').value.trim();
      if (em && em.includes('@')) {
        modal.querySelector('.exit-modal').innerHTML = `<div style="text-align:center;padding:16px 0"><div style="font-size:48px;margin-bottom:12px">📬</div><h3 style="margin-bottom:8px">On its way.</h3><p style="margin-bottom:0">Check your inbox in about 2 minutes. If not, peek in spam (sorry, we hate that too).</p></div>`;
        setTimeout(close, 2500);
      }
    });
  }

  /* ═══ Hero typewriter (home page) ═══ */
  const typedTarget = document.getElementById('typed-text');
  if (typedTarget) {
    const full = "Leena, you saved my week. When the Victoria order came in wrong, you called three suppliers, stayed past close, and made a customer feel like they mattered. That's the bar.";
    const cursor = '<span class="cursor"></span>';
    let i = 0;
    typedTarget.innerHTML = cursor;
    const speed = 22;
    const tick = () => {
      if (i <= full.length) {
        typedTarget.innerHTML = full.slice(0, i) + cursor;
        i++;
        setTimeout(tick, speed + Math.random() * 40);
      }
    };
    setTimeout(tick, 900);
  }

  /* Tweaks panel */
  const tweaks = document.querySelector('.tweaks-panel');
  if (tweaks) {
    tweaks.querySelectorAll('.swatch[data-accent]').forEach(sw => {
      sw.addEventListener('click', () => {
        tweaks.querySelectorAll('.swatch[data-accent]').forEach(s => s.classList.remove('on'));
        sw.classList.add('on');
        const accent = sw.dataset.accent;
        const map = {
          maple:  { ink: '#B8452E' },
          gold:   { ink: '#9A6A1F' },
          forest: { ink: '#2C5F4A' },
          midnight:{ ink: '#1C2833' },
        };
        const c = map[accent];
        document.documentElement.style.setProperty('--b-maple', c.ink);
        document.documentElement.style.setProperty('--b-gold-deep', c.ink);
      });
    });
  }
})();
