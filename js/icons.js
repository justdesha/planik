// Interface icons (line) and sticker icons (filled) for trackers & categories.
// Sticker icons: "F" = main ink fill, "C" = cut-out color (the badge color under the icon).

const L = (body) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const UI = {
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M8 3v4M16 3v4M3.5 10.5h17"/>',
  tracker: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />',
  pulse: '<path d="M2.5 12h4l2.5-6 4 13 3-9 1.5 2h4"/>',
  user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>',
  left: '<path d="m14.5 6-6 6 6 6"/>',
  right: '<path d="m9.5 6 6 6-6 6"/>',
  down: '<path d="m6 9.5 6 6 6-6"/>',
  up: '<path d="m6 14.5 6-6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  trash: '<path d="M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  tickets: '<rect x="4" y="3.5" width="16" height="7" rx="2.5"/><rect x="4" y="13.5" width="16" height="7" rx="2.5"/>',
  timeline: '<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="6" cy="18.5" r="2"/><path d="M6 7.5v2.5M6 14v2.5M11 5.5h9M11 12h9M11 18.5h6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  place: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  repeat: '<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5l3 3"/>',
  flag: '<path d="M5 21V4M5 4.5h11l-2 4 2 4H5"/>',
  note: '<path d="M6 3.5h8l4.5 4.5V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
  bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2.5h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  more: '<circle cx="5.5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  cake: '<path d="M4 20.5h16M5 20.5v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7"/><path d="M5 15.5c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0M12 11.5V8"/><path d="M12 3.5c.9 1.2.9 2.3 0 3-.9-.7-.9-1.8 0-3z"/>',
  task: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="m8.5 12.3 2.5 2.5 4.5-5"/>',
  spark: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  wallet: '<path d="M4.5 8V7a2.5 2.5 0 0 1 2.5-2.5h9.5V8"/><rect x="4" y="8" width="16.5" height="12" rx="3"/><path d="M20.5 12h-4a2 2 0 0 0 0 4h4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-5-4-6-5.5-11C11 7 8.5 8 8.5 11c-1 0-2-1-2.3-2.3C5.4 10 6 12 6 15a6 6 0 0 0 6 6z"/>'
};

// Pushpin — the "needle with a head" for pinning trackers
const PIN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3.5h6l-1 5 3.5 3.5v1.5h-11V12L10 8.5z" fill="currentColor"/><path d="M12 13.5V21" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>';

export function ui(name) {
  if (name === 'pin') return PIN;
  return L(UI[name] || UI.spark);
}

