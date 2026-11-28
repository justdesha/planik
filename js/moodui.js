// Mood UI: home check-in, a day's mood, the Pulse card, the mood calendar sheet and story slides.
import { MONTHS, MONTHS_GEN, WD_SHORT, WEEKDAYS, ymd, parseYmd, todayYmd, addDays, addMonths, wd, esc, haptic, plural, hx } from './util.js';
import { getState, update } from './store.js';
import { ui } from './icons.js';
import { openSheet, toast } from './ui.js';
import { MOODS, moodById, moodFace, moodsOf, moodOf, setMood, checkinSlot, SLOT_Q, moodStats, moodInsight, monthCells } from './moods.js';

const SLOT_WORD = { am: 'Зранку', pm: 'Увечері' };
const REACT = (v) => (v > 0 ? 'Відмічено. Хай так і триває' : v === 0 ? 'Відмічено' : 'Відмічено. Бережи себе сьогодні');

const faceRow = (cur, attr) => `<div class="mood-row">${MOODS.map((m) => `<label class="mood-opt hxl" role="button" tabindex="0" ${attr}="${m.id}" aria-pressed="${cur === m.id}" aria-label="${m.name}">${moodFace(m.id)}<span>${m.name}</span>${hx()}</label>`).join('')}</div>`;

/* ---------------- home: morning & evening check-in ---------------- */
export function checkinHtml() {
  const slot = checkinSlot();
  if (!slot) return '';
  const today = todayYmd();
  const cur = moodsOf(today)[slot];
  const skip = (getState().settings.moodSkip || '') === `${today}:${slot}`;
  if (cur) {
    const m = moodById(cur);
    return `<button class="mood-pill" data-mood="change" data-slot="${slot}">${moodFace(cur)}<span><b>${SLOT_WORD[slot]}: ${m.name.toLowerCase()}</b><small>змінити</small></span></button>`;
  }
  if (skip) return '';
  return `<section class="mood-ask reveal"><div class="mood-ask-h"><h3 class="h3">${SLOT_Q[slot]}</h3><button class="tiny muted" data-mood="skip" data-slot="${slot}">пізніше</button></div>
    ${faceRow(null, 'data-mpick')}</section>`;
}

export function bindCheckin(root, rerender) {
  root.addEventListener('click', (e) => {
    const p = e.target.closest('[data-mpick]');
    if (p) {
      const slot = checkinSlot() || 'pm';
      setMood(todayYmd(), slot, p.dataset.mpick);
      haptic(14); toast(REACT(moodById(p.dataset.mpick).v));
      return rerender();
    }
    const b = e.target.closest('[data-mood]');
    if (!b) return;
    if (b.dataset.mood === 'skip') { update((s) => { s.settings.moodSkip = `${todayYmd()}:${b.dataset.slot}`; }); rerender(); }
    if (b.dataset.mood === 'change') pickMood(todayYmd(), b.dataset.slot, rerender);
    if (b.dataset.mood === 'day') pickMood(b.dataset.d, null, rerender);
  });
}

/** sheet to set the mood of a day (slot null = whole day → evening slot) */
export function pickMood(d, slot, after) {
  const s0 = slot || (d === todayYmd() && checkinSlot() === 'am' ? 'am' : 'pm');
  const dt = parseYmd(d);
  const title = d === todayYmd() ? (slot ? SLOT_Q[slot] : 'Як ти сьогодні?') : `Як було ${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]}?`;
  const m = moodsOf(d);
  openSheet({
    title,
    html: `${faceRow(m[s0], 'data-set')}
      ${m.am && m.pm && !slot ? `<p class="tiny muted" style="margin:12px 4px 0">Зранку було «${moodById(m.am).name.toLowerCase()}», увечері — «${moodById(m.pm).name.toLowerCase()}».</p>` : ''}
      ${m[s0] ? '<button class="btn btn-ghost btn-sm" data-clear style="margin-top:14px">Прибрати відмітку</button>' : ''}`,
    onMount(sh) {
      sh.body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-set]');
        if (b) { if (moodsOf(d)[s0] !== b.dataset.set) setMood(d, s0, b.dataset.set); haptic(14); sh.close(); toast(REACT(moodById(b.dataset.set).v)); after && after(); return; }
        if (e.target.closest('[data-clear]')) { setMood(d, s0, null); sh.close(); after && after(); }
      });
    }
  });
}

/* ---------------- a selected day in the calendar ---------------- */
export function dayMoodHtml(d) {
  if (d > todayYmd()) return '';
  const cur = moodOf(d);
  if (cur) {
    const m = moodById(cur);
    return `<button class="mood-pill wide" data-mood="day" data-d="${d}">${moodFace(cur)}<span><b>Настрій: ${m.name.toLowerCase()}</b><small>торкнись, щоб змінити</small></span></button>`;
  }
  return `<button class="mood-pill wide ghost" data-mood="day" data-d="${d}"><span class="mf-row">${['joy', 'calm', 'tired', 'sad'].map((id) => moodFace(id)).join('')}</span><span><b>${d === todayYmd() ? 'Який сьогодні настрій?' : 'Який був настрій?'}</b><small>відміть, щоб бачити картину місяця</small></span></button>`;
}

