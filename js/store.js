// App state, persistence, recurrence and reminder logic.
import { ymd, parseYmd, todayYmd, addDays, daysInMonth, diffDays, atTime, uid } from './util.js';

const KEY = 'planik:v1';

export const PALETTE = {
  butter: '#F4D58A', cobalt: '#2D4FC5', tangerine: '#F47742', peach: '#F9BE9F',
  ink: '#161513', red: '#DE3A4E', navy: '#182766', sky: '#B4C5F6', stone: '#CEC7B7'
};
/** Text color that reads on top of each palette color */
export const ON = { butter: '#161513', cobalt: '#F8F6F1', tangerine: '#161513', peach: '#161513', ink: '#F8F6F1', red: '#FFF6EE', navy: '#F8F6F1', sky: '#161513', stone: '#161513' };
/** 1.2: palette changed; old color keys map onto the new ones */
const OLD_COLOR = { lime: 'butter', forest: 'cobalt', orange: 'tangerine', pink: 'peach', mustard: 'navy', lilac: 'sky', sand: 'stone' };
const fixColor = (c) => OLD_COLOR[c] || c;

export const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Робота', color: 'cobalt', icon: 'briefcase' },
  { id: 'home', name: 'Дім', color: 'tangerine', icon: 'house' },
  { id: 'health', name: 'Здоровʼя', color: 'butter', icon: 'heart' },
  { id: 'personal', name: 'Особисте', color: 'peach', icon: 'star' },
  { id: 'study', name: 'Навчання', color: 'sky', icon: 'book' },
  { id: 'buy', name: 'Покупки', color: 'navy', icon: 'cart' },
  { id: 'meet', name: 'Зустрічі', color: 'ink', icon: 'chat' },
  { id: 'other', name: 'Інше', color: 'stone', icon: 'spark' }
];

export const BIRTHDAY_COLOR = 'red';

export const REMIND_CHOICES = {
  birthday: [0, 1440, 4320, 10080, 20160, 43200],
  important: [5, 15, 30, 60, 180, 1440, 4320, 10080],
  normal: [0, 5, 10, 15, 30, 60, 1440]
};

function defaults() {
  const t = todayYmd();
  return {
    v: 1,
    user: { name: '', photo: '', onboarded: false },
    settings: {
      remind: { birthday: [10080, 1440], important: [1440, 60], normal: [15] },
      badge: true,
      view: 'grid',
      theme: 'auto',
      importantHorizon: 14
    },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    events: [],
    trackers: [
      { id: uid(), name: 'Не їм солодке', icon: 'candy', color: 'peach', mode: 'without', unit: 'days', goal: 30, start: t, end: '', auto: true, log: [], relapses: [], pinned: true, created: Date.now() },
      { id: uid(), name: 'Сходив у зал', icon: 'dumbbell', color: 'butter', mode: 'with', unit: 'times', goal: 12, start: t, end: '', auto: false, log: [], relapses: [], pinned: false, created: Date.now() + 1 }
    ],
    inbox: { read: {} },
    stories: { seen: {} },
    mood: {},
    money: { cur: '₴', start: null, ops: [], cats: [], limits: {}, recs: [], jars: [] },
    wheel: {},
    oracle: {},
    app: { seen: '' }
  };
}

let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const s = JSON.parse(raw);
    const d = defaults();
    // shallow migration: fill anything new
    const out = {
      ...d, ...s,
      user: { ...d.user, ...s.user },
      settings: { ...d.settings, ...s.settings, remind: { ...d.settings.remind, ...(s.settings || {}).remind } },
      inbox: { ...d.inbox, ...s.inbox },
      stories: { ...d.stories, ...s.stories },
      mood: { ...(s.mood || {}) },
      money: { ...d.money, ...(s.money || {}) },
      wheel: { ...(s.wheel || {}) },
      oracle: { ...(s.oracle || {}) },
      app: { ...d.app, ...(s.app || {}) }
    };
    // 1.1 → 1.2: color keys renamed with the new palette
    for (const c of out.categories || []) c.color = fixColor(c.color);
    for (const t of out.trackers || []) t.color = fixColor(t.color);
    return out;
  } catch (e) {
    return defaults();
  }
}

