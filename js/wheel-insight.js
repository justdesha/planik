// What a balance wheel says: a level for the average, the shape (even or lopsided),
// strong and weak areas, a small step for each weak one and questions for reflection.
// Built on common coaching practice for the Wheel of Life: low scores show where attention
// is needed, high ones are strengths to keep; a lopsided wheel means energy goes to some
// areas at the cost of others; pick 1–2 focus areas and one small step; look at the trend.

/** per area: a small step for a low score, questions for a low score, a question for a high one */
export const AREA_TEXT = {
  health: {
    step: 'Один простий ритуал на тиждень: лягати на 30 хвилин раніше або коротка прогулянка щодня.',
    low: ['Що найбільше забирає в тебе сили зараз?', 'Яка одна дрібниця для тіла далася б легко вже цього тижня?'],
    high: 'Що допомагає тобі почуватися добре? Що з цього варто берегти?'
  },
  work: {
    step: 'Запиши, що саме муляє в роботі, і обери одне, на що ти реально можеш вплинути.',
    low: ['Що в роботі виснажує найбільше: обсяг, люди чи сенс?', 'Як виглядав би твій робочий день на +1 бал?'],
    high: 'Що в роботі зараз дає тобі енергію?'
  },
  money: {
    step: 'Подивись у «Грошах», куди пішла найбільша частина витрат, і постав один ліміт.',
    low: ['Що тривожить у грошах найбільше: дохід, витрати чи відсутність запасу?', 'Яка сума на місяць дала б тобі відчуття спокою?'],
    high: 'Яка твоя звичка з грошима працює найкраще?'
  },
  love: {
    step: 'Знайди годину без телефонів для людини, яка тобі близька, або для себе.',
    low: ['Чого тобі зараз бракує в близьких стосунках?', 'Про що ти давно хочеш поговорити, але відкладаєш?'],
    high: 'Що робить твої стосунки теплими? Як про це подбати?'
  },
  people: {
    step: 'Напиши або подзвони одній людині, з якою давно не говорив.',
    low: ['З ким тобі хочеться бачитися частіше?', 'Хто з людей поруч додає тобі сил, а хто забирає?'],
    high: 'Кому з близьких ти вдячний цього місяця?'
  },
  growth: {
    step: 'Виділи 20 хвилин на тиждень на одну річ, яку давно хотів вивчити.',
    low: ['Чого тобі хочеться навчитися, якби був час?', 'Де ти відчуваєш, що стоїш на місці?'],
    high: 'Що нового ти дізнався чи спробував цього місяця?'
  },
  rest: {
    step: 'Постав у календар один вечір без справ, як зустріч, яку не можна перенести.',
    low: ['Коли ти востаннє відпочивав без почуття провини?', 'Що для тебе справжній відпочинок, а не просто пауза?'],
    high: 'Який відпочинок відновлює тебе найкраще?'
  },
  home: {
    step: 'Приведи до ладу одне маленьке місце: стіл, полицю чи куток кімнати.',
    low: ['Що вдома заважає тобі почуватися спокійно?', 'Яка одна зміна зробила б простір приємнішим?'],
    high: 'Що в твоєму домі дає відчуття, що ти на своєму місці?'
  }
};

/** levels for the average score */
const LEVELS = [
  { min: 8, id: 'full', title: 'Повний хід', tone: 'tangerine',
    text: () => 'Більшість сфер у тебе на 8 і вище, і це рідкісний стан. Пастка тут одна: розслабитися й перестати помічати, що саме його тримає. Звички, люди, ритм — бережи їх.' },
  { min: 6.5, id: 'steady', title: 'Стійкий ритм', tone: 'cobalt',
    text: () => 'Під тобою міцна основа. Оцінки 6–8 не обовʼязково треба виправляти: іноді «добре» — це вже достатньо. Варто обрати одну сферу, яка дасть найбільше, якщо додати їй трохи уваги.' },
  { min: 5, id: 'work', title: 'Робочий режим', tone: 'butter',
    text: () => 'Життя їде, але частина енергії кудись витікає. Не пробуй підтягнути все одразу: одна-дві сфери у фокусі на місяць дадуть більше, ніж вісім одночасно.' },
  { min: 3.5, id: 'half', title: 'На пів сили', tone: 'peach',
    text: () => 'Просіли одразу кілька сфер. Це не вирок, а сигнал почати з тієї, яка тягне за собою інші: найчастіше це здоровʼя і відпочинок.' },
  { min: 0, id: 'low', title: 'Важкий період', tone: 'sky',
    text: () => 'Зараз низько майже все, і це втомлює. Почни з найменшого кроку, який точно під силу. Якщо так триває довго, поговори з кимось, кому довіряєш, або з фахівцем: це нормально і допомагає.' }
];

