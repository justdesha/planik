// "Гроші": balance, a donut of expenses or income, categories, limits, recurring payments,
// savings jars, month-to-month comparison, history and purchases noticed in Pulse.
import { MONTHS, MONTHS_GEN, WEEKDAYS, ymd, parseYmd, todayYmd, addDays, addMonths, daysInMonth, wd, esc, haptic, plural, uid, humanDate } from './util.js';
import { getState, update, saveEvent, deleteEvent, eventById, occurrences } from './store.js';
import { ui, sticker, STICKER_ORDER } from './icons.js';
import { openSheet, toast, ask, segIndicator } from './ui.js';

/* ---------------- categories ---------------- */
export const EXP_CATS = [
  { id: 'groceries', name: 'Продукти', icon: 'basket' },
  { id: 'cafe', name: 'Кафе й ресторани', icon: 'cutlery' },
  { id: 'delivery', name: 'Доставка їжі', icon: 'box' },
  { id: 'transport', name: 'Транспорт', icon: 'bus' },
  { id: 'taxi', name: 'Таксі', icon: 'taxi' },
  { id: 'car', name: 'Авто й пальне', icon: 'car' },
  { id: 'rent', name: 'Житло', icon: 'house' },
  { id: 'utilities', name: 'Комуналка', icon: 'bulb' },
  { id: 'connect', name: 'Звʼязок та інтернет', icon: 'wifi' },
  { id: 'subs', name: 'Підписки', icon: 'play' },
  { id: 'shop', name: 'Шопінг', icon: 'bag' },
  { id: 'beauty', name: 'Краса й догляд', icon: 'lipstick' },
  { id: 'health', name: 'Здоровʼя й аптека', icon: 'pill' },
  { id: 'sport', name: 'Спорт', icon: 'dumbbell' },
  { id: 'fun', name: 'Розваги', icon: 'ticket' },
  { id: 'travel', name: 'Подорожі', icon: 'plane' },
  { id: 'edu', name: 'Освіта', icon: 'cap' },
  { id: 'gifts', name: 'Подарунки', icon: 'gift' },
  { id: 'kids', name: 'Діти', icon: 'teddy' },
  { id: 'pets', name: 'Тварини', icon: 'paw' },
  { id: 'household', name: 'Дім і побут', icon: 'sofa' },
  { id: 'tech', name: 'Техніка', icon: 'laptop' },
  { id: 'charity', name: 'Донати', icon: 'handheart' },
  { id: 'taxes', name: 'Податки й комісії', icon: 'receipt' },
  { id: 'other', name: 'Інше', icon: 'dots' }
];
export const INC_CATS = [
  { id: 'salary', name: 'Зарплата', icon: 'briefcase' },
  { id: 'side', name: 'Підробіток', icon: 'bolt' },
  { id: 'freelance', name: 'Фриланс', icon: 'laptop' },
  { id: 'gift_in', name: 'Подарунок', icon: 'gift' },
  { id: 'cashback', name: 'Кешбек і відсотки', icon: 'percent' },
  { id: 'sell', name: 'Продаж речей', icon: 'tag' },
  { id: 'debt', name: 'Повернення боргу', icon: 'handback' },
  { id: 'other_in', name: 'Інше', icon: 'dots' }
];
/** chart colors go by rank, so neighbouring slices never share a color */
const RANK = ['tangerine', 'cobalt', 'butter', 'peach', 'navy', 'sky', 'red', 'stone'];
const CURRENCIES = [['₴', 'гривня'], ['€', 'євро'], ['$', 'долар'], ['Kc', 'крона']];

const M = () => { const m = getState().money; if (!['₴', '€', '$', 'Kc'].includes(m.cur)) m.cur = '₴'; return m; };
const cats = (t) => [...(t === 'inc' ? INC_CATS : EXP_CATS).filter((c) => !c.id.startsWith('other')), ...(M().cats || []).filter((c) => c.t === t), (t === 'inc' ? INC_CATS : EXP_CATS).find((c) => c.id.startsWith('other'))];
export const mcat = (t, id) => cats(t).find((c) => c.id === id) || cats(t)[cats(t).length - 1];

/* ---------------- numbers ---------------- */
const nb = ' ';
export function fmt(n, { sign = false, cur = true } = {}) {
  const v = Math.round(Math.abs(n) * 100) / 100;
  const [i, f] = v.toFixed(2).split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, nb);
  const s = (sign ? (n < 0 ? '−' : '+') : n < 0 ? '−' : '') + int + (f !== '00' ? ',' + f : '');
  return cur ? `${s}${nb}${M().cur}` : s;
}
const num = (v) => { const x = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? Math.round(x * 100) / 100 : 0; };
const monthKey = (d) => d.slice(0, 7);

/** operations that already happened (a future date = planned, not counted yet) */
export function periodOps(from, to, t) { const top = to < todayYmd() ? to : todayYmd(); return (M().ops || []).filter((o) => o.d >= from && o.d <= top && (!t || o.t === t)); }
/** operations dated after today, up to a day */
export const futureOps = (to = '9999-12-31') => (M().ops || []).filter((o) => o.d > todayYmd() && o.d <= to && o.t !== 'jar');
const isFuture = (o) => o.d > todayYmd();
export function sumOps(list) { return list.reduce((a, o) => a + o.a, 0); }
export function balance() {
  const m = M();
  let b = m.start || 0;
  const today = todayYmd();
  // planned (future) operations count only from their own day
  for (const o of m.ops) { if (o.d > today) continue; b += o.t === 'inc' ? o.a : -o.a; } // jar: + into jar, − out of jar
  return b;
}
export function byCat(list, t) {
  const map = new Map();
  for (const o of list) map.set(o.cat, (map.get(o.cat) || 0) + o.a);
  return [...map.entries()].map(([id, a]) => ({ ...mcat(t, id), id, a })).sort((x, y) => y.a - x.a);
}
const ranked = (rows) => rows.map((r, i) => ({ ...r, color: i < RANK.length - 1 ? RANK[i] : 'stone' }));

/* ---------------- screen state ---------------- */
let root, month = new Date(new Date().getFullYear(), new Date().getMonth(), 1), kind = 'exp', focus = null;
const mFrom = () => ymd(month);
const mTo = () => ymd(new Date(month.getFullYear(), month.getMonth() + 1, 0));
const isCurMonth = () => mFrom().slice(0, 7) === todayYmd().slice(0, 7);

export function mountMoney(el) {
  root = el;
  root.addEventListener('click', onClick);
  window.addEventListener('planik:paid', (e) => payFromCalendar(e.detail.rec, e.detail.date));
  // a planned purchase ticked in the calendar: offer to record it
  window.addEventListener('planik:bought', (e) => {
    const ev = eventById(e.detail.id);
    if (!ev || (ev.bought || {})[e.detail.date]) return;
    setTimeout(() => toast(`Записати витрату «${ev.title}» · ${fmt(ev.amount)}?`, { action: 'Записати', ms: 5000, onAction: () => recordBuy(ev.id, e.detail.date, e.detail.after) }), 2700);
  });
}

function onClick(e) {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  const a = b.dataset.m;
  haptic();
  if (a === 'prev' || a === 'next') { month = addMonths(month, a === 'prev' ? -1 : 1); focus = null; render(); }
  else if (a === 'exp' || a === 'inc') openOp({ t: a });
  else if (a === 'kind') { kind = b.dataset.k; focus = null; render(); }
  else if (a === 'slice') { focus = focus === b.dataset.id ? null : b.dataset.id; render(); }
  else if (a === 'cat') openCatOps(kind, b.dataset.id);
  else if (a === 'allcats') openAllCats(kind);
  else if (a === 'all') openHistory({ t: kind });
  else if (a === 'hist') openHistory({});
  else if (a === 'op') openOp({ op: M().ops.find((o) => o.id === b.dataset.id) });
  else if (a === 'start') openStart();
  else if (a === 'settings') openSettings();
  else if (a === 'limit') openLimit(b.dataset.id);
  else if (a === 'rec') openRec(b.dataset.id ? M().recs.find((r) => r.id === b.dataset.id) : null);
  else if (a === 'pay') payRec(b.dataset.id, b.dataset.d);
  else if (a === 'jar') openJar(b.dataset.id ? M().jars.find((j) => j.id === b.dataset.id) : null);
  else if (a === 'buy') recordPurchase(b.dataset.ev, b.dataset.item);
  else if (a === 'bought') recordBuy(b.dataset.ev, b.dataset.d);
  else if (a === 'buyskip') { markItem(b.dataset.ev, b.dataset.item, 'skip'); render(); }
}

