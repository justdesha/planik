// "Пульс": the week at a glance, birthdays, things to buy, overdue tasks — and a bit of cheering.
import { WD_SHORT, MONTHS_GEN, ymd, parseYmd, todayYmd, addDays, wd, esc, diffDays, pDays, plural, haptic } from './util.js';
import { getState, eventsOn, occurrences, isDone, inboxItems, trackerCount, update, colorOf } from './store.js';
import { ui, sticker } from './icons.js';
import { eventRow, bindEventRows, openEvent, openEventForm } from './events.js';
import { ask } from './ui.js';
import { bubblesHtml, openStory, periodById } from './stories.js';
import { humanDate } from './util.js';
import { selectDate } from './calendar.js';

export function greetingLine() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Доброго ранку';
  if (h >= 18 && h < 23) return 'Добрий вечір';
  if (h >= 23 || h < 5) return 'Доброї ночі';
  return 'Привіт';
}

/** one line under the greeting, depends on how full today is */
export function dayMood() {
  const today = todayYmd();
  const list = eventsOn(today);
  const left = list.filter(({ ev, date }) => !isDone(ev, date)).length;
  if (!list.length) return 'Сьогодні вільно. Це теж план.';
  if (!left) return 'На сьогодні все зроблено. Можна видихнути.';
  if (left >= 5) return `${left} ${plural(left, 'пункт', 'пункти', 'пунктів')} на сьогодні. Почни з найважчого.`;
  return `${left} ${plural(left, 'справа', 'справи', 'справ')} на сьогодні. Спокійний темп.`;
}

const LINES = [
  ['Крок за кроком', 'Тиждень складається з маленьких справ. Ти їх уже робиш.'],
  ['Головне — ритм', 'Не обовʼязково встигати все. Достатньо встигати головне.'],
  ['Ти тримаєш темп', 'Не забудь залишити в плані місце для відпочинку.'],
  ['Зроблене рахується', 'Навіть якщо день пішов не за планом. Завтра — нова сторінка.'],
  ['План — це карта', 'Він допомагає, а не тисне. Міняй його, коли треба.'],
  ['Маленька справа зараз', 'Пʼять хвилин сьогодні — менше думок увечері.']
];

function cheerFor() {
  const st = getState();
  const now = new Date();
  const weekTo = ymd(addDays(now, 6));
  const week = occurrences(todayYmd(), weekTo);
  const doneWeek = occurrences(ymd(addDays(now, -6)), todayYmd()).filter(({ ev, date }) => ev.kind === 'task' && isDone(ev, date)).length;
  const best = st.trackers.map((t) => ({ t, n: trackerCount(t) })).sort((a, b) => b.n - a.n)[0];
  if (doneWeek >= 3) return ['Сильний тиждень', `${doneWeek} ${plural(doneWeek, 'справу', 'справи', 'справ')} закрито за сім днів. Так тримати.`];
  if (best && best.n >= 3) return [`${pDays(best.n)} поспіль`, `«${best.t.name}» тримається. Кожен день додає сили.`];
  if (week.length >= 12) return ['Насичений тиждень', 'Багато планів попереду. Подбай про сон і їжу — решта підтягнеться.'];
  const i = (now.getDate() + now.getMonth()) % LINES.length;
  return LINES[i];
}

let root;
export function mountPulse(el) {
  root = el;
  bindEventRows(root, renderPulse);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    if (b.dataset.p === 'day') { selectDate(b.dataset.d); window.dispatchEvent(new CustomEvent('planik:tab', { detail: 'home' })); }
    if (b.dataset.p === 'buy') {
      update((s) => { const ev = s.events.find((x) => x.id === b.dataset.ev); const it = ev && ev.checklist.find((c) => c.id === b.dataset.id); if (it) it.done = !it.done; });
      haptic(); renderPulse();
    }
    if (b.dataset.p === 'open') openEvent(b.dataset.ev, b.dataset.d, renderPulse);
    if (b.dataset.p === 'plan') planItem(b.dataset.ev, b.dataset.id, b.dataset.d);
  });
  root.addEventListener('click', (e) => {
    const s = e.target.closest('[data-story]');
    if (s) openStory(periodById(s.dataset.story), renderPulse);
  });
}

/** "Купити й підготувати" item → plan a purchase or a preparation task for it */
async function planItem(evId, itemId, date) {
  const ev = getState().events.find((x) => x.id === evId);
  const item = ev && ev.checklist.find((c) => c.id === itemId);
  if (!item) return;
  const planned = item.planned && getState().events.find((x) => x.id === item.planned);
  const choice = await ask(`«${item.text}» для «${ev.title}»`, [
    ...(planned ? [{ label: 'Відкрити заплановану справу', value: 'open', style: 'lime' }] : []),
    { label: 'Запланувати покупку', value: 'buy', style: planned ? 'sand' : 'lime' },
    { label: 'Запланувати підготовку', value: 'prep', style: 'sand' },
    { label: item.done ? 'Повернути в список' : 'Позначити готовим', value: 'done', style: 'sand' }
  ]);
  if (!choice) return;
  if (choice === 'open') return openEvent(planned.id, planned.date, renderPulse);
  if (choice === 'done') { update(() => { item.done = !item.done; }); haptic(); return renderPulse(); }
  // the day before the event, but never in the past
  const dayBefore = ymd(addDays(parseYmd(date), -1));
  const when = dayBefore < todayYmd() ? todayYmd() : dayBefore;
  const verbFirst = /^\S+(ти|ть|тися|тись)(\s|$)/i.test(item.text);
  const title = choice === 'buy' && !verbFirst ? `Купити ${item.text.charAt(0).toLowerCase() + item.text.slice(1)}` : item.text;
  openEventForm({
    preset: {
      kind: 'task', title, date: when, allDay: true, start: '',
      cat: choice === 'buy' ? 'buy' : (ev.kind === 'birthday' ? 'personal' : ev.cat),
      notes: `Для «${ev.title}» · ${humanDate(date)}`,
      link: { ev: ev.id, item: item.id }
    },
    onSaved: (task) => { update(() => { item.planned = task.id; }); renderPulse(); }
  });
}

