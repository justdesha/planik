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

export function haptic(ms = 8) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* iOS ignores */ } }

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
