/* Цифровая клавиатура для ввода телефона.
   Глобальный объект Numpad: open(), close(), onChange(cb), reset(). */
(function () {
  const MAX_DIGITS = 10;            // 10 цифр после +7
  const TEMPLATE = "+7 (___) ___-__-__";

  const root = document.getElementById('keyboard');
  const grid = root.querySelector('.keyboard__grid');

  let digits = '';
  let listeners = [];

  function format(raw) {
    let out = '+7 (';
    const slots = [3, 3, 2, 2];
    let i = 0;
    for (let s = 0; s < slots.length; s++) {
      const len = slots[s];
      const part = raw.slice(i, i + len);
      const pad = '_'.repeat(len - part.length);
      out += part + pad;
      i += len;
      if (s === 0) out += ') ';
      else if (s === 1) out += '-';
      else if (s === 2) out += '-';
    }
    return out;
  }

  function emit() {
    const value = format(digits);
    const complete = digits.length === MAX_DIGITS;
    const e164 = complete ? '+7' + digits : null;
    listeners.forEach(cb => cb({ display: value, raw: digits, complete, e164 }));
  }

  function press(key) {
    if (/^\d$/.test(key)) {
      if (digits.length < MAX_DIGITS) {
        digits += key;
        emit();
      }
    } else if (key === 'del') {
      if (digits.length > 0) {
        digits = digits.slice(0, -1);
        emit();
      }
    } else if (key === 'hide') {
      close();
    }
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    press(btn.dataset.key);
  });

  function open() {
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
  }
  function close() {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
  }
  function reset() {
    digits = '';
    emit();
  }
  function onChange(cb) {
    listeners.push(cb);
    cb({ display: format(digits), raw: digits, complete: false, e164: null });
  }

  window.Numpad = { open, close, reset, onChange, isOpen: () => root.classList.contains('is-open') };
})();
