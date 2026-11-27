// Event builder, event details, shared event row markup.
import { esc, uid, todayYmd, humanDate, inWords, pad, parseYmd, ymd, MONTHS_GEN, haptic, plural } from './util.js';
import { getState, saveEvent, deleteEvent, eventById, catById, colorOf, isDone, toggleDone, reminderOffsets, REMIND_CHOICES, occTime, update } from './store.js';
import { ui, sticker } from './icons.js';
import { openSheet, ask, toast, segIndicator, toggle } from './ui.js';

const REPEATS = [
  ['none', 'Не повторювати'], ['daily', 'Щодня'], ['days', 'Обрані дні'], ['weekdays', 'По буднях'], ['weekly', 'Щотижня'],
  ['biweekly', 'Раз на 2 тижні'], ['monthly', 'Щомісяця'], ['yearly', 'Щороку']
];
const REPEAT_LABEL = Object.fromEntries(REPEATS);
const WD_S = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const wdOf = (d) => (parseYmd(d).getDay() + 6) % 7;
/** "Пн, Ср, Пт" or a friendlier phrase for common sets */
export function daysLabel(days) {
  const d = [...(days || [])].sort();
  const k = d.join('');
  if (k === '01234') return 'По буднях';
  if (k === '56') return 'По вихідних';
  if (k === '0123456') return 'Щодня';
  return 'Щотижня: ' + d.map((i) => WD_S[i]).join(', ');
}
export const repeatText = (ev) => { const r = ev.kind === 'birthday' ? 'yearly' : ev.repeat; return r === 'days' ? daysLabel(ev.days) : REPEAT_LABEL[r]; };

const CHEERS = ['Зроблено. Так тримати!', 'Мінус одна справа', 'Готово. Ти в ритмі', 'Ще один крок уперед', 'Красиво закрито'];
export const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

export function evIcon(ev) {
  if (ev.kind === 'birthday') return 'gift';
  return catById(ev.cat).icon;
}

export function timeLabel(ev) {
  if (ev.allDay || !ev.start) return ev.kind === 'birthday' ? 'весь день' : 'весь день';
  return ev.end ? `${ev.start}–${ev.end}` : ev.start;
}

function ageText(ev, date) {
  if (ev.kind !== 'birthday' || !ev.birthYear) return '';
  const n = parseYmd(date).getFullYear() - ev.birthYear;
  return n > 0 ? `${n} ${plural(n, 'рік', 'роки', 'років')}` : '';
}

/** Card-style row used in the day agenda, timeline and pulse */
export function eventRow({ ev, date }, { showDate = false } = {}) {
  const done = isDone(ev, date);
  const color = colorOf(ev);
  const meta = [];
  if (showDate) meta.push(humanDate(date));
  meta.push(`${ui('clock')}${timeLabel(ev)}`);
  if (ev.place) meta.push(`${ui('place')}${esc(ev.place)}`);
  const age = ageText(ev, date);
  if (age) meta.push(`виповнюється ${age}`);
  const open = (ev.checklist || []).filter((c) => !c.done).length;
  if (open) meta.push(`${ui('bag')}${open}`);
  return `<div class="ev ${done ? 'done' : ''}" data-open="${ev.id}" data-date="${date}" role="button" tabindex="0">
    <span class="sb c-${color}">${sticker(evIcon(ev))}</span>
    <span class="body"><span class="t">${esc(ev.title)}</span>
      <span class="m">${ev.important ? '<span class="tag red">Важливо</span>' : ''}${meta.map((m) => `<span>${m}</span>`).join('')}</span></span>
    ${ev.kind === 'task' ? `<button class="check ${done ? 'on' : ''}" data-done="${ev.id}" data-date="${date}" aria-label="${done ? 'Повернути в роботу' : 'Позначити виконаним'}">${ui('check')}</button>` : ''}
  </div>`;
}

