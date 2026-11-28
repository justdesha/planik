// Small helpers: dates, Ukrainian words, escaping, ids.

export const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
export const MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
export const WEEKDAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя'];
export const WD_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' for a Date in local time */
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayYmd = () => ymd(new Date());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); return x; };
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
/** Monday = 0 … Sunday = 6 */
export const wd = (d) => (d.getDay() + 6) % 7;
export const sameDay = (a, b) => ymd(a) === ymd(b);
export const diffDays = (a, b) => Math.round((parseYmd(ymd(b)) - parseYmd(ymd(a))) / 86400000);

/** Date + 'HH:MM' → Date */
export const atTime = (dateStr, time) => {
  const d = parseYmd(dateStr);
  if (time) { const [h, m] = time.split(':').map(Number); d.setHours(h, m, 0, 0); }
  return d;
};

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
export const pDays = (n) => `${n} ${plural(n, 'день', 'дні', 'днів')}`;
export const pTimes = (n) => `${n} ${plural(n, 'раз', 'рази', 'разів')}`;

export function humanDate(dateStr, { withWeekday = false } = {}) {
  const d = parseYmd(dateStr);
  const t = new Date();
  const dd = diffDays(t, d);
  let rel = '';
  if (dd === 0) rel = 'Сьогодні';
  else if (dd === 1) rel = 'Завтра';
  else if (dd === -1) rel = 'Вчора';
  const base = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  if (rel) return `${rel}, ${base}`;
  return withWeekday ? `${WEEKDAYS[wd(d)]}, ${base}` : base;
}

export function inWords(mins) {
  if (mins < 60) return `${mins} хв`;
  if (mins < 1440) { const h = Math.round(mins / 60); return `${h} год`; }
  if (mins % 10080 === 0) { const w = mins / 10080; return `${w} ${plural(w, 'тиждень', 'тижні', 'тижнів')}`; }
  if (mins >= 43200 && mins % 43200 === 0) { const m = mins / 43200; return `${m} ${plural(m, 'місяць', 'місяці', 'місяців')}`; }
  return pDays(Math.round(mins / 1440));
}

/** "через 3 дні" / "через 2 год" / "зараз" */
export function untilText(date) {
  const ms = date - new Date();
  if (ms < 0) return 'вже минуло';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'зараз';
  if (mins < 60) return `через ${mins} хв`;
  const h = Math.round(mins / 60);
  if (h < 24) return `через ${h} год`;
  const d = Math.round(h / 24);
  return `через ${pDays(d)}`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/*
 * Haptics. Android: the Vibration API. iPhone has no vibration API for web apps, but toggling a
 * native switch (<input type="checkbox" switch>, iOS 18+) gives a real Taptic tick. Two ways to
 * toggle it are kept, because WebKit has changed which one it honours; the profile has a test
 * screen to see which works on a given phone, and the choice is remembered.
 */
export const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canVibrate = () => typeof navigator.vibrate === 'function';

// way A: a throw-away hidden label in <head>, clicked and removed (the common "ios-haptics" trick)
function tickA() {
  const l = document.createElement('label');
  l.setAttribute('aria-hidden', 'true');
  l.style.display = 'none';
  const i = document.createElement('input');
  i.type = 'checkbox'; i.setAttribute('switch', '');
  l.append(i);
  (document.head || document.body).append(l);
  l.click();
  l.remove();
}
// way B: a real switch kept in the page, toggled through its label
let keptLabel = null;
function tickB() {
  if (!keptLabel) {
    keptLabel = document.createElement('label');
    keptLabel.setAttribute('aria-hidden', 'true');
    keptLabel.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:.01;overflow:hidden;z-index:-1';
    const i = document.createElement('input');
    i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
    keptLabel.append(i);
    keptLabel.addEventListener('click', (e) => e.stopPropagation());
    i.addEventListener('change', (e) => e.stopPropagation());
    document.body.append(keptLabel);
  }
  const prev = document.activeElement;
  keptLabel.click();
  if (prev && prev !== document.body && prev !== document.activeElement && prev.focus) prev.focus({ preventScroll: true });
}
export const HAPTIC_WAYS = { a: tickA, b: tickB, vibrate: () => navigator.vibrate && navigator.vibrate(30) };
const way = () => { try { return localStorage.getItem('planik:haptic') || 'auto'; } catch (e) { return 'auto'; } };
export const setHapticWay = (w) => { try { localStorage.setItem('planik:haptic', w); } catch (e) { /* ignore */ } };

function tick(ms) {
  const w = way();
  if (w === 'off') return;
  if (w === 'a' || w === 'b') return HAPTIC_WAYS[w]();
  if (w === 'vibrate') return navigator.vibrate && navigator.vibrate(ms);
  // auto: on iPhone always the switch trick (navigator.vibrate may exist there but do nothing)
  if (isIOS()) return tickA();
  if (canVibrate()) navigator.vibrate(ms);
}
export function haptic(ms = 8) { try { tick(ms); } catch (e) { /* no haptics here */ } }
/** a rhythm: ticks at the given moments (ms from now) */
export function hapticPattern(times, len = 12) {
  try {
    if (!isIOS() && canVibrate() && way() !== 'a' && way() !== 'b') {
      const pat = []; let prev = 0;
      times.forEach((t, i) => { if (i) pat.push(Math.max(10, t - prev - len)); pat.push(len); prev = t; });
      navigator.vibrate(pat);
    } else times.forEach((t) => (t ? setTimeout(() => tick(len), t) : tick(len)));
  } catch (e) { /* no haptics here */ }
}

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
