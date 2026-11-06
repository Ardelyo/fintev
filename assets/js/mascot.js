// Pip — Fintev's mascot. A blob whose face follows how your money is doing.
// Every expression is a set of numbers; changing mood tweens between them.

import { closedSpline } from './shapes.js';

const R = 62;
const TAU = Math.PI * 2;

const BASE = {
  r: [1, 1, 1, 1, 1, 1, 1, 1], sy: 1, tilt: 0,
  ery: 1, arc: 0, gx: 0, gy: 0,
  mw: 14, mt: 16, mb: 16, my: 24,
  ba: 0, bl: 0, bo: 0, bush: 0.4,
  sweat: 0, spark: 0, dots: 0,
  c1: '#CBEBFA', c2: '#8CCCF0',
};

export const MOODS = {
  calm: { ...BASE, r: [1.02, 0.98, 1, 1.03, 0.99, 1.02, 0.98, 1], sy: 0.95, ery: 0.82, mw: 13, mt: 15, mb: 15, bush: 0.5, c1: '#CFEDFB', c2: '#8CCCF0' },
  happy: { ...BASE, r: [1.05, 0.99, 1.03, 0.97, 1.05, 0.99, 1.03, 0.97], arc: 1, mw: 17, mt: 18, mb: 28, my: 22, bush: 0.95, c1: '#D6F7E4', c2: '#7DDCAB' },
  joy: { ...BASE, r: [1.09, 0.96, 1.07, 0.95, 1.09, 0.96, 1.07, 0.95], sy: 1.03, tilt: -5, arc: 1, mw: 21, mt: 6, mb: 46, my: 19, bush: 1, spark: 1, c1: '#FFE0F1', c2: '#FF9FCF' },
  curious: { ...BASE, r: [1, 1.04, 0.98, 1.02, 1, 1.04, 0.97, 1.02], ery: 1.18, gx: 3.5, gy: -2.5, mw: 6, mt: -4, mb: 26, my: 27, ba: 0, bl: 6, bo: 1, bush: 0.35, tilt: 4, c1: '#E6DDFF', c2: '#B9A7FF' },
  worried: { ...BASE, r: [0.98, 1.02, 0.97, 1.03, 0.98, 1.02, 0.97, 1.03], sy: 0.97, ery: 1.05, gy: 1.5, mw: 12, mt: -15, mb: -15, my: 30, ba: 16, bl: 2, bo: 1, bush: 0.2, sweat: 1, c1: '#FFE3D2', c2: '#FFA77E' },
  thinking: { ...BASE, ery: 0.95, gx: 4.5, gy: -4, mw: 7, mt: 2, mb: 2, my: 27, ba: -7, bl: 3, bo: 0.8, dots: 1, tilt: 3, c1: '#FFF5CC', c2: '#FFD764' },
};

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (a) => '#' + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a + (b - a) * t;

function tween(a, b, t) {
  const o = {};
  for (const k in a) {
    if (Array.isArray(a[k])) o[k] = a[k].map((v, i) => mix(v, b[k][i], t));
    else if (typeof a[k] === 'string') {
      const x = hex2rgb(a[k]), y = hex2rgb(b[k]);
      o[k] = rgb2hex(x.map((v, i) => mix(v, y[i], t)));
    } else o[k] = mix(a[k], b[k], t);
  }
  return o;
}

const ease = (t) => 1 - Math.pow(1 - t, 3) * Math.cos(t * 2.2); // soft overshoot-ish

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let uid = 0;
const lookers = new Set();
let lookBound = false;

function bindLook() {
  if (lookBound) return;
  lookBound = true;
  let raf = 0, ev = null;
  window.addEventListener('pointermove', (e) => {
    ev = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      lookers.forEach((p) => p._look(ev.clientX, ev.clientY));
    });
  }, { passive: true });
  window.addEventListener('pointerleave', () => lookers.forEach((p) => p._look(null)));
}

