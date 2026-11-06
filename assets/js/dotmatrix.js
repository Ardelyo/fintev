// Dot-matrix numerals rendered as SVG.
// Each glyph is a set of strokes on a 10×16 grid. Strokes are smoothed with
// Chaikin's algorithm (points flagged `1` stay sharp), resampled at an even
// spacing, and drawn as dots — giving the "dotted pen" look of the design.

const SPACING = 1.02;
const GAP = 3.4; // space between glyphs, in grid units

const flip = (pts) => pts.map(([x, y, s]) => [10 - x, 16 - y, s]);

const SIX = [[9.2, 1.2], [7, 0], [3, 0], [0, 3], [0, 13], [2.6, 16], [7.4, 16], [10, 13.4], [10, 10], [7.4, 7.2], [3, 7.2], [0, 9.6]];

const GLYPHS = {
  '0': { w: 10, s: [{ c: true, p: [[0, 0], [10, 0], [10, 16], [0, 16]] }] },
  '1': { w: 10, s: [{ p: [[2.2, 3.6], [6, 0, 1], [6, 16]] }] },
  '2': { w: 10, s: [{ p: [[0, 3.8], [1, 0.6], [5, 0], [9, 0.6], [10, 4], [9.2, 7.6], [0, 16, 1], [10, 16]] }] },
  '3': {
    w: 10,
    s: [
      { p: [[0, 1.6], [3, 0], [8, 0], [10, 2], [10, 5.4], [8, 7.5], [3.6, 7.5]] },
      { p: [[8.6, 7.9], [10, 10], [10, 14], [8, 16], [3, 16], [0, 14.4]] },
    ],
  },
  '4': { w: 10, s: [{ p: [[7.4, 16], [7.4, 0, 1], [0, 11, 1], [10, 11]] }] },
  '5': { w: 10, s: [{ p: [[9.6, 0], [1.4, 0, 1], [0.6, 7.2, 1], [4, 6.2], [8, 6.3], [10, 8.6], [10, 13.6], [8, 16], [3, 16], [0, 14.6]] }] },
  '6': { w: 10, s: [{ p: SIX }] },
  '7': { w: 10, s: [{ p: [[0, 0], [10, 0, 1], [3.4, 16]] }] },
  '8': {
    w: 10,
    s: [
      { c: true, p: [[0.9, 0], [9.1, 0], [9.1, 7.5], [0.9, 7.5]] },
      { c: true, p: [[0, 7.5], [10, 7.5], [10, 16], [0, 16]] },
    ],
  },
  '9': { w: 10, s: [{ p: flip(SIX) }] },
  '$': {
    w: 10,
    s: [
      { p: [[9.4, 3.4], [7.8, 1.4], [2.6, 1.4], [0.6, 3.4], [0.6, 5.8], [2.6, 7.8], [7.4, 8.2], [9.4, 10.2], [9.4, 12.6], [7.4, 14.6], [2.4, 14.6], [0.4, 12.6]] },
      { p: [[5, -1.2], [5, 17.2]] },
    ],
  },
  ',': { w: 2.6, s: [{ p: [[1.6, 14], [1.6, 16.2], [0.2, 18.6]] }] },
  '.': { w: 2, dots: [[1, 16]] },
  '-': { w: 8, s: [{ p: [[0.5, 9], [7.5, 9]] }] },
  '+': { w: 9, s: [{ p: [[0.5, 9], [8.5, 9]] }, { p: [[4.5, 5], [4.5, 13]] }] },
  '%': {
    w: 11,
    s: [
      { p: [[10, 0], [1, 16]] },
      { c: true, p: [[0, 0], [4, 0], [4, 5], [0, 5]] },
      { c: true, p: [[7, 11], [11, 11], [11, 16], [7, 16]] },
    ],
  },
  ' ': { w: 3, dots: [] },
};

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function chaikin(pts, closed, iterations = 3) {
  let out = pts;
  for (let k = 0; k < iterations; k++) {
    const next = [];
    const n = out.length;
    if (closed) {
      for (let i = 0; i < n; i++) {
        const a = out[i], b = out[(i + 1) % n];
        next.push(lerp(a, b, 0.25), lerp(a, b, 0.75));
      }
    } else {
      next.push(out[0]);
      for (let i = 0; i < n - 1; i++) {
        const a = out[i], b = out[i + 1];
        if (i > 0) next.push(lerp(a, b, 0.25));
        if (i < n - 2) next.push(lerp(a, b, 0.75));
      }
      next.push(out[n - 1]);
    }
    out = next;
  }
  return out;
}