/** wire clicks for rows inside a container */
export function bindEventRows(root, rerender) {
  root.addEventListener('click', (e) => {
    const d = e.target.closest('[data-done]');
    if (d) {
      e.stopPropagation();
      const ev = eventById(d.dataset.done);
      const was = isDone(ev, d.dataset.date);
      toggleDone(d.dataset.done, d.dataset.date);
      haptic(12);
      if (!was) toast(cheer());
      rerender && rerender();
      return;
    }
    const o = e.target.closest('[data-open]');
    if (o && root.contains(o)) openEvent(o.dataset.open, o.dataset.date, rerender);
  });
}

/* ------------------------------------------------------------------ */
/*  Details                                                            */
/* ------------------------------------------------------------------ */
export function openEvent(id, date, rerender) {
  const ev = eventById(id);
  if (!ev) return;
  date = date || ev.date;
  const color = colorOf(ev);
  const cat = catById(ev.cat);
  const d = parseYmd(date);
  const rem = reminderOffsets(ev);
  const age = ageText(ev, date);

  const render = () => {
    const done = isDone(ev, date);
    const cl = ev.checklist || [];
    return `
    <div class="det-hero c-${color}" style="background:var(--cut);color:${color === 'ink' ? 'var(--cream)' : ['cobalt', 'red', 'navy'].includes(color) ? '#FFF6EE' : 'var(--on-color)'}">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="sb" style="background:rgba(255,255,255,.22);--cut:transparent;color:inherit">${sticker(evIcon(ev))}</span>
        <span class="tag" style="background:rgba(255,255,255,.28);color:inherit">${ev.kind === 'birthday' ? 'День народження' : esc(cat.name)}</span>
        ${ev.important && color !== 'red' ? '<span class="tag red">Важливо</span>' : ''}
        ${ev.important && color === 'red' ? '<span class="tag" style="background:rgba(255,255,255,.28);color:inherit">Особливо важливо</span>' : ''}
      </div>
      <h2 class="h1">${esc(ev.title)}</h2>
      <div class="meta">${humanDate(date, { withWeekday: true })} · ${timeLabel(ev)}${age ? ` · виповнюється ${age}` : ''}</div>
    </div>
    <div class="card" style="padding:4px 16px">
      ${(ev.kind === 'birthday' ? 'yearly' : ev.repeat) !== 'none' && (ev.repeat || ev.kind === 'birthday') ? `<div class="det-row">${ui('repeat')}<div>${repeatText(ev)}${ev.until ? `, до ${humanDate(ev.until)}` : ''}</div></div>` : ''}
      <div class="det-row">${ui('bell')}<div>${rem.length ? rem.map((m) => m === 0 ? 'у момент події' : 'за ' + inWords(m)).join(', ') : 'Без нагадувань'}</div></div>
      ${ev.place ? `<div class="det-row">${ui('place')}<div>${esc(ev.place)}</div></div>` : ''}
      ${ev.notes ? `<div class="det-row">${ui('note')}<div style="white-space:pre-wrap;-webkit-user-select:text;user-select:text">${esc(ev.notes)}</div></div>` : ''}
    </div>
    ${cl.length ? `<div class="card"><div class="card-h"><h3 class="h3">Підготувати й купити</h3><span class="small muted">${cl.filter((c) => c.done).length} з ${cl.length}</span></div>
      ${cl.map((c) => `<button class="cl-item ${c.done ? 'on' : ''}" data-cl="${c.id}"><span class="cl-box">${ui('check')}</span><span class="cl-t">${esc(c.text)}</span></button>`).join('')}</div>` : ''}
    ${ev.kind === 'task' ? `<button class="btn ${done ? 'btn-sand' : 'btn-acc'} btn-block" data-act="done" style="margin-bottom:10px">${ui('check')}${done ? 'Повернути в роботу' : 'Позначити виконаним'}</button>` : ''}
    <div class="det-actions">
      <button class="btn btn-ink" data-act="edit">${ui('edit')}Змінити</button>
      <button class="ibtn" data-act="ics" aria-label="Додати в Календар iPhone" style="width:54px;height:54px">${ui('download')}</button>
      <button class="ibtn" data-act="del" aria-label="Видалити" style="width:54px;height:54px;background:var(--red);color:#FFF6EE">${ui('trash')}</button>
    </div>`;
  };

  const sheet = openSheet({
    head: `<span class="small muted" style="font-weight:800">${d.getDate()} ${MONTHS_GEN[d.getMonth()]}</span>`,
    html: render(),
    onMount(s) {
      s.body.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-cl]');
        if (c) {
          update(() => { const it = ev.checklist.find((x) => x.id === c.dataset.cl); it.done = !it.done; it.doneAt = it.done ? Date.now() : 0; });
          haptic(); s.setHtml(render()); rerender && rerender(); return;
        }
        const a = e.target.closest('[data-act]');
        if (!a) return;
        const act = a.dataset.act;
        if (act === 'done') {
          const was = isDone(ev, date);
          toggleDone(ev.id, date); haptic(12);
          if (!was) toast(cheer());
          s.setHtml(render()); rerender && rerender();
        } else if (act === 'edit') {
          s.close();
          setTimeout(() => openEventForm({ ev, onSaved: rerender }), 200);
        } else if (act === 'ics') {
          downloadIcs(ev);
        } else if (act === 'del') {
          const recurring = ev.kind === 'birthday' || (ev.repeat && ev.repeat !== 'none');
          const choice = await ask(recurring ? 'Ця подія повторюється. Що видалити?' : `Видалити «${ev.title}»?`, recurring
            ? [{ label: 'Тільки цей день', value: 'one', style: 'sand' }, { label: 'Усю серію', value: 'all', style: 'danger' }]
            : [{ label: 'Видалити', value: 'all', style: 'danger' }]);
          if (!choice) return;
          const snapshot = JSON.parse(JSON.stringify(ev));
          deleteEvent(ev.id, choice === 'one' ? date : null);
          s.close(); rerender && rerender();
          toast(choice === 'one' ? 'День прибрано з серії' : 'Подію видалено', {
            action: 'Повернути', ms: 4500,
            onAction: () => { saveEvent(snapshot); rerender && rerender(); }
          });
        }
      });
    }
  });
  return sheet;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */
