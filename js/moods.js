// Mood set: 8 drawn faces in the Planik palette, plus helpers for the mood calendar.
import { ymd, addDays, parseYmd, daysInMonth, todayYmd } from './util.js';
import { getState, update } from './store.js';

const INK = '#161513';
const eyesDot = (c = INK, y = 29, dx = 9) => `<circle cx="${32 - dx}" cy="${y}" r="3.4" fill="${c}"/><circle cx="${32 + dx}" cy="${y}" r="3.4" fill="${c}"/>`;
const S = (d, c = INK, w = 3.6) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

// shape + face per mood. Light shapes get an ink face, dark ones a light face.
const ART = {
  joy: `<g fill="#F4D58A">${[0, 45, 90, 135].map((a) => `<rect x="25" y="2" width="14" height="60" rx="7" transform="rotate(${a} 32 32)"/>`).join('')}<circle cx="32" cy="32" r="22"/></g>
    ${S('M21 29q4-5 8 0M35 29q4-5 8 0')}${S('M23 37q9 9 18 0')}<circle cx="19" cy="36" r="3" fill="#F47742" opacity=".55"/><circle cx="45" cy="36" r="3" fill="#F47742" opacity=".55"/>`,
  inspired: `<path fill="#F47742" d="M32 3l6 13 14-5-5 14 14 7-14 6 5 14-14-5-6 13-6-13-14 5 5-14-14-6 14-7-5-14 14 5z"/>
    ${eyesDot(INK, 28, 8)}<circle cx="25.3" cy="26.8" r="1.2" fill="#fff"/><circle cx="41.3" cy="26.8" r="1.2" fill="#fff"/><path d="M24 35h16q0 9-8 9t-8-9z" fill="${INK}"/>`,
  calm: `<circle cx="32" cy="33" r="25" fill="#B4C5F6"/>
    ${S('M20 31q4 4 8 0M36 31q4 4 8 0')}${S('M27 41q5 3 10 0')}`,
  ok: `<rect x="8" y="9" width="48" height="48" rx="16" fill="#CEC7B7"/>
    ${eyesDot(INK, 30, 9)}${S('M25 42h14')}`,
  tired: `<path fill="#F9BE9F" d="M7 40a25 25 0 0 1 50 0v4a12 12 0 0 1-12 12H19A12 12 0 0 1 7 44z"/>
    ${S('M19 38h9M36 38h9')}<ellipse cx="32" cy="48" rx="3.2" ry="3.8" fill="${INK}"/>${S('M47 12h7l-7 8h7', '#8E897E', 2.6)}${S('M40 6h4l-4 5h4', '#8E897E', 2.2)}`,
  anxious: `<path fill="#2D4FC5" d="M32 6c6 0 7 4 12 5s9 3 9 9-3 7-2 12 4 8 0 13-8 3-12 7-5 6-7 6-4-2-7-6-8-2-12-7 0-8 0-13-2-6-2-12 4-8 9-9 6-5 12-5z"/>
    <circle cx="23" cy="29" r="5.2" fill="#fff"/><circle cx="41" cy="29" r="5.2" fill="#fff"/><circle cx="23" cy="29" r="2.4" fill="${INK}"/><circle cx="41" cy="29" r="2.4" fill="${INK}"/>
    ${S('M21 43l4-3 4 3 4-3 4 3 4-3 4 3', '#fff', 3)}`,
  sad: `<path fill="#2B3E8F" d="M32 4C25 16 11 26 11 39a21 21 0 0 0 42 0C53 26 39 16 32 4z"/>
    ${eyesDot('#F8F6F1', 36, 8)}${S('M25 49q7-6 14 0', '#F8F6F1')}`,
  angry: `<path fill="#DE3A4E" d="M32 5l7 9 11-2-1 11 9 7-9 7 1 11-11-2-7 9-7-9-11 2 1-11-9-7 9-7-1-11 11 2z"/>
    ${S('M19 25l8 4M45 25l-8 4', '#fff', 3.4)}<circle cx="24.5" cy="32" r="3" fill="#fff"/><circle cx="39.5" cy="32" r="3" fill="#fff"/>${S('M25 44q7-6 14 0', '#fff')}`
};

/** order on the picker: from bright to heavy */
export const MOODS = [
  { id: 'joy', name: 'Радісно', v: 2, color: '#F4D58A' },
  { id: 'inspired', name: 'Натхненно', v: 2, color: '#F47742' },
  { id: 'calm', name: 'Спокійно', v: 1, color: '#B4C5F6' },
  { id: 'ok', name: 'Нормально', v: 0, color: '#CEC7B7' },
  { id: 'tired', name: 'Втомлено', v: -1, color: '#F9BE9F' },
  { id: 'anxious', name: 'Тривожно', v: -1, color: '#2D4FC5' },
  { id: 'sad', name: 'Сумно', v: -2, color: '#2B3E8F' },
  { id: 'angry', name: 'Злюся', v: -2, color: '#DE3A4E' }
];
export const moodById = (id) => MOODS.find((m) => m.id === id);
export const moodFace = (id, cls = '') => `<svg class="mf ${cls}" viewBox="0 0 64 64" aria-hidden="true">${ART[id] || ART.ok}</svg>`;