export const getState = () => state;

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
  subs.forEach((fn) => fn(state));
}

export function update(fn) { fn(state); save(); }
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

export function resetAll() { localStorage.removeItem(KEY); state = defaults(); save(); }
export function importState(obj) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.events)) throw new Error('Це не схоже на резервну копію Planik');
  localStorage.setItem(KEY, JSON.stringify(obj));
  state = load();
  save();
}
export const exportState = () => JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 1);

/* ---------- categories ---------- */
export const catById = (id) => state.categories.find((c) => c.id === id) || state.categories[state.categories.length - 1] || DEFAULT_CATEGORIES[7];
export function colorOf(ev) {
  if (ev.important) return 'red';
  if (ev.kind === 'birthday') return BIRTHDAY_COLOR;
  return catById(ev.cat).color;
}

/* ---------- recurrence ---------- */
export function occursOn(ev, d) {
  if (ev.skip && ev.skip.includes(d)) return false;
  if (d < ev.date) return false;
  if (ev.until && d > ev.until) return false;
  const rep = ev.kind === 'birthday' ? 'yearly' : (ev.repeat || 'none');
  if (rep === 'none') return d === ev.date || (ev.endDate && d <= ev.endDate);
  const a = parseYmd(ev.date), b = parseYmd(d);
  switch (rep) {
    case 'daily': return true;
    case 'weekdays': { const w = b.getDay(); return w !== 0 && w !== 6; }
    case 'days': return (ev.days || []).includes((b.getDay() + 6) % 7);
    case 'weekly': return diffDays(a, b) % 7 === 0;
    case 'biweekly': return diffDays(a, b) % 14 === 0;
    case 'monthly': {
      const want = Math.min(a.getDate(), daysInMonth(b.getFullYear(), b.getMonth()));
      return b.getDate() === want;
    }
    case 'yearly': {
      if (b.getMonth() !== a.getMonth()) return false;
      const want = Math.min(a.getDate(), daysInMonth(b.getFullYear(), b.getMonth()));
      return b.getDate() === want;
    }
    default: return false;
  }
}

function sortEvents(list) {
  return list.sort((x, y) => {
    const ax = x.allDay || !x.start ? 0 : 1, ay = y.allDay || !y.start ? 0 : 1;
    if (ax !== ay) return ax - ay;
    if ((x.start || '') !== (y.start || '')) return (x.start || '').localeCompare(y.start || '');
    return (y.important ? 1 : 0) - (x.important ? 1 : 0);
  });
}

/** events happening on a given day, as [{ev, date}] */
export function eventsOn(d) {
  return sortEvents(state.events.filter((e) => occursOn(e, d))).map((ev) => ({ ev, date: d }));
}

/** occurrences between two dates inclusive */
export function occurrences(from, to, filter = () => true) {
  const out = [];
  let cur = parseYmd(from);
  const end = parseYmd(to);
  const list = state.events.filter(filter);
  while (cur <= end) {
    const d = ymd(cur);
    for (const ev of list) if (occursOn(ev, d)) out.push({ ev, date: d });
    cur = addDays(cur, 1);
  }
  return out;
}

export const isDone = (ev, date) => !!(ev.doneDates && ev.doneDates.includes(date));
export const isCancelled = (ev, date) => !!(ev.cancelled && ev.cancelled.includes(date));
export function toggleCancel(id, date) {
  update((s) => {
    const ev = s.events.find((e) => e.id === id); if (!ev) return;
    ev.cancelled = ev.cancelled || [];
    const i = ev.cancelled.indexOf(date);
    if (i >= 0) ev.cancelled.splice(i, 1); else ev.cancelled.push(date);
    if (!ev.cancelled.length) delete ev.cancelled;
  });
}
/** start and end of one occurrence; no end = one hour, end before start = runs past midnight */
export function occSpan(ev, date) {
  if (ev.allDay || !ev.start) return { s: atTime(date, '00:00'), e: atTime(ymd(addDays(parseYmd(date), 1)), '00:00'), allDay: true };
  const s = atTime(date, ev.start);
  let e = ev.end ? atTime(date, ev.end) : new Date(s.getTime() + 3600000);
  if (e <= s) e = ev.end ? new Date(e.getTime() + 86400000) : new Date(s.getTime() + 3600000);
  return { s, e, allDay: false };
}
/**
 * Status of one occurrence, like Google Calendar:
 * cancelled → «Скасовано»; done task → «Виконано»; now inside the time → «В процесі»;
 * already over → «Завершено»; otherwise «Заплановано». Birthdays have none.
 */