export function renderPulse() {
  if (!root) return;
  const now = new Date();
  const today = todayYmd();
  const [h, p] = cheerFor();

  // week load
  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i));
  const counts = days.map((d) => eventsOn(ymd(d)).length);
  const max = Math.max(3, ...counts);

  // birthdays within 60 days
  const bdays = occurrences(today, ymd(addDays(now, 60)), (e) => e.kind === 'birthday').slice(0, 6);

  // things to buy / prepare in the next 30 days
  const seen = new Set();
  const buy = occurrences(today, ymd(addDays(now, 30)))
    .filter(({ ev }) => (ev.checklist || []).some((c) => !c.done) && !seen.has(ev.id) && seen.add(ev.id));

  const overdue = inboxItems().filter((i) => i.type === 'overdue').slice(0, 8);

  root.innerHTML = `
    <header class="page-head"><div><h1 class="hero">Пульс</h1><p>Що попереду і що варто не прогавити</p></div></header>
    ${bubblesHtml()}
    <section class="cheer"><h2 class="h2">${esc(h)}</h2><p>${esc(p)}</p><span class="halves" aria-hidden="true"><i></i><i></i></span></section>

    <section class="card"><div class="card-h"><h3 class="h3">Наступні 7 днів</h3><span class="small muted">${counts.reduce((a, b) => a + b, 0)} ${plural(counts.reduce((a, b) => a + b, 0), 'план', 'плани', 'планів')}</span></div>
      <div class="week-bars">${days.map((d, i) => `<button class="wb ${i === 0 ? 'today' : ''} ${counts[i] >= 4 ? 'busy' : ''}" data-p="day" data-d="${ymd(d)}" aria-label="${d.getDate()} ${MONTHS_GEN[d.getMonth()]}: ${counts[i]}">
        <span class="col" style="height:${12 + (counts[i] / max) * 78}%">${counts[i] || ''}</span><span>${i === 0 ? 'Сьог' : WD_SHORT[wd(d)]}</span></button>`).join('')}</div>
    </section>

    ${overdue.length ? `<section class="card"><div class="card-h"><h3 class="h3">Протерміновані справи</h3><span class="tag red">${overdue.length}</span></div>
      <div class="ev-list">${overdue.map((o) => eventRow({ ev: o.ev, date: o.date }, { showDate: true })).join('')}</div></section>` : ''}

    <section class="card"><div class="card-h"><h3 class="h3">Дні народження</h3><span class="small muted">найближчі 2 місяці</span></div>
      ${bdays.length ? bdays.map(({ ev, date }) => {
        const n = diffDays(now, parseYmd(date));
        const age = ev.birthYear ? parseYmd(date).getFullYear() - ev.birthYear : 0;
        return `<button class="row" data-p="open" data-ev="${ev.id}" data-d="${date}"><span class="sb c-red">${sticker('gift')}</span>
          <span class="grow"><b>${esc(ev.title)}</b><span>${parseYmd(date).getDate()} ${MONTHS_GEN[parseYmd(date).getMonth()]}${age > 0 ? ` · ${age} ${plural(age, 'рік', 'роки', 'років')}` : ''}</span></span>
          <span class="pill-when ${n <= 7 ? 'hot' : ''}">${n === 0 ? 'сьогодні' : n === 1 ? 'завтра' : 'за ' + pDays(n)}</span></button>`;
      }).join('') : '<p class="small muted" style="margin:0">Додай дні народження близьких через плюс унизу — Planik нагадає завчасно.</p>'}
    </section>

    <section class="card"><div class="card-h"><h3 class="h3">Купити й підготувати</h3><span class="small muted">на 30 днів</span></div>
      ${buy.length ? buy.map(({ ev, date }) => `<div class="buy-group"><span>${esc(ev.title)} · ${parseYmd(date).getDate()} ${MONTHS_GEN[parseYmd(date).getMonth()]}</span>
        ${ev.checklist.map((c) => {
          const task = c.planned && getState().events.find((x) => x.id === c.planned);
          return `<div class="cl-item ${c.done ? 'on' : ''}"><button class="cl-box" data-p="buy" data-ev="${ev.id}" data-id="${c.id}" aria-label="${c.done ? 'Зняти позначку' : 'Позначити готовим'}">${ui('check')}</button>
            <button class="cl-t cl-plan" data-p="plan" data-ev="${ev.id}" data-id="${c.id}" data-d="${date}">${esc(c.text)}${task ? `<small>заплановано · ${humanDate(task.date)}</small>` : '<small>торкнись, щоб запланувати</small>'}</button>
            ${task ? '' : `<span class="cl-cal" aria-hidden="true">${ui('calendar')}</span>`}</div>`;
        }).join('')}</div>`).join('')
        : '<p class="small muted" style="margin:0">Список порожній. Додавай пункти «що купити» прямо в подію — вони зберуться тут.</p>'}
    </section>`;
}