export function openEventForm({ ev: existing, date, kind, preset, onSaved } = {}) {
  const st = getState();
  const isNew = !existing;
  const ev = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: uid(), kind: kind || 'event', title: '', cat: 'personal', date: date || todayYmd(),
    allDay: false, start: nextHalfHour(), end: '', repeat: 'none', until: '', important: false,
    remind: null, place: '', notes: '', checklist: [], birthYear: '', doneDates: [], created: Date.now(),
    ...(preset || {})
  };
  if (ev.kind === 'birthday') { ev.allDay = true; }
  let customRemind = Array.isArray(ev.remind);

  const remChoices = () => ev.kind === 'birthday' ? REMIND_CHOICES.birthday : (ev.important ? REMIND_CHOICES.important : REMIND_CHOICES.normal);
  const remCurrent = () => customRemind ? ev.remind : reminderOffsets({ ...ev, remind: null });

  const body = () => {
    const bd = ev.kind === 'birthday';
    const rep = bd ? 'yearly' : ev.repeat;
    return `
    <div class="seg" id="kindSeg" style="margin-bottom:18px">
      ${[['event', 'Подія'], ['task', 'Справа'], ['birthday', 'День народження']].map(([k, l]) => `<button type="button" data-kind="${k}" aria-pressed="${ev.kind === k}">${l}</button>`).join('')}
    </div>
    <div class="field"><input class="inp inp-title" id="fTitle" maxlength="80" placeholder="${bd ? 'Чий день народження?' : ev.kind === 'task' ? 'Що треба зробити?' : 'Що плануєш?'}" value="${esc(ev.title)}" autocomplete="off"></div>
    ${bd ? '' : `<div class="field"><span class="lbl">Категорія</span><div class="chips scroll">
      ${st.categories.map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${ev.cat === c.id}"><span class="sb sm c-${c.color} chip-ic" style="width:24px;height:24px">${sticker(c.icon)}</span>${esc(c.name)}</button>`).join('')}
    </div></div>`}
    <div class="field"><span class="lbl">${bd ? 'Дата народження' : 'Коли'}</span>
      <div class="two"><input class="inp" type="date" id="fDate" value="${ev.date}">
      ${bd ? `<input class="inp" id="fYear" inputmode="numeric" maxlength="4" placeholder="Рік" value="${esc(ev.birthYear || '')}">`
        : `<button type="button" class="opt-card" data-tg="allDay" style="padding:0 14px;height:54px;border-radius:18px"><span class="grow">Цілий день</span>${toggle('allDay', ev.allDay)}</button>`}</div>
    </div>
    ${!bd && !ev.allDay ? `<div class="field two"><div><span class="lbl">Початок</span><input class="inp" type="time" id="fStart" value="${ev.start || ''}"></div>
      <div><span class="lbl">Кінець</span><input class="inp" type="time" id="fEnd" value="${ev.end || ''}"></div></div>` : ''}
    ${bd ? '' : `<div class="field"><span class="lbl">Повтор</span><div class="chips scroll">
      ${REPEATS.map(([k, l]) => `<button type="button" class="chip" data-rep="${k}" aria-pressed="${rep === k}">${l}</button>`).join('')}</div>
      ${rep === 'days' ? `<div class="wd-pick" role="group" aria-label="Дні тижня">${WD_S.map((l, i) => `<button type="button" class="wd-dot" data-wd="${i}" aria-pressed="${(ev.days || []).includes(i)}">${l}</button>`).join('')}</div>
        <p class="tiny muted" style="margin:8px 4px 0">${(ev.days || []).length ? daysLabel(ev.days) : 'Обери хоча б один день'}</p>` : ''}
      ${rep !== 'none' ? `<div style="margin-top:10px" class="two"><span class="small muted" style="align-self:center;padding-left:4px">Повторювати до</span><input class="inp" type="date" id="fUntil" value="${ev.until || ''}"></div>` : ''}
    </div>`}
    <div class="field"><button type="button" class="opt-card ${ev.important ? 'on-red' : ''}" data-tg="important">
      <span class="sb ${ev.important ? '' : 'c-red'}" style="${ev.important ? 'background:#FFF6EE;color:var(--red);--cut:#FFF6EE' : ''}">${sticker('megaphone')}</span>
      <span class="grow"><b>Особливо важливо</b><span>Покажу вгорі головного екрана й нагадаю раніше</span></span>${toggle('important', ev.important, 'red')}</button></div>
    <div class="field"><span class="lbl">Нагадати</span><div class="chips">
      ${remChoices().map((m) => `<button type="button" class="chip" data-rem="${m}" aria-pressed="${remCurrent().includes(m)}">${m === 0 ? (bd ? 'У день' : 'Вчасно') : 'за ' + inWords(m)}</button>`).join('')}
    </div>${customRemind ? '' : '<p class="tiny muted" style="margin:8px 4px 0">Стоїть як у налаштуваннях. Можна змінити саме для цієї події.</p>'}</div>
    ${bd ? '' : `<div class="field"><span class="lbl">Місце</span><input class="inp" id="fPlace" placeholder="Адреса або назва" value="${esc(ev.place)}" autocomplete="off"></div>`}
    <div class="field"><span class="lbl">${bd ? 'Подарунок і підготовка' : 'Що підготувати або купити'}</span>
      <div id="clList">${(ev.checklist || []).map(clRow).join('')}</div>
      <div class="cl-add"><input class="inp" id="fCl" placeholder="${bd ? 'Напр. замовити торт' : 'Напр. купити батарейки'}" autocomplete="off"><button type="button" class="ibtn" id="clAdd" style="width:54px;height:54px;background:var(--ink);color:var(--cream)" aria-label="Додати пункт">${ui('plus')}</button></div>
    </div>
    <div class="field"><span class="lbl">Нотатки</span><textarea class="inp" id="fNotes" placeholder="Деталі, посилання, номер броні">${esc(ev.notes)}</textarea></div>`;
  };

  const clRow = (c) => `<div class="cl-item" data-id="${c.id}"><span class="cl-box" style="border-style:dashed"></span><span class="cl-t">${esc(c.text)}</span><button type="button" class="cl-del" data-cldel="${c.id}" aria-label="Прибрати">${ui('close')}</button></div>`;

  const readInputs = (root) => {
    const v = (id) => { const el = root.querySelector('#' + id); return el ? el.value : undefined; };
    if (v('fTitle') !== undefined) ev.title = v('fTitle').trim();
    if (v('fDate')) ev.date = v('fDate');
    if (v('fYear') !== undefined) ev.birthYear = v('fYear').replace(/\D/g, '');
    if (v('fStart') !== undefined) ev.start = v('fStart');
    if (v('fEnd') !== undefined) ev.end = v('fEnd');
    if (v('fUntil') !== undefined) ev.until = v('fUntil');
    if (v('fPlace') !== undefined) ev.place = v('fPlace').trim();
    if (v('fNotes') !== undefined) ev.notes = v('fNotes');
  };

  openSheet({
    full: true,
    title: isNew ? (preset && preset.kind === 'task' ? 'Нова справа' : 'Новий план') : 'Змінити',
    html: body(),
    foot: `<button class="btn btn-acc btn-block" id="fSave">${isNew ? 'Додати в календар' : 'Зберегти зміни'}</button>`,
    onMount(s) {
      const rerender = () => {
        readInputs(s.body);
        const top = s.body.scrollTop;
        // keep horizontal chip rows (categories, repeats) where the person left them
        const lefts = [...s.body.querySelectorAll('.chips.scroll')].map((c) => c.scrollLeft);
        s.setHtml(body());
        s.body.scrollTop = top;
        s.body.querySelectorAll('.chips.scroll').forEach((c, i) => { if (lefts[i] !== undefined) c.scrollLeft = lefts[i]; });
        segIndicator(s.body.querySelector('#kindSeg'));
      };
      requestAnimationFrame(() => segIndicator(s.body.querySelector('#kindSeg')));
      if (isNew) setTimeout(() => s.body.querySelector('#fTitle').focus({ preventScroll: true }), 450);

      s.body.addEventListener('click', (e) => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.dataset.kind) {
          ev.kind = t.dataset.kind;
          if (ev.kind === 'birthday') { ev.allDay = true; ev.repeat = 'yearly'; } else if (ev.repeat === 'yearly' && existing?.kind !== ev.kind) ev.repeat = 'none';
          if (!customRemind) ev.remind = null;
          haptic(); rerender();
        } else if (t.dataset.cat) { ev.cat = t.dataset.cat; haptic(); rerender(); }
        else if (t.dataset.rep) { ev.repeat = t.dataset.rep; if (ev.repeat === 'days' && !(ev.days || []).length) ev.days = [wdOf(ev.date)]; haptic(); rerender(); }
        else if (t.dataset.wd !== undefined) {
          const i = +t.dataset.wd; ev.days = ev.days || [];
          ev.days = ev.days.includes(i) ? ev.days.filter((x) => x !== i) : [...ev.days, i].sort();
          haptic(); rerender();
        }
        else if (t.dataset.tg === 'allDay') { ev.allDay = !ev.allDay; if (!ev.allDay && !ev.start) ev.start = nextHalfHour(); haptic(); rerender(); }
        else if (t.dataset.tg === 'important') { ev.important = !ev.important; if (!customRemind) ev.remind = null; haptic(); rerender(); }
        else if (t.dataset.rem !== undefined) {
          const m = +t.dataset.rem;
          const cur = [...remCurrent()];
          const i = cur.indexOf(m);
          if (i >= 0) cur.splice(i, 1); else cur.push(m);
          ev.remind = cur.sort((a, b) => b - a); customRemind = true; haptic(); rerender();
        } else if (t.id === 'clAdd') addCl();
        else if (t.dataset.cldel) { ev.checklist = ev.checklist.filter((c) => c.id !== t.dataset.cldel); rerender(); }
      });
      const addCl = () => {
        const inp = s.body.querySelector('#fCl');
        const text = inp.value.trim();
        if (!text) return;
        ev.checklist = ev.checklist || [];
        ev.checklist.push({ id: uid(), text, done: false });
        s.body.querySelector('#clList').insertAdjacentHTML('beforeend', clRow(ev.checklist[ev.checklist.length - 1]));
        inp.value = ''; inp.focus();
      };
      s.body.addEventListener('keydown', (e) => { if (e.target.id === 'fCl' && e.key === 'Enter') { e.preventDefault(); addCl(); } });

      s.el.querySelector('#fSave').addEventListener('click', () => {
        readInputs(s.body);
        const pending = s.body.querySelector('#fCl');
        if (pending && pending.value.trim()) { ev.checklist.push({ id: uid(), text: pending.value.trim(), done: false }); }
        if (!ev.title) {
          const f = s.body.querySelector('#fTitle');
          f.focus(); f.placeholder = 'Спершу назви подію'; haptic(30);
          return;
        }
        if (ev.kind === 'birthday') { ev.allDay = true; ev.repeat = 'yearly'; ev.cat = 'personal'; }
        if (ev.allDay) { ev.start = ''; ev.end = ''; }
        if (ev.end && ev.start && ev.end < ev.start) ev.end = '';
        if (ev.repeat === 'none') ev.until = '';
        if (ev.repeat === 'days') { if (!(ev.days || []).length) ev.days = [wdOf(ev.date)]; } else delete ev.days;
        if (!customRemind) ev.remind = null;
        ev.birthYear = ev.birthYear ? Number(ev.birthYear) : '';
        saveEvent(ev);
        haptic(15);
        s.close();
        toast(isNew ? `Додано на ${humanDate(ev.date)}` : 'Зміни збережено');
        onSaved && onSaved(ev);
      });
    }
  });
}

