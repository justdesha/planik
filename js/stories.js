// Weekly & monthly summary stories: how full life was, a quick quiz, the busiest day.
import { MONTHS, MONTHS_GEN, WEEKDAYS, ymd, parseYmd, addDays, addMonths, daysInMonth, wd, esc, plural, pDays, haptic, todayYmd } from './util.js';
import { getState, update, occurrences, isDone, catById, trackerStreak } from './store.js';
import { ui, sticker } from './icons.js';
import { moodSlide } from './moodui.js';
import { moodStats } from './moods.js';

const SLIDE_MS = 6500;

/* ---------------- periods ---------------- */
function weekPeriod(offset) {
  const now = new Date();
  const start = addDays(now, -wd(now) + offset * 7);
  const end = addDays(start, 6);
  const a = ymd(start), b = ymd(end);
  const label = offset === 0 ? 'Цей тиждень' : offset === -1 ? 'Минулий тиждень' : rangeShort(start, end);
  return { id: `w-${a}`, kind: 'week', from: a, to: b, label, current: offset === 0, days: 7, offset };
}
function monthPeriod(offset) {
  const m = addMonths(new Date(), offset);
  const a = ymd(m), b = ymd(new Date(m.getFullYear(), m.getMonth(), daysInMonth(m.getFullYear(), m.getMonth())));
  return { id: `m-${a.slice(0, 7)}`, kind: 'month', from: a, to: b, label: MONTHS[m.getMonth()], current: offset === 0, days: daysInMonth(m.getFullYear(), m.getMonth()), offset, month: m.getMonth() };
}
function rangeShort(a, b) {
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[a.getMonth()].slice(0, 4)}.`
    : `${a.getDate()} ${MONTHS_GEN[a.getMonth()].slice(0, 3)}. – ${b.getDate()} ${MONTHS_GEN[b.getMonth()].slice(0, 3)}.`;
}
const prevOf = (p) => (p.kind === 'week' ? weekPeriod(p.offset - 1) : monthPeriod(p.offset - 1));
const nextOf = (p) => (p.kind === 'week' ? weekPeriod(p.offset + 1) : monthPeriod(p.offset + 1));

/** bubbles shown on Pulse: this week, past weeks with plans, this month, past months with plans */
/** a period has something to tell: plans, moods (and later money) */
const hasData = (p) => occurrences(p.from, p.to).length > 0 || moodStats(p.from, p.to).n > 0 || extraData(p);
let extraData = () => false;
export const setExtraData = (fn) => { extraData = fn; };
let extraSlides = () => [];
export const setExtraSlides = (fn) => { extraSlides = fn; };

export function storyPeriods() {
  const list = [weekPeriod(0)];
  for (let i = -1; i >= -4; i--) { const p = weekPeriod(i); if (hasData(p)) list.push(p); }
  list.push(monthPeriod(0));
  for (let i = -1; i >= -3; i--) { const p = monthPeriod(i); if (hasData(p)) list.push(p); }
  return list;
}

/** a finished period worth announcing on the home screen */
export function freshStory() {
  const seen = getState().stories.seen;
  const now = new Date();
  const lastWeek = weekPeriod(-1);
  if (wd(now) <= 2 && !seen[lastWeek.id] && hasData(lastWeek)) return lastWeek;
  const lastMonth = monthPeriod(-1);
  if (now.getDate() <= 7 && !seen[lastMonth.id] && hasData(lastMonth)) return lastMonth;
  return null;
}

export const isSeen = (p) => !!getState().stories.seen[p.id];

/* ---------------- numbers ---------------- */
function groupKey(ev) { return ev.kind === 'birthday' ? 'bday' : ev.cat; }
function groupInfo(key) {
  if (key === 'bday') return { name: 'Дні народження', color: 'red', icon: 'gift' };
  const c = catById(key);
  return { name: c.name, color: c.color, icon: c.icon };
}

function stats(p) {
  const occ = occurrences(p.from, p.to);
  const groups = new Map();
  const perDay = new Map();
  let tasks = 0, tasksDone = 0, important = 0;
  for (const { ev, date } of occ) {
    const k = groupKey(ev);
    groups.set(k, (groups.get(k) || 0) + 1);
    perDay.set(date, (perDay.get(date) || 0) + 1);
    if (ev.kind === 'task') { tasks++; if (isDone(ev, date)) tasksDone++; }
    if (ev.important) important++;
  }
  const cats = [...groups.entries()].map(([k, n]) => ({ key: k, n, ...groupInfo(k) })).sort((a, b) => b.n - a.n);
  let busiest = null;
  for (const [d, n] of perDay) if (!busiest || n > busiest.n || (n === busiest.n && d < busiest.d)) busiest = { d, n };
  const free = p.days - perDay.size;
  const prev = prevOf(p), next = nextOf(p);
  const prevTotal = occurrences(prev.from, prev.to).length;
  const nextTotal = occurrences(next.from, next.to).length;
  const best = getState().trackers.map((t) => ({ t, n: trackerStreak(t) })).sort((a, b) => b.n - a.n)[0];
  return { total: occ.length, cats, busiest, free, tasks, tasksDone, important, prevTotal, nextTotal, best, perDay };
}

function levelWord(p, total) {
  const perDay = total / p.days;
  if (total === 0) return 'Тихий';
  if (perDay < .6) return 'Спокійний';
  if (perDay < 1.6) return 'Рівний';
  if (perDay < 3) return 'Насичений';
  return 'Шалений';
}

const countWord = (n) => plural(n, 'план', 'плани', 'планів');

/* ---------------- slides ---------------- */
function buildSlides(p, s) {
  const unit = p.kind === 'week' ? 'тиждень' : 'місяць';
  const your = p.kind === 'week' ? (p.current ? 'Твій тиждень' : 'Твій минулий тиждень') : `Твій ${MONTHS[p.month].toLowerCase()}`;
  const range = `${parseYmd(p.from).getDate()} ${MONTHS_GEN[parseYmd(p.from).getMonth()]} – ${parseYmd(p.to).getDate()} ${MONTHS_GEN[parseYmd(p.to).getMonth()]}`;
  const slides = [];

  slides.push({ bg: 'cobalt', html: `
    <div class="sx-top"><span class="sx-word">planik</span></div>
    <div class="sx-mid"><p class="sx-kicker">${p.current ? 'поки що' : 'підсумок'}</p><h2 class="sx-hero" style="color:var(--butter)">${esc(your)}</h2><p class="sx-text">${range}</p></div>
    <span class="sx-halves" aria-hidden="true"><i></i><i></i></span>` });

  if (!s.total) {
    slides.push({ bg: 'peach', html: `<div class="sx-mid"><h2 class="sx-hero">${p.current ? 'Поки порожньо' : `Тихий ${unit}`}</h2><p class="sx-text">${p.current ? 'Додай кілька планів — і тут зʼявиться твоя статистика.' : 'Без планів у календарі. Іноді саме це й потрібно.'}</p></div>` });
    const ms0 = moodSlide(p);
    if (ms0) slides.push(ms0);
    slides.push(...extraSlides(p));
    return slides;
  }

  const diff = s.total - s.prevTotal;
  const cmp = !s.prevTotal ? '' : diff > 0 ? `на ${diff} більше, ніж ${p.kind === 'week' ? 'тижнем раніше' : 'місяцем раніше'}` : diff < 0 ? `на ${-diff} менше, ніж ${p.kind === 'week' ? 'тижнем раніше' : 'місяцем раніше'}` : `стільки ж, як ${p.kind === 'week' ? 'тижнем раніше' : 'місяцем раніше'}`;
  slides.push({ bg: 'butter', html: `
    <div class="sx-mid"><p class="sx-kicker">${p.current ? 'у календарі цього ' + (p.kind === 'week' ? 'тижня' : 'місяця') : 'за цей ' + unit}</p>
      <div class="sx-num">${s.total}</div><p class="sx-big">${countWord(s.total)}</p>
      <p class="sx-pill">${levelWord(p, s.total)} ${unit}</p>${cmp ? `<p class="sx-text">${cmp}</p>` : ''}</div>
    <span class="sx-st" style="--cut:var(--cobalt)">${sticker('bolt')}</span>` });

  // quiz
  if (s.cats.length >= 2) {
    const right = s.cats[0];
    const pool = s.cats.slice(1, 3).map((c) => c.key);
    const others = getState().categories.map((c) => c.id).filter((k) => k !== right.key && !pool.includes(k));
    while (pool.length < 3 && others.length) pool.push(others.splice(Math.floor(Math.random() * others.length), 1)[0]);
    const opts = [right.key, ...pool].sort(() => Math.random() - .5).map((k) => ({ key: k, ...groupInfo(k), n: (s.cats.find((c) => c.key === k) || { n: 0 }).n }));
    const tie = s.cats[1].n === right.n;
    slides.push({ bg: 'peach', quiz: { right: right.key, tie, top: right.n }, html: `
      <div class="sx-mid"><p class="sx-kicker">квіз</p><h2 class="sx-q">Як гадаєш, чого в тебе було найбільше ${p.kind === 'week' ? 'цього тижня' : 'цього місяця'}?</h2>
      <div class="sx-opts">${opts.map((o) => `<button class="sx-opt" data-q="${o.key}" data-n="${o.n}"><span class="sb sm c-${o.color}">${sticker(o.icon)}</span><span class="grow">${esc(o.name)}</span><span class="sx-cnt"></span></button>`).join('')}</div>
      <p class="sx-text sx-verdict" aria-live="polite"></p></div>` });
  }

  // breakdown
  const max = s.cats[0].n;
  slides.push({ bg: 'cream', html: `
    <div class="sx-mid"><p class="sx-kicker">з чого складався ${unit}</p><h2 class="sx-h">Розклад по категоріях</h2>
    <div class="sx-bars">${s.cats.slice(0, 6).map((c, i) => `<div class="sx-bar" style="--d:${i * 90}ms"><span class="sb sm c-${c.color}">${sticker(c.icon)}</span><span class="sx-bar-body"><span class="sx-bar-l"><b>${esc(c.name)}</b><span>${c.n}</span></span><span class="sx-bar-t"><i style="--w:${Math.max(8, c.n / max * 100)}%;background:var(--${c.color})"></i></span></span></div>`).join('')}</div></div>` });

  // days
  const bd = parseYmd(s.busiest.d);
  slides.push({ bg: 'tangerine', html: `
    <div class="sx-mid"><p class="sx-kicker">найнасиченіший день</p><h2 class="sx-hero">${WEEKDAYS[wd(bd)]}</h2>
      <p class="sx-big">${bd.getDate()} ${MONTHS_GEN[bd.getMonth()]} · ${s.busiest.n} ${countWord(s.busiest.n)}</p>
      <p class="sx-text">${s.free ? `А ще ${pDays(s.free)} без жодних планів. ${s.free >= p.days / 2 ? 'Простір для себе — теж добре.' : 'Бережи ці паузи.'}` : `Жодного вільного дня. Наступного ${p.kind === 'week' ? 'тижня' : 'місяця'} заплануй собі відпочинок.`}</p></div>
    <span class="sx-st" style="--cut:#161513">${sticker('flame')}</span>` });

  // mood & money
  const ms = moodSlide(p);
  if (ms) slides.push(ms);
  slides.push(...extraSlides(p));

  // tasks & trackers
  if (s.tasks || (s.best && s.best.n)) {
    const pct = s.tasks ? Math.round(s.tasksDone / s.tasks * 100) : 0;
    slides.push({ bg: 'ink', html: `
      <div class="sx-mid">${s.tasks ? `<p class="sx-kicker">справи</p>
        <div class="sx-ring" style="--p:${pct}"><span><b>${s.tasksDone}</b>з ${s.tasks}</span></div>
        <p class="sx-big">${pct >= 80 ? 'Майже все закрито' : pct >= 50 ? 'Більшість зроблено' : p.current ? 'Ще є час' : 'Частина лишилась'}</p>` : ''}
        ${s.best && s.best.n ? `<p class="sx-text">${esc(s.best.t.name)}: ${pDays(s.best.n)} поспіль</p>` : ''}</div>` });
  }

  // outro
  const lines = s.total / p.days >= 1.6
    ? ['Ти тримаєш темп', 'Між справами не забувай про сон, їжу й людей поруч.']
    : ['Хороший ритм', 'Є місце і для справ, і для себе. Так тримати.'];
  slides.push({ bg: 'cobalt', html: `
    <div class="sx-mid"><h2 class="sx-hero" style="color:var(--butter)">${lines[0]}</h2><p class="sx-text">${lines[1]}</p>
      <p class="sx-pill" style="background:var(--butter);color:var(--on-color)">${p.current ? 'Попереду ще' : (p.kind === 'week' ? 'Наступного тижня' : 'Наступного місяця')}: ${s.nextTotal} ${countWord(s.nextTotal)}</p></div>
    <span class="sx-halves" aria-hidden="true"><i></i><i></i></span>` });
  return slides;
}

/* ---------------- viewer ---------------- */
export function openStory(p, onClose) {
  const s = stats(p);
  const slides = buildSlides(p, s);
  update((st) => { st.stories.seen[p.id] = Date.now(); });
  playDeck(slides, { label: `Підсумок: ${p.label}`, onClose });
}

/** generic story player: [{bg, html, quiz?}] — used by summaries and "what's new" */
export function playDeck(slides, { label = '', onClose, onEnd } = {}) {
  let i = 0, t0 = 0, elapsed = 0, paused = false, raf = 0, answered = false;

  const el = document.createElement('div');
  el.className = 'sx';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', label);
  el.innerHTML = `
    <div class="sx-bars-top">${slides.map(() => '<i><b></b></i>').join('')}</div>
    <button class="sx-close" aria-label="Закрити">${ui('close')}</button>
    <div class="sx-stage"></div>
    <button class="sx-nav prev" aria-label="Назад"></button><button class="sx-nav next" aria-label="Далі"></button>`;
  document.body.append(el);
  document.body.style.overflow = 'hidden';

  const bars = [...el.querySelectorAll('.sx-bars-top b')];
  const stage = el.querySelector('.sx-stage');

  const show = (n) => {
    i = n; elapsed = 0; answered = false;
    const sl = slides[i];
    el.dataset.bg = sl.bg;
    stage.innerHTML = `<section class="sx-slide">${sl.html}</section>`;
    bars.forEach((b, k) => { b.style.width = k < i ? '100%' : '0%'; });
    t0 = performance.now();
  };
  const next = () => { if (i < slides.length - 1) { haptic(); show(i + 1); } else { onEnd && onEnd(); close(); } };
  const prev = () => { haptic(); show(Math.max(0, i - 1)); };

  const loop = (now) => {
    const sl = slides[i];
    const waiting = sl.quiz && !answered;
    if (!paused && !waiting) elapsed += now - t0;
    t0 = now;
    bars[i].style.width = Math.min(100, (elapsed / SLIDE_MS) * 100) + '%';
    if (elapsed >= SLIDE_MS) next();
    raf = requestAnimationFrame(loop);
  };

  const close = () => {
    cancelAnimationFrame(raf);
    el.classList.add('out');
    setTimeout(() => { el.remove(); document.body.style.overflow = ''; onClose && onClose(); }, 300);
  };

  // tap left/right; hold anywhere to pause
  let downAt = 0, y0 = 0;
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('.sx-opt, .sx-close, [data-sx], .sx-demo')) return; downAt = Date.now(); y0 = e.clientY; paused = true; });
  el.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    paused = false;
    const long = Date.now() - downAt > 350;
    downAt = 0;
    if (e.clientY - y0 > 90) return close();
    if (long) return;
    if (e.target.closest('.sx-nav.prev')) prev();
    else if (e.target.closest('.sx-nav.next')) next();
  });
  el.addEventListener('pointercancel', () => { paused = false; downAt = 0; });
  el.querySelector('.sx-close').addEventListener('click', close);
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); });

  stage.addEventListener('click', (e) => {
    const go = e.target.closest('[data-sx]');
    if (go) { const a = go.dataset.sx; if (a === 'close') { onEnd && onEnd(); close(); } else if (a === 'next') next(); else if (slides[i].onAction) slides[i].onAction(a, close); return; }
    const o = e.target.closest('.sx-opt');
    if (!o || answered) return;
    const q = slides[i].quiz;
    answered = true;
    elapsed = SLIDE_MS * .35;
    const ok = o.dataset.q === q.right || (q.tie && +o.dataset.n === q.top);
    haptic(ok ? 20 : 40);
    stage.querySelectorAll('.sx-opt').forEach((b) => {
      b.disabled = true;
      b.querySelector('.sx-cnt').textContent = b.dataset.n;
      if (b.dataset.q === q.right || (q.tie && +b.dataset.n === q.top)) b.classList.add('right');
      else if (b === o) b.classList.add('wrong');
    });
    const rightName = groupInfo(q.right).name;
    stage.querySelector('.sx-verdict').textContent = ok
      ? (q.tie ? 'Влучно! Тут була нічия.' : 'Влучно! Ти знаєш свій ритм.')
      : `Майже! Найбільше було «${rightName}»: ${q.top}.`;
  });

  show(0);
  raf = requestAnimationFrame(loop);
  el.tabIndex = -1; el.focus();
}

/* ---------------- bubbles ---------------- */
export function bubblesHtml() {
  return `<div class="sx-row">${storyPeriods().map((p) => {
    const n = occurrences(p.from, p.to).length;
    return `<button class="sx-bub ${isSeen(p) && !p.current ? 'seen' : ''}" data-story="${p.id}">
      <span class="sx-ring-b"><span class="sx-face ${p.kind}">${p.kind === 'week' ? `<b>${n}</b>` : `<b>${MONTHS[p.month].slice(0, 3)}</b>`}</span></span>
      <span class="sx-lbl">${esc(p.label)}</span></button>`;
  }).join('')}</div>`;
}
export function periodById(id) { return storyPeriods().find((p) => p.id === id) || [weekPeriod(-1), monthPeriod(-1)].find((p) => p.id === id); }
