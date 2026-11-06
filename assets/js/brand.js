import { createPip, MOODS } from './mascot.js';
import { bubbles, runwayChart, jarSvg } from './charts.js';
import { goals } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

createPip($('#brand-pip'), { mood: 'calm', look: false, shadow: false });
const hero = createPip($('#hero-pip'), { mood: 'happy' });
const mini = createPip($('#mini-pip'), { mood: 'calm', look: false, shadow: false });

const MOOD_INFO = [
  ['calm', 'Calm', 'The default. Quietly reassuring.', 'Spending is within 12% of the month’s pace.'],
  ['happy', 'Happy', 'Good news, nothing to do.', 'Spending is slower than the month, or a bill was cancelled.'],
  ['joy', 'Joy', 'A small celebration.', 'A plan is approved or a goal fills up.'],
  ['curious', 'Curious', 'Needs a decision or a closer look.', 'A choice is yours, or Pip isn’t sure what you mean.'],
  ['worried', 'Worried', 'Gentle, never alarming.', 'Spending runs 12%+ faster than the month, or a purchase gets tight.'],
  ['thinking', 'Thinking', 'Working on it…', 'Pip is reading your accounts.'],
];
$('#moods').innerHTML = MOOD_INFO.map(([k, n, d, w]) => `<article class="mood-card" style="--c:${MOODS[k].c2}"><div data-pip="${k}"></div><h3>${n}</h3><p>${d}</p><p class="when"><b>When:</b> ${w}</p></article>`).join('');
$$('[data-pip]').forEach((el) => createPip(el, { mood: el.dataset.pip }));

const sw = $('#mood-switch');
sw.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('button', sw).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  document.body.dataset.mood = b.dataset.m;
  const pip = { calm: 'calm', happy: 'happy', worried: 'worried', joy: 'joy' }[b.dataset.m];
  hero.setMood(pip); mini.setMood(pip);
  renderPal();
});

const SW = [
  ['Ink', '#1B1A2E'], ['Paper', '#F7F3EC'], ['Lilac', '#DCD3FF'], ['Mint', '#C6F0DA'], ['Peach', '#FFD9C8'], ['Sky', '#C9E8FA'], ['Butter', '#FFF0B8'], ['Rose', '#FFD3E6'],
  ['Good', '#14774A'], ['Warn', '#B53A15'], ['Needs', '#8CCBF5'], ['Wants', '#FFA98A'], ['Saved', '#6BD9A4'],
];
$('#swatches').innerHTML = SW.map(([n, h]) => `<button class="sw-c" type="button" style="--c:${h}" data-hex="${h}" aria-label="Copy ${n} ${h}"><i></i><span><b>${n}</b><small>${h}</small></span></button>`).join('');
let tt;
$('#swatches').addEventListener('click', async (e) => {
  const b = e.target.closest('.sw-c');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.hex); } catch {}
  const t = $('#toast'); t.textContent = `Copied ${b.dataset.hex}`; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1800);
});

function renderPal() {
  const cs = getComputedStyle(document.body);
  const names = { calm: 'Calm', happy: 'Bright', worried: 'Gentle', joy: 'Win' };
  const cur = document.body.dataset.mood;
  $('#mood-pal').innerHTML = ['calm', 'happy', 'worried', 'joy'].map((m) => {
    const P = { calm: ['#BFE6F7', '#CDF2DF', '#E2D9FF', '#FFF1C2'], happy: ['#C9F3DA', '#BFE6F7', '#FFF1C2', '#DDF5C8'], worried: ['#FFD8C4', '#FFE6B8', '#FFCBDA', '#EBD9FF'], joy: ['#FFC9E4', '#D9C8FF', '#FFF0A8', '#BDE9FA'] }[m];
    return `<div class="mp"><b>${names[m]}${m === cur ? ' · now' : ''}</b><div>${P.map((c) => `<i style="background:${c}"></i>`).join('')}</div></div>`;
  }).join('');
}
renderPal();

bubbles($('#p-bubbles'));
$('#p-jars').innerHTML = [['Sleepy', { ...goals[3], saved: 3000 }], ['Smiling', { ...goals[2] }], ['Happy', { ...goals[0] }], ['Full', { ...goals[1], saved: 2840 }]].map(([n, g]) => `<li>${jarSvg(g, { size: 74 })}${n}</li>`).join('');
runwayChart($('#p-run'), { height: 170 });