function nextHalfHour() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------- Export one event to the iPhone Calendar (.ics) ---------- */
function downloadIcs(ev) {
  const z = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const dOnly = (s) => s.replace(/-/g, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Planik//UA', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${ev.id}@planik`, `DTSTAMP:${z(new Date())}`, `SUMMARY:${icsText(ev.title)}`];
  if (ev.allDay || !ev.start) {
    const next = parseYmd(ev.date); next.setDate(next.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${dOnly(ev.date)}`, `DTEND;VALUE=DATE:${dOnly(ymd(next))}`);
  } else {
    const s = occTime(ev, ev.date);
    const e = ev.end ? occTime({ ...ev, start: ev.end }, ev.date) : new Date(s.getTime() + 3600000);
    lines.push(`DTSTART:${z(s)}`, `DTEND:${z(e)}`);
  }
  const rep = ev.kind === 'birthday' ? 'yearly' : ev.repeat;
  const RR = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
  if (rep === 'days') RR.days = 'FREQ=WEEKLY;BYDAY=' + (ev.days || []).map((i) => ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][i]).join(',');
  if (RR[rep]) lines.push(`RRULE:${RR[rep]}${ev.until ? ';UNTIL=' + dOnly(ev.until) + 'T235959Z' : ''}`);
  if (ev.place) lines.push(`LOCATION:${icsText(ev.place)}`);
  if (ev.notes) lines.push(`DESCRIPTION:${icsText(ev.notes)}`);
  for (const m of reminderOffsets(ev)) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(ev.title)}`, `TRIGGER:-PT${m}M`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (ev.title || 'planik').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 40) + '.ics';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Відкрий файл, щоб додати в Календар');
}
const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