export function createPip(host, { mood = 'calm', look = true, shadow = true } = {}) {
  const id = `pip${++uid}`;
  host.classList.add('pip-host');
  host.innerHTML = `
  <svg class="pip" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="${id}g" cx=".34" cy=".26" r=".95"><stop offset="0" data-s="1"/><stop offset="1" data-s="2"/></radialGradient>
    </defs>
    ${shadow ? '<ellipse class="pip-shadow" cx="100" cy="178" rx="44" ry="6.5"/>' : ''}
    <g class="pip-float" style="--d:${(-Math.random() * 4).toFixed(2)}s">
      <g class="pip-main" transform="translate(100 100)">
        <path class="pip-body" fill="url(#${id}g)"/>
        <ellipse cx="-27" cy="-40" rx="17" ry="8.5" transform="rotate(-28 -27 -40)" fill="#fff" opacity=".5"/>
        <g class="pip-face">
          <ellipse class="pip-blush" cx="-40" cy="13" rx="9" ry="5.5"/>
          <ellipse class="pip-blush" cx="40" cy="13" rx="9" ry="5.5"/>
          <g class="pip-gaze">
            <g class="pip-eyes" style="--d:${(Math.random() * 5).toFixed(2)}s">
              <g class="pip-eye" data-side="-1"><ellipse class="e-dot" rx="6.4" ry="8"/><circle class="e-hi" r="2.2"/><path class="e-arc" d="M-8.5 3.5Q0 -9 8.5 3.5"/></g>
              <g class="pip-eye" data-side="1"><ellipse class="e-dot" rx="6.4" ry="8"/><circle class="e-hi" r="2.2"/><path class="e-arc" d="M-8.5 3.5Q0 -9 8.5 3.5"/></g>
            </g>
          </g>
          <line class="pip-brow" data-side="-1" x1="-8" y1="0" x2="8" y2="0"/>
          <line class="pip-brow" data-side="1" x1="-8" y1="0" x2="8" y2="0"/>
          <path class="pip-mouth"/>
        </g>
        <path class="pip-sweat" d="M0 -9C4 -2 7 2 7 6a7 7 0 0 1-14 0c0-4 3-8 7-15Z"/>
        <g class="pip-sparks">
          <path class="spark s1" d="M0-9C1 -3 3 -1 9 0 3 1 1 3 0 9-1 3-3 1-9 0-3-1-1-3 0-9Z"/>
          <path class="spark s2" d="M0-6C.7-2 2-.7 6 0 2 .7 .7 2 0 6-.7 2-2 .7-6 0-2-.7-.7-2 0-6Z"/>
          <path class="spark s3" d="M0-7C.8-2.3 2.3-.8 7 0 2.3.8 .8 2.3 0 7-.8 2.3-2.3.8-7 0-2.3-.8-.8-2.3 0-7Z"/>
        </g>
        <g class="pip-dots"><circle r="3"/><circle r="4.4"/><circle r="6.2"/></g>
      </g>
    </g>
  </svg>`;

  const q = (s) => host.querySelector(s);
  const qa = (s) => [...host.querySelectorAll(s)];
  const el = {
    stops: qa('stop'), body: q('.pip-body'), main: q('.pip-main'), eyes: qa('.pip-eye'),
    gaze: q('.pip-gaze'), mouth: q('.pip-mouth'), brows: qa('.pip-brow'), blush: qa('.pip-blush'),
    sweat: q('.pip-sweat'), sparks: q('.pip-sparks'), dots: q('.pip-dots'),
  };
  const sparkSpots = [[-62, -52, 1], [64, -34, 0.85], [48, -70, 0.7]];
  const dotSpots = [[52, -58], [66, -72], [84, -92]];

  let cur = structuredClone(MOODS[mood] || MOODS.calm);
  let name = mood;
  let lookX = 0, lookY = 0;

  function render(p) {
    el.stops[0].setAttribute('stop-color', p.c1);
    el.stops[1].setAttribute('stop-color', p.c2);
    const pts = p.r.map((k, i) => {
      const a = (i / 8) * TAU - Math.PI / 2;
      return [Math.cos(a) * R * k, Math.sin(a) * R * k * p.sy + (1 - p.sy) * R * 0.95];
    });
    el.body.setAttribute('d', closedSpline(pts));
    el.main.setAttribute('transform', `translate(100 100) rotate(${p.tilt.toFixed(2)})`);

    el.eyes.forEach((g) => {
      const s = +g.dataset.side;
      g.setAttribute('transform', `translate(${s * 22} ${-5 + (1 - p.sy) * 30})`);
      const dot = g.querySelector('.e-dot'), hi = g.querySelector('.e-hi'), arc = g.querySelector('.e-arc');
      dot.setAttribute('ry', (8 * p.ery).toFixed(2));
      dot.style.opacity = 1 - p.arc;
      hi.setAttribute('cx', 2);
      hi.setAttribute('cy', (-2.6 * p.ery).toFixed(2));
      hi.style.opacity = 1 - p.arc;
      arc.style.opacity = p.arc;
    });
    el.gaze.setAttribute('transform', `translate(${(p.gx + lookX).toFixed(2)} ${(p.gy + lookY).toFixed(2)})`);

    el.brows.forEach((b) => {
      const s = +b.dataset.side;
      b.setAttribute('transform', `translate(${s * 22} ${-22 - p.bl + (1 - p.sy) * 30}) rotate(${(-s * p.ba).toFixed(1)})`);
      b.style.opacity = p.bo;
    });
    el.blush.forEach((b) => (b.style.opacity = p.bush));

    const w = p.mw, y = p.my + (1 - p.sy) * 30;
    el.mouth.setAttribute('transform', `translate(0 ${y.toFixed(1)})`);
    el.mouth.setAttribute('d', `M${-w} 0Q0 ${p.mt.toFixed(1)} ${w} 0Q0 ${p.mb.toFixed(1)} ${-w} 0Z`);

    el.sweat.setAttribute('transform', 'translate(50 -34)');
    el.sweat.style.opacity = p.sweat;
    el.sparks.style.opacity = p.spark;
    el.sparks.querySelectorAll('.spark').forEach((s, i) => {
      const [x, yy, sc] = sparkSpots[i];
      s.setAttribute('transform', `translate(${x} ${yy}) scale(${sc * (0.4 + 0.6 * p.spark)})`);
    });
    el.dots.style.opacity = p.dots;
    el.dots.querySelectorAll('circle').forEach((c, i) => {
      c.setAttribute('cx', dotSpots[i][0]);
      c.setAttribute('cy', dotSpots[i][1]);
    });
  }

  let raf = 0;
  function setMood(next, { instant = false } = {}) {
    const target = MOODS[next];
    if (!target || next === name) return;
    name = next;
    host.dataset.mood = next;
    cancelAnimationFrame(raf);
    if (instant || reduced()) {
      cur = structuredClone(target);
      render(cur);
      return;
    }
    const from = structuredClone(cur);
    const t0 = performance.now(), dur = 720;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      cur = tween(from, target, ease(t));
      render(cur);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  const api = {
    host,
    get mood() { return name; },
    setMood,
    _look(x, y) {
      if (x == null) { lookX = lookY = 0; return render(cur); }
      const r = host.getBoundingClientRect();
      if (!r.width) return;
      const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dist / 280);
      lookX = (dx / dist) * 4.2 * k;
      lookY = (dy / dist) * 3.4 * k;
      render(cur);
    },
    destroy() { lookers.delete(api); },
  };

  host.dataset.mood = name;
  render(cur);
  if (look && !reduced()) { lookers.add(api); bindLook(); }
  return api;
}
