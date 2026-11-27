// Колесо балансу: eight areas of life scored 1–10 once a month, drawn as a petal donut.
import { MONTHS, MONTHS_GEN, todayYmd, esc, haptic, parseYmd, addMonths, ymd } from './util.js';
import { getState, update } from './store.js';
import { sticker, ui } from './icons.js';
import { openSheet, toast } from './ui.js';

export const AREAS = [
  { id: 'health', name: 'Здоровʼя', icon: 'heart', color: 'red' },
  { id: 'work', name: 'Робота', icon: 'briefcase', color: 'cobalt' },
  { id: 'money', name: 'Фінанси', icon: 'money', color: 'butter' },
  { id: 'love', name: 'Стосунки', icon: 'star', color: 'peach' },
  { id: 'people', name: 'Родина й друзі', icon: 'chat', color: 'tangerine' },
  { id: 'growth', name: 'Розвиток', icon: 'book', color: 'navy' },
  { id: 'rest', name: 'Відпочинок', icon: 'sun', color: 'sky' },
  { id: 'home', name: 'Дім і простір', icon: 'house', color: 'stone' }
];

const W = () => getState().wheel || {};
const curKey = () => todayYmd().slice(0, 7);
export const wheelOf = (k) => W()[k] || null;
const avg = (sc) => { const v = AREAS.map((a) => sc[a.id]).filter(Boolean); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0; };
const monthName = (k) => MONTHS[+k.slice(5, 7) - 1];
const monthLabel = (k) => `${monthName(k)} ${k.slice(0, 4)}`;

/* ---------- drawing ---------- */
const P = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
function sector(cx, cy, r0, r1, a0, a1) {
  const [x0, y0] = P(cx, cy, r1, a0), [x1, y1] = P(cx, cy, r1, a1), [x2, y2] = P(cx, cy, r0, a1), [x3, y3] = P(cx, cy, r0, a0);
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r1} ${r1} 0 ${big} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r0} ${r0} 0 ${big} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

/** the wheel itself; scores may be partial (0 = not set yet) */
export function wheelSvg(sc, { size = 240, icons = true, center = true, ghost = false, anim = true } = {}) {
  const c = 120, r0 = 30, rMax = 96, n = AREAS.length, gap = 0.045;
  const step = (2 * Math.PI) / n, start = -Math.PI / 2;
  let g = '';
  // guide rings
  for (let k = 2; k <= 10; k += 2) g += `<circle cx="${c}" cy="${c}" r="${r0 + (rMax - r0) * k / 10}" class="wh-ring"/>`;
  AREAS.forEach((a, i) => {
    const a0 = start + i * step + gap, a1 = start + (i + 1) * step - gap;
    g += `<path class="wh-bg" d="${sector(c, c, r0, rMax, a0, a1)}"/>`;
    const v = sc[a.id] || 0;
    if (v && !ghost) g += `<path class="wh-pet ${anim ? 'anim' : ''}" style="--d:${i * 60}ms;fill:var(--${a.color})" d="${sector(c, c, r0, r0 + (rMax - r0) * v / 10, a0, a1)}"/>`;
    if (icons) {
      const [x, y] = P(c, c, rMax + 15, (a0 + a1) / 2);
      g += `<g transform="translate(${(x - 11).toFixed(1)} ${(y - 11).toFixed(1)})" class="wh-ic" style="color:var(--${a.color})">${sticker(a.icon).replace('<svg', '<svg width="22" height="22"')}</g>`;
    }
  });
  const m = avg(sc);
  return `<svg class="wheel" viewBox="-10 -10 260 260" width="${size}" height="${size}" aria-hidden="true">${g}
    ${center ? `<circle cx="${c}" cy="${c}" r="${r0 - 4}" class="wh-mid"/><text x="${c}" y="${c + 7}" text-anchor="middle" class="wh-avg">${ghost || !m ? '?' : m.toFixed(1).replace('.', ',')}</text>` : ''}</svg>`;
}