export function occStatus(ev, date, now = new Date()) {
  if (isCancelled(ev, date)) return { id: 'cancelled' };
  if (ev.kind === 'birthday') return { id: 'none' };
  if (ev.kind === 'task' && isDone(ev, date)) return { id: 'done' };
  const { s, e, allDay } = occSpan(ev, date);
  if (now >= e) return { id: ev.kind === 'task' ? 'missed' : 'past' };
  if (now >= s) return allDay ? { id: 'today' } : { id: 'active', p: (now - s) / (e - s), s, e };
  return { id: 'planned' };
}
export const STATUS_LABEL = { planned: 'Заплановано', active: 'В процесі', past: 'Завершено', done: 'Виконано', cancelled: 'Скасовано', missed: 'Не виконано', today: 'Сьогодні' };
export function toggleDone(id, date) {
  update((s) => {
    const ev = s.events.find((e) => e.id === id);
    if (!ev) return;
    ev.doneDates = ev.doneDates || [];
    const i = ev.doneDates.indexOf(date);
    if (i >= 0) ev.doneDates.splice(i, 1); else ev.doneDates.push(date);
    // a recurring payment ticked in the calendar becomes an expense in Money
    if (ev.pay && i < 0) setTimeout(() => window.dispatchEvent(new CustomEvent('planik:paid', { detail: { rec: ev.pay, date } })), 0);
    if (ev.cat === 'buy' && ev.amount > 0 && i < 0) setTimeout(() => window.dispatchEvent(new CustomEvent('planik:bought', { detail: { id: ev.id, date } })), 0);
    // a task planned from a checklist item ticks that item too
    if (ev.link) {
      const parent = s.events.find((e) => e.id === ev.link.ev);
      const item = parent && (parent.checklist || []).find((c) => c.id === ev.link.item);
      if (item) item.done = i < 0;
    }
  });
}

/** the moment an occurrence "happens" — all-day items count from 09:00 */
export const occTime = (ev, date) => atTime(date, ev.allDay || !ev.start ? '09:00' : ev.start);

export function reminderOffsets(ev) {
  if (Array.isArray(ev.remind)) return ev.remind;
  const r = state.settings.remind;
  if (ev.kind === 'birthday') return r.birthday;
  if (ev.important) return r.important;
  return r.normal;
}

/* ---------- events CRUD ---------- */
export function saveEvent(ev) {
  update((s) => {
    const i = s.events.findIndex((e) => e.id === ev.id);
    if (i >= 0) s.events[i] = ev; else s.events.push(ev);
  });
}
export function deleteEvent(id, onlyDate) {
  update((s) => {
    const ev = s.events.find((e) => e.id === id);
    if (!ev) return;
    if (onlyDate) { ev.skip = ev.skip || []; ev.skip.push(onlyDate); }
    else s.events = s.events.filter((e) => e.id !== id);
  });
}
export const eventById = (id) => state.events.find((e) => e.id === id);

/* ---------- the "important soon" banner ---------- */
export function nextImportant() {
  const from = todayYmd();
  const to = ymd(addDays(new Date(), state.settings.importantHorizon || 14));
  const now = new Date();
  const list = occurrences(from, to, (e) => e.important)
    .filter(({ ev, date }) => !isDone(ev, date) && !isCancelled(ev, date) && (ev.allDay || !ev.start ? true : occTime(ev, date) > now));
  return list[0] || null;
}

