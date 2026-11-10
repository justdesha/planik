// Habit trackers: grid of tiles, quick +/−, details, builder.
import { esc, uid, todayYmd, ymd, addDays, parseYmd, pDays, pTimes, plural, WD_SHORT, wd, haptic, humanDate } from './util.js';
import { getState, update, trackerCount, trackerStreak, trackerDoneToday } from './store.js';
import { ui, sticker, STICKER_ORDER } from './icons.js';
import { openSheet, ask, toast, segIndicator, toggle } from './ui.js';

const COLORS = ['lime', 'pink', 'orange', 'forest', 'mustard', 'lilac', 'ink'];
const GOALS = { days: [7, 21, 30, 66, 100], times: [5, 10, 12, 20, 50] };

function unitWord(t, n) {
  if (t.unit === 'times') return plural(n, 'раз', 'рази', 'разів');
  return plural(n, 'день', 'дні', 'днів');
}
function subtitle(t, n) {
  const w = unitWord(t, n);
  if (t.mode === 'without') return t.unit === 'days' ? `${w} без` : `${w} втрималися`;
  return t.unit === 'days' ? `${w} зі звичкою` : w;
}

let root;
export function mountTrackers(el) {
  root = el;
  root.addEventListener('click', onClick);
}

function sorted() {
  return [...getState().trackers].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.pinnedAt || a.created) - (b.pinnedAt || b.created));
}

export function tileHtml(t, { preview = false } = {}) {
  const n = trackerCount(t);
  const hit = t.goal && n >= t.goal;
  const pct = t.goal ? Math.min(100, (n / t.goal) * 100) : 0;
  const autoDays = t.mode === 'without' && t.auto;
  const doneToday = t.unit === 'days' && !autoDays && trackerDoneToday(t);
  return `<article class="trk ${hit ? 'goal-hit' : ''}" data-trk="${t.id}" ${preview ? '' : 'role="button" tabindex="0"'}>
    <div class="trk-top"><span class="sb c-${t.color}">${sticker(t.icon)}</span>
      ${preview ? '' : `<button class="pin ${t.pinned ? 'on' : ''}" data-pin="${t.id}" aria-label="${t.pinned ? 'Відкріпити' : 'Закріпити вгорі'}" aria-pressed="${!!t.pinned}">${ui('pin')}</button>`}</div>
    <div class="trk-name">${esc(t.name || 'Новий трекер')}</div>
    <div><div class="trk-num"><span data-num>${n}</span><small>${subtitle(t, n)}</small></div></div>
    ${t.goal ? `<div><div class="bar"><i style="width:${pct}%"></i></div><div class="trk-goal" style="margin-top:6px"><span>${hit ? 'Мета досягнута' : 'мета'}</span><span>${n} / ${t.goal}</span></div></div>` : ''}
    <div class="trk-act">${autoDays
      ? `<button data-slip="${t.id}" aria-label="Зрив: почати рахунок заново">${ui('undo')}Зрив</button>`
      : `<button data-minus="${t.id}" aria-label="Мінус один">${ui('minus')}</button><button class="plus ${doneToday ? 'done' : ''}" data-plus="${t.id}" aria-label="${t.unit === 'days' ? 'Відмітити сьогодні' : 'Плюс один'}">${doneToday ? ui('check') : ui('plus')}</button>`}</div>
  </article>`;
}

export function renderTrackers() {
  if (!root) return;
  const list = sorted();
  root.innerHTML = `
    <header class="page-head"><div><h1 class="hero">Трекери</h1><p>Маленькі кроки, які видно</p></div>
      <button class="ibtn" data-new style="background:var(--lime)" aria-label="Створити трекер">${ui('plus')}</button></header>
    <div class="trk-grid">${list.map((t) => tileHtml(t)).join('')}
      <button class="trk trk-new" data-new><span class="ibtn">${ui('plus')}</span><b>Створити трекер</b><span class="small">Звичка, від якої тікаєш, або та, яку будуєш</span></button>
    </div>`;
}

function onClick(e) {
  const b = e.target.closest('button, [data-trk]');
  if (!b) return;
  const st = getState();
  if (b.dataset.new !== undefined) return openBuilder();
  if (b.dataset.pin) {
    e.stopPropagation();
    update(() => { const t = st.trackers.find((x) => x.id === b.dataset.pin); t.pinned = !t.pinned; t.pinnedAt = Date.now(); });
    haptic(10);
    animateReorder(() => renderTrackers());
    return;
  }
  if (b.dataset.plus) { e.stopPropagation(); return plus(b.dataset.plus); }
  if (b.dataset.minus) { e.stopPropagation(); return minus(b.dataset.minus); }
  if (b.dataset.slip) { e.stopPropagation(); return slip(b.dataset.slip); }
  if (b.dataset.trk) openDetail(b.dataset.trk);
}

