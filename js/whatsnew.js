// "Що нового": after every update, a short story deck about what changed,
// with small visuals and a mini how-to for new features.
import { getState, update } from './store.js';
import { VERSION } from './profile.js';
import { playDeck } from './stories.js';
import { moodFace, MOODS } from './moods.js';
import { sticker, ui } from './icons.js';

const LOGO_OLD = '<svg viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#0F4A37"/><rect x="282" y="232" width="168" height="580" rx="84" fill="#D4F46A"/><path d="M430 232 A218 218 0 0 1 430 668 Z" fill="#F5922F"/><circle cx="528" cy="410" r="27" fill="#161513"/><path d="M520 500 q56 56 112 0" fill="none" stroke="#161513" stroke-width="26" stroke-linecap="round"/></svg>';
export const LOGO = '<svg viewBox="0 0 1024 1024" aria-hidden="true"><rect width="1024" height="1024" fill="#F47742"/><rect x="196" y="250" width="632" height="560" rx="120" fill="#FFFFFF"/><path d="M196 370a120 120 0 0 1 120-120h392a120 120 0 0 1 120 120v70H196z" fill="#2D4FC5"/><rect x="340" y="178" width="70" height="150" rx="35" fill="#161513"/><rect x="614" y="178" width="70" height="150" rx="35" fill="#161513"/><path d="M300 724a212 212 0 0 1 424 0z" fill="#F4D58A"/><circle cx="440" cy="628" r="24" fill="#161513"/><circle cx="584" cy="628" r="24" fill="#161513"/><path d="M474 676q38 32 76 0" fill="none" stroke="#161513" stroke-width="22" stroke-linecap="round"/></svg>';