/* ---------- storage: state.mood[date] = { am, pm } ---------- */
export const moodsOf = (d) => (getState().mood || {})[d] || {};
/** the mood that represents a day: evening wins over morning */
export const moodOf = (d) => { const m = moodsOf(d); return m.pm || m.am || null; };
export function setMood(d, slot, id) {
  update((s) => {
    s.mood = s.mood || {};
    const m = s.mood[d] || (s.mood[d] = {});
    if (!id || m[slot] === id) delete m[slot]; else m[slot] = id;
    if (!m.am && !m.pm) delete s.mood[d];
  });
}

/** which check-in the home screen asks for right now (null = none) */
export function checkinSlot(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'am';
  if (h >= 18) return 'pm';
  return null;
}
export const SLOT_Q = { am: 'Як ти зранку?', pm: 'Як пройшов день?' };

/* ---------- stats ---------- */
export function moodStats(from, to) {
  const counts = {}; let n = 0, sum = 0;
  const days = [];
  for (let d = parseYmd(from); ymd(d) <= to; d = addDays(d, 1)) {
    const k = ymd(d), m = moodOf(k);
    if (!m) continue;
    days.push({ d: k, m });
    counts[m] = (counts[m] || 0) + 1; n++; sum += moodById(m).v;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, c]) => ({ id, c, ...moodById(id) }));
  const good = days.filter((x) => moodById(x.m).v > 0).length;
  const bad = days.filter((x) => moodById(x.m).v < 0).length;
  // weekday with the lowest average (needs a few points)
  const byWd = Array.from({ length: 7 }, () => ({ s: 0, n: 0 }));
  for (const x of days) { const w = (parseYmd(x.d).getDay() + 6) % 7; byWd[w].s += moodById(x.m).v; byWd[w].n++; }
  let low = null, high = null;
  byWd.forEach((b, i) => {
    if (b.n < 2) return;
    const a = b.s / b.n;
    if (!low || a < low.a) low = { w: i, a };
    if (!high || a > high.a) high = { w: i, a };
  });
  // current run of good days
  let streak = 0;
  for (let d = new Date(); ; d = addDays(d, -1)) { const m = moodOf(ymd(d)); if (!m) { if (ymd(d) === todayYmd()) continue; break; } if (moodById(m).v > 0) streak++; else break; }
  return { n, avg: n ? sum / n : 0, counts, top, good, bad, low, high, streak, days };
}

const WD_LOC = ['у понеділки', 'у вівторки', 'у середи', 'у четверги', 'у пʼятниці', 'у суботи', 'у неділі'];

/** a gentle observation (not advice) about a period: { title, text, tone } */
export function moodInsight(st, span = 'місяць') {
  if (!st.n) return { title: 'Ще порожньо', text: 'Відмічай настрій зранку чи ввечері, і тут зʼявиться картина твого місяця.', tone: 'ok' };
  if (st.n < 4) return { title: 'Перші відмітки є', text: 'Ще кілька днів, і стане видно, що тебе тішить, а що виснажує.', tone: 'calm' };
  const share = st.good / st.n, badShare = st.bad / st.n, top = st.top[0];
  if (share >= .6) return { title: 'Багато світлих днів!', text: `${Math.round(share * 100)} % відмічених днів були добрими. Круто, що так.`, tone: 'joy' };
  if (top && top.id === 'tired' && top.c / st.n >= .35) return { title: 'Втома часто поруч', text: 'Втома — найчастіша відмітка цього разу. Як думаєш, що забирає найбільше сил?', tone: 'tired' };
  if (top && top.id === 'anxious' && top.c / st.n >= .3) return { title: 'Багато тривоги', text: 'Тривожних днів немало. Може, є щось одне, що найбільше не дає спокою?', tone: 'anxious' };
  if (badShare >= .5) return { title: 'Щось засмучує тебе', text: `Важких днів за ${span} більше, ніж легких. Як гадаєш, що це може бути?`, tone: 'sad' };
  if (st.low && st.high && st.low.w !== st.high.w && st.high.a - st.low.a >= 1.5) return { title: 'Є закономірність', text: `Найважче тобі ${WD_LOC[st.low.w]}, найлегше — ${WD_LOC[st.high.w]}. Цікаво, чому так?`, tone: 'calm' };
  if (st.streak >= 3) return { title: `${st.streak} добрих дні поспіль`, text: 'Хороша смуга. Що допомагає її тримати?', tone: 'inspired' };
  return { title: 'Рівно, з різними днями', text: 'Добрих і важких днів приблизно порівну. Так буває в більшості людей.', tone: 'ok' };
}

/** month grid data for a mood calendar */
export function monthCells(y, m) {
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) { const k = ymd(new Date(y, m, d)); cells.push({ k, d, m: moodOf(k) }); }
  return cells;
}