/** FLIP animation so a pinned tile glides to the top */
function animateReorder(fn) {
  const before = new Map([...root.querySelectorAll('[data-trk]')].map((el) => [el.dataset.trk, el.getBoundingClientRect()]));
  fn();
  root.querySelectorAll('[data-trk]').forEach((el) => {
    const a = before.get(el.dataset.trk);
    if (!a) return;
    const b = el.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.34,1.3,.55,1)' });
  });
}

const findT = (id) => getState().trackers.find((x) => x.id === id);

function afterChange(t, before) {
  const n = trackerCount(t);
  renderTrackers();
  const num = root.querySelector(`[data-trk="${t.id}"] [data-num]`);
  num && num.classList.add('bump');
  if (t.goal && before < t.goal && n >= t.goal) toast(`Мета «${t.name}» досягнута. Це сильно!`, { ms: 3500 });
  else if (n > before && n > 0 && n % 7 === 0 && t.unit === 'days') toast(`${pDays(n)}! Тиждень за тижнем`);
}

function plus(id) {
  const t = findT(id), before = trackerCount(t), today = todayYmd();
  if (t.unit === 'days' && t.log.includes(today)) { toast('Сьогодні вже відмічено'); return; }
  update(() => { t.log.push(today); });
  haptic(12);
  afterChange(t, before);
}
function minus(id) {
  const t = findT(id), before = trackerCount(t);
  if (!t.log.length) { toast('Ще нема що віднімати'); return; }
  update(() => { const today = todayYmd(); const i = t.log.lastIndexOf(today); if (i >= 0) t.log.splice(i, 1); else t.log.pop(); });
  haptic(8);
  afterChange(t, before);
}
async function slip(id) {
  const t = findT(id);
  const n = trackerCount(t);
  const ok = await ask(`Рахунок «${t.name}» почнеться з нуля. ${n ? `${pDays(n)} — це все одно досвід.` : ''}`, [{ label: 'Почати заново', value: true, style: 'ink' }]);
  if (!ok) return;
  update(() => { t.relapses = t.relapses || []; t.relapses.push(todayYmd()); });
  renderTrackers();
  toast('Новий старт. Ти впораєшся', { action: 'Скасувати', ms: 4500, onAction: () => { update(() => t.relapses.pop()); renderTrackers(); } });
}

/* ---------------------------- details ---------------------------- */
function openDetail(id) {
  const t = findT(id);
  if (!t) return;
  const body = () => {
    const n = trackerCount(t);
    const streak = trackerStreak(t);
    const autoDays = t.mode === 'without' && t.auto;
    // 5 weeks heat map ending this week
    const today = new Date();
    const end = addDays(today, 6 - wd(today));
    const start = addDays(end, -34);
    const set = new Set(t.log);
    const from = autoDays ? (t.relapses && t.relapses.length ? t.relapses[t.relapses.length - 1] : t.start) : null;
    let cells = '';
    for (let i = 0; i < 35; i++) {
      const d = addDays(start, i); const ds = ymd(d);
      const fut = d > today && ds !== todayYmd();
      const on = autoDays ? (ds >= from && ds < todayYmd()) : set.has(ds);
      cells += `<i class="${fut ? 'fut' : on ? 'on' : ''} ${ds === todayYmd() ? 'today' : ''}" title="${ds}"></i>`;
    }
    return `
      <div style="display:flex;gap:14px;align-items:center"><span class="sb lg c-${t.color}">${sticker(t.icon)}</span>
        <div><h2 class="h2">${esc(t.name)}</h2><p class="small muted" style="margin:4px 0 0">${t.mode === 'without' ? 'Без звички' : 'Зі звичкою'} · з ${humanDate(t.start)}${t.end ? ` до ${humanDate(t.end)}` : ''}</p></div></div>
      <div class="stat-row">
        <div class="stat"><b>${n}</b><span>${subtitle(t, n)}</span></div>
        <div class="stat"><b>${streak}</b><span>${plural(streak, 'день', 'дні', 'днів')} поспіль</span></div>
        <div class="stat"><b>${t.goal || '—'}</b><span>мета</span></div>
      </div>
      <div class="card" style="padding:16px"><div class="card-h" style="margin-bottom:10px"><h3 class="h3">Останні 5 тижнів</h3></div>
        <div class="heat-wd">${WD_SHORT.map((d) => `<span>${d}</span>`).join('')}</div><div class="heat">${cells}</div></div>
      ${t.relapses && t.relapses.length ? `<p class="small muted" style="margin:0 4px 16px">Нових стартів: ${t.relapses.length}. Останній — ${humanDate(t.relapses[t.relapses.length - 1])}.</p>` : ''}
      <div class="det-actions">
        <button class="btn btn-ink" data-d="edit">${ui('edit')}Змінити</button>
        <button class="ibtn" data-d="reset" aria-label="Обнулити" style="width:54px;height:54px">${ui('undo')}</button>
        <button class="ibtn" data-d="del" aria-label="Видалити" style="width:54px;height:54px;background:var(--red);color:#FFF6EE">${ui('trash')}</button>
      </div>`;
  };
  openSheet({
    head: '<span></span>',
    html: body(),
    onMount(s) {
      s.body.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-d]');
        if (!b) return;
        if (b.dataset.d === 'edit') { s.close(); setTimeout(() => openBuilder(t), 200); }
        if (b.dataset.d === 'reset') {
          const ok = await ask('Обнулити всю історію трекера?', [{ label: 'Обнулити', value: true, style: 'danger' }]);
          if (!ok) return;
          update(() => { t.log = []; t.relapses = []; t.start = todayYmd(); });
          s.setHtml(body()); renderTrackers();
        }
        if (b.dataset.d === 'del') {
          const ok = await ask(`Видалити «${t.name}»?`, [{ label: 'Видалити', value: true, style: 'danger' }]);
          if (!ok) return;
          const snap = JSON.parse(JSON.stringify(t));
          update((st) => { st.trackers = st.trackers.filter((x) => x.id !== t.id); });
          s.close(); renderTrackers();
          toast('Трекер видалено', { action: 'Повернути', ms: 4500, onAction: () => { update((st) => st.trackers.push(snap)); renderTrackers(); } });
        }
      });
    }
  });
}