const r1 = (x) => x.toFixed(1).replace('.', ',');
const low = (name) => name.toLowerCase();

/**
 * Full reading of one wheel.
 * @param {Object} sc   scores by area id
 * @param {Array} AREAS area list
 * @param {Object} [prev] previous wheel scores (for the trend)
 * @param {string} [name] person's name
 */
export function readWheel(sc, AREAS, prev, name) {
  const list = AREAS.map((a) => ({ ...a, v: sc[a.id] }));
  const avg = list.reduce((s, a) => s + a.v, 0) / list.length;
  const sorted = [...list].sort((a, b) => b.v - a.v);
  const max = sorted[0].v, min = sorted[sorted.length - 1].v, spread = max - min;
  const level = LEVELS.find((l) => avg >= l.min);

  // strong: 7+ (up to 3); if none — the best two "relatively"
  let strong = sorted.filter((a) => a.v >= 7).slice(0, 3);
  const strongRel = !strong.length;
  if (strongRel) strong = sorted.slice(0, 2);
  // focus: 5 and below (up to 2, lowest first); if none — the lowest two still get a thought
  let weak = [...sorted].reverse().filter((a) => a.v <= 5).slice(0, 2);
  const weakRel = !weak.length;
  if (weakRel) weak = [...sorted].reverse().slice(0, 2).filter((a) => !strong.includes(a));

  // shape
  let shape;
  if (spread >= 5) shape = `Колесо нерівне: ${low(sorted[0].name)} на ${max}, а ${low(sorted[sorted.length - 1].name)} лише на ${min}. Схоже, сили йдуть в одні сфери за рахунок інших, і на такому колесі трясе.`;
  else if (spread <= 2) shape = 'Колесо рівне: сфери тримаються близько одна до одної, без провалів.';
  else shape = `Найміцніше — ${low(sorted[0].name)}, найбільше уваги просить ${low(sorted[sorted.length - 1].name)}.`;

  // trend
  let trend = null;
  if (prev) {
    const pa = AREAS.reduce((s, a) => s + (prev[a.id] || 0), 0) / AREAS.length;
    const d = avg - pa;
    const moves = list.map((a) => ({ ...a, d: a.v - (prev[a.id] || 0) })).filter((a) => a.d).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const up = moves.filter((a) => a.d > 0), dn = moves.filter((a) => a.d < 0);
    let t = Math.abs(d) < .25 ? 'Порівняно з минулим місяцем загалом без змін' : d > 0 ? `Порівняно з минулим місяцем колесо виросло на ${r1(d)}` : `Порівняно з минулим місяцем колесо просіло на ${r1(-d)}`;
    if (up.length) t += `. Найбільше підросло: ${low(up[0].name)} (+${up[0].d})`;
    if (dn.length) t += `${up.length ? ', а' : '. Найбільше'} просіло: ${low(dn[0].name)} (${dn[0].d})`;
    trend = { d, text: t + '.', moves };
  }

  // the focus of the month: the lowest area (ties: the one that dropped the most)
  const focus = weak[0];

  // questions for reflection
  const qs = [];
  for (const a of weak) for (const q of AREA_TEXT[a.id].low) qs.push({ q, area: a.id });
  if (strong[0]) qs.push({ q: AREA_TEXT[strong[0].id].high, area: strong[0].id });
  qs.push({ q: 'Яка оцінка тебе здивувала найбільше і чому?', area: null });
  qs.push({ q: `Що одне ти зробиш цього місяця для сфери «${low(focus.name)}»?`, area: focus.id });

  return {
    avg, level, spread, shape, trend, strong, strongRel, weak, weakRel, focus,
    title: level.title,
    text: level.text(),
    step: AREA_TEXT[focus.id].step,
    questions: qs
  };
}
