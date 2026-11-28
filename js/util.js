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
 * Haptics. Android: the Vibration API. iPhone has no such API for web apps, but since iOS 18
 * toggling a native switch (<input type="checkbox" switch>) gives a real Taptic tick —
 * we toggle a hidden one. Older iPhones simply stay silent.
 */
let hapticLabel = null;
function iosTick() {
  if (!hapticLabel) {
    hapticLabel = document.createElement('label');
    hapticLabel.setAttribute('aria-hidden', 'true');
    hapticLabel.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    const i = document.createElement('input');
    i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
    hapticLabel.append(i);
    hapticLabel.addEventListener('click', (e) => e.stopPropagation());
    i.addEventListener('change', (e) => e.stopPropagation());
    document.body.append(hapticLabel);
  }
  // a label click moves focus to the switch; give it back so a typed field keeps its keyboard
  const prev = document.activeElement;
  hapticLabel.click();
  if (prev && prev !== document.body && prev !== document.activeElement && prev.focus) prev.focus({ preventScroll: true });
}
const canVibrate = () => typeof navigator.vibrate === 'function';
export function haptic(ms = 8) {
  try { if (canVibrate()) navigator.vibrate(ms); else iosTick(); } catch (e) { /* no haptics here */ }
}
/** a rhythm: ticks at the given moments (ms from now); on Android each tick lasts `len` */
export function hapticPattern(times, len = 12) {
  try {
    if (canVibrate()) {
      const pat = []; let prev = 0;
      times.forEach((t, i) => { if (i) pat.push(Math.max(10, t - prev - len)); pat.push(len); prev = t; });
      navigator.vibrate(pat);
    } else times.forEach((t) => (t ? setTimeout(iosTick, t) : iosTick()));
  } catch (e) { /* no haptics here */ }
}

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