/* ---------------------------- builder ---------------------------- */
export function openBuilder(existing) {
  const isNew = !existing;
  const t = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: uid(), name: '', icon: 'flame', color: 'orange', mode: 'with', unit: 'days', goal: 21,
    start: todayYmd(), end: '', auto: false, log: [], relapses: [], pinned: false, created: Date.now()
  };
  let moreOpen = false;
  let hasEnd = !!t.end;

  const body = () => {
    const first = STICKER_ORDER.slice(0, 5);
    if (!first.includes(t.icon)) first[4] = t.icon;
    const rest = STICKER_ORDER.filter((s) => !first.includes(s));
    const pick = (s) => `<button type="button" class="st-pick c-${s === t.icon ? t.color : 'sand'}" data-ic="${s}" aria-pressed="${s === t.icon}" aria-label="Іконка ${s}" style="${s === t.icon ? `--cut:var(--${t.color});background:var(--cut)` : ''}">${sticker(s)}</button>`;
    return `
    <div class="preview-wrap"><div id="pv">${tileHtml(t, { preview: true })}</div><p class="preview-note">Так трекер виглядатиме в списку. Змінюй налаштування — картка оновлюється.</p></div>
    <div class="field"><span class="lbl">Назва</span><input class="inp" id="tName" maxlength="40" placeholder="Напр. Пити воду, Не гортати стрічку" value="${esc(t.name)}" autocomplete="off"></div>
    <div class="field"><span class="lbl">Іконка</span>
      <div class="st-row">${first.map(pick).join('')}<button type="button" class="st-pick" data-more aria-expanded="${moreOpen}" aria-label="Більше іконок" style="background:var(--ink);color:var(--cream)">${ui(moreOpen ? 'up' : 'more')}</button></div>
      <div class="st-more ${moreOpen ? 'open' : ''}">${rest.map(pick).join('')}</div></div>
    <div class="field"><span class="lbl">Колір</span><div class="colors">${COLORS.map((c) => `<button type="button" class="swatch" data-col="${c}" aria-pressed="${t.color === c}" aria-label="Колір" style="background:var(--${c})"></button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Тип</span><div class="seg" id="sMode">
      <button type="button" data-mode="without" aria-pressed="${t.mode === 'without'}">Без звички</button>
      <button type="button" data-mode="with" aria-pressed="${t.mode === 'with'}">Зі звичкою</button></div>
      <p class="tiny muted" style="margin:8px 4px 0">${t.mode === 'without' ? 'Рахуємо, скільки ти тримаєшся: без солодкого, без цигарок.' : 'Рахуємо, скільки разів ти це зробив: зал, читання, вода.'}</p></div>
    <div class="field"><span class="lbl">Що рахуємо</span><div class="seg" id="sUnit">
      <button type="button" data-unit="days" aria-pressed="${t.unit === 'days'}">Дні</button>
      <button type="button" data-unit="times" aria-pressed="${t.unit === 'times'}">Рази</button></div></div>
    ${t.mode === 'without' && t.unit === 'days' ? `<div class="field"><button type="button" class="opt-card" data-auto><span class="grow"><b>Рахувати дні самостійно</b><span>Кожен день без зриву додається сам. Якщо зірвешся — одна кнопка</span></span>${toggle('auto', t.auto)}</button></div>` : ''}
    <div class="field"><span class="lbl">Мета</span><div class="chips">${GOALS[t.unit].map((g) => `<button type="button" class="chip" data-goal="${g}" aria-pressed="${t.goal === g}">${t.unit === 'days' ? pDays(g) : pTimes(g)}</button>`).join('')}
      <button type="button" class="chip" data-goal="0" aria-pressed="${!t.goal}">Без мети</button></div>
      <div style="margin-top:10px"><input class="inp" id="tGoal" inputmode="numeric" placeholder="Або своє число" value="${t.goal && !GOALS[t.unit].includes(t.goal) ? t.goal : ''}"></div></div>
    <div class="field"><button type="button" class="opt-card" data-end><span class="grow"><b>Кінцева дата</b><span>Коли челендж закінчиться, прийде сповіщення</span></span>${toggle('end', hasEnd)}</button>
      ${hasEnd ? `<input class="inp" type="date" id="tEnd" style="margin-top:10px" value="${t.end || ymd(addDays(new Date(), 30))}">` : ''}</div>`;
  };

  openSheet({
    full: true,
    title: isNew ? 'Новий трекер' : 'Змінити трекер',
    html: body(),
    foot: `<button class="btn btn-lime btn-block" id="tSave">${isNew ? 'Створити трекер' : 'Зберегти'}</button>`,
    onMount(s) {
      const sync = () => {
        const name = s.body.querySelector('#tName'); if (name) t.name = name.value.trim();
        const g = s.body.querySelector('#tGoal'); if (g && g.value) t.goal = Math.max(1, parseInt(g.value, 10) || 0);
        const en = s.body.querySelector('#tEnd'); if (en) t.end = en.value;
      };
      const rerender = () => {
        sync();
        const top = s.body.scrollTop;
        s.setHtml(body()); s.body.scrollTop = top;
        s.body.querySelectorAll('.seg').forEach(segIndicator);
      };
      requestAnimationFrame(() => s.body.querySelectorAll('.seg').forEach(segIndicator));
      s.body.addEventListener('input', (e) => {
        if (e.target.id === 'tName' || e.target.id === 'tGoal') { sync(); s.body.querySelector('#pv').innerHTML = tileHtml(t, { preview: true }); }
      });
      s.body.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.ic) { t.icon = b.dataset.ic; haptic(); rerender(); }
        else if (b.dataset.more !== undefined) { moreOpen = !moreOpen; rerender(); }
        else if (b.dataset.col) { t.color = b.dataset.col; haptic(); rerender(); }
        else if (b.dataset.mode) { t.mode = b.dataset.mode; t.auto = t.mode === 'without' && t.unit === 'days'; haptic(); rerender(); }
        else if (b.dataset.unit) { t.unit = b.dataset.unit; if (t.unit !== 'days') t.auto = false; t.goal = GOALS[t.unit][1]; haptic(); rerender(); }
        else if (b.dataset.auto !== undefined) { t.auto = !t.auto; haptic(); rerender(); }
        else if (b.dataset.goal !== undefined) { const gi = s.body.querySelector('#tGoal'); if (gi) gi.value = ''; t.goal = +b.dataset.goal; haptic(); rerender(); }
        else if (b.dataset.end !== undefined) { hasEnd = !hasEnd; if (!hasEnd) t.end = ''; rerender(); }
      });
      s.el.querySelector('#tSave').addEventListener('click', () => {
        sync();
        if (!t.name) { const f = s.body.querySelector('#tName'); f.focus(); f.placeholder = 'Дай трекеру назву'; haptic(30); return; }
        if (!hasEnd) t.end = '';
        update((st) => {
          const i = st.trackers.findIndex((x) => x.id === t.id);
          if (i >= 0) st.trackers[i] = t; else st.trackers.push(t);
        });
        s.close(); renderTrackers();
        toast(isNew ? `Трекер «${t.name}» створено` : 'Зміни збережено');
      });
    }
  });
}
