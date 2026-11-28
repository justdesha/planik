// Profile & settings.
import { esc, inWords, uid, haptic } from './util.js';
import { getState, update, REMIND_CHOICES, exportState, importState, resetAll, PALETTE } from './store.js';
import { ui, sticker, STICKER_ORDER } from './icons.js';
import { openSheet, ask, toast, toggle, segIndicator, saveFile } from './ui.js';
import { askPermission, notifState, isStandalone, updateBadge } from './notify.js';

export const VERSION = '1.3.3';

/** resolve "auto" against the phone setting and paint the theme */
export function applyTheme() {
  const pref = getState().settings.theme || 'auto';
  const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0E0F14' : '#F8F6F1'));
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());

/** reminder preferences block (used here and in onboarding) */
export function remindersHtml() {
  const r = getState().settings.remind;
  const chips = (key, multi) => REMIND_CHOICES[key].map((m) => `<button type="button" class="chip" data-rk="${key}" data-rm="${m}" data-multi="${multi}" aria-pressed="${r[key].includes(m)}">${m === 0 ? (key === 'birthday' ? 'У день' : 'Вчасно') : 'за ' + inWords(m)}</button>`).join('');
  return `
    <div class="set-block"><b>Дні народження</b><div class="chips">${chips('birthday', true)}</div><p class="tiny muted" style="margin:8px 0 0">Можна обрати кілька: наприклад, за місяць — щоб подумати про подарунок, і в день.</p></div>
    <div class="set-block"><b>Особливо важливі події</b><div class="chips">${chips('important', true)}</div></div>
    <div class="set-block"><b>Звичайні події та справи</b><div class="chips">${chips('normal', false)}</div></div>`;
}

export function bindReminders(container, after) {
  container.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rk]');
    if (!b) return;
    const key = b.dataset.rk, m = +b.dataset.rm, multi = b.dataset.multi === 'true';
    update((s) => {
      let list = [...s.settings.remind[key]];
      if (multi) { const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); else list.push(m); }
      else list = list[0] === m && list.length === 1 ? [] : [m];
      s.settings.remind[key] = list.sort((a, b2) => b2 - a);
    });
    haptic();
    container.querySelectorAll(`[data-rk="${key}"]`).forEach((c) => c.setAttribute('aria-pressed', getState().settings.remind[key].includes(+c.dataset.rm)));
    after && after();
  });
}

/** resize a picked photo to a small square data URL */
export function pickPhoto() {
  return new Promise((resolve) => {
    // iOS only fires "change" for a file input that lives in the page,
    // so the input is attached (invisibly) and removed afterwards.
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
    document.body.append(inp);
    const done = (v) => { inp.remove(); resolve(v); };
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      if (!f) return done(null);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = 320, c = document.createElement('canvas');
          c.width = c.height = s;
          const k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
          const w = img.naturalWidth * k, h = img.naturalHeight * k;
          c.getContext('2d').drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
          done(c.toDataURL('image/jpeg', .82));
        };
        img.onerror = () => { toast('Це фото не вдалося відкрити. Спробуй інше'); done(null); };
        img.src = reader.result;
      };
      reader.onerror = () => done(null);
      reader.readAsDataURL(f);
    }, { once: true });
    inp.click();
  });
}

let root;
/**
 * "Restore from backup" as a real <label> around a real file input that lives in the page.
 * On iPhone an input created on the fly and never attached gets lost while the picker is open,
 * so the chosen file never arrives. Tapping a label opens the picker natively every time.
 */
export const restoreButton = (cls, inner) => `<label class="${cls} file-btn">${inner}<input type="file" class="file-in" data-restore accept=".json,application/json,text/plain,text/json"></label>`;

const readText = (f) => (f.text ? f.text() : new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(f); }));

/** listen for a chosen backup anywhere inside root */
export function bindRestore(root) {
  root.addEventListener('change', async (e) => {
    const inp = e.target.closest('[data-restore]');
    if (!inp) return;
    const f = inp.files && inp.files[0];
    inp.value = '';
    if (!f) return;
    toast('Читаю копію…');
    try {
      const text = await readText(f);
      let data;
      try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (err) { throw new Error('Це не файл резервної копії Planik (.json)'); }
      const fresh = !getState().user.onboarded;
      const ok = fresh || await ask('Поточні дані заміняться даними з копії.', [{ label: 'Відновити', value: true, style: 'ink' }]);
      if (!ok) return;
      data.user = { ...(data.user || {}), onboarded: true };
      // a fresh phone restoring a copy does not need the update stories on top
      if (fresh) data.app = { ...(data.app || {}), seen: VERSION };
      importState(data);
      toast('Готово, відкриваю…');
      setTimeout(() => location.reload(), 350);
    } catch (err) { toast(err && err.message ? err.message : 'Файл не вдалося прочитати', { ms: 4000 }); }
  });
}