/* ---------------- render ---------------- */
export function renderMoney() { render(); }
function render() {
  if (!root) return;
  const m = M();
  const from = mFrom(), to = mTo();
  const exp = periodOps(from, to, 'exp'), inc = periodOps(from, to, 'inc');
  const list = kind === 'exp' ? exp : inc;
  const rows = ranked(byCat(list, kind));
  const total = sumOps(list);
  const bal = balance();

  root.innerHTML = `
    <header class="page-head"><div><h1 class="hero">Гроші</h1><p>Куди йдуть і звідки приходять</p></div>
      <div style="display:flex;gap:8px"><button class="ibtn" data-m="hist" aria-label="Усі операції">${ui('list')}</button><button class="ibtn" data-m="settings" aria-label="Налаштування грошей">${ui('settings')}</button></div></header>
    ${purchaseBanner()}
    <section class="bal">
      <div class="bal-top"><span>На рахунку</span>${m.start === null && !m.ops.length ? '' : `<button class="tiny" data-m="start">змінити</button>`}</div>
      ${m.start === null && !m.ops.length
        ? `<p class="bal-num">0 ${esc(m.cur)}</p><button class="btn btn-acc btn-sm" data-m="start">Вказати, скільки є зараз</button>`
        : `<p class="bal-num ${bal < 0 ? 'neg' : ''}">${fmt(bal)}</p>`}
      <div class="bal-month"><span class="mon-sw"><button data-m="prev" aria-label="Попередній місяць">${ui('left')}</button><b>${MONTHS[month.getMonth()]}</b><button data-m="next" aria-label="Наступний місяць">${ui('right')}</button></span>
        <span class="bal-io"><i class="up">+${fmt(sumOps(inc), { cur: false })}</i><i class="dn">−${fmt(sumOps(exp), { cur: false })}</i></span></div>
      ${projection(bal)}
      <span class="bal-halves" aria-hidden="true"><i></i><i></i></span>
    </section>
    <div class="m-actions"><button class="btn btn-acc" data-m="exp">${ui('minus')}Витрата</button><button class="btn btn-deep" data-m="inc">${ui('plus')}Дохід</button></div>

    <section class="card chart-card">
      <div class="seg" id="mSeg"><button data-m="kind" data-k="exp" aria-pressed="${kind === 'exp'}">Витрати</button><button data-m="kind" data-k="inc" aria-pressed="${kind === 'inc'}">Доходи</button></div>
      ${rows.length ? donut(rows, total) : `<div class="donut-empty">${sticker(kind === 'exp' ? 'wallet' : 'money')}<p>${kind === 'exp' ? 'Витрат цього місяця ще немає' : 'Доходів цього місяця ще немає'}</p><button class="btn btn-ink btn-sm" data-m="${kind}">${ui('plus')}${kind === 'exp' ? 'Додати витрату' : 'Додати дохід'}</button></div>`}
      ${rows.length ? `<div class="legend">${rows.slice(0, 5).map((r) => legendRow(r, total)).join('')}</div>
        <div class="two" style="margin-top:12px"><button class="btn btn-sand btn-sm" data-m="allcats">${ui('grid')}Категорії</button><button class="btn btn-sand btn-sm" data-m="all">${ui('list')}Усі ${kind === 'exp' ? 'витрати' : 'доходи'}</button></div>` : ''}
    </section>

    ${plannedCard()}
    ${limitsCard(exp)}
    ${recsCard()}
    ${jarsCard()}
    ${compareCard()}
    ${historyCard()}`;
  requestAnimationFrame(() => { const s = root.querySelector('#mSeg'); s && segIndicator(s); });
}

function donut(rows, total) {
  const R = 74, C = 2 * Math.PI * R, gap = rows.length > 1 ? 3 : 0;
  let acc = 0;
  const segs = rows.map((r) => {
    const len = Math.max(0, (r.a / total) * C - gap);
    const s = `<circle class="slice ${focus && focus !== r.id ? 'dim' : ''} ${focus === r.id ? 'on' : ''}" data-m="slice" data-id="${r.id}" cx="90" cy="90" r="${R}" stroke="var(--${r.color})" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}"/>`;
    acc += (r.a / total) * C;
    return s;
  }).join('');
  const f = focus && rows.find((r) => r.id === focus);
  return `<div class="donut"><svg viewBox="0 0 180 180" aria-hidden="true"><g transform="rotate(-90 90 90)">${segs}</g></svg>
    <div class="donut-c">${f ? `<span class="sb sm c-${f.color}">${sticker(f.icon)}</span><b>${fmt(f.a, { cur: false })}</b><span>${esc(f.name)} · ${Math.round(f.a / total * 100)} %</span>`
      : `<span class="donut-k">${kind === 'exp' ? 'витрачено' : 'отримано'}</span><b>${fmt(total, { cur: false })}</b><span>${esc(M().cur)} за ${MONTHS[month.getMonth()].toLowerCase()}</span>`}</div></div>`;
}

const legendRow = (r, total) => `<button class="lg-row ${focus === r.id ? 'on' : ''}" data-m="cat" data-id="${r.id}">
  <span class="sb sm c-${r.color}">${sticker(r.icon)}</span><span class="grow"><b>${esc(r.name)}</b><span class="bar"><i style="width:${Math.max(3, r.a / total * 100)}%;background:var(--${r.color})"></i></span></span>
  <span class="lg-v"><b>${fmt(r.a, { cur: false })}</b><span>${Math.round(r.a / total * 100)} %</span></span></button>`;

/* ---------------- limits ---------------- */
function limitsCard(exp) {
  const lim = M().limits || {};
  const ids = Object.keys(lim).filter((k) => lim[k] > 0);
  const spent = Object.fromEntries(byCat(exp, 'exp').map((r) => [r.id, r.a]));
  return `<section class="card"><div class="card-h"><div><h3 class="h3">Ліміти</h3><span class="small muted">на місяць</span></div><button class="btn btn-sand btn-sm" data-m="limit">${ui('plus')}Ліміт</button></div>
    ${ids.length ? ids.map((id) => {
      const c = mcat('exp', id), s = spent[id] || 0, p = s / lim[id];
      const tone = p >= 1 ? 'over' : p >= .8 ? 'warn' : '';
      return `<button class="lim ${tone}" data-m="limit" data-id="${id}"><span class="sb sm c-sand">${sticker(c.icon)}</span><span class="grow"><span class="lim-l"><b>${esc(c.name)}</b><span>${fmt(s, { cur: false })} з ${fmt(lim[id])}</span></span>
        <span class="bar"><i style="width:${Math.min(100, p * 100)}%"></i></span>${p >= 1 ? `<small>Перевищено на ${fmt(s - lim[id])}</small>` : p >= .8 ? `<small>Лишилось ${fmt(lim[id] - s)}</small>` : ''}</span></button>`;
    }).join('') : '<p class="small muted" style="margin:0">Постав межу для категорій, де гроші тікають найшвидше. Planik попередить на 80 %.</p>'}</section>`;
}

