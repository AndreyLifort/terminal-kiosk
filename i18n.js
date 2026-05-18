/* Простейший i18n: словарь + applyLang(). Глобальный объект I18N. */
(function () {
  const STORAGE_KEY = 'lang_v1';

  const dict = {
    ru: {
      'start.title':        'Что вас интересует?',
      'start.subtitle':     'Коснитесь нужного действия на экране',
      'start.crypto.title': 'Купить криптовалюту',
      'start.crypto.desc':  'USDT — за наличные рубли',
      'start.ai.title':     'Оплатить нейросети',
      'start.ai.desc':      'ChatGPT, Midjourney и другие сервисы',
      'start.hint':         'Безопасно · Анонимно · Быстро',

      'quiz.step':              'Шаг',
      'quiz.of':                'из',
      'quiz.next':              'Далее',

      'buy.currency.title':     'Выберите валюту',
      'buy.currency.subtitle':  'Пока доступен только USDT — Tether',
      'buy.currency.usdt.desc': 'Tether — стейблкоин 1:1 к доллару США',

      'buy.op.title':           'Выберите тип операции',
      'buy.op.subtitle':        'Что вы хотите сделать?',
      'buy.op.buy.title':       'Покупка',
      'buy.op.buy.desc':        'Внести рубли → получить USDT',
      'buy.op.sell.title':      'Продажа',
      'buy.op.sell.desc':       'Передать USDT → получить рубли',

      'buy.amount.title':       'Введите сумму',
      'buy.amount.subtitle':    'Сумма операции в рублях',
      'buy.amount.label':       'Сумма, ₽',
      'buy.amount.hint':        'Минимум 100 ₽',

      'lead.back':          'Назад',
      'lead.badge':         'Скоро запуск',
      'lead.title':         'Совсем скоро — здесь!',
      'lead.subtitle':      'Мы готовим эту услугу прямо сейчас, чтобы вы могли пользоваться ею удобно и без лишних шагов. Оставьте номер — и мы первым делом сообщим вам, как только всё будет готово.',
      'lead.phoneLabel':    'Ваш номер телефона',
      'lead.submit':        'Оставить номер',
      'lead.submitting':    'Отправляем…',

      'thanks.title':       'Спасибо! Номер записан.',
      'thanks.subtitle':    'Мы обязательно оповестим вас, как только этот функционал станет доступен. До скорой встречи!',
      'thanks.footnote':    'Возвращаемся на главный экран…',
    },
    en: {
      'start.title':        'What can we help with?',
      'start.subtitle':     'Tap the option you need',
      'start.crypto.title': 'Buy cryptocurrency',
      'start.crypto.desc':  'USDT — for cash in rubles',
      'start.ai.title':     'Pay for AI services',
      'start.ai.desc':      'ChatGPT, Midjourney and other apps',
      'start.hint':         'Secure · Anonymous · Fast',

      'quiz.step':              'Step',
      'quiz.of':                'of',
      'quiz.next':              'Next',

      'buy.currency.title':     'Choose a currency',
      'buy.currency.subtitle':  'Only USDT is available for now',
      'buy.currency.usdt.desc': 'Tether — a stablecoin pegged 1:1 to the US dollar',

      'buy.op.title':           'Choose operation type',
      'buy.op.subtitle':        'What do you want to do?',
      'buy.op.buy.title':       'Buy',
      'buy.op.buy.desc':        'Insert rubles → receive USDT',
      'buy.op.sell.title':      'Sell',
      'buy.op.sell.desc':       'Send USDT → receive rubles',

      'buy.amount.title':       'Enter the amount',
      'buy.amount.subtitle':    'Operation amount in rubles',
      'buy.amount.label':       'Amount, ₽',
      'buy.amount.hint':        'Minimum 100 ₽',

      'lead.back':          'Back',
      'lead.badge':         'Coming soon',
      'lead.title':         'Coming very soon!',
      'lead.subtitle':      'We are getting this service ready so you can use it without any extra steps. Leave your number — we will let you know first as soon as it goes live.',
      'lead.phoneLabel':    'Your phone number',
      'lead.submit':        'Submit number',
      'lead.submitting':    'Sending…',

      'thanks.title':       'Thanks! Your number is saved.',
      'thanks.subtitle':    'We will reach out as soon as this functionality becomes available. See you soon!',
      'thanks.footnote':    'Returning to the home screen…',
    },
  };

  let current = (function readSaved() {
    try { return localStorage.getItem(STORAGE_KEY) || 'ru'; } catch { return 'ru'; }
  })();
  if (!dict[current]) current = 'ru';

  function t(key) {
    return (dict[current] && dict[current][key]) || (dict.ru[key]) || key;
  }

  function apply(lang) {
    if (!dict[lang]) lang = 'ru';
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', t(key));
    });

    // переключатель в topbar
    document.querySelectorAll('.lang-switch__btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.lang === lang);
    });
  }

  function init() {
    apply(current);
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-switch__btn');
      if (!btn) return;
      apply(btn.dataset.lang);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.I18N = { t, apply, get current() { return current; } };
})();