export function mountProfile(el, { restartOnboarding }) {
  bindRestore(el);
  root = el;
  bindReminders(root);
  root.addEventListener('click', async (e) => {
    const th = e.target.closest('[data-theme-set]');
    if (th) {
      update((s) => { s.settings.theme = th.dataset.themeSet; });
      applyTheme(); haptic();
      root.querySelectorAll('[data-theme-set]').forEach((x) => x.setAttribute('aria-pressed', x === th));
      segIndicator(root.querySelector('#themeSeg'));
      return;
    }
    const b = e.target.closest('[data-pr], [data-tgl]');
    if (!b) return;
    const a = b.dataset.pr || 'tgl:' + b.dataset.tgl;
    if (a === 'photo') {
      const p = await pickPhoto();
      if (p) { update((s) => { s.user.photo = p; }); renderProfile(); toast('Фото оновлено'); }
    } else if (a === 'tgl:badge') {
      update((s) => { s.settings.badge = !s.settings.badge; });
      if (getState().settings.badge && notifState() === 'default') await askPermission();
      updateBadge(); renderProfile();
    } else if (a === 'perm') {
      const r = await askPermission();
      toast(r === 'granted' ? 'Сповіщення увімкнено' : r === 'denied' ? 'Дозвіл вимкнено в Параметрах iPhone' : 'Спершу додай Planik на початковий екран');
      updateBadge(); renderProfile();
    } else if (a === 'export') {
      const r = await saveFile(`planik-backup-${new Date().toISOString().slice(0, 10)}.json`, exportState(), 'application/json');
      if (r === 'shared') toast('Копію передано'); else if (r === 'downloaded') toast('Копію збережено');
      else if (r === 'fail') toast('Не вдалося зберегти копію');
    } else if (a === 'cat') {
      openCategoryForm();
    } else if (a === 'back') {
      window.dispatchEvent(new CustomEvent('planik:tab', { detail: 'home' }));
    } else if (a === 'news') {
      import('./whatsnew.js').then((m) => m.showWhatsNew({ replay: true }));
    } else if (a === 'onboard') {
      restartOnboarding();
    } else if (a === 'reset') {
      const ok = await ask('Видалити всі події, трекери й налаштування? Це не можна скасувати.', [{ label: 'Видалити все', value: true, style: 'danger' }]);
      if (ok) { resetAll(); location.reload(); }
    }
  });
  root.addEventListener('change', (e) => {
    if (e.target.id === 'pName') { update((s) => { s.user.name = e.target.value.trim(); }); toast('Імʼя збережено'); }
  });
}