function openLimit(id) {
  const lim = M().limits || {};
  let cat = id || null;
  const body = () => `${cat ? '' : `<div class="field"><span class="lbl">Категорія</span>${catGrid('exp', cat, 'data-lc')}</div>`}
    ${cat ? `<div class="lim-head"><span class="sb c-sand">${sticker(mcat('exp', cat).icon)}</span><b>${esc(mcat('exp', cat).name)}</b></div>` : ''}
    <div class="field"><span class="lbl">Ліміт на місяць, ${esc(M().cur)}</span><input class="inp amt-inp" id="lA" inputmode="decimal" placeholder="0" value="${cat && lim[cat] ? lim[cat] : ''}"></div>
    ${id ? '<button class="btn btn-ghost btn-sm danger" data-del>Прибрати ліміт</button>' : ''}`;
  openSheet({
    title: id ? 'Ліміт' : 'Новий ліміт', html: body(),
    foot: '<button class="btn btn-acc btn-block" id="lSave">Зберегти</button>',
    onMount(s) {
      s.body.addEventListener('click', (e) => {
        const c = e.target.closest('[data-lc]'); if (c) { cat = c.dataset.lc; haptic(); s.setHtml(body()); s.body.querySelector('#lA').focus(); }
        if (e.target.closest('[data-del]')) { update((st) => { delete st.money.limits[id]; }); s.close(); render(); }
      });
      s.el.querySelector('#lSave').addEventListener('click', () => {
        const v = num(s.body.querySelector('#lA').value);
        if (!cat) return toast('Обери категорію');
        update((st) => { st.money.limits = st.money.limits || {}; if (v > 0) st.money.limits[cat] = v; else delete st.money.limits[cat]; });
        s.close(); render();
      });
    }
  });
}

/** after an expense: warn when a limit is close or crossed */
function limitCheck(op) {
  const lim = (M().limits || {})[op.cat];
  if (!lim || op.t !== 'exp') return;
  const k = monthKey(op.d);
  const s = sumOps(periodOps(k + '-01', k + '-31', 'exp').filter((o) => o.cat === op.cat));
  const before = s - op.a;
  const c = mcat('exp', op.cat).name;
  if (s >= lim && before < lim) setTimeout(() => toast(`«${c}»: ліміт вичерпано`), 2700);
  else if (s >= lim * .8 && before < lim * .8) setTimeout(() => toast(`«${c}»: використано ${Math.round(s / lim * 100)} % ліміту`), 2700);
}

/* ---------------- recurring payments ---------------- */
/** next due date of a recurring payment, from a given day */
function dueFrom(r, from = todayYmd()) {
  const f = parseYmd(from);
  for (let k = 0; k < 14; k++) {
    const mm = addMonths(f, k);
    const d = ymd(new Date(mm.getFullYear(), mm.getMonth(), Math.min(r.day, daysInMonth(mm.getFullYear(), mm.getMonth()))));
    if (d < r.start || (r.paid || {})[monthKey(d)]) continue;
    return d; // the first unpaid one — may be overdue
  }
  return null;
}

function recsCard() {
  const list = (M().recs || []).map((r) => ({ r, d: dueFrom(r) })).filter((x) => x.d).sort((a, b) => a.d.localeCompare(b.d));
  const sum = list.reduce((a, x) => a + x.r.a, 0);
  return `<section class="card"><div class="card-h"><div><h3 class="h3">Регулярні платежі</h3><span class="small muted">${list.length ? `${fmt(sum)} щомісяця` : 'оренда, підписки, звʼязок'}</span></div><button class="btn btn-sand btn-sm" data-m="rec">${ui('plus')}Платіж</button></div>
    ${list.length ? list.map(({ r, d }) => {
      const paid = !!(r.paid || {})[monthKey(d)];
      const late = !paid && d < todayYmd();
      const dd = Math.round((parseYmd(d) - parseYmd(todayYmd())) / 86400000);
      return `<div class="rec"><button class="rec-main" data-m="rec" data-id="${r.id}"><span class="sb sm c-sand">${sticker(mcat('exp', r.cat).icon)}</span>
        <span class="grow"><b>${esc(r.name)}</b><span>${parseYmd(d).getDate()} ${MONTHS_GEN[parseYmd(d).getMonth()]} · ${fmt(r.a)}</span></span></button>
        ${paid ? `<span class="pill-when">оплачено</span>` : `<button class="pill-when ${late || dd <= 2 ? 'hot' : ''}" data-m="pay" data-id="${r.id}" data-d="${d}">${late ? 'Оплатити' : dd === 0 ? 'Сьогодні' : dd === 1 ? 'Завтра' : 'за ' + dd + ' дн.'}</button>`}</div>`;
    }).join('') : '<p class="small muted" style="margin:0">Додай платіж, і він зʼявиться в календарі з нагадуванням. Відмітиш оплату там чи тут — Planik сам запише витрату.</p>'}</section>`;
}

function openRec(r) {
  const isNew = !r;
  const x = r ? { ...r } : { id: uid(), name: '', a: '', cat: 'rent', day: Math.min(28, new Date().getDate()), start: todayYmd(), paid: {}, ev: null };
  const body = () => `<div class="field"><input class="inp inp-title" id="rN" maxlength="40" placeholder="Що оплачуємо?" value="${esc(x.name)}"></div>
    <div class="field two"><div><span class="lbl">Сума, ${esc(M().cur)}</span><input class="inp" id="rA" inputmode="decimal" placeholder="0" value="${x.a}"></div>
      <div><span class="lbl">Число місяця</span><input class="inp" id="rD" inputmode="numeric" maxlength="2" value="${x.day}"></div></div>
    <div class="field"><span class="lbl">Категорія</span>${catGrid('exp', x.cat, 'data-rc')}</div>
    ${isNew ? '' : '<button class="btn btn-ghost btn-sm danger" data-del>Видалити платіж</button>'}`;
  const read = (s) => { x.name = s.body.querySelector('#rN').value.trim(); x.a = num(s.body.querySelector('#rA').value); x.day = Math.min(31, Math.max(1, parseInt(s.body.querySelector('#rD').value, 10) || 1)); };
  openSheet({
    title: isNew ? 'Регулярний платіж' : 'Платіж', html: body(),
    foot: `<button class="btn btn-acc btn-block" id="rSave">${isNew ? 'Додати й поставити в календар' : 'Зберегти'}</button>`,
    onMount(s) {
      s.body.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-rc]'); if (c) { read(s); x.cat = c.dataset.rc; haptic(); s.setHtml(body()); }
        if (e.target.closest('[data-del]')) {
          const ok = await ask(`Видалити «${x.name}»? Подія в календарі теж зникне.`, [{ label: 'Видалити', value: 1, style: 'danger' }]);
          if (!ok) return;
          if (x.ev) deleteEvent(x.ev);
          update((st) => { st.money.recs = st.money.recs.filter((q) => q.id !== x.id); });
          s.close(); render();
        }
      });
      s.el.querySelector('#rSave').addEventListener('click', () => {
        read(s);
        if (!x.name) { s.body.querySelector('#rN').focus(); return toast('Назви платіж'); }
        if (!x.a) { s.body.querySelector('#rA').focus(); return toast('Вкажи суму'); }
        // the calendar side: a monthly all-day task with a reminder the day before
        const first = dueFrom(x, x.start);
        const ev = (x.ev && eventById(x.ev)) || { id: uid(), kind: 'task', cat: 'buy', allDay: true, start: '', end: '', repeat: 'monthly', until: '', important: false, remind: [1440, 0], place: '', notes: '', checklist: [], birthYear: '', doneDates: [], created: Date.now() };
        Object.assign(ev, { title: `Оплатити: ${x.name}`, date: first, pay: x.id, notes: `${fmt(x.a)} · з розділу «Гроші»` });
        saveEvent(ev);
        x.ev = ev.id;
        update((st) => { const i = st.money.recs.findIndex((q) => q.id === x.id); if (i >= 0) st.money.recs[i] = x; else st.money.recs.push(x); });
        s.close(); render(); toast(isNew ? 'Додано. Нагадаю напередодні' : 'Збережено');
      });
    }
  });
}

