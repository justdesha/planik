// Home screen: greeting, "important soon" banner and the month in 3 views.
import { MONTHS, MONTHS_GEN, WEEKDAYS, WD_SHORT, ymd, parseYmd, todayYmd, addDays, addMonths, daysInMonth, wd, esc, untilText, haptic, pDays, diffDays } from './util.js';
import { getState, update, eventsOn, colorOf, nextImportant, occTime, unreadCount, isDone, occurrences } from './store.js';
import { ui, sticker } from './icons.js';
import { menu } from './ui.js';
import { eventRow, bindEventRows, openEvent, openEventForm, timeLabel, evIcon } from './events.js';
import { openInbox } from './notify.js';
import { greetingLine, dayMood } from './pulse.js';

const VIEWS = [
  { value: 'grid', label: 'Календар', icon: 'grid' },
  { value: 'feed', label: 'Стрічка днів', icon: 'tickets' },
  { value: 'timeline', label: 'Таймлайн', icon: 'timeline' }
];

let month = firstOf(new Date());
let selected = null;
let feedMonths = null;
let showPast = false;
let root;

function firstOf(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

export function mountHome(el) {
  root = el;
  bindEventRows(root, render);
  root.addEventListener('click', onClick);
  let x0 = null, y0 = null;
  root.addEventListener('touchstart', (e) => {
    const g = e.target.closest('.cal');
    x0 = g ? e.touches[0].clientX : null; y0 = g ? e.touches[0].clientY : null;
  }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) shiftMonth(dx < 0 ? 1 : -1);
    x0 = null;
  });
}

export function goToday() { month = firstOf(new Date()); selected = null; feedMonths = null; showPast = false; render(); window.scrollTo({ top: 0 }); }
export function selectDate(d) {
  month = firstOf(parseYmd(d)); selected = d;
  if (getState().settings.view !== 'grid') update((s) => { s.settings.view = 'grid'; });
  render();
}

function shiftMonth(n) {
  month = addMonths(month, n);
  selected = null;
  haptic();
  render();
  const g = root.querySelector('.cal');
  if (g) { g.style.animation = 'none'; g.offsetHeight; g.style.animation = `${n > 0 ? 'obIn' : 'obInBack'} .4s var(--ease)`; }
}

