/* SPA для крипто-терминала.
   Роуты:
     #/                      — старт
     #/buy                   — квиз покупки (валюта → операция → сумма)
     #/lead?src=crypto|ai    — ввод телефона (+ доп. поля при src=crypto: op, cur, amount)
     #/lead?sent=1           — "спасибо"
*/
(function () {
  const TERMINAL_ID     = (window.CONFIG && window.CONFIG.TERMINAL_ID) || 'atm-001';
  const APPS_SCRIPT_URL = (window.CONFIG && window.CONFIG.APPS_SCRIPT_URL) || '';
  const IDLE_MS         = 30_000;
  const THANKS_MS       = 5_000;
  const STORAGE_KEY     = 'pending_leads_v1';

  const screens = {
    start:  document.querySelector('[data-screen="start"]'),
    buy:    document.querySelector('[data-screen="buy"]'),
    lead:   document.querySelector('[data-screen="lead"]'),
    thanks: document.querySelector('[data-screen="thanks"]'),
  };
  const phoneInput   = document.getElementById('phone-input');
  const amountInput  = document.getElementById('amount-input');
  const submitBtn    = document.getElementById('submit-btn');
  const buyNextBtn   = document.getElementById('buy-next-btn');
  const buyStepNum   = document.getElementById('buy-step-num');
  const clockEl      = document.getElementById('clock');
  const progressEl   = document.getElementById('thanks-progress');
  const stepBlocks   = document.querySelectorAll('[data-buy-step]');
  const stepDots     = document.querySelectorAll('.quiz-progress__dot');

  let currentLead = null;     // { phone, source, op?, currency?, amount? }
  let currentBuy  = null;     // { step, currency, op, amount }
  let idleTimer   = null;
  let thanksTimer = null;

  /* ---- ANTI-NAVIGATION ------------------------------------------------- */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('selectstart', e => e.preventDefault());
  document.addEventListener('dragstart',   e => e.preventDefault());
  document.addEventListener('keydown', (e) => {
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
    Numpad.unbind();
    document.body.classList.remove('kbd-side');

    const { path, params } = parseHash();

    if (path === '/buy') {
      currentBuy = { step: 1, currency: null, op: null, amount: 0 };
      show('buy');
      renderBuyStep(1);
      startIdle();
      return;
    }

    if (path === '/lead') {
      if (params.get('sent') === '1') {
        show('thanks');
        startThanksTimer();
        return;
      }
      const src = params.get('src') === 'ai' ? 'ai' : 'crypto';
      currentLead = {
        phone:    null,
        source:   src,
        op:       params.get('op')     || null,
        currency: params.get('cur')    || null,
        amount:   params.get('amount') ? parseInt(params.get('amount'), 10) : null,
      };
      submitBtn.disabled = true;
      submitBtn.textContent = I18N.t('lead.submit');
      show('lead');
      document.body.classList.add('kbd-side');
      Numpad.bind(phoneInput, {
        mode: 'phone',
        onChange: ({ complete, value }) => {
          submitBtn.disabled = !complete;
          if (currentLead) currentLead.phone = value;
        }
      });
      Numpad.open();
      startIdle();
      return;
    }

    // default → стартовая
    if (path !== '/' && path !== '') {
      location.hash = '#/';
      return;
    }
    show('start');
    flushPendingLeads();
  }

  window.addEventListener('hashchange', route);

  /* ---- BUY QUIZ -------------------------------------------------------- */
  function renderBuyStep(n) {
    if (!currentBuy) return;
    currentBuy.step = n;

    stepBlocks.forEach(el => {
      el.hidden = (parseInt(el.dataset.buyStep, 10) !== n);
    });
    buyStepNum.textContent = n;
    stepDots.forEach(dot => {
      const i = parseInt(dot.dataset.dot, 10);
      dot.classList.toggle('is-active', i === n);
      dot.classList.toggle('is-done',   i <  n);
    });

    // Numpad нужен только на шаге 3 (сумма)
    if (n === 3) {
      document.body.classList.add('kbd-side');
      Numpad.bind(amountInput, {
        mode: 'amount',
        onChange: ({ complete, value }) => {
          buyNextBtn.disabled = !complete;
          if (currentBuy) currentBuy.amount = value;
        }
      });
      Numpad.open();
    } else {
      document.body.classList.remove('kbd-side');
      Numpad.close();
      Numpad.unbind();
    }
  }

  function buyBack() {
    if (!currentBuy) { location.hash = '#/'; return; }
    if (currentBuy.step <= 1) { location.hash = '#/'; return; }
    renderBuyStep(currentBuy.step - 1);
  }

  function finishBuy() {
    if (!currentBuy || !currentBuy.currency || !currentBuy.op || !currentBuy.amount) return;
    const params = new URLSearchParams({
      src:    'crypto',
      op:     currentBuy.op,
      cur:    currentBuy.currency,
      amount: String(currentBuy.amount),
    });
    location.hash = `#/lead?${params.toString()}`;
  }

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
    progressEl.style.transition = 'none';
    progressEl.style.transform  = 'scaleX(1)';
    void progressEl.offsetWidth;
    progressEl.style.transition = `transform ${THANKS_MS}ms linear`;
    progressEl.style.transform  = 'scaleX(0)';
    thanksTimer = setTimeout(() => { location.hash = '#/'; }, THANKS_MS);
  }

  /* ---- BUTTONS (delegated) -------------------------------------------- */
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'buy') {
      location.hash = '#/buy';

    } else if (action === 'lead') {
      const src = target.dataset.src || 'crypto';
      location.hash = `#/lead?src=${src}`;

    } else if (action === 'back') {
      // Внутри /buy → шаг назад. Иначе → старт.
      const { path } = parseHash();
      if (path === '/buy') buyBack();
      else                 location.hash = '#/';

    } else if (action === 'select-currency') {
      if (!currentBuy) return;
      currentBuy.currency = target.dataset.value || 'USDT';
      renderBuyStep(2);

    } else if (action === 'select-op') {
      if (!currentBuy) return;
      currentBuy.op = target.dataset.value || 'buy';
      renderBuyStep(3);
    }
  });

  buyNextBtn.addEventListener('click', () => { finishBuy(); });

  submitBtn.addEventListener('click', async () => {
    if (!currentLead || !currentLead.phone) return;
    submitBtn.disabled = true;
    submitBtn.textContent = I18N.t('lead.submitting');

    const payload = {
      phone:      currentLead.phone,
      source:     currentLead.source,
      op:         currentLead.op       || '',
      currency:   currentLead.currency || '',
      amount:     currentLead.amount   || '',
      lang:       (window.I18N && I18N.current) || 'ru',
      userAgent:  navigator.userAgent,
      terminalId: TERMINAL_ID,
      ts:         new Date().toISOString(),
    };

    const ok = await sendLead(payload);
    if (!ok) queueLead(payload);

    submitBtn.textContent = I18N.t('lead.submit');
    location.hash = '#/lead?sent=1';
  });

  /* ---- SEND TO GOOGLE APPS SCRIPT ------------------------------------- */
  async function sendLead(payload) {
    if (!APPS_SCRIPT_URL) {
      console.warn('APPS_SCRIPT_URL не задан — lead не отправлен:', payload);
      return false;
    }
    try {
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