export function renderProfile() {
  if (!root) return;
  const st = getState();
  const perm = notifState();
  const initial = (st.user.name || 'P').trim()[0].toUpperCase();
  const permText = perm === 'granted' ? 'Увімкнено' : perm === 'denied' ? 'Вимкнено в Параметрах iPhone' : perm === 'unsupported' ? (isStandalone() ? 'Цей iOS не підтримує сповіщення' : 'Працює після додавання на початковий екран') : 'Ще не дозволено';
  root.innerHTML = `
    <header class="page-head"><div><button class="back-link" data-pr="back">${ui('left')}Календар</button><h1 class="hero">Профіль</h1></div></header>
    <div class="prof-hero">
      <button class="avatar" data-pr="photo" aria-label="Змінити фото">${st.user.photo ? `<img src="${st.user.photo}" alt="">` : esc(initial)}<span class="ibtn sm ink cam">${ui('camera')}</span></button>
      <input class="inp" id="pName" value="${esc(st.user.name)}" placeholder="Твоє імʼя" style="text-align:center;max-width:260px;font-family:var(--display);font-weight:900;font-size:20px">
    </div>

    <section class="set-group"><h2 class="h3">Оформлення</h2>
      <div class="seg" id="themeSeg">${[['auto', 'Авто'], ['light', 'Світла'], ['dark', 'Темна']].map(([k, l]) => `<button type="button" data-theme-set="${k}" aria-pressed="${(st.settings.theme || 'auto') === k}">${l}</button>`).join('')}</div></section>

    <section class="set-group"><h2 class="h3">Нагадування</h2><p>За скільки часу попереджати. Для кожної події можна змінити окремо.</p>
      <div class="set">${remindersHtml()}</div></section>

    <section class="set-group"><h2 class="h3">Сповіщення</h2>
      <div class="set">
        <div class="set-row"><span class="grow">Сповіщення від Planik<span>${permText}</span></span>${perm === 'default' ? '<button class="btn btn-acc btn-sm" data-pr="perm">Дозволити</button>' : ''}</div>
        <button class="set-row" data-tgl="badge"><span class="grow">Лічильник на іконці<span>Кількість непрочитаних нагадувань на початковому екрані</span></span>${toggle('badge', st.settings.badge)}</button>
      </div></section>

    <section class="set-group"><h2 class="h3">Категорії</h2>
      <div class="set" style="padding:14px 16px"><div class="chips">${st.categories.map((c) => `<span class="chip"><span class="sb sm c-${c.color}" style="width:24px;height:24px">${sticker(c.icon)}</span>${esc(c.name)}</span>`).join('')}
        <button class="chip" data-pr="cat" style="background:var(--butter);color:var(--on-color)">${ui('plus')}Своя категорія</button></div></div></section>

    <section class="set-group"><h2 class="h3">Дані</h2><p>Усе зберігається тільки на цьому телефоні. Роби копію час від часу.</p>
      <div class="set">
        <button class="set-row" data-pr="export">${ui('download')}<span class="grow">Зберегти резервну копію<span>Файл .json у Файли або iCloud</span></span></button>
        ${restoreButton('set-row', `${ui('upload')}<span class="grow">Відновити з копії</span>`)}
        <button class="set-row" data-pr="news">${ui('spark')}<span class="grow">Що нового<span>Planik ${VERSION} у сторіз</span></span></button>
        <button class="set-row" data-pr="onboard">${ui('repeat')}<span class="grow">Пройти знайомство знову</span></button>
        <button class="set-row danger" data-pr="reset">${ui('trash')}<span class="grow">Видалити всі дані</span></button>
      </div></section>
    <p class="tiny muted" style="text-align:center">Planik ${VERSION}</p>`;
  requestAnimationFrame(() => segIndicator(root.querySelector('#themeSeg')));
}

function openCategoryForm() {
  const colors = Object.keys(PALETTE).filter((c) => c !== 'red');
  const c = { id: uid(), name: '', color: 'sky', icon: 'star' };
  const body = () => `
    <div class="field"><span class="lbl">Назва</span><input class="inp" id="cName" maxlength="24" placeholder="Напр. Подорожі" value="${esc(c.name)}"></div>
    <div class="field"><span class="lbl">Колір</span><div class="colors">${colors.map((k) => `<button type="button" class="swatch" data-col="${k}" aria-pressed="${c.color === k}" style="background:var(--${k})"></button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Іконка</span><div class="st-row">${STICKER_ORDER.map((s) => `<button type="button" class="st-pick c-${s === c.icon ? c.color : 'sand'}" data-ic="${s}" aria-pressed="${s === c.icon}" style="${s === c.icon ? `--cut:var(--${c.color});background:var(--cut)` : ''}">${sticker(s)}</button>`).join('')}</div></div>`;
  openSheet({
    title: 'Своя категорія', full: true, html: body(),
    foot: '<button class="btn btn-acc btn-block" id="cSave">Додати категорію</button>',
    onMount(s) {
      s.body.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        c.name = s.body.querySelector('#cName').value;
        if (b.dataset.col) c.color = b.dataset.col;
        if (b.dataset.ic) c.icon = b.dataset.ic;
        const top = s.body.scrollTop; s.setHtml(body()); s.body.scrollTop = top;
      });
      s.el.querySelector('#cSave').addEventListener('click', () => {
        c.name = s.body.querySelector('#cName').value.trim();
        if (!c.name) { s.body.querySelector('#cName').focus(); return; }
        update((st) => { st.categories.splice(st.categories.length - 1, 0, { ...c }); });
        s.close(); renderProfile(); toast(`Категорію «${c.name}» додано`);
      });
    }
  });
}
