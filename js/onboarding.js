// Full-screen first-run questionnaire.
import { esc, uid, haptic } from './util.js';
import { getState, update, saveEvent } from './store.js';
import { ui, sticker } from './icons.js';
import { remindersHtml, bindReminders, pickPhoto, VERSION, restoreButton, bindRestore } from './profile.js';
import { askPermission, isStandalone, notifState, updateBadge } from './notify.js';
import { toggle } from './ui.js';

import { LOGO } from './whatsnew.js';

export function runOnboarding(onDone) {
  const st = getState();
  const draft = { name: st.user.name || '', photo: st.user.photo || '', birthdays: [{ id: uid(), name: '', date: '' }] };
  let step = 0, dir = 1;
  const STEPS = ['welcome', 'name', 'photo', 'remind', 'bdays', 'notify', 'done'];

  const el = document.createElement('div');
  el.className = 'ob';
  document.body.append(el);
  bindRestore(el);

  const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
  const installTip = ios && !isStandalone()
    ? `<div class="install-tip"><span class="sb sm c-butter" style="width:36px;height:36px">${sticker('phone')}</span><span>Щоб Planik працював як застосунок, у Safari натисни <b>Поділитися</b> → <b>На початковий екран</b>.</span></div>` : '';

  const views = {
    welcome: () => `
      <div class="ob-mark">${LOGO}</div>
      <h1 class="hero">Тримай життя в&nbsp;ритмі</h1>
      <p class="lead">Робота, дім, дні народження близьких і звички — в одному календарі, який нагадує завчасно й підбадьорює.</p>
      <div class="ob-tiles">
        <div class="ob-tile" style="background:var(--butter)"><span class="sb c-cobalt">${sticker('briefcase')}</span>Графік і справи</div>
        <div class="ob-tile" style="background:var(--peach)"><span class="sb c-red">${sticker('gift')}</span>Дні народження</div>
        <div class="ob-tile" style="background:var(--cobalt);color:var(--paper)"><span class="sb c-tangerine">${sticker('cart')}</span>Що купити заздалегідь</div>
        <div class="ob-tile" style="background:var(--tangerine)"><span class="sb c-butter">${sticker('flame')}</span>Звички й трекери</div>
      </div>${installTip}`,
    name: () => `
      <h1 class="hero">Як тебе звати?</h1>
      <p class="lead">Щоб вітатися по-людськи.</p>
      <input class="inp" id="obName" maxlength="24" placeholder="Імʼя" value="${esc(draft.name)}" autocomplete="given-name" style="height:64px;font-family:var(--display);font-weight:900;font-size:24px">`,
    photo: () => `
      <h1 class="hero">Додай фото</h1>
      <p class="lead">Воно буде поруч із привітанням. Можна пропустити.</p>
      <button class="ob-photo" id="obPhoto" aria-label="Обрати фото">${draft.photo ? `<img src="${draft.photo}" alt="">` : esc((draft.name || 'P')[0].toUpperCase())}<span class="ibtn ink cam">${ui('camera')}</span></button>`,
    remind: () => `
      <h1 class="hero" style="font-size:clamp(36px,11vw,48px)">Коли нагадувати?</h1>
      <p class="lead">Для кожної події потім можна змінити окремо.</p>
      <div class="set" id="obRem">${remindersHtml()}</div>`,
    bdays: () => `
      <h1 class="hero" style="font-size:clamp(34px,10.5vw,46px)">Чиї дні народження не можна пропустити?</h1>
      <p class="lead">Додай кількох людей зараз — решту можна пізніше.</p>
      <div id="obBd">${draft.birthdays.map((b) => `<div class="bd-row" data-id="${b.id}"><input class="inp" data-bn placeholder="Імʼя" value="${esc(b.name)}"><input class="inp" type="date" data-bd value="${b.date}"><button class="ibtn sm" data-bdel aria-label="Прибрати">${ui('close')}</button></div>`).join('')}</div>
      <button class="btn btn-sand btn-sm" id="obBdAdd">${ui('plus')}Ще людина</button>`,
    notify: () => {
      const perm = notifState();
      return `
      <h1 class="hero">Не пропусти важливе</h1>
      <p class="lead">Planik покаже нагадування і поставить лічильник на іконку, коли щось потребує уваги.</p>
      <div class="set">
        <div class="set-row"><span class="grow">Сповіщення<span>${perm === 'granted' ? 'Увімкнено' : perm === 'denied' ? 'Вимкнено в Параметрах iPhone' : perm === 'unsupported' ? 'Стане доступно після додавання на початковий екран' : 'Потрібен твій дозвіл'}</span></span>
          ${perm === 'default' ? '<button class="btn btn-acc btn-sm" id="obPerm">Дозволити</button>' : perm === 'granted' ? `<span class="sb sm c-cobalt">${sticker('star')}</span>` : ''}</div>
        <button class="set-row" id="obBadge"><span class="grow">Лічильник на іконці<span>Число непрочитаних нагадувань</span></span>${toggle('badge', getState().settings.badge)}</button>
      </div>${installTip}`;
    },
    done: () => `
      <div class="big-ok" aria-hidden="true"><i></i><i></i></div>
      <h1 class="hero">Готово${draft.name ? `, ${esc(draft.name)}` : ''}!</h1>
      <p class="lead">Плюс унизу додає події, справи й дні народження. Натисни на будь-який день, щоб побачити план.</p>`
  };

  const save = () => {
    const n = el.querySelector('#obName'); if (n) draft.name = n.value.trim();
    el.querySelectorAll('.bd-row').forEach((r) => {
      const b = draft.birthdays.find((x) => x.id === r.dataset.id);
      if (b) { b.name = r.querySelector('[data-bn]').value.trim(); b.date = r.querySelector('[data-bd]').value; }
    });
  };

  const render = () => {
    const key = STEPS[step];
    el.innerHTML = `
      <div class="ob-prog">${STEPS.slice(0, -1).map((_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="ob-top">${step > 0 && key !== 'done' ? `<button class="ibtn sm" id="obBack" aria-label="Назад">${ui('left')}</button>` : '<span class="ob-word">planik</span>'}
        ${['photo', 'bdays', 'notify'].includes(key) ? '<button class="ob-skip" id="obSkip">Пропустити</button>' : ''}</div>
      <div class="ob-stage"><div class="ob-step ${dir < 0 ? 'back' : ''}">${views[key]()}</div></div>
      <div class="ob-foot ${key === 'welcome' ? 'col' : ''}"><button class="btn btn-acc" id="obNext">${key === 'welcome' ? 'Почнімо' : key === 'done' ? 'Відкрити календар' : 'Далі'}${key === 'done' ? '' : ui('right')}</button>
        ${key === 'welcome' ? restoreButton('btn btn-ghost ob-restore', `${ui('upload')}Відновити з копії`) : ''}</div>`;
    if (key === 'name') setTimeout(() => el.querySelector('#obName')?.focus(), 350);
    if (key === 'remind') bindReminders(el.querySelector('#obRem'));
  };

  const go = (d) => {
    save();
    if (d > 0 && STEPS[step] === 'name' && !draft.name) {
      const f = el.querySelector('#obName'); f.placeholder = 'Напиши імʼя, будь ласка'; f.focus(); haptic(30); return;
    }
    if (d > 0 && STEPS[step] === 'done') return finish();
    dir = d; step = Math.max(0, Math.min(STEPS.length - 1, step + d)); haptic(); render();
  };

  const finish = () => {
    update((s) => { s.user.name = draft.name; s.user.photo = draft.photo; s.user.onboarded = true; s.app = { ...(s.app || {}), seen: VERSION }; });
    for (const b of draft.birthdays) {
      if (!b.name || !b.date) continue;
      const [y] = b.date.split('-').map(Number);
      saveEvent({ id: uid(), kind: 'birthday', title: b.name, cat: 'personal', date: b.date, allDay: true, start: '', end: '', repeat: 'yearly', until: '', important: false, remind: null, place: '', notes: '', checklist: [], birthYear: y < new Date().getFullYear() ? y : '', doneDates: [], created: Date.now() });
    }
    updateBadge();
    el.style.transition = 'opacity .45s, transform .45s';
    el.style.opacity = '0'; el.style.transform = 'scale(1.04)';
    setTimeout(() => { el.remove(); onDone && onDone(); }, 430);
  };

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'obNext') go(1);
    else if (b.id === 'obBack') go(-1);
    else if (b.id === 'obSkip') { if (STEPS[step] === 'bdays') { save(); } dir = 1; step++; render(); }
    else if (b.id === 'obPhoto') { const p = await pickPhoto(); if (p) { draft.photo = p; render(); } }
    else if (b.id === 'obBdAdd') { save(); draft.birthdays.push({ id: uid(), name: '', date: '' }); render(); el.querySelector('.bd-row:last-child [data-bn]').focus(); }
    else if (b.dataset.bdel !== undefined) { save(); const id = b.closest('.bd-row').dataset.id; draft.birthdays = draft.birthdays.filter((x) => x.id !== id); if (!draft.birthdays.length) draft.birthdays.push({ id: uid(), name: '', date: '' }); render(); }
    else if (b.id === 'obPerm') { await askPermission(); render(); }
    else if (b.id === 'obBadge') { update((s) => { s.settings.badge = !s.settings.badge; }); render(); }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'obName') go(1); });
  render();
}