function payRec(id, d, { fromCalendar = false } = {}) {
  const r = M().recs.find((q) => q.id === id);
  if (!r || (r.paid || {})[monthKey(d)]) return;
  const op = { id: uid(), t: 'exp', a: r.a, cat: r.cat, d: d > todayYmd() ? todayYmd() : d, note: r.name, ts: Date.now(), rec: r.id };
  update((st) => {
    st.money.ops.push(op);
    const q = st.money.recs.find((x) => x.id === id); q.paid = q.paid || {}; q.paid[monthKey(d)] = op.id;
    const ev = r.ev && st.events.find((e) => e.id === r.ev);
    if (ev && !fromCalendar) { ev.doneDates = ev.doneDates || []; if (!ev.doneDates.includes(d)) ev.doneDates.push(d); }
  });
  haptic(15);
  toast(`«${r.name}» оплачено · −${fmt(r.a)}`, { action: 'Скасувати', onAction: () => { unpay(id, d); render(); } });
  limitCheck(op);
  render();
}
function unpay(id, d) {
  update((st) => {
    const q = st.money.recs.find((x) => x.id === id); if (!q) return;
    const opId = (q.paid || {})[monthKey(d)];
    st.money.ops = st.money.ops.filter((o) => o.id !== opId);
    delete q.paid[monthKey(d)];
    const ev = q.ev && st.events.find((e) => e.id === q.ev);
    if (ev && ev.doneDates) ev.doneDates = ev.doneDates.filter((x) => x !== d);
  });
}
function payFromCalendar(id, date) { payRec(id, date, { fromCalendar: true }); }

/* ---------------- jars ---------------- */
const JAR_COLORS = ['butter', 'peach', 'sky', 'tangerine', 'cobalt', 'navy'];
function jarsCard() {
  const jars = M().jars || [];
  // before the first jar: a card that explains the idea
  if (!jars.length) return `<section class="card"><div class="card-h"><div><h3 class="h3">Скарбнички</h3><span class="small muted">цілі, на які збираєш</span></div><button class="btn btn-sand btn-sm" data-m="jar">${ui('plus')}Нова</button></div>
    <p class="small muted" style="margin:0">Відпустка, ноутбук, подушка безпеки. Гроші в скарбничці не рахуються як витрата, але й не висять на рахунку.</p></section>`;
  // afterwards: just a title and a row of jars on the app background, "+" at the end
  return `<section class="jars-sec"><div class="sec-h"><h3 class="h3">Скарбнички</h3><span class="small muted">відкладено ${fmt(jars.reduce((a, j) => a + j.saved, 0))}</span></div>
    <div class="jars-row">${jars.map((j) => {
      const p = j.goal ? Math.min(1, j.saved / j.goal) : 0;
      return `<button class="jar c-${j.color}" data-m="jar" data-id="${j.id}" style="--p:${p * 100}"><span class="jar-ring"><span class="sb c-${j.color}">${sticker(j.icon || 'piggy')}</span></span>
        <b>${esc(j.name)}</b><span>${fmt(j.saved, { cur: false })}${j.goal ? ` з ${fmt(j.goal)}` : ` ${esc(M().cur)}`}</span>${j.goal ? `<i class="jar-p">${Math.round(p * 100)} %</i>` : ''}</button>`;
    }).join('')}<button class="jar jar-add" data-m="jar" aria-label="Нова скарбничка"><span>${ui('plus')}</span><b>Нова</b></button></div></section>`;
}