const C = 'var(--cut)';
const ST = {
  candy: `<ellipse cx="24" cy="24" rx="11" ry="9.5"/><path d="M14.5 20 4 13.5 5 27l9.5-2.5zM33.5 20 44 13.5 43 27l-9.5-2.5z"/><path d="M20.5 15.5q4 8.5 0 17M27.5 15.5q-4 8.5 0 17" stroke="${C}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  nosmoke: `<rect x="5" y="21" width="30" height="8" rx="2"/><rect x="37" y="21" width="6" height="8" rx="2"/><path d="M38 9c-3 3 3 5 0 9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M8 8l32 32" stroke="${C}" stroke-width="10" stroke-linecap="round"/><path d="M8 8l32 32" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>`,
  dumbbell: `<rect x="3" y="17" width="7" height="14" rx="2.5"/><rect x="10.5" y="11.5" width="7.5" height="25" rx="2.5"/><rect x="30" y="11.5" width="7.5" height="25" rx="2.5"/><rect x="38" y="17" width="7" height="14" rx="2.5"/><rect x="18" y="21" width="12" height="6" rx="1.5"/>`,
  shoe: `<path d="M5 33c0-7 2-13 4.5-17.5l8 3c2.2.8 4.2-.2 5-2.2l3.3 1.2c2 6.5 8 9.5 16 10.5 2 .3 3.2 2 3.2 4V36H5z"/><path d="M5 36h37" stroke="${C}" stroke-width="2.6"/><path d="M19 23l3 1.2M17 27.5l3 1.2" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>`,
  drop: `<path d="M24 4C17 14 10.5 21.5 10.5 29a13.5 13.5 0 0 0 27 0C37.5 21.5 31 14 24 4z"/><path d="M17.5 29.5a6.5 6.5 0 0 0 6.5 6.5" stroke="${C}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  book: `<path d="M5 9h13a6 6 0 0 1 6 6v26a4.5 4.5 0 0 0-4.5-4.5H5zM43 9H30a6 6 0 0 0-6 6v26a4.5 4.5 0 0 1 4.5-4.5H43z"/>`,
  moon: `<path d="M29 5a18 18 0 1 0 14 27A15.5 15.5 0 0 1 29 5z"/><path d="M37 8l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z"/>`,
  apple: `<path d="M24 16c-3-2.5-10.5-3.5-14.5 1.5-5.5 7.5.5 23 7.5 25 3 .8 5-1 7-1s4 1.8 7 1c7-2 13-17.5 7.5-25-4-5-11.5-4-14.5-1.5z"/><path d="M24 16c0-5.5 3-9 7.5-10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M15 23c-1.5 2-2 5-1 8" stroke="${C}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  coffee: `<path d="M7 18h27v9.5A12.5 12.5 0 0 1 21.5 40h-2A12.5 12.5 0 0 1 7 27.5z"/><path d="M34 21h3a5.5 5.5 0 0 1 0 11h-3.5" stroke="currentColor" stroke-width="3.6" fill="none"/><path d="M16 5c-2 3 2 4 0 8M24 5c-2 3 2 4 0 8" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  glass: `<path d="M13 5h22c1.2 11-3.5 18.5-11 18.5S11.8 16 13 5z"/><rect x="22" y="22" width="4" height="13"/><rect x="14" y="35" width="20" height="5" rx="2.5"/><path d="M15 11h18" stroke="${C}" stroke-width="2.6"/>`,
  phone: `<rect x="12.5" y="3.5" width="23" height="41" rx="6"/><rect x="16.5" y="9" width="15" height="26" rx="2" fill="${C}"/><circle cx="24" cy="39.5" r="2.2" fill="${C}"/>`,
  heart: `<path d="M24 42S5 31 5 17.5a9.5 9.5 0 0 1 19-3.5 9.5 9.5 0 0 1 19 3.5C43 31 24 42 24 42z"/><path d="M13 15a4.5 4.5 0 0 1 4-3" stroke="${C}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  bolt: `<path d="M28 3 8.5 27.5h12.5L18 45l21.5-26.5H27z"/>`,
  flame: `<path d="M24 3.5c2 8.5 13 12.5 13 25a13 13 0 0 1-26 0c0-6.5 3.2-9.8 5.4-12.8 1 4.3 3.2 6.3 5.4 6.3-2.2-6.5 0-13.5 2.2-18.5z"/><path d="M24 41a5.5 5.5 0 0 1-5.5-5.5c0-3.5 3-5 5.5-8.5 2.5 3.5 5.5 5 5.5 8.5A5.5 5.5 0 0 1 24 41z" fill="${C}"/>`,
  star: `<path d="M24 3.5l6.2 13 14.3 1.9-10.4 9.9 2.6 14.2L24 35.6l-12.7 6.9 2.6-14.2-10.4-9.9 14.3-1.9z"/>`,
  music: `<path d="M18.5 35V10.5L39 5v24.5" stroke="currentColor" stroke-width="4.2" fill="none" stroke-linejoin="round"/><circle cx="13" cy="35.5" r="6.5"/><circle cx="33.5" cy="30" r="6.5"/>`,
  camera: `<path d="M5 16a4 4 0 0 1 4-4h5.5l3-4.5h13l3 4.5H39a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><circle cx="24" cy="26" r="9" fill="${C}"/><circle cx="24" cy="26" r="5.5"/><circle cx="37" cy="18" r="2" fill="${C}"/>`,
  plant: `<path d="M13 29h22l-3.2 15H16.2z"/><path d="M24 29c0-10.5-4.5-16.5-15-18.5 0 10.5 5.5 17.5 15 18.5zM24 29c0-8.5 4.5-14.5 15-15.5 0 9.5-5.5 15.5-15 15.5z"/>`,
  pill: `<g transform="rotate(-45 24 24)"><rect x="6.5" y="15.5" width="35" height="17" rx="8.5"/><path d="M24 15.5v17" stroke="${C}" stroke-width="3"/><path d="M12 21.5a3.5 3.5 0 0 1 3.5-2.5" stroke="${C}" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`,
  money: `<rect x="3.5" y="11.5" width="41" height="25" rx="4.5"/><circle cx="24" cy="24" r="6.5" fill="${C}"/><circle cx="10.5" cy="24" r="2.2" fill="${C}"/><circle cx="37.5" cy="24" r="2.2" fill="${C}"/>`,
  smile: `<circle cx="24" cy="24" r="19.5"/><circle cx="17" cy="19.5" r="2.8" fill="${C}"/><circle cx="31" cy="19.5" r="2.8" fill="${C}"/><path d="M14.5 27.5q9.5 10 19 0" stroke="${C}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
  sun: `<circle cx="24" cy="24" r="9.5"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`,
  bike: `<circle cx="11.5" cy="31" r="7.5" stroke="currentColor" stroke-width="4" fill="none"/><circle cx="36.5" cy="31" r="7.5" stroke="currentColor" stroke-width="4" fill="none"/><path d="M11.5 31l7-13h12l6 13M18.5 18l6 13h6M16 12h6" stroke="currentColor" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  walk: `<circle cx="27" cy="7.5" r="4.5"/><path d="M25 15l-6 11 7 6-2 12M23 20l-8 3-2 7M25.5 19l5 6 6 1M19 26l-7 16" stroke="currentColor" stroke-width="4.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  pen: `<path d="M33 5.5l9.5 9.5L18 39.5 6 42l2.5-12z"/><path d="M28.5 10l9.5 9.5" stroke="${C}" stroke-width="3"/><path d="M8.5 30l9.5 9.5" stroke="${C}" stroke-width="2.4"/>`,
  game: `<path d="M14 13h20c6 0 10.5 4.5 10.5 10.5v7a6 6 0 0 1-11 3.5L31 30.5H17L14.5 34a6 6 0 0 1-11-3.5v-7C3.5 17.5 8 13 14 13z"/><path d="M14 19v8M10 23h8" stroke="${C}" stroke-width="3" stroke-linecap="round"/><circle cx="31" cy="20.5" r="2.2" fill="${C}"/><circle cx="35.5" cy="25.5" r="2.2" fill="${C}"/>`,
  paw: `<ellipse cx="24" cy="32" rx="10" ry="8.5"/><ellipse cx="11" cy="21" rx="4.2" ry="5.2"/><ellipse cx="19" cy="12.5" rx="4.2" ry="5.6"/><ellipse cx="29" cy="12.5" rx="4.2" ry="5.6"/><ellipse cx="37" cy="21" rx="4.2" ry="5.2"/>`,
  trophy: `<path d="M13.5 5h21v11a10.5 10.5 0 0 1-21 0z"/><path d="M13.5 9H8a6 6 0 0 0 6 9.5M34.5 9H40a6 6 0 0 1-6 9.5" stroke="currentColor" stroke-width="3.4" fill="none"/><rect x="21" y="25.5" width="6" height="8"/><rect x="13.5" y="33" width="21" height="7" rx="2.5"/>`,
  cart: `<path d="M12 13h30.5L38 30H15.5z"/><path d="M4 7h6l5.5 23h22" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="38.5" r="3.8"/><circle cx="34" cy="38.5" r="3.8"/>`,
  target: `<circle cx="24" cy="24" r="19.5"/><circle cx="24" cy="24" r="12.5" fill="${C}"/><circle cx="24" cy="24" r="6.5"/>`,
  house: `<path d="M24 5 3.5 21.5H9.5V43H20V32h8v11h10.5V21.5h6z"/>`,
  tooth: `<path d="M14.5 5.5C8 5.5 5 10.5 6 16.5c.9 5 3 7.3 4 13.3 1.2 7.5 3.4 12.7 6.5 12.7 3.3 0 3-9.3 7.5-9.3s4.2 9.3 7.5 9.3c3.1 0 5.3-5.2 6.5-12.7 1-6 3.1-8.3 4-13.3 1-6-2-11-8.5-11-4 0-6 2-9.5 2s-5.5-2-9.5-2z"/>`,
  briefcase: `<path d="M17 13V9a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 31 9v4" stroke="currentColor" stroke-width="3.8" fill="none"/><rect x="3.5" y="13" width="41" height="27" rx="5"/><rect x="3.5" y="23.5" width="41" height="3.2" fill="${C}"/><rect x="20.5" y="21.5" width="7" height="7" rx="1.5"/>`,
  chat: `<path d="M8 6.5h32a4.5 4.5 0 0 1 4.5 4.5v18a4.5 4.5 0 0 1-4.5 4.5H20l-9.5 8.5v-8.5H8A4.5 4.5 0 0 1 3.5 29V11A4.5 4.5 0 0 1 8 6.5z"/><circle cx="15" cy="20" r="2.6" fill="${C}"/><circle cx="24" cy="20" r="2.6" fill="${C}"/><circle cx="33" cy="20" r="2.6" fill="${C}"/>`,
  spark: `<rect x="20.5" y="3" width="7" height="42" rx="3.5"/><rect x="20.5" y="3" width="7" height="42" rx="3.5" transform="rotate(60 24 24)"/><rect x="20.5" y="3" width="7" height="42" rx="3.5" transform="rotate(-60 24 24)"/>`,
  gift: `<rect x="5" y="16" width="38" height="9" rx="2.5"/><rect x="8" y="25" width="32" height="18" rx="2.5"/><rect x="21" y="16" width="6" height="27" fill="${C}"/><path d="M24 16c-3-6-12-9-12-3 0 3 6 3 12 3zM24 16c3-6 12-9 12-3 0 3-6 3-12 3z" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linejoin="round"/>`,
  megaphone: `<path d="M6 19h7l20-10v30L13 29H6a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z"/><path d="M13 29l3 11h6l-2.5-9" /><path d="M38 18a7 7 0 0 1 0 12" stroke="currentColor" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
  plane: `<path d="M44 5 4 21.5l14.5 5L22 42l7-10 10 7.5z"/><path d="M18.5 26.5 36 12" stroke="${C}" stroke-width="2.8" stroke-linecap="round"/>`,
  car: `<path d="M9 21l4-10h22l4 10h3a2.5 2.5 0 0 1 2.5 2.5V35H3.5V23.5A2.5 2.5 0 0 1 6 21z"/><path d="M14.5 14h19l2.5 7h-24z" fill="${C}"/><circle cx="13.5" cy="35" r="6" fill="${C}"/><circle cx="13.5" cy="35" r="3.8"/><circle cx="34.5" cy="35" r="6" fill="${C}"/><circle cx="34.5" cy="35" r="3.8"/>`,
  brush: `<path d="M30 4.5l6 3-8.5 18-6-3z"/><path d="M14 23.5l14 6.5-2.5 6c-1 2.5-4 4.5-6 8.5-3-2.5-6.5-3.5-12-5 4.5-3.5 5-8 6.5-11.5z"/><path d="M16 35l4 2M12.5 33l2 1" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>`,
  lotus: `<path d="M24 8c-4.5 5-6 11-6 16s2.5 10 6 13c3.5-3 6-8 6-13s-1.5-11-6-16z"/><path d="M15.5 17c-6.5 0-11 1-12 2 0 8 6 17 20.5 18-5-4-8.5-11-8.5-20zM32.5 17c6.5 0 11 1 12 2 0 8-6 17-20.5 18 5-4 8.5-11 8.5-20z"/>`,
  globe: `<circle cx="24" cy="24" r="19.5"/><path d="M4.5 24h39M24 4.5c-6 6-6 33 0 39M24 4.5c6 6 6 33 0 39M8 13.5h32M8 34.5h32" stroke="${C}" stroke-width="2.6" fill="none"/>`,
  // ---- money (1.2) ----
  basket: `<path d="M4 18h40l-4.5 22a3 3 0 0 1-3 2.5h-25a3 3 0 0 1-3-2.5z"/><path d="M13 18l7-11M35 18l-7-11" stroke="currentColor" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M17 25v11M24 25v11M31 25v11" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`,
  cutlery: `<path d="M11 4v13a5 5 0 0 0 3.5 4.8V44h5V21.8A5 5 0 0 0 23 17V4h-3.5v11h-2V4h-3v11h-2V4z"/><path d="M36 4c-5 0-8 7-8 15 0 4 2 6 4.5 6.5V44h5V4z"/>`,
  box: `<path d="M24 4 43 13v22L24 44 5 35V13z"/><path d="M5 13l19 9 19-9M24 22v22" stroke="${C}" stroke-width="2.8" fill="none" stroke-linejoin="round"/><path d="M14.5 8.5 34 18v7" stroke="${C}" stroke-width="2.8" fill="none"/>`,
  bus: `<rect x="7" y="5" width="34" height="34" rx="7"/><rect x="11.5" y="11" width="25" height="12" rx="2.5" fill="${C}"/><circle cx="15" cy="31" r="2.6" fill="${C}"/><circle cx="33" cy="31" r="2.6" fill="${C}"/><rect x="10" y="38" width="6" height="7" rx="2"/><rect x="32" y="38" width="6" height="7" rx="2"/>`,
  taxi: `<rect x="18" y="6" width="12" height="6" rx="2"/><path d="M8 24l4-9a4 4 0 0 1 3.7-2.5h16.6A4 4 0 0 1 36 15l4 9a5 5 0 0 1 4 5v8H4v-8a5 5 0 0 1 4-5z"/><path d="M12 24h24" stroke="${C}" stroke-width="2.6"/><circle cx="12" cy="31" r="3" fill="${C}"/><circle cx="36" cy="31" r="3" fill="${C}"/><rect x="7" y="37" width="7" height="6" rx="2"/><rect x="34" y="37" width="7" height="6" rx="2"/>`,
  bulb: `<path d="M24 3a14 14 0 0 0-8 25.5c1.5 1 2.5 2.7 2.5 4.5v1h11v-1c0-1.8 1-3.5 2.5-4.5A14 14 0 0 0 24 3z"/><rect x="18.5" y="37" width="11" height="4" rx="1.5"/><rect x="20.5" y="42.5" width="7" height="3" rx="1.5"/><path d="M20 22l4 4 4-4" stroke="${C}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  wifi: `<path d="M4 18a28 28 0 0 1 40 0" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M11 25.5a18 18 0 0 1 26 0" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M17.5 32.5a9 9 0 0 1 13 0" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/><circle cx="24" cy="40" r="4"/>`,
  play: `<rect x="4" y="8" width="40" height="30" rx="7"/><path d="M20 16v14l12-7z" fill="${C}"/><rect x="15" y="40.5" width="18" height="4" rx="2"/>`,
  bag: `<path d="M8 15h32l2.5 29h-37z"/><path d="M17 20v-7a7 7 0 0 1 14 0v7" stroke="currentColor" stroke-width="3.8" fill="none" stroke-linecap="round"/><circle cx="17" cy="21" r="2.4" fill="${C}"/><circle cx="31" cy="21" r="2.4" fill="${C}"/>`,
  lipstick: `<path d="M18 4h12v8l-12 5z"/><rect x="16" y="19" width="16" height="7" rx="1.5"/><rect x="13" y="27" width="22" height="18" rx="3"/><path d="M13 34h22" stroke="${C}" stroke-width="2.6"/>`,
  ticket: `<path d="M4 12h40v8a4 4 0 0 0 0 8v8H4v-8a4 4 0 0 0 0-8z"/><path d="M31 13v22" stroke="${C}" stroke-width="2.6" stroke-dasharray="3 3"/><path d="M12 20h12M12 27h8" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`,
  cap: `<path d="M24 7 2 18l22 11 22-11z"/><path d="M11 23.5V33c0 3.5 6 7 13 7s13-3.5 13-7v-9.5L24 30z"/><path d="M42 20v12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="42" cy="34" r="3"/>`,
  teddy: `<circle cx="12" cy="11" r="6"/><circle cx="36" cy="11" r="6"/><circle cx="24" cy="21" r="13"/><ellipse cx="24" cy="38" rx="13" ry="8"/><circle cx="19.5" cy="18.5" r="2" fill="${C}"/><circle cx="28.5" cy="18.5" r="2" fill="${C}"/><ellipse cx="24" cy="25.5" rx="4.5" ry="3.5" fill="${C}"/>`,
  sofa: `<rect x="9" y="10" width="30" height="17" rx="5"/><rect x="3" y="19" width="9" height="18" rx="4"/><rect x="36" y="19" width="9" height="18" rx="4"/><rect x="9" y="27" width="30" height="10"/><path d="M24 12v15" stroke="${C}" stroke-width="2.4"/><rect x="6" y="37" width="5" height="6" rx="1.5"/><rect x="37" y="37" width="5" height="6" rx="1.5"/>`,
  laptop: `<rect x="8" y="8" width="32" height="23" rx="3.5"/><rect x="12" y="12" width="24" height="15" rx="1.5" fill="${C}"/><path d="M2 34h44l-3 6H5z"/>`,
  handheart: `<path d="M24 25s-11-6.5-11-14a6 6 0 0 1 11-3.4A6 6 0 0 1 35 11c0 7.5-11 14-11 14z"/><path d="M3 32h8l7 3h9a3 3 0 0 1 0 6H17" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 38l11-5.5a3 3 0 0 1 3.5 4.7L30 45H3" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  receipt: `<path d="M9 3h30v42l-5-3.5-5 3.5-5-3.5-5 3.5-5-3.5-5 3.5z"/><path d="M15 13h18M15 20h18M15 27h11" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`,
  dots: `<circle cx="9" cy="24" r="5.5"/><circle cx="24" cy="24" r="5.5"/><circle cx="39" cy="24" r="5.5"/>`,
  percent: `<circle cx="24" cy="24" r="20"/><path d="M15 33 33 15" stroke="${C}" stroke-width="3.6" stroke-linecap="round"/><circle cx="16.5" cy="16.5" r="3.6" fill="${C}"/><circle cx="31.5" cy="31.5" r="3.6" fill="${C}"/>`,
  tag: `<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h15.5l22 22-18 18-22-22z"/><circle cx="14" cy="14" r="4" fill="${C}"/>`,
  handback: `<path d="M17 9 6 19l11 10" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 19h22a13 13 0 0 1 0 26H18" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  piggy: `<path d="M8 24a15 13 0 0 1 15-13h6a15 13 0 0 1 12 6l4-1v10l-3.5 1.5a15 13 0 0 1-6.5 7.5V42h-6v-4h-8v4h-6v-6a13 13 0 0 1-5-7l-4-1v-6z"/><path d="M20 15h8" stroke="${C}" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="22" r="2.2" fill="${C}"/><rect x="22" y="3" width="6" height="9" rx="2"/>`,
  wallet: `<path d="M5 13a5 5 0 0 1 5-5h24v6H10a2 2 0 0 0 0 4h33v20a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><circle cx="35" cy="30" r="3.2" fill="${C}"/>`,
  calrep: `<rect x="5" y="8" width="38" height="35" rx="7"/><path d="M5 17h38" stroke="${C}" stroke-width="3"/><rect x="13" y="3" width="5" height="10" rx="2.5"/><rect x="30" y="3" width="5" height="10" rx="2.5"/><path d="M16 30a8 8 0 0 1 14.5-4.5M32 32a8 8 0 0 1-14.5 4.5" stroke="${C}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M31 21v5h-5M17 41v-5h5" stroke="${C}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

export const STICKERS = Object.keys(ST);
/** Common choices first in the tracker builder */
export const STICKER_ORDER = ['candy', 'nosmoke', 'dumbbell', 'drop', 'book', 'moon', 'shoe', 'apple', 'coffee', 'glass', 'phone', 'heart', 'bolt', 'flame', 'star', 'smile', 'music', 'camera', 'plant', 'pill', 'money', 'sun', 'bike', 'walk', 'pen', 'game', 'paw', 'trophy', 'cart', 'target', 'house', 'tooth', 'brush', 'lotus', 'globe', 'plane', 'car', 'briefcase', 'chat', 'gift', 'megaphone', 'spark'];

export function sticker(name, cls = '') {
  return `<svg class="st ${cls}" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${ST[name] || ST.spark}</svg>`;
}