function onClick(e) {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const a = b.dataset.a;
  if (a === 'prev') shiftMonth(-1);
  else if (a === 'next') shiftMonth(1);
  else if (a === 'today') goToday();
  else if (a === 'day') {
    const d = b.dataset.d;
    haptic();
    if (selected === d) { selected = null; } else { selected = d; if (parseYmd(d).getMonth() !== month.getMonth()) month = firstOf(parseYmd(d)); }
    render();
    if (selected) setTimeout(() => root.querySelector('.agenda')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  } else if (a === 'expand') { selected = null; render(); }
  else if (a === 'view') {
    menu(b, VIEWS.map((v) => ({ ...v, active: getState().settings.view === v.value })), (v) => {
      update((s) => { s.settings.view = v; });
      feedMonths = null; selected = null; showPast = false;
      render(); window.scrollTo({ top: 0 });
    });
  } else if (a === 'bell') openInbox(render);
  else if (a === 'alert') openEvent(b.dataset.id, b.dataset.date, render);
  else if (a === 'add') openEventForm({ date: b.dataset.d, onSaved: render });
  else if (a === 'more') {
    const last = feedMonths[feedMonths.length - 1];
    feedMonths.push(addMonths(last, 1));
    b.closest('.next-wrap').remove();
    appendFeedMonth(feedMonths[feedMonths.length - 1], true);
  } else if (a === 'past') { showPast = true; render(); }
}

export function render() {
  if (!root) return;
  const st = getState();
  const view = st.settings.view || 'grid';
  const imp = nextImportant();
  const unread = unreadCount();
  const name = st.user.name || 'друже';
  const initial = (st.user.name || 'P').trim()[0].toUpperCase();

  root.innerHTML = `
    <header class="top">
      <div class="avatar">${st.user.photo ? `<img src="${st.user.photo}" alt="">` : esc(initial)}</div>
      <div class="greet"><h1 class="h2">${esc(greetingLine())}, ${esc(name)}</h1><p>${esc(dayMood())}</p></div>
      <button class="ibtn" data-a="view" aria-label="Вигляд місяця">${ui(VIEWS.find((v) => v.value === view).icon)}</button>
      <button class="ibtn pink" data-a="bell" aria-label="Сповіщення">${ui('bell')}${unread ? `<span class="badge-count">${unread > 9 ? '9+' : unread}</span>` : ''}</button>
    </header>
    ${imp ? alertHtml(imp) : ''}
    <div id="homeBody"></div>`;
  const body = root.querySelector('#homeBody');
  if (view === 'grid') renderGrid(body);
  else renderFeed(body, view);
}

function alertHtml({ ev, date }) {
  const when = occTime(ev, date);
  const d = diffDays(new Date(), parseYmd(date));
  const whenTxt = d === 0 ? (ev.allDay || !ev.start ? 'сьогодні' : untilText(when)) : d === 1 ? 'завтра' : `за ${pDays(d)}`;
  return `<button class="alert" data-a="alert" data-id="${ev.id}" data-date="${date}">
    <span class="sb">${sticker('megaphone')}</span>
    <span class="txt"><b>Важливо: скоро «${esc(ev.title)}»</b><span>Потрібна твоя увага · ${d === 0 ? 'сьогодні' : MONTHS_GEN && `${parseYmd(date).getDate()} ${MONTHS_GEN[parseYmd(date).getMonth()]}`}</span></span>
    <span class="when">${whenTxt}</span>
  </button>`;
}

/* ------------------------------- GRID ------------------------------- */
function renderGrid(body) {
  const y = month.getFullYear(), m = month.getMonth();
  const today = todayYmd();
  const first = new Date(y, m, 1);
  const startOffset = wd(first);
  const gridStart = addDays(first, -startOffset);
  const weeks = Math.ceil((startOffset + daysInMonth(y, m)) / 7);
  const isCurMonth = ymd(firstOf(new Date())) === ymd(month);

  let html = `<div class="month-head"><h2 class="hero">${MONTHS[m]}</h2></div><div class="month-sub"><span class="year">${y}</span>
    <div class="month-tools">
      ${isCurMonth ? '' : `<button class="ibtn sm" data-a="today" aria-label="До сьогодні" style="background:var(--lime)">${ui('calendar')}</button>`}
      <button class="ibtn sm" data-a="prev" aria-label="Попередній місяць">${ui('left')}</button>
      <button class="ibtn sm" data-a="next" aria-label="Наступний місяць">${ui('right')}</button></div></div>
    <div class="cal ${selected ? 'collapsed' : ''}"><div class="cal-wd">${WD_SHORT.map((d) => `<span>${d}</span>`).join('')}</div>`;

  for (let w = 0; w < weeks; w++) {
    let row = '', hasSel = false;
    for (let i = 0; i < 7; i++) {
      const d = addDays(gridStart, w * 7 + i);
      const ds = ymd(d);
      const evs = eventsOn(ds);
      if (ds === selected) hasSel = true;
      const cls = ['day', d.getMonth() !== m ? 'other' : '', ds === today ? 'today' : '', ds === selected ? 'sel' : '', ds < today ? 'past' : ''].join(' ');
      const dots = evs.slice(0, 3).map(({ ev, date }) => `<i style="background:var(--${colorOf(ev)});${isDone(ev, date) ? 'opacity:.35' : ''}"></i>`).join('') + (evs.length > 3 ? '<i class="more"></i>' : '');
      row += `<button class="${cls}" data-a="day" data-d="${ds}" aria-label="${d.getDate()} ${MONTHS_GEN[d.getMonth()]}, ${evs.length} ${evs.length === 1 ? 'план' : 'планів'}"><span class="n">${d.getDate()}</span><span class="dots">${dots}</span></button>`;
    }
    html += `<div class="cal-week ${hasSel ? 'has-sel' : ''}">${row}</div>`;
  }
  html += '</div>';

  if (selected) {
    const d = parseYmd(selected);
    const list = eventsOn(selected);
    html += `<section class="agenda reveal"><div class="agenda-head"><div><h3 class="h2">${WEEKDAYS[wd(d)]}, ${d.getDate()}</h3><p>${MONTHS_GEN[d.getMonth()]} · ${list.length ? `${list.length} ${list.length === 1 ? 'план' : list.length < 5 ? 'плани' : 'планів'}` : 'нічого не заплановано'}</p></div>
      <div style="display:flex;gap:8px"><button class="ibtn sm" data-a="add" data-d="${selected}" aria-label="Додати на цей день" style="background:var(--lime)">${ui('plus')}</button>
      <button class="ibtn sm" data-a="expand" aria-label="Показати весь місяць">${ui('up')}</button></div></div>
      ${list.length ? `<div class="ev-list">${list.map((o) => eventRow(o)).join('')}</div>`
        : `<div class="empty"><p class="h3">Вільний день</p><p class="small">Можна залишити так. Або запланувати щось приємне.</p><button class="btn btn-ink btn-sm" data-a="add" data-d="${selected}">${ui('plus')}Додати план</button></div>`}
    </section>`;
  } else {
    const from = isCurMonth ? today : ymd(month);
    const to = ymd(addDays(parseYmd(from), 14));
    const up = occurrences(from, to).filter(({ ev, date }) => !isDone(ev, date) && !(date === today && ev.start && !ev.allDay && occTime(ev, date) < new Date())).slice(0, 5);
    html += `<section class="agenda"><div class="agenda-head"><div><h3 class="h2">Найближче</h3><p>наступні два тижні</p></div></div>
      ${up.length ? `<div class="ev-list">${up.map((o) => eventRow(o, { showDate: true })).join('')}</div>`
        : `<div class="empty"><p class="h3">Поки порожньо</p><p class="small">Натисни на день у календарі або на плюс унизу, щоб додати перший план.</p></div>`}</section>`;
  }
  body.innerHTML = html;
}

/* --------------------------- FEED & TIMELINE --------------------------- */
function feedSub(ev, date) {
  const bits = [];
  if (ev.kind === 'birthday') bits.push(ev.birthYear ? `день народження · ${parseYmd(date).getFullYear() - ev.birthYear}` : 'день народження');
  if (ev.important) bits.push('особливо важливо');
  if (ev.place) bits.push(esc(ev.place));
  return bits.length ? `<small>${bits.join(' · ')}</small>` : '';
}

function renderFeed(body, view) {
  if (!feedMonths) feedMonths = [firstOf(new Date())];
  body.innerHTML = '';
  body.dataset.view = view;
  feedMonths.forEach((m, i) => appendFeedMonth(m, false, i === feedMonths.length - 1));
}

function appendFeedMonth(m, animate, isLast = true) {
  const body = root.querySelector('#homeBody');
  const view = body.dataset.view;
  const y = m.getFullYear(), mi = m.getMonth();
  const today = todayYmd();
  const isCur = ymd(firstOf(new Date())) === ymd(m);
  let startDay = 1;
  if (isCur && !showPast) startDay = new Date().getDate();

  const sec = document.createElement('section');
  sec.className = 'feed-month' + (animate ? ' reveal' : '');
  let html = `<div class="feed-title"><h2 class="h1">${MONTHS[mi]}<small>${y}</small></h2></div>`;
  if (isCur && !showPast && startDay > 1) html += `<button class="btn btn-sand btn-sm" data-a="past" style="margin:-6px 0 14px">${ui('up')}Показати минулі дні</button>`;

  if (view === 'feed') {
    html += '<div class="tickets">';
    for (let d = startDay; d <= daysInMonth(y, mi); d++) {
      const date = new Date(y, mi, d);
      const ds = ymd(date);
      const list = eventsOn(ds);
      const weekend = wd(date) >= 5;
      const cls = ['ticket', ds === today ? 'today' : '', weekend ? 'weekend' : '', list.length ? '' : 'free'].join(' ');
      html += `<article class="${cls}">
        <div class="ticket-head"><div><div class="wdn">${ds === today ? 'Сьогодні' : WEEKDAYS[wd(date)]}</div><div class="dt muted">${ds === today ? WEEKDAYS[wd(date)].toLowerCase() + ', ' : ''}${d} ${MONTHS_GEN[mi]}${list.length ? '' : ' · вільно'}</div></div>
        <div style="display:flex;align-items:center;gap:12px"><button class="add-here" data-a="add" data-d="${ds}" aria-label="Додати на ${d} ${MONTHS_GEN[mi]}">${ui('plus')}</button><span class="big">${d}</span></div></div>
        ${list.length ? `<div class="t-items">${list.map(({ ev, date: dd }) => `<button class="t-item ${isDone(ev, dd) ? 'done' : ''}" data-open="${ev.id}" data-date="${dd}">
          <span class="tm">${ev.allDay || !ev.start ? '—' : ev.start}</span>
          <span class="ttl">${esc(ev.title)}${feedSub(ev, dd)}</span>
          <span class="dotc" style="background:var(--${colorOf(ev)})"></span></button>`).join('')}</div>` : ''}
      </article>`;
    }
    html += '</div>';
  } else {
    html += '<div class="tl">';
    let gap = 0;
    const flushGap = () => { if (gap) { html += `<div class="tl-gap"><span>${gap === 1 ? 'Вільний день' : `${pDays(gap)} без планів`}</span></div>`; gap = 0; } };
    for (let d = startDay; d <= daysInMonth(y, mi); d++) {
      const date = new Date(y, mi, d);
      const ds = ymd(date);
      const list = eventsOn(ds);
      if (!list.length && ds !== today) { gap++; continue; }
      flushGap();
      html += `<div class="tl-day ${ds === today ? 'today' : ''} ${wd(date) >= 5 ? 'weekend' : ''}">
        <div class="tl-node"><b>${d}</b><span>${WD_SHORT[wd(date)]}</span></div>
        <div class="tl-items">${list.length ? list.map((o) => eventRow(o)).join('') : `<div class="tl-empty-today">Сьогодні вільно. <button data-a="add" data-d="${ds}" style="font-weight:800;text-decoration:underline">Додати план</button></div>`}</div></div>`;
    }
    flushGap();
    html += '</div>';
  }
  if (isLast) {
    const nm = addMonths(m, 1);
    html += `<div class="next-wrap"><button class="next-btn" data-a="more"><span class="halves"><i></i><i></i></span><b><small>Місяць закінчився</small>${MONTHS[nm.getMonth()]}</b><span class="arrow">${ui('down')}</span></button></div>`;
  }
  sec.innerHTML = html;
  body.append(sec);
  const btn = sec.querySelector('.next-btn');
  if (btn) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { btn.classList.add('in'); io.disconnect(); }
    }, { threshold: .4 });
    io.observe(btn);
  }
}
