// Bottom sheets, action sheets, toast and popover menu.
import { $, esc, haptic } from './util.js';
import { ui } from './icons.js';

const stack = [];

/**
 * openSheet({ title, html, foot, full, onMount, onClose })
 * returns { el, body, close }
 */
export function openSheet({ title = '', head = '', html = '', foot = '', full = false, onMount, onClose } = {}) {
  const root = $('#sheets');
  const back = document.createElement('div');
  back.className = 'sheet-back';
  const sh = document.createElement('section');
  sh.className = 'sheet' + (full ? ' full' : '');
  sh.setAttribute('role', 'dialog');
  sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = `
    <div class="sheet-grab"><i></i></div>
    <div class="sheet-head">${head || `<h2 class="h2">${esc(title)}</h2>`}<button class="ibtn sm" data-close aria-label="Закрити">${ui('close')}</button></div>
    <div class="sheet-body">${html}</div>
    ${foot ? `<div class="sheet-foot">${foot}</div>` : ''}`;
  root.append(back, sh);
  document.body.style.overflow = 'hidden';

  let closed = false;
  const api = {
    el: sh,
    body: sh.querySelector('.sheet-body'),
    close(result) {
      if (closed) return;
      closed = true;
      sh.classList.remove('on');
      back.classList.remove('on');
      const i = stack.indexOf(api);
      if (i >= 0) stack.splice(i, 1);
      setTimeout(() => { sh.remove(); back.remove(); if (!stack.length) document.body.style.overflow = ''; }, 420);
      onClose && onClose(result);
    },
    setHtml(h) { api.body.innerHTML = h; }
  };
  stack.push(api);
  back.addEventListener('click', () => api.close());
  sh.querySelector('[data-close]').addEventListener('click', () => api.close());

  // swipe down to close (from the grab handle or header)
  let y0 = null, dy = 0;
  const start = (e) => { y0 = e.touches[0].clientY; dy = 0; sh.classList.add('dragging'); };
  const move = (e) => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; };
  const end = () => {
    if (y0 === null) return;
    sh.classList.remove('dragging'); sh.style.transform = '';
    if (dy > 110) api.close();
    y0 = null;
  };
  for (const zone of [sh.querySelector('.sheet-grab'), sh.querySelector('.sheet-head')]) {
    zone.addEventListener('touchstart', start, { passive: true });
    zone.addEventListener('touchmove', move, { passive: true });
    zone.addEventListener('touchend', end);
  }
  // pull down from the top of the scrolled body also closes
  const body = api.body;
  let by0 = null;
  body.addEventListener('touchstart', (e) => { by0 = body.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  body.addEventListener('touchmove', (e) => {
    if (by0 === null) return;
    const d = e.touches[0].clientY - by0;
    if (d > 0 && body.scrollTop <= 0) { sh.classList.add('dragging'); dy = d; sh.style.transform = `translateY(${d * .8}px)`; }
  }, { passive: true });
  body.addEventListener('touchend', () => { if (by0 !== null) { sh.classList.remove('dragging'); sh.style.transform = ''; if (dy > 140) api.close(); } by0 = null; });

  requestAnimationFrame(() => requestAnimationFrame(() => { back.classList.add('on'); sh.classList.add('on'); }));
  onMount && onMount(api);
  return api;
}

export const closeAllSheets = () => [...stack].forEach((s) => s.close());

/** Action sheet. actions: [{label, value, style:'butter'|'ink'|'sand'|'danger'}] → Promise<value|null> */
export function ask(message, actions) {
  return new Promise((resolve) => {
    let picked = null;
    openSheet({
      title: '',
      head: `<span></span>`,
      html: `${message ? `<p class="act-msg">${esc(message)}</p>` : ''}<div class="act-list">${actions.map((a, i) =>
        `<button class="btn ${a.style === 'danger' ? 'btn-ink danger-btn' : 'btn-' + (a.style || 'sand')}" data-i="${i}">${esc(a.label)}</button>`).join('')}
        <button class="btn btn-ghost" data-i="-1">Скасувати</button></div>`,
      onMount(s) {
        s.body.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
          const i = +b.dataset.i;
          picked = i >= 0 ? actions[i].value : null;
          s.close();
        }));
        s.body.querySelectorAll('.danger-btn').forEach((b) => { b.style.background = 'var(--red)'; b.style.color = '#FFF6EE'; });
      },
      onClose() { resolve(picked); }
    });
  });
}

let toastTimer;
export function toast(msg, { action, onAction, ms = 2600 } = {}) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('on'); onAction && onAction(); };
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

/** popover menu anchored to an element */
export function menu(anchor, items, onPick) {
  const r = anchor.getBoundingClientRect();
  const back = document.createElement('div');
  back.className = 'menu-back';
  const m = document.createElement('div');
  m.className = 'menu';
  m.innerHTML = items.map((it, i) => `<button data-i="${i}" aria-pressed="${!!it.active}">${it.icon ? ui(it.icon) : ''}<span>${esc(it.label)}</span></button>`).join('');
  m.style.top = r.bottom + 8 + 'px';
  m.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
  document.body.append(back, m);
  const close = () => { back.remove(); m.remove(); };
  back.addEventListener('click', close);
  m.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { haptic(); close(); onPick(items[+b.dataset.i].value); }));
}

/** animate a segmented control indicator */
export function segIndicator(seg) {
  let ind = seg.querySelector('.seg-ind');
  if (!ind) { ind = document.createElement('i'); ind.className = 'seg-ind'; seg.prepend(ind); }
  const on = seg.querySelector('button[aria-pressed="true"]');
  if (!on) { ind.style.width = '0'; return; }
  ind.style.left = on.offsetLeft + 'px';
  ind.style.width = on.offsetWidth + 'px';
}

/** toggle switch html */
export const toggle = (name, on, cls = '') => `<span class="tgl ${cls}" role="switch" aria-checked="${!!on}" data-tgl="${name}"></span>`;
