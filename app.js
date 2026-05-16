/* SPA для крипто-терминала.
   Hash-роутер: #/ (start), #/lead?src=crypto|ai, #/lead?sent=1 (thanks).
   Idle-reset на /lead. Очередь pending-leads в localStorage. Anti-nav защиты. */
(function () {
  const TERMINAL_ID = (window.CONFIG && window.CONFIG.TERMINAL_ID) || 'atm-001';
  const APPS_SCRIPT_URL = (window.CONFIG && window.CONFIG.APPS_SCRIPT_URL) || '';
  const IDLE_MS = 30_000;           // 30 сек простоя на /lead → возврат на /
  const THANKS_MS = 5_000;          // 5 сек на экране "Спасибо" → возврат на /
  const STORAGE_KEY = 'pending_leads_v1';

  const screens = {
    start:  document.querySelector('[data-screen="start"]'),
    lead:   document.querySelector('[data-screen="lead"]'),
    thanks: document.querySelector('[data-screen="thanks"]'),
  };
  const phoneInput = document.getElementById('phone-input');
  const submitBtn  = document.getElementById('submit-btn');
  const clockEl    = document.getElementById('clock');
  const progressEl = document.getElementById('thanks-progress');

  let currentLead = null;     // { phone, source }
  let idleTimer = null;
  let thanksTimer = null;

  /* ---- ANTI-NAVIGATION ------------------------------------------------- */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('selectstart', e => e.preventDefault());
  document.addEventListener('dragstart',   e => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    // глушим хоткеи, способные вытащить из киоска
    const k = e.key;
    if (k === 'F11' || k === 'F5' || k === 'F12') { e.preventDefault(); return; }
    if (e.ctrlKey || e.altKey || e.metaKey) { e.preventDefault(); return; }
  });

  /* ---- CLOCK ----------------------------------------------------------- */
  function updateClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}`;
  }
  updateClock();
  setInterval(updateClock, 15_000);

  /* ---- ROUTER ---------------------------------------------------------- */
  function parseHash() {
    const hash = location.hash || '#/';
    const [path, qs] = hash.slice(1).split('?');
    const params = new URLSearchParams(qs || '');
    return { path: path || '/', params };
  }

  function show(name) {
    Object.entries(screens).forEach(([k, el]) => { el.hidden = (k !== name); });
  }

  function route() {
    clearTimeout(thanksTimer);
    stopIdle();
    Numpad.close();
    document.body.classList.remove('lead-active');

    const { path, params } = parseHash();

    if (path === '/lead') {
      if (params.get('sent') === '1') {
        show('thanks');
        startThanksTimer();
        return;
      }
      const src = params.get('src') === 'ai' ? 'ai' : 'crypto';
      currentLead = { phone: null, source: src };
      Numpad.reset();
      submitBtn.disabled = true;
      show('lead');
      document.body.classList.add('lead-active');
      Numpad.open();                          // клавиатура всегда видна на /lead
      startIdle();
      return;
    }

    // default → стартовая
    if (path !== '/' && path !== '') {
      location.hash = '#/';                   // hashchange запустит route() снова
      return;
    }
    show('start');
    flushPendingLeads();                      // тихо отправляем накопленную очередь
  }

  window.addEventListener('hashchange', route);

  /* ---- IDLE-RESET ------------------------------------------------------ */
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { location.hash = '#/'; }, IDLE_MS);
  }
  function startIdle() {
    resetIdle();
    document.addEventListener('touchstart', resetIdle, { passive: true });
    document.addEventListener('mousemove',  resetIdle, { passive: true });
    document.addEventListener('keydown',    resetIdle);
  }
  function stopIdle() {
    clearTimeout(idleTimer);
    document.removeEventListener('touchstart', resetIdle);
    document.removeEventListener('mousemove',  resetIdle);
    document.removeEventListener('keydown',    resetIdle);
  }

  /* ---- THANKS TIMER + PROGRESS ----------------------------------------- */
  function startThanksTimer() {
    // анимация прогресс-бара
    progressEl.style.transition = 'none';
    progressEl.style.transform  = 'scaleX(1)';
    // forced reflow
    void progressEl.offsetWidth;
    progressEl.style.transition = `transform ${THANKS_MS}ms linear`;
    progressEl.style.transform  = 'scaleX(0)';
    thanksTimer = setTimeout(() => { location.hash = '#/'; }, THANKS_MS);
  }

  /* ---- PHONE INPUT + NUMPAD ------------------------------------------- */
  phoneInput.addEventListener('click', () => Numpad.open());
  phoneInput.addEventListener('focus', () => Numpad.open());

  Numpad.onChange(({ display, complete, e164 }) => {
    phoneInput.value = display;
    submitBtn.disabled = !complete;
    if (currentLead) currentLead.phone = e164;
  });

  /* ---- BUTTONS --------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'lead') {
      const src = target.dataset.src || 'crypto';
      location.hash = `#/lead?src=${src}`;
    } else if (action === 'back') {
      location.hash = '#/';
    }
  });

  submitBtn.addEventListener('click', async () => {
    if (!currentLead || !currentLead.phone) return;
    submitBtn.disabled = true;
    submitBtn.textContent = window.I18N ? I18N.t('lead.submitting') : 'Отправляем…';

    const payload = {
      phone:      currentLead.phone,
      source:     currentLead.source,
      lang:       (window.I18N && I18N.current) || 'ru',
      userAgent:  navigator.userAgent,
      terminalId: TERMINAL_ID,
      ts:         new Date().toISOString(),
    };

    const ok = await sendLead(payload);
    if (!ok) queueLead(payload);    // даже при no-cors-success мы не знаем результат, но не страшно

    submitBtn.textContent = window.I18N ? I18N.t('lead.submit') : 'Оставить номер';
    location.hash = '#/lead?sent=1';
  });

  /* ---- SEND TO GOOGLE APPS SCRIPT ------------------------------------- */
  async function sendLead(payload) {
    if (!APPS_SCRIPT_URL) {
      console.warn('APPS_SCRIPT_URL не задан — lead не отправлен:', payload);
      return false;
    }
    try {
      // mode: no-cors → ответ нам недоступен (всегда opaque), но Apps Script запишет данные
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      return true;
    } catch (err) {
      console.warn('Lead send failed:', err);
      return false;
    }
  }

  function queueLead(payload) {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      arr.push(payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }

  async function flushPendingLeads() {
    if (!APPS_SCRIPT_URL) return;
    let arr;
    try { arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return; }
    if (!arr.length) return;
    const remaining = [];
    for (const p of arr) {
      const ok = await sendLead(p);
      if (!ok) remaining.push(p);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  }

  /* ---- BOOT ------------------------------------------------------------ */
  if (!location.hash) location.hash = '#/';
  route();
})();
