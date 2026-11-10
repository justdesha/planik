// In-app inbox, home-screen badge and system notifications (while the app is running).
import { esc, humanDate, inWords, untilText } from './util.js';
import { getState, update, inboxItems, markAllRead, markRead, unreadCount, occTime } from './store.js';
import { ui, sticker } from './icons.js';
import { openSheet } from './ui.js';
import { openEvent } from './events.js';

const LAST_SEEN = 'planik:notified';

export const isStandalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
export const notifSupported = () => 'Notification' in window;
export const notifState = () => (notifSupported() ? Notification.permission : 'unsupported');

export async function askPermission() {
  if (!notifSupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
}

export function updateBadge() {
  const n = unreadCount();
  if (!getState().settings.badge) { navigator.clearAppBadge && navigator.clearAppBadge().catch(() => {}); return n; }
  if ('setAppBadge' in navigator) {
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  }
  return n;
}

function describe(it) {
  if (it.type === 'overdue') return { icon: 'flame', color: 'orange', title: `Не забудь: «${it.ev.title}»`, text: `Мало бути ${humanDate(it.date)}. Зроби або перенеси.` };
  if (it.type === 'birthday') return { icon: 'gift', color: 'red', title: `День народження: ${it.ev.title}`, text: it.offset === 0 ? 'Сьогодні! Не забудь привітати.' : `${humanDate(it.date)} — є ${inWords(it.offset)}, щоб підготуватися.` };
  if (it.type === 'important') return { icon: 'megaphone', color: 'red', title: `Важливо: ${it.ev.title}`, text: `${humanDate(it.date)}${it.ev.start && !it.ev.allDay ? ', ' + it.ev.start : ''} · ${untilText(occTime(it.ev, it.date))}` };
  if (it.type === 'remind') return { icon: 'bolt', color: 'lime', title: it.ev.title, text: `${humanDate(it.date)}${it.ev.start && !it.ev.allDay ? ', ' + it.ev.start : ''} · ${untilText(occTime(it.ev, it.date))}` };
  if (it.type === 'goal') return { icon: 'trophy', color: 'lime', title: `Мета досягнута: ${it.tracker.name}`, text: 'Мету досягнуто. Постав нову або просто порадій.' };
  if (it.type === 'trackerEnd') return { icon: 'target', color: 'pink', title: `Челендж завершено: ${it.tracker.name}`, text: 'Подивись результат у трекерах.' };
  return { icon: 'spark', color: 'sand', title: 'Planik', text: '' };
}

export function openInbox(after) {
  const render = () => {
    const items = inboxItems();
    const read = getState().inbox.read;
    if (!items.length) return `<div class="empty" style="margin-top:6px"><p class="h3">Тут тихо</p><p class="small">Нагадування, протерміновані справи й досягнуті цілі зʼявлятимуться тут.</p></div>`;
    return items.map((it) => {
      const d = describe(it);
      return `<button class="nt ${read[it.id] ? '' : 'unread'}" data-nid="${it.id}" ${it.ev ? `data-ev="${it.ev.id}" data-d="${it.date}"` : ''}>
        <span class="sb c-${d.color}">${sticker(d.icon)}</span><span class="grow"><b>${esc(d.title)}</b><span>${esc(d.text)}</span></span></button>`;
    }).join('');
  };
  openSheet({
    title: 'Сповіщення',
    html: render(),
    foot: unreadCount() ? '<button class="btn btn-ink btn-block" id="readAll">Позначити все прочитаним</button>' : '',
    onMount(s) {
      s.body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-nid]');
        if (!b) return;
        markRead(b.dataset.nid);
        updateBadge();
        if (b.dataset.ev) { s.close(); setTimeout(() => openEvent(b.dataset.ev, b.dataset.d, after), 200); }
        else s.setHtml(render());
        after && after();
      });
      const ra = s.el.querySelector('#readAll');
      ra && ra.addEventListener('click', () => { markAllRead(); updateBadge(); s.setHtml(render()); ra.remove(); after && after(); });
    }
  });
}

/** fire system notifications for items that appeared since the last check */
export async function tick(onChange) {
  const items = inboxItems();
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(LAST_SEEN) || '{}'); } catch (e) { seen = {}; }
  const fresh = items.filter((i) => !seen[i.id] && !getState().inbox.read[i.id]);
  if (fresh.length && notifState() === 'granted') {
    const reg = await navigator.serviceWorker?.getRegistration();
    for (const it of fresh.slice(0, 3)) {
      const d = describe(it);
      const opts = { body: d.text, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: it.id, data: it.ev ? { eventId: it.ev.id, date: it.date } : {} };
      try { reg ? await reg.showNotification(d.title, opts) : new Notification(d.title, opts); } catch (e) { /* not allowed here */ }
    }
  }
  for (const i of items) seen[i.id] = 1;
  // keep the map small
  const keys = Object.keys(seen);
  if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((k) => delete seen[k]);
  localStorage.setItem(LAST_SEEN, JSON.stringify(seen));
  updateBadge();
  if (fresh.length && onChange) onChange();
}