/* ---------- Pulse card ---------- */
export function wheelCardHtml() {
  const k = curKey(), w = wheelOf(k);
  const past = Object.keys(W()).filter((x) => x !== k).length;
  if (!w) {
    const late = +todayYmd().slice(8) >= 20;
    return `<section class="card wheel-card"><div class="card-h"><div><h3 class="h3">Колесо балансу</h3><span class="small muted">${monthName(k)} · ще не оцінено</span></div>
        ${past ? `<button class="btn btn-sand btn-sm" data-wh="archive">Минулі</button>` : ''}</div>
      <div class="wheel-cta"><div class="wheel-wrap ghost">${wheelSvg({}, { size: 132, ghost: true, icons: false })}</div>
        <div><p>Оціни вісім сфер життя від 1 до 10. Раз на місяць, хвилина часу.${late ? ' Місяць уже добігає кінця.' : ''}</p><button class="btn btn-acc btn-sm" data-wh="edit">Оцінити ${monthName(k).toLowerCase()}</button></div></div></section>`;
  }
  const sorted = AREAS.map((a) => ({ ...a, v: w.sc[a.id] })).sort((x, y) => y.v - x.v);
  const today = todayYmd(), editable = w.at && w.at.slice(0, 10) === today;
  return `<section class="card wheel-card"><div class="card-h"><div><h3 class="h3">Колесо балансу</h3><span class="small muted">${monthName(k)} · середнє ${avg(w.sc).toFixed(1).replace('.', ',')}</span></div>
      ${past ? `<button class="btn btn-sand btn-sm" data-wh="archive">Минулі</button>` : ''}</div>
    <button class="wheel-wrap" data-wh="${editable ? 'edit' : 'view'}" aria-label="Колесо балансу">${wheelSvg(w.sc, { size: 250 })}</button>
    <div class="wh-sum"><span><i style="background:var(--${sorted[0].color})"></i>найсильніше: <b>${esc(sorted[0].name.toLowerCase())}</b></span><span><i style="background:var(--${sorted[7].color})"></i>просідає: <b>${esc(sorted[7].name.toLowerCase())}</b></span></div>
    <p class="tiny muted" style="margin:10px 2px 0">${editable ? 'Сьогодні ще можна виправити: торкнись колеса.' : `Наступне оцінювання — з 1 ${MONTHS_GEN[+addMonths(parseYmd(k + '-01'), 1).getMonth()]}.`}</p></section>`;
}

export function bindWheel(root, rerender) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wh]');
    if (!b) return;
    haptic();
    if (b.dataset.wh === 'edit') openWheelEdit(rerender);
    if (b.dataset.wh === 'archive') openArchive();
    if (b.dataset.wh === 'view') openWheelView(curKey());
  });
}

/* ---------- filling in ---------- */
export function openWheelEdit(after) {
  const k = curKey();
  const old = wheelOf(k);
  if (old && !(old.at && old.at.slice(0, 10) === todayYmd())) { toast(`Колесо за ${monthName(k).toLowerCase()} уже є`); return openWheelView(k); }
  const sc = old ? { ...old.sc } : {};
  const rows = () => AREAS.map((a) => `<div class="wh-row"><div class="wh-row-h"><span class="sb sm c-${a.color}">${sticker(a.icon)}</span><b>${a.name}</b><span class="wh-v">${sc[a.id] || '—'}</span></div>
      <div class="wheel-edit" role="group" aria-label="${a.name}">${Array.from({ length: 10 }, (_, i) => `<button type="button" class="wh-dot ${sc[a.id] >= i + 1 ? 'on' : ''}" data-a="${a.id}" data-v="${i + 1}" style="--c:var(--${a.color})" aria-label="${i + 1}">${i + 1}</button>`).join('')}</div></div>`).join('');
  openSheet({
    full: true,
    title: `Колесо · ${monthName(k).toLowerCase()}`,
    html: `<div class="wheel-wrap sticky" id="whPrev">${wheelSvg(sc, { size: 200, anim: false })}</div>
      <p class="small muted" style="margin:0 4px 14px">Не думай довго: як відчувається саме зараз. 1 — зовсім погано, 10 — краще не буває.</p>
      <div id="whRows">${rows()}</div>`,
    foot: '<button class="btn btn-acc btn-block" id="whSave">Зберегти колесо</button>',
    onMount(s) {
      s.body.addEventListener('click', (e) => {
        const d = e.target.closest('.wh-dot'); if (!d) return;
        sc[d.dataset.a] = +d.dataset.v; haptic(8);
        const row = d.closest('.wh-row');
        row.querySelectorAll('.wh-dot').forEach((x) => x.classList.toggle('on', +x.dataset.v <= sc[d.dataset.a]));
        row.querySelector('.wh-v').textContent = sc[d.dataset.a];
        s.body.querySelector('#whPrev').innerHTML = wheelSvg(sc, { size: 200, anim: false });
      });
      s.el.querySelector('#whSave').addEventListener('click', () => {
        const miss = AREAS.filter((a) => !sc[a.id]);
        if (miss.length) { haptic(30); return toast(`Ще ${miss.length === 1 ? 'одна сфера' : miss.length + ' сфер'}: ${miss.map((a) => a.name.toLowerCase()).join(', ')}`); }
        update((st) => { st.wheel = st.wheel || {}; st.wheel[k] = { sc: { ...sc }, at: new Date().toISOString() }; });
        haptic(15); s.close(); after && after();
        toast('Колесо збережено');
      });
    }
  });
}