/* ---------------- purchases planned in the calendar ---------------- */
/** "Покупки" events with an amount in the viewed month */
function plannedBuys() {
  return occurrences(mFrom(), mTo(), (ev) => ev.cat === 'buy' && ev.amount > 0)
    .map(({ ev, date }) => ({ ev, date, op: (ev.bought || {})[date] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export const plannedLeft = () => plannedBuys().filter((x) => !x.op).reduce((a, x) => a + x.ev.amount, 0);

/** balance at the end of the viewed month, counting what is planned */
function projection(bal) {
  if (mTo() < todayYmd()) return '';
  const fut = futureOps(mTo());
  const delta = fut.reduce((a, o) => a + (o.t === 'inc' ? o.a : -o.a), 0) - plannedLeft();
  if (!fut.length && !plannedLeft()) return '';
  return `<p class="bal-plan">${ui('calendar')}з урахуванням запланованого на кінець ${MONTHS_GEN[month.getMonth()]} буде <b>${fmt(bal + delta)}</b></p>`;
}

function plannedCard() {
  const buys = plannedBuys();
  const ops = futureOps(mTo()).filter((o) => o.d >= mFrom()).sort((a, b) => a.d.localeCompare(b.d));
  if (!buys.length && !ops.length) return '';
  const inc = ops.filter((o) => o.t === 'inc').reduce((a, o) => a + o.a, 0);
  const exp = ops.filter((o) => o.t === 'exp').reduce((a, o) => a + o.a, 0) + buys.filter((x) => !x.op).reduce((a, x) => a + x.ev.amount, 0);
  const rows = [
    ...ops.map((o) => ({ d: o.d, html: `<div class="rec"><button class="rec-main" data-m="op" data-id="${o.id}"><span class="sb sm ${o.t === 'inc' ? 'c-cobalt' : 'c-sand'}">${sticker(mcat(o.t, o.cat).icon)}</span>
        <span class="grow"><b>${esc(o.note || mcat(o.t, o.cat).name)}</b><span>${parseYmd(o.d).getDate()} ${MONTHS_GEN[parseYmd(o.d).getMonth()]} · ${esc(mcat(o.t, o.cat).name)}</span></span></button>
        <span class="op-a ${o.t === 'inc' ? 'up' : ''}">${fmt(o.t === 'inc' ? o.a : -o.a, { sign: o.t === 'inc' })}</span></div>` })),
    ...buys.map(({ ev, date, op }) => {
      const o = op && M().ops.find((x) => x.id === op);
      const late = !op && date < todayYmd();
      return { d: date, html: `<div class="rec ${op ? 'bought' : ''}"><div class="rec-main"><span class="sb sm c-sand">${sticker('bag')}</span>
        <span class="grow"><b>${esc(ev.title)}</b><span>${parseYmd(date).getDate()} ${MONTHS_GEN[parseYmd(date).getMonth()]} · ${op && o ? `куплено за ${fmt(o.a)}` : `покупка, план ${fmt(ev.amount)}`}</span></span></div>
        ${op ? `<span class="pill-when">${ui('check')}</span>` : `<button class="pill-when ${late ? 'hot' : ''}" data-m="bought" data-ev="${ev.id}" data-d="${date}">Куплено</button>`}</div>` };
    })
  ].sort((a, b) => a.d.localeCompare(b.d));
  return `<section class="card"><div class="card-h"><div><h3 class="h3">Заплановано</h3><span class="small muted">${[inc ? `+${fmt(inc)}` : '', exp ? `−${fmt(exp)}` : ''].filter(Boolean).join(' · ') || 'усе вже сталося'}</span></div></div>
    ${rows.map((r) => r.html).join('')}
    <p class="tiny muted" style="margin:10px 2px 0">Заплановане додасться до рахунку або спишеться в свій день.</p></section>`;
}

/** record a planned purchase as a real expense (amount can be changed before saving) */
export function recordBuy(evId, date, after) {
  const ev = eventById(evId);
  if (!ev || (ev.bought || {})[date]) return;
  openOp({
    t: 'exp',
    preset: { a: ev.amount || '', cat: guessCat(ev, ev.title), note: ev.title, d: date > todayYmd() ? todayYmd() : date },
    onSaved: (op) => {
      update((st) => {
        const e = st.events.find((x) => x.id === evId); if (!e) return;
        e.bought = e.bought || {}; e.bought[date] = op.id;
        if (e.kind === 'task') { e.doneDates = e.doneDates || []; if (!e.doneDates.includes(date)) e.doneDates.push(date); }
      });
      render(); after && after();
    }
  });
}

function openJar(j) {
  const isNew = !j;
  const x = j ? { ...j } : { id: uid(), name: '', goal: '', saved: 0, color: JAR_COLORS[(M().jars || []).length % JAR_COLORS.length], icon: 'piggy' };
  if (isNew) {
    const body = () => `<div class="field"><input class="inp inp-title" id="jN" maxlength="30" placeholder="На що збираєш?" value="${esc(x.name)}"></div>
      <div class="field"><span class="lbl">Ціль, ${esc(M().cur)} (можна без неї)</span><input class="inp" id="jG" inputmode="decimal" placeholder="0" value="${x.goal}"></div>
      <div class="field"><span class="lbl">Колір</span><div class="colors">${JAR_COLORS.map((c) => `<button type="button" class="swatch" data-jc="${c}" aria-pressed="${x.color === c}" style="background:var(--${c})"></button>`).join('')}</div></div>
      <div class="field"><span class="lbl">Іконка</span><div class="st-row">${['piggy', 'plane', 'laptop', 'house', 'car', 'gift', 'star', 'cap', 'teddy', 'heart', 'phone', 'bag'].map((i) => `<button type="button" class="st-pick c-${x.color}" data-ji="${i}" aria-pressed="${x.icon === i}" style="${x.icon === i ? 'background:var(--cut)' : ''}">${sticker(i)}</button>`).join('')}</div></div>`;
    const read = (s) => { x.name = s.body.querySelector('#jN').value.trim(); x.goal = num(s.body.querySelector('#jG').value); };
    return openSheet({
      title: 'Нова скарбничка', html: body(),
      foot: '<button class="btn btn-acc btn-block" id="jSave">Створити</button>',
      onMount(s) {
        s.body.addEventListener('click', (e) => {
          const c = e.target.closest('[data-jc]'); if (c) { read(s); x.color = c.dataset.jc; s.setHtml(body()); }
          const i = e.target.closest('[data-ji]'); if (i) { read(s); x.icon = i.dataset.ji; s.setHtml(body()); }
        });
        s.el.querySelector('#jSave').addEventListener('click', () => {
          read(s);
          if (!x.name) { s.body.querySelector('#jN').focus(); return toast('Назви скарбничку'); }
          update((st) => { st.money.jars = st.money.jars || []; st.money.jars.push(x); });
          s.close(); render();
        });
      }
    });
  }
  const left = x.goal ? Math.max(0, x.goal - x.saved) : 0;
  openSheet({
    title: x.name,
    html: `<div class="jar-big c-${x.color}" style="--p:${x.goal ? Math.min(100, x.saved / x.goal * 100) : 0}"><span class="jar-ring"><span class="sb lg c-${x.color}">${sticker(x.icon)}</span></span>
        <div><b>${fmt(x.saved)}</b><span>${x.goal ? (left ? `ще ${fmt(left)} до цілі` : 'Ціль досягнуто!') : 'без цілі'}</span></div></div>
      <div class="field"><span class="lbl">Сума, ${esc(M().cur)}</span><input class="inp amt-inp" id="jA" inputmode="decimal" placeholder="0"></div>
      <div class="two"><button class="btn btn-acc" data-j="in">${ui('plus')}Покласти</button><button class="btn btn-sand" data-j="out">${ui('minus')}Забрати</button></div>
      <p class="tiny muted" style="margin:12px 4px 0">«Покласти» переносить гроші з рахунку в скарбничку, «Забрати» — назад.</p>
      <button class="btn btn-ghost btn-sm danger" data-j="del" style="margin-top:14px">Видалити скарбничку</button>`,
    onMount(s) {
      s.body.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-j]'); if (!b) return;
        if (b.dataset.j === 'del') {
          const ok = await ask(x.saved ? `Видалити «${x.name}»? ${fmt(x.saved)} повернуться на рахунок.` : `Видалити «${x.name}»?`, [{ label: 'Видалити', value: 1, style: 'danger' }]);
          if (!ok) return;
          update((st) => { if (x.saved) st.money.ops.push({ id: uid(), t: 'jar', a: -x.saved, jar: x.id, d: todayYmd(), ts: Date.now(), note: x.name }); st.money.jars = st.money.jars.filter((q) => q.id !== x.id); });
          s.close(); return render();
        }
        const v = num(s.body.querySelector('#jA').value);
        if (!v) { s.body.querySelector('#jA').focus(); return; }
        const d = b.dataset.j === 'in' ? v : -Math.min(v, x.saved);
        if (!d) return toast('У скарбничці поки порожньо');
        update((st) => { const q = st.money.jars.find((y) => y.id === x.id); q.saved = Math.round((q.saved + d) * 100) / 100; st.money.ops.push({ id: uid(), t: 'jar', a: d, jar: x.id, d: todayYmd(), ts: Date.now(), note: x.name }); });
        haptic(15); s.close(); render();
        const q = M().jars.find((y) => y.id === x.id);
        toast(d > 0 ? (q.goal && q.saved >= q.goal ? `«${q.name}»: ціль досягнуто!` : `+${fmt(d)} у «${q.name}»`) : `${fmt(-d)} повернулись на рахунок`);
      });
    }
  });
}

/* ---------------- comparison ---------------- */
function compareCard() {
  const cur = isCurMonth();
  const day = cur ? new Date().getDate() : daysInMonth(month.getFullYear(), month.getMonth());
  const pm = addMonths(month, -1);
  const pTo = ymd(new Date(pm.getFullYear(), pm.getMonth(), Math.min(day, daysInMonth(pm.getFullYear(), pm.getMonth()))));
  const a = periodOps(mFrom(), cur ? todayYmd() : mTo(), 'exp');
  const b = periodOps(ymd(pm), cur ? pTo : ymd(new Date(pm.getFullYear(), pm.getMonth() + 1, 0)), 'exp');
  if (!a.length && !b.length) return '';
  const ta = sumOps(a), tb = sumOps(b);
  const ca = Object.fromEntries(byCat(a, 'exp').map((r) => [r.id, r.a])), cb = Object.fromEntries(byCat(b, 'exp').map((r) => [r.id, r.a]));
  const diffs = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].map((id) => ({ id, d: (ca[id] || 0) - (cb[id] || 0), ...mcat('exp', id) }))
    .filter((x) => Math.abs(x.d) > 0).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 4);
  const mx = Math.max(1, ...diffs.map((x) => Math.abs(x.d)));
  const delta = ta - tb, pct = tb ? Math.round(delta / tb * 100) : 0;
  return `<section class="card"><div class="card-h"><div><h3 class="h3">Порівняння</h3><span class="small muted">${cur ? `1–${day} число` : 'цілий місяць'}: ${MONTHS[month.getMonth()].toLowerCase()} і ${MONTHS[pm.getMonth()].toLowerCase()}</span></div></div>
    <div class="cmp-top"><div><span>${MONTHS[pm.getMonth()]}</span><b>${fmt(tb, { cur: false })}</b></div><div><span>${MONTHS[month.getMonth()]}</span><b>${fmt(ta, { cur: false })}</b></div>
      <span class="cmp-badge ${delta > 0 ? 'up' : 'dn'}">${!tb ? 'новий місяць' : delta > 0 ? `+${pct} %` : delta < 0 ? `${pct} %` : 'так само'}</span></div>
    ${diffs.length ? `<div class="cmp-list">${diffs.map((x) => `<div class="cmp-row"><span class="sb sm c-sand">${sticker(x.icon)}</span><span class="grow"><b>${esc(x.name)}</b>
      <span class="cmp-bar ${x.d > 0 ? 'up' : 'dn'}"><i style="width:${Math.abs(x.d) / mx * 100}%"></i></span></span><span class="cmp-v ${x.d > 0 ? 'up' : 'dn'}">${fmt(x.d, { sign: true, cur: false })}</span></div>`).join('')}</div>` : ''}</section>`;
}

/* ---------------- history ---------------- */
const opRow = (o) => {
  const c = o.t === 'jar' ? { name: o.a > 0 ? `У скарбничку «${o.note}»` : `Зі скарбнички «${o.note}»`, icon: 'piggy' } : mcat(o.t, o.cat);
  const amt = o.t === 'inc' ? o.a : -o.a;
  return `<div class="swr" data-op="${o.id}"><button class="swr-del" data-opdel="${o.id}">${ui('trash')}Видалити</button>
    <button class="op-row" data-m="op" data-id="${o.id}" ${o.t === 'jar' ? 'disabled' : ''}><span class="sb sm ${o.t === 'inc' ? 'c-cobalt' : o.t === 'jar' ? 'c-butter' : 'c-sand'}">${sticker(c.icon)}</span>
    <span class="grow"><b>${esc(o.t === 'jar' ? c.name : (o.note || c.name))}</b><span>${isFuture(o) ? '<i class="plan-tag">заплановано</i>' : ''}${o.t === 'jar' ? 'переказ' : esc(o.note ? c.name : humanDate(o.d))}${o.rec ? ' · регулярний' : ''}</span></span>
    <span class="op-a ${o.t === 'inc' ? 'up' : ''}">${fmt(amt, { sign: o.t === 'inc' })}</span></button></div>`;
};

