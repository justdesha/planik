// Передбачення дня: one prediction a day, opened by shaking the phone over a plasma ball.
import { todayYmd, parseYmd, esc, haptic, hapticPattern, MONTHS_GEN, reduceMotion } from './util.js';
import { getState, update } from './store.js';
import { ui, sticker } from './icons.js';
import { ORACLE } from './oracle-data.js';

/* ---------- which prediction belongs to a day ---------- */
// every year gets its own shuffle of all 365, so no day repeats within a year
const perms = {};
function perm(year) {
  if (perms[year]) return perms[year];
  let a = year * 2654435761 >>> 0;
  const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const p = ORACLE.map((_, i) => i);
  for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return (perms[year] = p);
}
export function oracleFor(d) {
  const dt = parseYmd(d);
  const day = Math.round((dt - new Date(dt.getFullYear(), 0, 1)) / 86400000);
  return ORACLE[perm(dt.getFullYear())[day % ORACLE.length]];
}
const opened = (d) => !!(getState().oracle || {})[d];

/* ---------- home ---------- */
const miniOrb = '<span class="orb-mini" aria-hidden="true"><i></i><i></i><i></i></span>';
export function oracleHomeHtml() {
  const t = todayYmd();
  if (!opened(t)) {
    return `<button class="orb-card reveal" data-oracle="open">${miniOrb}<span class="grow"><b>Передбачення дня</b><span>Струсни телефон над кулею</span></span>${ui('right')}</button>`;
  }
  return `<button class="orb-pill" data-oracle="open">${miniOrb}<span class="grow">${esc(oracleFor(t))}</span></button>`;
}

/** for a day in the calendar: past days and today once it is opened */
export function dayOracleHtml(d) {
  const t = todayYmd();
  if (d > t || (d === t && !opened(t))) return '';
  return `<div class="orb-day">${miniOrb}<span><small>Передбачення ${d === t ? 'на сьогодні' : 'цього дня'}</small>${esc(oracleFor(d))}</span></div>`;
}

export function bindOracle(root, rerender) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-oracle="open"]')) openOracle(rerender);
  });
}

/* ---------- full screen ---------- */
export async function openOracle(after) {
  const t = todayYmd();
  const was = opened(t);
  // iPhone asks for motion access, and only inside a tap — this is that tap
  let motion = typeof DeviceMotionEvent !== 'undefined';
  if (!was && motion && typeof DeviceMotionEvent.requestPermission === 'function') {
    try { motion = (await DeviceMotionEvent.requestPermission()) === 'granted'; } catch (e) { motion = false; }
  }
  const dt = parseYmd(t);
  const el = document.createElement('div');
  el.className = 'orb-screen';
  el.innerHTML = `
    <div class="orb-top"><span class="orb-date">${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]}</span><button class="orb-x" aria-label="Закрити">${ui('close')}</button></div>
    <div class="orb-stage"><div class="orb-ball"><canvas></canvas></div></div>
    <div class="orb-read"><p class="orb-kicker">передбачення на ${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]}</p><p class="orb-text"></p></div>
    <div class="orb-foot"><p class="orb-hint">${motion ? '<span class="orb-shake">' + sticker('phone') + '</span>Струсни телефон' : 'Торкнись кулі'}</p>
      <button class="orb-tap">${motion ? 'або торкнись кулі' : ''}</button></div>`;
  document.body.append(el);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => el.classList.add('on'));

  const canvas = el.querySelector('canvas');
  const plasma = startPlasma(canvas);
  const text = el.querySelector('.orb-text');
  const ball = el.querySelector('.orb-ball');
  let state = was ? 'shown' : 'idle';

  /** the ball grows into a huge circle in the top half, the words surface below it */
  const showText = (instant) => {
    el.classList.add('revealed');
    if (instant) el.classList.add('instant');
    const ws = oracleFor(t).split(' ');
    text.innerHTML = words(oracleFor(t));
    // re-measure the canvas once the ball has grown, so it stays sharp
    const resize = () => plasma.resize();
    ball.addEventListener('transitionend', resize, { once: true });
    setTimeout(resize, instant ? 50 : 1300);
    text.classList.add('on');
    const foot = el.querySelector('.orb-foot');
    foot.innerHTML = '<p class="orb-hint small">Нове передбачення — завтра</p><button class="orb-done">Дякую</button>';
    foot.classList.remove('gone');
    foot.classList.add('end');
    if (!instant) {
      // a soft tick for every word as it surfaces
      const start = 650;
      hapticPattern(ws.map((_, i) => start + i * 90), 8);
    }
  };
  if (was) { plasma.calm(); showText(true); }

  const reveal = () => {
    if (state !== 'idle') return;
    state = 'burst';
    plasma.burst();
    el.querySelector('.orb-foot').classList.add('gone');
    // a rumble that speeds up, as if the ball charges…
    hapticPattern([0, 170, 310, 420, 510, 585, 645, 695, 735, 770, 800, 825, 848, 868, 886], 14);
    setTimeout(() => {
      // …and a heavy double knock when it bursts open
      hapticPattern([0, 45, 90, 200], 40);
      update((s) => { s.oracle = s.oracle || {}; s.oracle[t] = Date.now(); });
      plasma.calm();
      state = 'shown';
      showText(false);
    }, reduceMotion() ? 200 : 1300);
  };

  // shake: two strong jolts within a second
  let last = null, hits = [];
  const onMotion = (e) => {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x == null) return;
    if (last) {
      const d = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
      if (d > 24) {
        const now = Date.now();
        hits = hits.filter((h) => now - h < 1000); hits.push(now);
        plasma.poke();
        if (state === 'idle') haptic(18);
        if (hits.length >= 2) reveal();
      }
    }
    last = { x: a.x, y: a.y, z: a.z };
  };
  if (motion && !was) window.addEventListener('devicemotion', onMotion);

  const close = () => {
    window.removeEventListener('devicemotion', onMotion);
    plasma.stop();
    el.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(() => el.remove(), 380);
    after && after();
  };
  el.addEventListener('click', (e) => {
    if (e.target.closest('.orb-x, .orb-done')) return close();
    if (e.target.closest('.orb-ball, .orb-tap')) { if (state === 'idle') reveal(); else { plasma.poke(); haptic(10); } }
  });
}