/* ---------------- Pulse card ---------------- */
function miniCal(y, m, big = false) {
  const today = todayYmd();
  return `<div class="mcal ${big ? 'big' : ''}"><div class="mcal-wd">${WD_SHORT.map((x) => `<span>${x}</span>`).join('')}</div>
    <div class="mcal-g">${monthCells(y, m).map((c) => c ? `<button class="mcal-d ${c.k === today ? 'today' : ''} ${c.k > today ? 'fut' : ''}" data-mday="${c.k}" ${c.k > today ? 'disabled' : ''} aria-label="${c.d}${c.m ? ': ' + moodById(c.m).name : ''}">${c.m ? moodFace(c.m) : `<i>${c.d}</i>`}</button>` : '<span></span>').join('')}</div></div>`;
}

export function moodCardHtml() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const st = moodStats(ymd(new Date(y, m, 1)), todayYmd());
  const ins = moodInsight(st);
  return `<section class="card mood-card"><div class="card-h"><div><h3 class="h3">Настрій</h3><span class="small muted">${MONTHS[m]} · ${st.n ? `${st.n} ${plural(st.n, 'відмітка', 'відмітки', 'відміток')}` : 'ще без відміток'}</span></div>
      <button class="btn btn-sand btn-sm" data-moodcal>Статистика</button></div>
    ${miniCal(y, m)}
    <div class="mood-ins">${moodFace(ins.tone)}<div><b>${esc(ins.title)}</b><span>${esc(ins.text)}</span></div></div></section>`;
}

export function bindMoodCard(root, rerender) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-moodcal]')) return openMoodCalendar(rerender);
    const d = e.target.closest('.mood-card [data-mday]');
    if (d) pickMood(d.dataset.mday, null, rerender);
  });
}

/* ---------------- full mood calendar ---------------- */
export function openMoodCalendar(after) {
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const html = () => {
    const y = month.getFullYear(), m = month.getMonth();
    const last = ymd(new Date(y, m + 1, 0));
    const to = last < todayYmd() ? last : todayYmd();
    const st = moodStats(ymd(month), to);
    const ins = moodInsight(st);
    const max = st.top.length ? st.top[0].c : 1;
    const isCur = ymd(month).slice(0, 7) === todayYmd().slice(0, 7);
    return `<div class="month-sub"><span class="h2">${MONTHS[m]} <span class="year">${y}</span></span><div class="month-tools">
        <button class="ibtn sm" data-mm="-1" aria-label="Попередній місяць">${ui('left')}</button>
        <button class="ibtn sm" data-mm="1" ${isCur ? 'disabled style="opacity:.35"' : ''} aria-label="Наступний місяць">${ui('right')}</button></div></div>
      ${miniCal(y, m, true)}
      <div class="mood-ins big">${moodFace(ins.tone)}<div><b>${esc(ins.title)}</b><span>${esc(ins.text)}</span></div></div>
      ${st.n ? `<div class="card" style="margin-top:14px"><div class="card-h"><h3 class="h3">Як часто</h3><span class="small muted">${st.good} ${plural(st.good, 'світлий', 'світлі', 'світлих')} · ${st.bad} ${plural(st.bad, 'важкий', 'важкі', 'важких')}</span></div>
        <div class="mood-bars">${st.top.map((t) => `<div class="mood-bar">${moodFace(t.id)}<span class="grow"><span class="mood-bar-l"><b>${t.name}</b><span>${t.c}</span></span><span class="bar"><i style="width:${Math.max(8, t.c / max * 100)}%;background:${t.color}"></i></span></span></div>`).join('')}</div></div>` : ''}
      <p class="tiny muted" style="margin:4px 4px 0">Торкнись дня, щоб відмітити чи змінити настрій.</p>`;
  };
  openSheet({
    title: 'Календар настрою',
    html: html(),
    onMount(sh) {
      sh.body.addEventListener('click', (e) => {
        const n = e.target.closest('[data-mm]');
        if (n && !n.disabled) { month = addMonths(month, +n.dataset.mm); haptic(); sh.setHtml(html()); return; }
        const d = e.target.closest('[data-mday]');
        if (d) pickMood(d.dataset.mday, null, () => { sh.setHtml(html()); after && after(); });
      });
    },
    onClose() { after && after(); }
  });
}

/* ---------------- summary stories ---------------- */
export function moodSlide(p) {
  const to = p.to < todayYmd() ? p.to : todayYmd();
  const st = moodStats(p.from, to);
  if (!st.n) return null;
  const ins = moodInsight(st, p.kind === 'week' ? 'тиждень' : 'місяць');
  const top = st.top[0];
  const strip = [];
  for (let d = parseYmd(p.from); ymd(d) <= p.to; d = addDays(d, 1)) strip.push(moodOf(ymd(d)));
  const week = p.kind === 'week';
  return {
    bg: 'cream',
    html: `<div class="sx-mid"><p class="sx-kicker">настрій ${week ? 'тижня' : 'місяця'}</p>
      <div class="sx-mood-hero">${moodFace(top.id)}</div>
      <h2 class="sx-h">Найчастіше: ${top.name.toLowerCase()}</h2>
      <div class="sx-mood-strip ${week ? 'week' : ''}">${strip.map((m, i) => `<span style="--d:${i * (week ? 80 : 25)}ms">${m ? moodFace(m) : '<i></i>'}</span>`).join('')}</div>
      <p class="sx-big">${esc(ins.title)}</p><p class="sx-text">${esc(ins.text)}</p></div>`
  };
}