/** decks per version; each slide: { bg, html } */
const DECKS = {
  '1.2.0': () => [
    { bg: 'cobalt', html: `
      <div class="sx-top"><span class="sx-word">planik</span></div>
      <div class="sx-mid"><p class="sx-kicker">оновлення 1.2</p><h2 class="sx-hero" style="color:var(--butter)">Що нового</h2>
        <p class="sx-text">Нові кольори, гроші, настрій і повтор за днями тижня. Тапай праворуч, щоб гортати.</p></div>
      <span class="sx-halves" aria-hidden="true"><i></i><i></i></span>` },
    { bg: 'butter', html: `
      <div class="sx-mid"><p class="sx-kicker">вигляд</p><h2 class="sx-h">Нова палітра й іконка</h2>
        <div class="wn-ba"><div class="wn-b"><span>було</span><div class="wn-icon">${LOGO_OLD}</div><div class="wn-sw"><i style="background:#D4F46A"></i><i style="background:#0F4A37"></i><i style="background:#F5922F"></i></div></div>
          <span class="wn-arrow">${ui('right')}</span>
          <div class="wn-b now"><span>стало</span><div class="wn-icon">${LOGO}</div><div class="wn-sw"><i style="background:#F47742"></i><i style="background:#2D4FC5"></i><i style="background:#F4D58A"></i></div></div></div>
        <p class="sx-text">Мандарин, кобальт і масло. Темна тема теж перефарбована.</p>
        <p class="wn-tip">${ui('spark')}Щоб іконка змінилась на екрані «Додому», видали Planik і додай знову через Safari. Дані лишаться.</p></div>` },
    { bg: 'tangerine', html: `
      <div class="sx-mid"><p class="sx-kicker">повтор</p><h2 class="sx-h">Обрані дні тижня</h2>
        <div class="wn-demo sx-demo"><div class="wd-pick">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((d, i) => `<span class="wd-dot ${[0, 2, 4].includes(i) ? 'demo-on' : ''}" style="--d:${[0, 2, 4].indexOf(i) * 450 + 500}ms">${d}</span>`).join('')}</div>
          <p class="wn-cap">Щотижня: Пн, Ср, Пт</p></div>
        <ol class="wn-steps"><li><span>Натисни <b>+</b> і створи план</span></li><li><span>У «Повтор» обери <b>Обрані дні</b></span></li><li><span>Торкнись кружечків потрібних днів</span></li></ol></div>` },
    { bg: 'cream', html: `
      <div class="sx-mid"><p class="sx-kicker">настрій</p><h2 class="sx-h">Як ти сьогодні?</h2>
        <div class="wn-moods">${MOODS.map((m, i) => `<span style="--d:${i * 70}ms">${moodFace(m.id)}<small>${m.name}</small></span>`).join('')}</div>
        <ol class="wn-steps"><li><span><b>Зранку і ввечері</b> питання зʼявиться під привітанням</span></li><li><span>Минулий день: торкнись його в календарі</span></li><li><span>Картина місяця й спостереження — у <b>Пульсі</b></span></li></ol></div>` },
    { bg: 'peach', html: `
      <div class="sx-mid"><p class="sx-kicker">нова вкладка</p><h2 class="sx-h">Гроші</h2>
        <div class="wn-money"><svg viewBox="0 0 120 120"><g transform="rotate(-90 60 60)" fill="none" stroke-width="20">
          <circle cx="60" cy="60" r="44" stroke="#F47742" stroke-dasharray="110 167" class="wn-arc"/><circle cx="60" cy="60" r="44" stroke="#2D4FC5" stroke-dasharray="70 207" stroke-dashoffset="-113" class="wn-arc"/>
          <circle cx="60" cy="60" r="44" stroke="#F4D58A" stroke-dasharray="50 227" stroke-dashoffset="-186" class="wn-arc"/><circle cx="60" cy="60" r="44" stroke="#161513" stroke-dasharray="35 242" stroke-dashoffset="-239" class="wn-arc"/></g></svg>
          <div class="wn-cats">${[['basket', 'Продукти'], ['house', 'Житло'], ['cutlery', 'Кафе'], ['bus', 'Транспорт']].map(([i, n], k) => `<span><span class="sb sm c-${['tangerine', 'cobalt', 'butter', 'ink'][k]}">${sticker(i)}</span>${n}</span>`).join('')}</div></div>
        <ol class="wn-steps"><li><span><b>− Витрата</b> чи <b>+ Дохід</b>: сума, категорія, готово</span></li><li><span>Під діаграмою: ліміти, регулярні платежі, скарбнички, порівняння й історія</span></li><li><span>Купив щось зі списку в Пульсі — Planik запропонує записати витрату</span></li></ol></div>` },
    { bg: 'ink', html: `
      <div class="sx-mid"><p class="sx-kicker">дрібниці</p><h2 class="sx-h" style="color:var(--butter)">Де тепер профіль</h2>
        <div class="wn-nav"><span>${ui('calendar')}Календар</span><span>${ui('tracker')}Трекери</span><i>${ui('plus')}</i><span class="on">${sticker('wallet')}Гроші</span><span>${ui('pulse')}Пульс</span></div>
        <p class="sx-text">У меню звільнилось місце для «Грошей». Профіль і налаштування відкриваються тапом по аватарці вгорі головного екрана.</p>
        <p class="sx-text" style="margin-top:12px">Настрій і гроші тепер є і в підсумкових сторіз тижня й місяця.</p></div>` },
    { bg: 'cobalt', html: `
      <div class="sx-mid"><h2 class="sx-hero" style="color:var(--butter)">Готово!</h2><p class="sx-text">Почни з того, що цікавіше.</p>
        <div class="wn-go"><button class="btn btn-acc" data-sx="money">${sticker('wallet')}Відкрити Гроші</button><button class="btn btn-cream" data-sx="close">До календаря</button></div></div>
      <span class="sx-halves" aria-hidden="true"><i></i><i></i></span>`, onAction: (a, close) => { if (a === 'money') { close(); setTimeout(() => window.dispatchEvent(new CustomEvent('planik:tab', { detail: 'money' })), 320); } } }
  ]
};

const vnum = (v) => (v || '0').split('.').map(Number).reduce((a, n) => a * 1000 + (n || 0), 0);

/** after an update: play decks newer than the last one seen */
export function maybeWhatsNew() {
  const st = getState();
  if (!st.user.onboarded) return;
  const seen = st.app && st.app.seen ? st.app.seen : '1.1.0'; // everyone before 1.2 had no record
  if (vnum(seen) >= vnum(VERSION)) return;
  showWhatsNew({ from: seen });
}

export function showWhatsNew({ from = '', replay = false } = {}) {
  const all = Object.keys(DECKS).filter((v) => vnum(v) <= vnum(VERSION)).sort((a, b) => vnum(a) - vnum(b));
  const versions = replay ? all.slice(-1) : all.filter((v) => vnum(v) > vnum(from));
  const slides = versions.flatMap((v) => DECKS[v]());
  const done = () => update((s) => { s.app = { ...(s.app || {}), seen: VERSION }; });
  if (!slides.length) return done();
  playDeck(slides, { label: 'Що нового в Planik', onClose: done });
}