function historyCard() {
  const ops = [...M().ops].filter((o) => o.t !== 'jar' && !isFuture(o)).sort((a, b) => b.d.localeCompare(a.d) || b.ts - a.ts).slice(0, 5);
  return `<section class="card"><div class="card-h"><h3 class="h3">Останні операції</h3>${ops.length ? '<button class="btn btn-sand btn-sm" data-m="hist">Усі</button>' : ''}</div>
    ${ops.length ? `<div class="ops">${ops.map(opRow).join('')}</div>` : '<p class="small muted" style="margin:0">Тут будуть усі витрати й доходи. Тап — змінити, свайп ліворуч — видалити.</p>'}</section>`;
}

function groupedOps(list) {
  const by = new Map();
  for (const o of list.sort((a, b) => b.d.localeCompare(a.d) || b.ts - a.ts)) { if (!by.has(o.d)) by.set(o.d, []); by.get(o.d).push(o); }
  return [...by.entries()].map(([d, os]) => {
    const net = os.reduce((a, o) => a + (o.t === 'inc' ? o.a : o.t === 'exp' ? -o.a : 0), 0);
    const dt = parseYmd(d);
    return `<div class="op-day ${d > todayYmd() ? 'future' : ''}"><div class="op-day-h"><b>${humanDate(d, { withWeekday: true })}${d > todayYmd() ? ' · заплановано' : ''}</b><span>${net ? fmt(net, { sign: true }) : ''}</span></div><div class="ops">${os.map(opRow).join('')}</div></div>`;
  }).join('');
}

export function openHistory({ t = '', cat = '' } = {}) {
  let q = '', ft = t, fc = cat;
  const list = () => [...M().ops].filter((o) => (ft ? o.t === ft : o.t !== 'jar') && (!fc || o.cat === fc)
    && (!q || `${o.note || ''} ${o.t === 'jar' ? '' : mcat(o.t, o.cat).name} ${o.a}`.toLowerCase().includes(q)));
  const results = () => {
    const l = list();
    const tot = l.filter((o) => !isFuture(o)).reduce((a, o) => a + (o.t === 'inc' ? o.a : -o.a), 0);
    const nf = l.filter(isFuture).length;
    return l.length ? `<p class="small muted" style="margin:0 4px 10px">${l.length} ${plural(l.length, 'операція', 'операції', 'операцій')} · разом ${fmt(tot, { sign: true })}${nf ? ` · ${nf} ${plural(nf, 'запланована', 'заплановані', 'запланованих')}` : ''}</p>${groupedOps(l)}`
      : `<div class="empty"><p class="h3">Нічого не знайшлося</p><p class="small">Спробуй інше слово або зніми фільтр.</p></div>`;
  };
  const chips = () => `<div class="chips scroll" style="margin-bottom:12px">${[['', 'Усе'], ['exp', 'Витрати'], ['inc', 'Доходи']].map(([k, l]) => `<button class="chip" data-ht="${k}" aria-pressed="${ft === k && !fc}">${l}</button>`).join('')}
    ${fc ? `<button class="chip" aria-pressed="true" data-hc="">${esc(mcat(ft || 'exp', fc).name)} ${ui('close')}</button>` : ''}</div>`;
  openSheet({
    full: true,
    title: cat ? mcat(t || 'exp', cat).name : t === 'exp' ? 'Усі витрати' : t === 'inc' ? 'Усі доходи' : 'Операції',
    html: `<div class="search"><span>${ui('search')}</span><input class="inp" id="hQ" placeholder="Пошук: кава, оренда, 250" autocomplete="off"></div><div id="hC">${chips()}</div><div id="hR">${results()}</div>`,
    onMount(s) {
      const R = () => { s.body.querySelector('#hR').innerHTML = results(); s.body.querySelector('#hC').innerHTML = chips(); };
      s.body.querySelector('#hQ').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); R(); });
      s.body.addEventListener('click', (e) => {
        const c = e.target.closest('[data-ht]'); if (c) { ft = c.dataset.ht; fc = ''; haptic(); return R(); }
        if (e.target.closest('[data-hc]')) { fc = ''; return R(); }
        const del = e.target.closest('[data-opdel]'); if (del) return deleteOp(del.dataset.opdel, R);
        const o = e.target.closest('[data-m="op"]'); if (o && !o.closest('.swr.open')) { openOp({ op: M().ops.find((x) => x.id === o.dataset.id), after: R }); }
      });
      swipeRows(s.body);
    },
    onClose() { render(); }
  });
}

function deleteOp(id, after) {
  const op = M().ops.find((o) => o.id === id);
  if (!op) return;
  const row = document.querySelector(`.swr[data-op="${id}"]`);
  if (row) row.classList.add('gone');
  setTimeout(() => {
    update((st) => {
      st.money.ops = st.money.ops.filter((o) => o.id !== id);
      if (op.rec) { const r = st.money.recs.find((x) => x.id === op.rec); if (r && r.paid) for (const k of Object.keys(r.paid)) if (r.paid[k] === id) delete r.paid[k]; }
      unlinkPurchase(st, id);
    });
    after && after(); render();
    toast('Операцію видалено', { action: 'Повернути', onAction: () => { update((st) => { st.money.ops.push(op); }); after && after(); render(); } });
  }, 240);
}

/** swipe a row left to reveal "Видалити"; a long swipe deletes at once */
function swipeRows(scope) {
  let row = null, x0 = 0, y0 = 0, dx = 0, dir = null;
  const OPEN = -104;
  scope.addEventListener('touchstart', (e) => {
    const r = e.target.closest('.swr'); if (!r) return;
    scope.querySelectorAll('.swr.open').forEach((o) => { if (o !== r) { o.classList.remove('open'); o.querySelector('.op-row').style.transform = ''; } });
    row = r; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; dir = null;
  }, { passive: true });
  scope.addEventListener('touchmove', (e) => {
    if (!row) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!dir) { if (Math.abs(mx) < 8 && Math.abs(my) < 8) return; dir = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'; }
    if (dir !== 'h') return;
    dx = Math.min(0, mx + (row.classList.contains('open') ? OPEN : 0));
    const b = row.querySelector('.op-row'); b.style.transition = 'none'; b.style.transform = `translateX(${dx}px)`;
  }, { passive: true });
  scope.addEventListener('touchend', () => {
    if (!row || dir !== 'h') { row = null; return; }
    const b = row.querySelector('.op-row'); b.style.transition = '';
    if (dx < -row.offsetWidth * .55) { deleteOp(row.dataset.op, () => scope.closest('.sheet') && scope.querySelector('#hR') && (scope.querySelector('#hR').innerHTML = '')); }
    else if (dx < OPEN / 2) { row.classList.add('open'); b.style.transform = `translateX(${OPEN}px)`; }
    else { row.classList.remove('open'); b.style.transform = ''; }
    row = null;
  });
}

/* ---------------- by category ---------------- */
function openAllCats(t) {
  const list = periodOps(mFrom(), mTo(), t);
  const rows = ranked(byCat(list, t)), total = sumOps(list);
  openSheet({
    title: `${t === 'exp' ? 'Витрати' : 'Доходи'} за категоріями`,
    html: `<p class="small muted" style="margin:0 4px 12px">${MONTHS[month.getMonth()]} · разом ${fmt(total)}</p>
      <div class="legend">${rows.map((r) => legendRow(r, total)).join('')}</div>`,
    onMount(s) { s.body.addEventListener('click', (e) => { const b = e.target.closest('[data-m="cat"]'); if (b) openCatOps(t, b.dataset.id); }); }
  });
}
function openCatOps(t, id) { openHistory({ t, cat: id }); }

/* ---------------- add / edit an operation ---------------- */
function catGrid(t, cur, attr) {
  return `<div class="cat-grid">${cats(t).map((c) => `<button type="button" class="cat-pick" ${attr}="${c.id}" aria-pressed="${cur === c.id}"><span class="sb ${cur === c.id ? (t === 'inc' ? 'c-cobalt' : 'c-tangerine') : 'c-sand'}">${sticker(c.icon)}</span><span>${esc(c.name)}</span></button>`).join('')}
    ${attr === 'data-oc' ? `<button type="button" class="cat-pick" data-newcat="${t}"><span class="sb c-sand" style="background:transparent;box-shadow:inset 0 0 0 2px var(--sand-2)">${ui('plus')}</span><span>Своя</span></button>` : ''}</div>`;
}