/* ---------- one month, with the change since the previous wheel ---------- */
function prevKey(k) { return Object.keys(W()).filter((x) => x < k).sort().pop(); }
export function openWheelView(k) {
  const w = wheelOf(k); if (!w) return;
  const pk = prevKey(k), pw = pk && wheelOf(pk);
  openSheet({
    title: `Колесо · ${monthLabel(k).toLowerCase()}`,
    html: `<div class="wheel-wrap">${wheelSvg(w.sc, { size: 260 })}</div>
      <div class="wh-list">${AREAS.map((a) => {
        const v = w.sc[a.id], d = pw ? v - pw.sc[a.id] : 0;
        return `<div class="wh-li"><span class="sb sm c-${a.color}">${sticker(a.icon)}</span><span class="grow">${a.name}</span>
          ${pw && d ? `<span class="wh-d ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '+' : '−'}${Math.abs(d)}</span>` : ''}<b>${v}</b></div>`;
      }).join('')}</div>
      ${pw ? `<p class="tiny muted" style="margin:10px 4px 0">Зміни порівняно з колесом за ${monthName(pk).toLowerCase()}.</p>` : ''}`
  });
}

/* ---------- archive ---------- */
export function openArchive() {
  const keys = Object.keys(W()).filter((x) => x !== curKey()).sort().reverse();
  openSheet({
    title: 'Минулі колеса',
    html: keys.length ? `<div class="wh-arch">${keys.map((k) => `<button class="wh-arch-it" data-whk="${k}">${wheelSvg(W()[k].sc, { size: 130, icons: false, anim: false })}<b>${monthLabel(k)}</b><span>середнє ${avg(W()[k].sc).toFixed(1).replace('.', ',')}</span></button>`).join('')}</div>`
      : '<div class="empty"><p class="h3">Тут поки порожньо</p><p class="small">Минулі колеса зʼявляться тут із наступного місяця.</p></div>',
    onMount(s) { s.body.addEventListener('click', (e) => { const b = e.target.closest('[data-whk]'); if (b) openWheelView(b.dataset.whk); }); }
  });
}

/* ---------- reminder: from the 25th, if this month is still empty ---------- */
export function wheelReminder(now = new Date()) {
  const k = ymd(now).slice(0, 7);
  if (now.getDate() < 25 || wheelOf(k)) return null;
  return { id: `wheel|${k}`, type: 'wheel', at: new Date(now.getFullYear(), now.getMonth(), 25, 10, 0), month: monthName(k) };
}

/* ---------- monthly summary story ---------- */
export function wheelSlide(p) {
  if (p.kind !== 'month') return null;
  const w = wheelOf(p.from.slice(0, 7));
  if (!w) return null;
  const sorted = AREAS.map((a) => ({ ...a, v: w.sc[a.id] })).sort((x, y) => y.v - x.v);
  return {
    bg: 'cream',
    html: `<div class="sx-mid"><p class="sx-kicker">колесо балансу</p><h2 class="sx-h">Середнє ${avg(w.sc).toFixed(1).replace('.', ',')} з 10</h2>
      <div class="sx-wheel">${wheelSvg(w.sc, { size: 250 })}</div>
      <p class="sx-text">Найсильніше — ${sorted[0].name.toLowerCase()}, найбільше уваги просить ${sorted[7].name.toLowerCase()}.</p></div>`
  };
}
