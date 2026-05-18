/* Цифровая клавиатура с двумя режимами:
   - phone:  +7 (___) ___-__-__, до 10 цифр после +7
   - amount: число в рублях, до 9 цифр, форматирование "12 345 ₽"
   Использование:
     Numpad.bind(inputElement, { mode: 'phone', onChange: (state) => {...} });
     Numpad.open(); / Numpad.close(); / Numpad.reset(); / Numpad.unbind();
*/
(function () {
  const root = document.getElementById('keyboard');
  const grid = root.querySelector('.keyboard__grid');

  const MODES = {
    phone: {
      max: 10,
      format(raw) {
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
      },
      valueOf(raw) { return raw.length === 10 ? '+7' + raw : null; },
      isComplete(raw) { return raw.length === 10; },
      acceptDigit(raw, d) { return raw.length < 10; },
    },
    amount: {
      max: 9,
      format(raw) {
        if (!raw) return '0 ₽';
        return raw.replace(/(\d)(?=(\d{3})+$)/g, '$1 ') + ' ₽';
      },
      valueOf(raw) { return raw ? parseInt(raw, 10) : 0; },
      isComplete(raw) { return !!raw && parseInt(raw, 10) >= 100; },
      acceptDigit(raw, d) {
        if (raw.length >= 9) return false;
        if (raw === '' && d === '0') return false;   // запрет ведущего нуля
        return true;
      },
    },
  };

  let mode = MODES.phone;
  let digits = '';
  let target = null;
  let listener = null;

  function emit() {
    const display = mode.format(digits);
    const value = mode.valueOf(digits);
    const complete = mode.isComplete(digits);
    if (target) target.value = display;
    if (listener) listener({ display, raw: digits, complete, value });
  }

  function bind(input, opts) {
    target = input;
    mode = MODES[opts && opts.mode] || MODES.phone;
    digits = '';
    listener = (opts && opts.onChange) || null;
    emit();
  }

  function unbind() {
    target = null;
    listener = null;
    digits = '';
  }

  function press(key) {
    if (/^\d$/.test(key)) {
      if (mode.acceptDigit(digits, key)) {
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

  function open()  { root.classList.add('is-open');    root.setAttribute('aria-hidden', 'false'); }
  function close() { root.classList.remove('is-open'); root.setAttribute('aria-hidden', 'true'); }
  function reset() { digits = ''; emit(); }

  window.Numpad = { bind, unbind, open, close, reset, isOpen: () => root.classList.contains('is-open') };
})();