export function openOp({ op, t = 'exp', preset = {}, after, onSaved } = {}) {
  const isNew = !op;
  const x = op ? { ...op } : { id: uid(), t, a: '', cat: t === 'inc' ? 'salary' : 'groceries', d: todayYmd(), note: '', ts: Date.now(), ...preset };
  const dayChip = (d, l) => `<button type="button" class="chip" data-od="${d}" aria-pressed="${x.d === d}">${l}</button>`;
  const body = () => `
    ${isNew ? `<div class="seg" id="oSeg" style="margin-bottom:16px"><button type="button" data-ot="exp" aria-pressed="${x.t === 'exp'}">Витрата</button><button type="button" data-ot="inc" aria-pressed="${x.t === 'inc'}">Дохід</button></div>` : ''}
    <div class="amt ${x.t}"><span>${x.t === 'exp' ? '−' : '+'}</span><input id="oA" inputmode="decimal" placeholder="0" value="${x.a}" autocomplete="off" aria-label="Сума"><em>${esc(M().cur)}</em></div>
    <div class="field"><span class="lbl">Категорія</span>${catGrid(x.t, x.cat, 'data-oc')}</div>
    <div class="field"><span class="lbl">Коли</span><div class="chips">${dayChip(ymd(addDays(new Date(), -1)), 'Вчора')}${dayChip(todayYmd(), 'Сьогодні')}${dayChip(ymd(addDays(new Date(), 1)), 'Завтра')}</div>
      <input class="inp" type="date" id="oD" value="${x.d}" style="margin-top:10px">
      ${x.d > todayYmd() ? `<p class="plan-note">${ui('calendar')}Заплановано: ${x.t === 'exp' ? 'спишеться' : 'додасться'} ${humanDate(x.d)}, до того рахунок не зміниться.</p>` : ''}</div>
    <div class="field"><span class="lbl">Нотатка</span><input class="inp" id="oN" maxlength="60" placeholder="${x.t === 'exp' ? 'Напр. Albert, кава з Олею' : 'Напр. аванс'}" value="${esc(x.note)}" autocomplete="off"></div>
    ${isNew ? '' : '<button type="button" class="btn btn-ghost btn-sm danger" data-odel>Видалити операцію</button>'}`;
  const read = (s) => { const a = s.body.querySelector('#oA'); if (a) x.a = a.value; x.d = s.body.querySelector('#oD').value || x.d; x.note = s.body.querySelector('#oN').value.trim(); };
  openSheet({
    full: true,
    title: isNew ? (x.t === 'exp' ? 'Нова витрата' : 'Новий дохід') : 'Змінити операцію',
    html: body(),
    foot: `<button class="btn btn-acc btn-block" id="oSave">${isNew ? 'Записати' : 'Зберегти'}</button>`,
    onMount(s) {
      const rer = () => { read(s); const top = s.body.scrollTop; s.setHtml(body()); s.body.scrollTop = top; const sg = s.body.querySelector('#oSeg'); sg && segIndicator(sg); };
      requestAnimationFrame(() => { const sg = s.body.querySelector('#oSeg'); sg && segIndicator(sg); });
      if (isNew) setTimeout(() => s.body.querySelector('#oA').focus({ preventScroll: true }), 420);
      s.body.addEventListener('change', (e) => { if (e.target.id === 'oD') rer(); });
      s.body.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.ot) { x.t = b.dataset.ot; x.cat = x.t === 'inc' ? 'salary' : 'groceries'; s.el.querySelector('.sheet-head .h2').textContent = x.t === 'exp' ? 'Нова витрата' : 'Новий дохід'; haptic(); rer(); }
        else if (b.dataset.oc) { x.cat = b.dataset.oc; haptic(); rer(); }
        else if (b.dataset.od) { x.d = b.dataset.od; haptic(); rer(); }
        else if (b.dataset.newcat) { read(s); openCatForm(b.dataset.newcat, (c) => { x.cat = c.id; rer(); }); }
        else if (b.hasAttribute('data-odel')) { s.close(); deleteOp(x.id, after); }
      });
      s.el.querySelector('#oSave').addEventListener('click', () => {
        read(s);
        const a = num(x.a);
        if (a <= 0) { const i = s.body.querySelector('#oA'); i.focus(); haptic(30); return toast('Вкажи суму'); }
        x.a = a;
        if (x.d > todayYmd()) x.plan = true; else if (isNew) delete x.plan;
        update((st) => { const i = st.money.ops.findIndex((o) => o.id === x.id); if (i >= 0) st.money.ops[i] = x; else st.money.ops.push(x); });
        haptic(15); s.close();
        const future = x.d > todayYmd();
        toast(future ? `Заплановано на ${humanDate(x.d)}: ${x.t === 'exp' ? '−' : '+'}${fmt(a)}` : isNew ? `${x.t === 'exp' ? '−' : '+'}${fmt(a)} · ${mcat(x.t, x.cat).name}` : 'Зміни збережено');
        if (isNew && !future) limitCheck(x);
        onSaved && onSaved(x); after && after(); render();
      });
    }
  });
}

function openCatForm(t, done) {
  const c = { id: 'c' + uid(), t, name: '', icon: t === 'inc' ? 'money' : 'star' };
  const icons = [...new Set(['star', 'heart', 'music', 'camera', 'game', 'plant', 'coffee', 'glass', 'phone', 'brush', 'tooth', 'bike', 'walk', 'book', 'pen', 'globe', 'money', 'trophy', 'target', 'sun', 'moon', 'apple', 'shoe', 'flame'])].filter((i) => STICKER_ORDER.includes(i) || true);
  const body = () => `<div class="field"><input class="inp inp-title" id="cN" maxlength="24" placeholder="Назва категорії" value="${esc(c.name)}"></div>
    <div class="field"><span class="lbl">Іконка</span><div class="st-row">${icons.map((i) => `<button type="button" class="st-pick c-tangerine" data-ci="${i}" aria-pressed="${c.icon === i}" style="${c.icon === i ? 'background:var(--cut)' : ''}">${sticker(i)}</button>`).join('')}</div></div>`;
  openSheet({
    title: t === 'inc' ? 'Своя категорія доходу' : 'Своя категорія витрат', html: body(),
    foot: '<button class="btn btn-acc btn-block" id="cSave">Додати</button>',
    onMount(s) {
      s.body.addEventListener('click', (e) => { const i = e.target.closest('[data-ci]'); if (i) { c.name = s.body.querySelector('#cN').value.trim(); c.icon = i.dataset.ci; s.setHtml(body()); } });
      s.el.querySelector('#cSave').addEventListener('click', () => {
        c.name = s.body.querySelector('#cN').value.trim();
        if (!c.name) return s.body.querySelector('#cN').focus();
        update((st) => { st.money.cats = st.money.cats || []; st.money.cats.push(c); });
        s.close(); done(c);
      });
    }
  });
}

/* ---------------- starting balance & settings ---------------- */
function openStart() {
  openSheet({
    title: 'Скільки зараз на рахунку?',
    html: `<p class="small muted" style="margin:0 4px 14px">Усі гроші разом: картка, готівка. Далі баланс рахуватиметься сам із витрат і доходів.</p>
      <div class="amt"><input id="sA" inputmode="decimal" placeholder="0" value="${M().start !== null ? Math.round(balance() * 100) / 100 : ''}"><em>${esc(M().cur)}</em></div>`,
    foot: '<button class="btn btn-acc btn-block" id="sSave">Зберегти</button>',
    onMount(s) {
      setTimeout(() => s.body.querySelector('#sA').focus({ preventScroll: true }), 420);
      s.el.querySelector('#sSave').addEventListener('click', () => {
        const want = num(s.body.querySelector('#sA').value);
        // keep history intact: shift the starting point so the balance equals what the person sees
        update((st) => { const cur = balance() - (st.money.start || 0); st.money.start = Math.round((want - cur) * 100) / 100; });
        s.close(); render(); toast('Баланс оновлено');
      });
    }
  });
}