const words = (s) => esc(s).split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ');

/* ---------- the plasma ball ---------- */
function startPlasma(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const ctx = canvas.getContext('2d');
  let W = 0, R = 0;
  const size = () => { const r = canvas.getBoundingClientRect(); W = r.width * dpr; canvas.width = canvas.height = W; R = W / 2; };
  size();
  const COLORS = ['#F9BE9F', '#F4D58A', '#FFFFFF', '#B4C5F6', '#F47742'];
  const mk = (i) => ({ a: Math.random() * Math.PI * 2, v: (Math.random() - .5) * .012, c: COLORS[i % COLORS.length], seed: Math.random() * 1000 });
  const arcs = Array.from({ length: 16 }, (_, i) => mk(i));
  let energy = .5, target = .5, flash = 0, raf = 0, tm = 0, alive = true;
  const still = reduceMotion();

  const tendril = (t, k) => {
    // a jittery line from the core to the glass
    const end = t.a, n = 14;
    ctx.beginPath();
    let x = R, y = R;
    ctx.moveTo(x, y);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      const r = R * .86 * f;
      const wob = Math.sin(tm * .004 + t.seed + i * 1.7) * .16 * (1 - f * .5) + (Math.random() - .5) * .06 * energy;
      x = R + Math.cos(end + wob) * r;
      y = R + Math.sin(end + wob) * r;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = t.c;
    ctx.lineWidth = (1.2 + energy * 1.8) * dpr * (k === 0 ? 1.6 : 1);
    ctx.shadowColor = t.c; ctx.shadowBlur = 14 * dpr * (.6 + energy);
    ctx.globalAlpha = .55 + energy * .45;
    ctx.stroke();
    // the touch point on the glass
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16 * dpr * (.6 + energy));
    g.addColorStop(0, t.c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.arc(x, y, 16 * dpr * (.6 + energy), 0, Math.PI * 2); ctx.fill();
  };

  const frame = (now) => {
    if (!alive) return;
    tm = now;
    // the ball grows on reveal: keep the canvas as big as it is on screen
    if (Math.abs(canvas.clientWidth * dpr - W) > 2) size();
    energy += (target - energy) * .06;
    if (flash > 0) flash *= .92;
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    // glass
    ctx.beginPath(); ctx.arc(R, R, R - 2 * dpr, 0, Math.PI * 2); ctx.clip();
    const bg = ctx.createRadialGradient(R, R, R * .1, R, R, R);
    bg.addColorStop(0, '#2A3B85'); bg.addColorStop(.7, '#182766'); bg.addColorStop(1, '#0E1640');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, W);
    // swirling clouds
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = tm * .0003 * (i + 1) + i * 2.1;
      const cx = R + Math.cos(a) * R * .35, cy = R + Math.sin(a * 1.3) * R * .35;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .8);
      g.addColorStop(0, ['rgba(45,79,197,.55)', 'rgba(244,119,66,.22)', 'rgba(180,197,246,.25)'][i]); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.globalAlpha = 1; ctx.fillRect(0, 0, W, W);
    }
    // tendrils
    const count = Math.min(arcs.length, Math.round(4 + energy * 5));
    for (let i = 0; i < count; i++) { const t = arcs[i]; t.a += t.v * (1 + energy * 2); tendril(t, i); }
    ctx.shadowBlur = 0;
    // core
    const core = ctx.createRadialGradient(R, R, 0, R, R, R * (.16 + energy * .06));
    core.addColorStop(0, '#FFFFFF'); core.addColorStop(.35, '#F4D58A'); core.addColorStop(1, 'rgba(244,119,66,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = core; ctx.beginPath(); ctx.arc(R, R, R * .3, 0, Math.PI * 2); ctx.fill();
    // flash on reveal
    if (flash > .01) { ctx.globalAlpha = flash; ctx.fillStyle = '#FFF6E0'; ctx.fillRect(0, 0, W, W); }
    ctx.globalCompositeOperation = 'source-over';
    // glass highlight
    ctx.globalAlpha = 1;
    const hl = ctx.createRadialGradient(R * .62, R * .5, 0, R * .62, R * .5, R * .55);
    hl.addColorStop(0, 'rgba(255,255,255,.22)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fillRect(0, 0, W, W);
    ctx.restore();
    // rim
    ctx.beginPath(); ctx.arc(R, R, R - 2 * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2 * dpr; ctx.stroke();
    if (!still || energy > .2) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  addEventListener('resize', size);
  return {
    poke() { target = Math.min(1.4, target + .35); setTimeout(() => { if (target > .6) target = .6; }, 500); },
    burst() { target = 1.6; setTimeout(() => { flash = .9; }, 900); },
    calm() { target = .32; },
    resize() { size(); },
    stop() { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', size); }
  };
}
