// Planik — entry point: screens, bottom navigation, lifecycle.
import { $, haptic } from './util.js';
import { getState, eventById } from './store.js';
import { ui } from './icons.js';
import { mountHome, render as renderHome } from './calendar.js';
import { mountTrackers, renderTrackers } from './trackers.js';
import { mountPulse, renderPulse } from './pulse.js';
import { mountProfile, renderProfile } from './profile.js';
import { mountMoney, renderMoney, moneyHasData, moneySlides } from './money.js';
import { setExtraData, setExtraSlides } from './stories.js';
import { maybeWhatsNew } from './whatsnew.js';
import { runOnboarding } from './onboarding.js';
import { openEventForm, openEvent } from './events.js';
import { tick } from './notify.js';
import { closeAllSheets } from './ui.js';
import { reduceMotion } from './util.js';
import { applyTheme } from './profile.js';

const TABS = [
  { id: 'home', label: 'Календар', icon: 'calendar', render: () => renderHome() },
  { id: 'trackers', label: 'Трекери', icon: 'tracker', render: () => renderTrackers() },
  { id: 'money', label: 'Гроші', icon: 'wallet', render: () => renderMoney() },
  { id: 'pulse', label: 'Пульс', icon: 'pulse', render: () => renderPulse() },
  // profile has no tab: it opens from the avatar on the home screen
  { id: 'profile', label: 'Профіль', icon: 'user', render: () => renderProfile(), hidden: true }
];
let current = 'home';

function shell() {
  const app = $('#app');
  app.innerHTML = `
    ${TABS.map((t) => `<main class="screen" id="s-${t.id}" ${t.id === current ? '' : 'hidden'}></main>`).join('')}
    <nav class="nav" aria-label="Розділи">
      <span class="nav-ind" aria-hidden="true"></span>
      ${tabBtn(TABS[0])}${tabBtn(TABS[1])}
      <button class="nav-add" id="navAdd" aria-label="Додати план">${ui('plus')}</button>
      ${tabBtn(TABS[2])}${tabBtn(TABS[3])}
    </nav>`;
  mountHome($('#s-home'));
  mountTrackers($('#s-trackers'));
  mountPulse($('#s-pulse'));
  mountMoney($('#s-money'));
  mountProfile($('#s-profile'), { restartOnboarding: () => runOnboarding(() => refresh()) });

  $('.nav').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) switchTab(t.dataset.tab, { dir: Math.sign(NAV.indexOf(t.dataset.tab) - NAV.indexOf(current)) });
  });
  $('#navAdd').addEventListener('click', () => {
    haptic(10);
    openEventForm({ onSaved: refresh });
  });
  requestAnimationFrame(() => moveIndicator(current, false));
  window.addEventListener('resize', () => moveIndicator(current, false));
}

const tabBtn = (t) => `<button class="nav-tab" data-tab="${t.id}" ${t.id === current ? 'aria-current="page"' : ''}>${ui(t.icon)}<span>${t.label}</span></button>`;

function moveIndicator(id, animate = true, fromId) {
  const nav = $('.nav'), ind = $('.nav-ind'), tab = nav.querySelector(`[data-tab="${id}"]`);
  ind.style.opacity = tab ? '' : '0';
  if (!tab) return;
  const n = nav.getBoundingClientRect(), r = tab.getBoundingClientRect();
  const left = r.left - n.left + 3, right = n.right - r.right + 3;
  const order = TABS.map((t) => t.id);
  if (!nav.querySelector(`[data-tab="${fromId}"]`)) animate = false;
  const goingRight = order.indexOf(id) > order.indexOf(fromId);
  if (animate) {
    // leading edge moves first, trailing edge catches up — it stretches like a drop
    ind.style.transition = goingRight
      ? 'right .34s cubic-bezier(.3,1.35,.5,1), left .5s cubic-bezier(.45,1.25,.45,1) .07s'
      : 'left .34s cubic-bezier(.3,1.35,.5,1), right .5s cubic-bezier(.45,1.25,.45,1) .07s';
    ind.classList.remove('squish'); void ind.offsetWidth; ind.classList.add('squish');
  } else ind.style.transition = 'none';
  ind.style.left = left + 'px';
  ind.style.right = right + 'px';
}