function openSettings() {
  openSheet({
    title: 'Налаштування грошей',
    html: `<div class="field"><span class="lbl">Валюта</span><div class="chips">${CURRENCIES.map(([c, n]) => `<button class="chip" data-cur="${c}" aria-pressed="${M().cur === c}">${c} ${n}</button>`).join('')}</div></div>
      <div class="set"><button class="set-row" data-s="start"><span class="sb sm c-butter">${sticker('wallet')}</span><span class="grow">Баланс на рахунку<span>${fmt(balance())}</span></span>${ui('right')}</button>
      <button class="set-row" data-s="cats"><span class="sb sm c-peach">${sticker('dots')}</span><span class="grow">Свої категорії<span>${(M().cats || []).length ? (M().cats || []).map((c) => c.name).join(', ') : 'ще немає'}</span></span>${ui('right')}</button></div>`,
    onMount(s) {
      s.body.addEventListener('click', (e) => {
        const c = e.target.closest('[data-cur]'); if (c) { update((st) => { st.money.cur = c.dataset.cur; }); s.close(); render(); return; }
        const r = e.target.closest('[data-s]'); if (!r) return;
        if (r.dataset.s === 'start') { s.close(); openStart(); }
        if (r.dataset.s === 'cats') { s.close(); manageCats(); }
      });
    }
  });
}
function manageCats() {
  const own = M().cats || [];
  openSheet({
    title: 'Свої категорії',
    html: `${own.length ? `<div class="set">${own.map((c) => `<div class="set-row"><span class="sb sm c-sand">${sticker(c.icon)}</span><span class="grow">${esc(c.name)}<span>${c.t === 'inc' ? 'дохід' : 'витрата'}</span></span><button class="ibtn sm" data-cdel="${c.id}" aria-label="Видалити">${ui('trash')}</button></div>`).join('')}</div>` : '<p class="small muted">Свою категорію можна додати прямо під час запису витрати чи доходу: кнопка «Своя» в кінці сітки.</p>'}`,
    onMount(s) {
      s.body.addEventListener('click', (e) => {
        const d = e.target.closest('[data-cdel]'); if (!d) return;
        update((st) => { st.money.cats = st.money.cats.filter((c) => c.id !== d.dataset.cdel); });
        s.close(); manageCats(); render();
      });
    }
  });
}

/* ---------------- purchases noticed in Pulse ---------------- */
/** checklist items ticked as bought during the last 3 weeks that are not recorded yet */
export function pendingPurchases() {
  const out = [];
  const from = ymd(addDays(new Date(), -21)), to = ymd(addDays(new Date(), 45));
  const seen = new Set();
  for (const { ev, date } of occurrences(from, to)) {
    if (seen.has(ev.id)) continue; seen.add(ev.id);
    for (const c of ev.checklist || []) if (c.done && !c.spent && (c.doneAt || 0) > Date.now() - 21 * 86400000) out.push({ ev, item: c, date });
  }
  return out.sort((a, b) => (b.item.doneAt || 0) - (a.item.doneAt || 0));
}
function purchaseBanner() {
  const p = pendingPurchases()[0];
  if (!p) return '';
  const more = pendingPurchases().length - 1;
  return `<section class="buy-banner reveal"><span class="sb c-butter">${sticker('bag')}</span><div class="grow"><b>Куплено: «${esc(p.item.text)}»</b>
    <span>Відмічено в Пульсі для «${esc(p.ev.title)}». Записати як витрату?${more > 0 ? ` Ще ${more} в черзі.` : ''}</span>
    <div class="buy-act"><button class="btn btn-ink btn-sm" data-m="buy" data-ev="${p.ev.id}" data-item="${p.item.id}">Записати</button><button class="btn btn-ghost btn-sm" data-m="buyskip" data-ev="${p.ev.id}" data-item="${p.item.id}">Не треба</button></div></div></section>`;
}
function guessCat(ev, text) {
  const t = text.toLowerCase();
  if (ev.kind === 'birthday' || /подарун|квіт|листівк/.test(t)) return 'gifts';
  if (/торт|продукт|їж|вино|сир|хліб|фрукт/.test(t)) return 'groceries';
  if (/квит|кіно|концерт/.test(t)) return 'fun';
  if (/ліки|аптек/.test(t)) return 'health';
  return 'shop';
}
function markItem(evId, itemId, val) {
  update((st) => { const ev = st.events.find((e) => e.id === evId); const it = ev && (ev.checklist || []).find((c) => c.id === itemId); if (it) it.spent = val; });
}
function unlinkPurchase(st, opId) {
  for (const ev of st.events) {
    for (const c of ev.checklist || []) if (c.spent === opId) delete c.spent;
    for (const k of Object.keys(ev.bought || {})) if (ev.bought[k] === opId) delete ev.bought[k];
  }
}
export function recordPurchaseExt(evId, itemId, after) { recordPurchase(evId, itemId, after); }
function recordPurchase(evId, itemId, after) {
  const ev = eventById(evId); const it = ev && (ev.checklist || []).find((c) => c.id === itemId);
  if (!it) return;
  openOp({ t: 'exp', preset: { cat: guessCat(ev, it.text), note: it.text }, onSaved: (op) => { markItem(evId, itemId, op.id); render(); after && after(); } });
}

/* ---------------- stories ---------------- */
export function moneyHasData(p) { return periodOps(p.from, p.to).some((o) => o.t !== 'jar'); }
export function moneySlides(p) {
  const exp = periodOps(p.from, p.to, 'exp'), inc = periodOps(p.from, p.to, 'inc');
  if (!exp.length && !inc.length) return [];
  const te = sumOps(exp), ti = sumOps(inc);
  const rows = ranked(byCat(exp, 'exp'));
  const out = [];
  if (rows.length) {
    const R = 70, C = 2 * Math.PI * R; let acc = 0;
    const segs = rows.map((r) => { const len = Math.max(0, (r.a / te) * C - 3); const s = `<circle cx="90" cy="90" r="${R}" fill="none" stroke-width="30" stroke="var(--${r.color})" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}"/>`; acc += (r.a / te) * C; return s; }).join('');
    out.push({ bg: 'cream', html: `<div class="sx-mid"><p class="sx-kicker">гроші за ${p.kind === 'week' ? 'тиждень' : 'місяць'}</p><h2 class="sx-h">На що пішли гроші</h2>
      <div class="sx-donut"><svg viewBox="0 0 180 180"><g transform="rotate(-90 90 90)">${segs}</g></svg><span><b>${fmt(te, { cur: false })}</b>${esc(M().cur)}</span></div>
      <div class="sx-bars">${rows.slice(0, 3).map((r, i) => `<div class="sx-bar" style="--d:${i * 90}ms"><span class="sb sm c-${r.color}">${sticker(r.icon)}</span><span class="sx-bar-body"><span class="sx-bar-l"><b>${esc(r.name)}</b><span>${Math.round(r.a / te * 100)} %</span></span><span class="sx-bar-t"><i style="--w:${r.a / rows[0].a * 100}%;background:var(--${r.color})"></i></span></span></div>`).join('')}</div></div>` });
  }
  const top = rows[0];
  out.push({ bg: 'cobalt', html: `<div class="sx-mid"><p class="sx-kicker">${top ? 'найбільша категорія' : 'гроші'}</p>${top ? `<h2 class="sx-hero" style="color:var(--butter)">${esc(top.name)}</h2><p class="sx-big">${fmt(top.a)} · ${Math.round(top.a / te * 100)} % витрат</p>` : ''}
      <div class="sx-io"><div><span>прийшло</span><b>+${fmt(ti)}</b></div><div><span>пішло</span><b>−${fmt(te)}</b></div></div>
      <p class="sx-text">${ti - te >= 0 ? `У плюсі на ${fmt(ti - te)}. Гарно.` : `Витрати більші за доходи на ${fmt(te - ti)}. Подивись, де можна підрізати.`}</p></div>
    ${top ? `<span class="sx-st" style="--cut:var(--tangerine)">${sticker(top.icon)}</span>` : ''}` });
  return out;
}