function smoothStroke({ p, c }) {
  if (c) {
    const pts = chaikin(p, true);
    return [...pts, pts[0]];
  }
  // Split at sharp points, smooth each run, then join.
  const runs = [];
  let run = [p[0]];
  for (let i = 1; i < p.length; i++) {
    run.push(p[i]);
    if (p[i][2] && i < p.length - 1) {
      runs.push(run);
      run = [p[i]];
    }
  }
  runs.push(run);
  const out = [];
  runs.forEach((r, idx) => {
    const sm = r.length > 2 ? chaikin(r, false) : r;
    out.push(...(idx === 0 ? sm : sm.slice(1)));
  });
  return out;
}

function resample(line, spacing) {
  const lens = [0];
  for (let i = 1; i < line.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  }
  const total = lens[lens.length - 1];
  const n = Math.max(1, Math.round(total / spacing));
  const step = total / n;
  const out = [];
  let seg = 1;
  for (let k = 0; k <= n; k++) {
    const d = k * step;
    while (seg < lens.length - 1 && lens[seg] < d) seg++;
    const span = lens[seg] - lens[seg - 1] || 1;
    out.push(lerp(line[seg - 1], line[seg], (d - lens[seg - 1]) / span));
  }
  return out;
}

const cache = new Map();

function glyphDots(ch) {
  if (cache.has(ch)) return cache.get(ch);
  const g = GLYPHS[ch] || GLYPHS[' '];
  let dots = g.dots ? g.dots.slice() : [];
  if (g.s) {
    const min = SPACING * 0.62;
    for (const stroke of g.s) {
      for (const pt of resample(smoothStroke(stroke), SPACING)) {
        if (!dots.some((d) => Math.hypot(d[0] - pt[0], d[1] - pt[1]) < min)) dots.push(pt);
      }
    }
  }
  const res = { w: g.w, dots };
  cache.set(ch, res);
  return res;
}

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Render `text` as dot-matrix SVG into `el`. Size follows the element's
 * font-size: one em equals the digit height.
 */
export function dotMatrix(el, text, { label = text, animate = true, radius = 0.56 } = {}) {
  const slant = -8;
  const shift = Math.tan((-slant * Math.PI) / 180) * 19; // room for the italic lean
  let x = shift + 0.8;
  const circles = [];
  for (const ch of String(text)) {
    const g = glyphDots(ch);
    for (const [dx, dy] of g.dots) circles.push([x + dx, dy]);
    x += g.w + GAP;
  }
  const width = x - GAP + 1.2;
  const top = -2;
  const height = 21.5;
  const animated = animate && !prefersReduced();
  const body = circles
    .map(([cx, cy]) => {
      const delay = animated ? Math.round((cx / width) * 420 + Math.random() * 120) : 0;
      return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius}"${animated ? ` style="animation-delay:${delay}ms"` : ''}/>`;
    })
    .join('');
  el.innerHTML = `<svg class="dm-svg${animated ? ' is-animated' : ''}" viewBox="0 ${top} ${width.toFixed(2)} ${height}" width="${(width / 16).toFixed(3)}em" height="${(height / 16).toFixed(3)}em" aria-hidden="true" focusable="false"><g transform="skewX(${slant})" fill="currentColor">${body}</g></svg>`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', label);
}