/* ---------- swipe left / right to move between the menu sections ---------- */
const NAV = ['home', 'trackers', 'money', 'pulse'];
// places where a horizontal swipe already means something else
const OWN_SWIPE = '.cal, .chips.scroll, .mood-row, .sx-row, .swr, .wd-pick, input, textarea, .nav, .seg';
function bindTabSwipe() {
  let x0 = null, y0 = 0, t0 = 0;
  document.addEventListener('touchstart', (e) => {
    x0 = null;
    if (e.touches.length !== 1) return;
    if (document.querySelector('.sheet.on, .sx, .ob, .menu')) return;
    const t = e.touches[0];
    // leave the screen edges to the system
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
    if (e.target.closest(OWN_SWIPE)) return;
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if (Date.now() - t0 > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    if (current === 'profile') { if (dx > 0) switchTab('home', { dir: -1 }); return; }
    const i = NAV.indexOf(current) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < NAV.length) switchTab(NAV[i], { dir: dx < 0 ? 1 : -1 });
  }, { passive: true });
}

/* ---------- keep the swipe history clean ----------
   iPhone treats an edge swipe as back/forward. An anchor entry means there is never
   a "forward" page to land on, and "back" just closes the top sheet. */
function anchorHistory() {
  try { history.pushState({ planik: 1 }, '', location.pathname); } catch (e) { return; }
  window.addEventListener('popstate', () => {
    closeAllSheets();
    try { history.pushState({ planik: 1 }, '', location.pathname); } catch (e) { /* ignore */ }
  });
}

function switchTab(id, { silent = false, dir = 0 } = {}) {
  if (id === current) {
    if (id === 'home') { import('./calendar.js').then((m) => m.goToday()); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const from = current;
  current = id;
  if (!silent) haptic(8);
  document.querySelectorAll('.nav-tab').forEach((b) => {
    if (b.dataset.tab === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  TABS.forEach((t) => { $('#s-' + t.id).hidden = t.id !== id; });
  TABS.find((t) => t.id === id).render();
  const scr = $('#s-' + id);
  if (dir && !reduceMotion()) { scr.classList.remove('in-l', 'in-r'); void scr.offsetWidth; scr.classList.add(dir > 0 ? 'in-r' : 'in-l'); }
  window.scrollTo({ top: 0 });
  moveIndicator(id, true, from);
}

export function refresh() {
  TABS.find((t) => t.id === current).render();
}

function openFromHash() {
  const m = location.hash.match(/event=([\w-]+)/);
  if (m && eventById(m[1])) {
    history.replaceState(null, '', location.pathname);
    switchTab('home', { silent: true });
    setTimeout(() => openEvent(m[1], null, refresh), 300);
  }
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw && nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(nw);
      });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.addEventListener('message', (e) => {
    const d = e.data && e.data.open;
    if (d && d.eventId) { closeAllSheets(); switchTab('home', { silent: true }); openEvent(d.eventId, d.date, refresh); }
  });
}

function showUpdate(worker) {
  const bar = document.createElement('div');
  bar.className = 'update-bar';
  bar.innerHTML = '<span>Є нова версія Planik</span><button class="btn btn-acc btn-sm">Оновити</button>';
  bar.querySelector('button').onclick = () => worker.postMessage('skipWaiting');
  document.body.append(bar);
}

function start() {
  applyTheme();
  shell();
  const st = getState();
  refresh();
  setExtraData(moneyHasData);
  setExtraSlides(moneySlides);
  if (!st.user.onboarded) runOnboarding(() => refresh());
  else setTimeout(maybeWhatsNew, 600);
  openFromHash();
  tick(refresh);
  setInterval(() => tick(refresh), 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(refresh); refresh(); } });
  window.addEventListener('hashchange', openFromHash);
  window.addEventListener('planik:tab', (e) => switchTab(e.detail));
  registerSW();
  bindTabSwipe();
  anchorHistory();
}

start();