/* ---------- trackers ---------- */
export function trackerCount(t) {
  if (t.mode === 'without' && t.auto) return Math.max(0, diffDays(parseYmd(trackerFrom(t)), new Date()));
  return t.log.length;
}
export function trackerStreak(t) {
  if (t.mode === 'without' && t.auto) return trackerCount(t);
  const set = new Set(t.log);
  let n = 0, d = new Date();
  if (!set.has(ymd(d))) d = addDays(d, -1);
  while (set.has(ymd(d))) { n++; d = addDays(d, -1); }
  return n;
}
export const trackerDoneToday = (t) => t.log.includes(todayYmd());

/** for auto-counted trackers: the date the current run started */
export const trackerFrom = (t) => (t.relapses && t.relapses.length ? t.relapses[t.relapses.length - 1] : t.start);
/** set how many days the current run already lasts (moves its start date) */
export function setTrackerDays(t, n) {
  const from = ymd(addDays(new Date(), -Math.max(0, n)));
  if (t.relapses && t.relapses.length) t.relapses[t.relapses.length - 1] = from;
  else t.start = from;
}

/* ---------- inbox / notifications ---------- */
export function inboxItems(now = new Date()) {
  const items = [];
  const today = todayYmd();
  const from = ymd(addDays(now, -30));
  const to = ymd(addDays(now, 45));
  const occ = occurrences(from, to);

  for (const { ev, date } of occ) {
    if (isCancelled(ev, date)) continue;
    const when = occTime(ev, date);
    const endOfOcc = ev.allDay || !ev.start ? atTime(date, '23:59') : atTime(date, ev.end || ev.start);
    // overdue tasks
    if (ev.kind === 'task' && !isDone(ev, date) && endOfOcc < now && date >= from) {
      items.push({ id: `over|${ev.id}|${date}`, type: 'overdue', ev, date, at: endOfOcc });
      continue;
    }
    if (endOfOcc < now) continue;
    // reminders: pick the most recent offset that already fired
    const offs = [...reminderOffsets(ev)].sort((a, b) => a - b);
    const fired = offs.find((m) => new Date(when - m * 60000) <= now);
    if (fired !== undefined && !isDone(ev, date)) {
      items.push({ id: `rem|${ev.id}|${date}|${fired}`, type: ev.kind === 'birthday' ? 'birthday' : (ev.important ? 'important' : 'remind'), ev, date, at: new Date(when - fired * 60000), offset: fired });
    }
  }
  for (const t of state.trackers) {
    const c = trackerCount(t);
    if (t.goal && c >= t.goal) items.push({ id: `goal|${t.id}|${t.goal}`, type: 'goal', tracker: t, at: now });
    if (t.end && t.end <= today) items.push({ id: `end|${t.id}|${t.end}`, type: 'trackerEnd', tracker: t, at: atTime(t.end, '09:00') });
  }
  // planned money operations: a note on their day
  for (const o of (state.money && state.money.ops) || []) {
    if (o.plan && o.d <= today && o.d >= from) items.push({ id: `money|${o.id}`, type: 'moneyDue', op: o, at: atTime(o.d, '09:00') });
  }
  // balance wheel: from the 25th, if this month has none yet
  if (now.getDate() >= 25 && !(state.wheel || {})[ymd(now).slice(0, 7)]) {
    items.push({ id: `wheel|${ymd(now).slice(0, 7)}`, type: 'wheel', at: new Date(now.getFullYear(), now.getMonth(), 25, 10, 0) });
  }
  return items.sort((a, b) => b.at - a.at);
}

export const unreadCount = () => inboxItems().filter((i) => !state.inbox.read[i.id]).length;
export function markAllRead() {
  update((s) => { for (const i of inboxItems()) s.inbox.read[i.id] = Date.now(); pruneRead(s); });
}
export function markRead(id) { update((s) => { s.inbox.read[id] = Date.now(); }); }
function pruneRead(s) {
  const cutoff = Date.now() - 90 * 86400000;
  for (const k of Object.keys(s.inbox.read)) if (s.inbox.read[k] < cutoff) delete s.inbox.read[k];
}
