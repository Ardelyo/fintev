// Fintev chart toolkit — hand-drawn SVG, no dependencies.
import { smoothLine, blobPath } from './shapes.js';
import { money, runway, PAYDAYS, events, shortDate, dateAt, BUFFER, HORIZON, judgePurchase, spending, flow, income } from './data.js';

let gid = 0;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Draw now and again whenever the host's width changes (also fires when a hidden view becomes visible). */
export function responsive(host, draw) {
  host._ro?.disconnect();
  let w = -1;
  const run = () => {
    const cw = host.clientWidth;
    if (!cw || cw === w) return;
    w = cw;
    draw(cw);
  };
  host._ro = new ResizeObserver(run);
  host._ro.observe(host);
  run();
}

/* =========================================================
   Area chart — net worth over time (single or stacked)
   ========================================================= */
export function areaChart(host, { fullLabels, series, stacked = false, height = 220, fit = false, ticks = 3 }) {
  host.classList.add('chart');
  const n = fullLabels.length;
  const short = fullLabels.map((l) => l.split(' ')[0]);
  responsive(host, (W) => {
    const H = height, pad = { l: 6, r: 8, t: 16, b: 26 };
    const X = (i) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
    let base = new Array(n).fill(0);
    const layers = series.map((s) => {
      const upper = s.values.map((v, i) => base[i] + v);
      const lower = base;
      base = stacked ? upper : new Array(n).fill(0);
      return { s, upper, lower };
    });
    const top = layers[layers.length - 1].upper;
    const lows = series[0].values;
    const yMax = Math.max(...top) * (fit ? 1.015 : 1.07);
    const yMin = fit ? Math.min(...lows.map((_, i) => (stacked ? top[i] : lows[i]))) * 0.985 : 0;
    const Y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
    const uid = `a${gid++}`;

    let defs = '', body = '';
    layers.forEach((L, k) => {
      const up = L.upper.map((v, i) => [X(i), Y(v)]);
      const lo = L.lower.map((v, i) => [X(i), Y(Math.max(v, yMin))]).reverse();
      const loPath = smoothLine(lo);
      const d = smoothLine(up) + `L${lo[0][0].toFixed(1)},${lo[0][1].toFixed(1)}` + loPath.slice(loPath.indexOf('C'));
      if (stacked) {
        body += `<path d="${d}" fill="${L.s.color}" class="layer" style="--k:${k}"/>`;
        body += `<path d="${smoothLine(up)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-opacity=".9"/>`;
      } else {
        defs += `<linearGradient id="${uid}g${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.s.color}" stop-opacity=".75"/><stop offset="1" stop-color="${L.s.color}" stop-opacity="0"/></linearGradient>`;
        body += `<path d="${d}" fill="url(#${uid}g${k})" class="layer"/>`;
        body += `<path d="${smoothLine(up)}" fill="none" stroke="${L.s.ink || L.s.color}" stroke-width="2.6" stroke-linecap="round" class="draw" pathLength="1"/>`;
      }
    });
    const endX = X(n - 1), endY = Y(top[n - 1]);
    body += `<circle cx="${endX}" cy="${endY}" r="9" fill="${series[series.length - 1].ink || '#1B1A2E'}" opacity=".16"/><circle cx="${endX}" cy="${endY}" r="4.6" fill="#fff" stroke="${series[series.length - 1].ink || '#1B1A2E'}" stroke-width="2.4"/>`;

    let grid = '';
    for (let g = 1; g <= ticks; g++) {
      const v = yMin + ((yMax - yMin) * g) / (ticks + 1);
      grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${pad.l}" y="${Y(v) - 5}" class="ax">$${Math.round(v / 1000)}k</text>`;
    }
    const step = W < 420 ? 3 : 2;
    let xl = '';
    for (let i = 0; i < n; i++) {
      if ((n - 1 - i) % step) continue;
      xl += `<text x="${X(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}" class="ax${i === n - 1 ? ' now' : ''}">${i === n - 1 ? 'Now' : short[i]}</text>`;
    }

    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Net worth over the last ${n - 1} months, from ${money(top[0])} to ${money(top[n - 1])}">
      <defs>${defs}</defs>${grid}${body}${xl}
      <g class="cur" opacity="0"><line y1="${pad.t - 4}" y2="${H - pad.b}"/></g>
      <rect width="${W}" height="${H}" fill="transparent" class="hit"/></svg><div class="tip" hidden></div>`;

    const svg = host.querySelector('svg'), cur = host.querySelector('.cur'), tip = host.querySelector('.tip');
    const dots = layers.map((L) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', 4.4); c.setAttribute('fill', '#fff'); c.setAttribute('stroke', L.s.ink || L.s.color); c.setAttribute('stroke-width', 2.2);
      cur.appendChild(c);
      return c;
    });
    const move = (cx) => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.round(((cx - r.left - pad.l) / (W - pad.l - pad.r)) * (n - 1))));
      cur.setAttribute('opacity', 1);
      cur.querySelector('line').setAttribute('transform', `translate(${X(i)} 0)`);
      dots.forEach((c, k) => { c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(layers[k].upper[i])); });
      const total = top[i];
      tip.hidden = false;
      tip.innerHTML = `<small>${esc(fullLabels[i])}</small><b>${money(total)}</b>` +
        (stacked ? [...series].reverse().map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)} <em>${money(s.values[i])}</em></span>`).join('') : '');
      const tw = tip.offsetWidth;
      tip.style.transform = `translate(${Math.max(4, Math.min(W - tw - 4, X(i) - tw / 2))}px, ${Math.max(2, Y(total) - tip.offsetHeight - 14)}px)`;
    };
    svg.addEventListener('pointermove', (e) => move(e.clientX));
    svg.addEventListener('pointerdown', (e) => move(e.clientX));
    svg.addEventListener('pointerleave', () => { cur.setAttribute('opacity', 0); tip.hidden = true; });
  });
}

/* =========================================================
   Runway — how much is safe to spend, day by day
   ========================================================= */
export function runwayChart(host, { purchase = 0, height = 210 } = {}) {
  host.classList.add('chart');
  responsive(host, (W) => {
    const H = height, pad = { l: 8, r: 8, t: 30, b: 28 };
    const J = purchase ? judgePurchase(purchase) : null;
    const A = runway, B = purchase ? runway.map((v) => v - purchase) : null;
    const yMin = Math.min(...A, ...(B || []), BUFFER) - 230, yMax = Math.max(...A) + 260;
    const X = (d) => pad.l + (d / HORIZON) * (W - pad.l - pad.r);
    const Y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
    const uid = `r${gid++}`;
    const lineA = smoothLine(A.map((v, d) => [X(d), Y(v)]));
    const lineB = B ? smoothLine(B.map((v, d) => [X(d), Y(v)])) : '';
    const area = `${lineA}L${X(HORIZON)},${Y(yMin)}L${X(0)},${Y(yMin)}Z`;

    let marks = '';
    PAYDAYS.forEach((d) => {
      marks += `<g class="pay" transform="translate(${X(d)} ${Y(A[d])})"><circle r="10"/><text y="4.5" text-anchor="middle">$</text></g><text x="${X(d)}" y="${Y(A[d]) - 17}" text-anchor="middle" class="ax strong">Payday</text>`;
    });
    if (J && J.low < BUFFER + 200) {
      const lx = X(J.lowDay), ly = Y(B[J.lowDay]);
      marks += `<g transform="translate(${lx} ${ly})"><circle r="9" class="low-halo"/><circle r="5" class="low"/></g>`;
      const left = lx > W * 0.7;
      marks += `<text x="${lx + (left ? -14 : 14)}" y="${ly - 12}" text-anchor="${left ? 'end' : 'start'}" class="ax strong low-t">Low ${money(Math.max(0, J.low))} · ${shortDate(J.lowDay)}</text>`;
    }
    let xl = '';
    [0, 7, 14, 21, 28].forEach((d) => {
      xl += `<text x="${X(d)}" y="${H - 7}" text-anchor="${d === 0 ? 'start' : 'middle'}" class="ax">${d === 0 ? 'Today' : shortDate(d)}</text>`;
    });

    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Safe-to-spend forecast for the next 30 days, starting at ${money(A[0])}">
      <defs>
        <linearGradient id="${uid}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#58D49C" stop-opacity=".5"/><stop offset="1" stop-color="#58D49C" stop-opacity="0"/></linearGradient>
        <pattern id="${uid}h" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#FF8F70" stroke-opacity=".35" stroke-width="2"/></pattern>
      </defs>
      <rect x="${pad.l}" y="${Y(BUFFER)}" width="${W - pad.l - pad.r}" height="${Math.max(0, Y(yMin) - Y(BUFFER))}" fill="url(#${uid}h)" rx="6"/>
      <text x="${W - pad.r - 6}" y="${Y(BUFFER) + 14}" text-anchor="end" class="ax zone">Tight zone · under ${money(BUFFER)}</text>
      ${B ? '' : `<path d="${area}" fill="url(#${uid}a)" class="layer"/>`}
      <path d="${lineA}" fill="none" class="${B ? 'line-ghost' : 'line-main draw'}" pathLength="1"/>
      ${B ? `<path d="${lineB}" fill="none" class="line-buy draw" pathLength="1"/>` : ''}
      ${marks}${xl}
      <g class="cur" opacity="0"><line y1="${pad.t - 8}" y2="${H - pad.b}"/><circle class="d1" r="4.6"/>${B ? '<circle class="d2" r="4.6"/>' : ''}</g>
      <rect width="${W}" height="${H}" fill="transparent"/></svg><div class="tip" hidden></div>`;

    const svg = host.querySelector('svg'), cur = host.querySelector('.cur'), tip = host.querySelector('.tip');
    const move = (cx) => {
      const r = svg.getBoundingClientRect();
      const d = Math.max(0, Math.min(HORIZON, Math.round(((cx - r.left - pad.l) / (W - pad.l - pad.r)) * HORIZON)));
      cur.setAttribute('opacity', 1);
      cur.querySelector('line').setAttribute('transform', `translate(${X(d)} 0)`);
      const d1 = cur.querySelector('.d1');
      d1.setAttribute('cx', X(d)); d1.setAttribute('cy', Y(A[d]));
      if (B) { const d2 = cur.querySelector('.d2'); d2.setAttribute('cx', X(d)); d2.setAttribute('cy', Y(B[d])); }
      const ev = events.filter((e) => e.d === d);
      tip.hidden = false;
      tip.innerHTML = `<small>${dateAt(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</small>` +
        (B ? `<b>${money(Math.max(0, B[d]))}</b><span>after purchase · ${money(A[d])} without</span>` : `<b>${money(A[d])}</b><span>safe to spend</span>`) +
        ev.map((e) => `<span class="ev">${e.kind === 'income' ? '＋' : '✓'} ${esc(e.name)} ${e.kind === 'income' ? '' : '· set aside'}</span>`).join('');
      const tw = tip.offsetWidth;
      tip.style.transform = `translate(${Math.max(4, Math.min(W - tw - 4, X(d) - tw / 2))}px, 0px)`;
    };
    svg.addEventListener('pointermove', (e) => move(e.clientX));
    svg.addEventListener('pointerdown', (e) => move(e.clientX));
    svg.addEventListener('pointerleave', () => { cur.setAttribute('opacity', 0); tip.hidden = true; });
  });
}

/* =========================================================
   Bubbles — spending categories as soft blobs sized by amount
   ========================================================= */
export function bubbles(host, { onSelect } = {}) {
  const cats = spending.categories;
  const maxA = Math.max(...cats.map((c) => c.amount));
  const items = cats.map((c) => ({ c, r: 100 * Math.sqrt(c.amount / maxA) })).sort((a, b) => b.r - a.r);
  const placed = [];
  items.forEach((it, i) => {
    if (i === 0) { it.x = 0; it.y = 0; placed.push(it); return; }
    for (let k = 1; k < 900; k++) {
      const a = k * 2.39996, rad = k * 0.55;
      const x = Math.cos(a) * rad * 1.25, y = Math.sin(a) * rad;
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + it.r + 5)) { it.x = x; it.y = y; placed.push(it); return; }
    }
  });
  const minX = Math.min(...placed.map((p) => p.x - p.r)), maxX = Math.max(...placed.map((p) => p.x + p.r));
  const minY = Math.min(...placed.map((p) => p.y - p.r)), maxY = Math.max(...placed.map((p) => p.y + p.r));
  const VW = 440, VH = 250;
  const k = Math.min((VW - 16) / (maxX - minX), (VH - 16) / (maxY - minY));
  const ox = VW / 2 - ((minX + maxX) / 2) * k, oy = VH / 2 - ((minY + maxY) / 2) * k;

  const g = items.map((it, i) => {
    const { c } = it;
    const x = ox + it.x * k, y = oy + it.y * k, r = it.r * k;
    const pct = Math.round((c.amount / c.budget) * 100);
    const over = c.amount > c.budget;
    const big = r > 52;
    return `<g class="bubble${over ? ' is-over' : ''}" tabindex="0" role="button" data-id="${c.id}" aria-label="${esc(c.name)}: ${money(c.amount)} of ${money(c.budget)} budget${over ? ', over budget' : ''}" style="--i:${i};--cx:${x}px;--cy:${y}px">
      <path d="${blobPath(x, y, r + 5, i + 3, 0.05)}" class="ring"/>
      <path d="${blobPath(x, y, r, i + 3, 0.06)}" fill="${c.color}" class="body"/>
      <ellipse cx="${x - r * 0.3}" cy="${y - r * 0.5}" rx="${r * 0.3}" ry="${r * 0.14}" fill="#fff" opacity=".45" transform="rotate(-24 ${x - r * 0.3} ${y - r * 0.5})"/>
      <text x="${x}" y="${y - (big ? 6 : 2)}" text-anchor="middle" class="b-amt" style="font-size:${Math.max(14, r * 0.3)}px">${money(c.amount)}</text>
      <text x="${x}" y="${y + (big ? 14 : 13)}" text-anchor="middle" class="b-name" style="font-size:${r > 40 ? 12 : 10.5}px">${esc(r > 44 ? c.name : c.name.split(' ')[0])}</text>
      ${big ? `<text x="${x}" y="${y + 29}" text-anchor="middle" class="b-pct${over ? ' over' : ''}">${over ? '▲ ' : ''}${pct}% of budget</text>` : ''}
    </g>`;
  }).join('');

  host.innerHTML = `<svg viewBox="0 0 ${VW} ${VH}" role="group" aria-label="Spending by category">${g}</svg>`;
  const sel = (id) => {
    host.querySelectorAll('.bubble').forEach((b) => b.classList.toggle('is-dim', !!id && b.dataset.id !== id));
    onSelect?.(id ? cats.find((c) => c.id === id) : null);
  };
  host.querySelectorAll('.bubble').forEach((b) => {
    b.addEventListener('pointerenter', () => sel(b.dataset.id));
    b.addEventListener('focus', () => sel(b.dataset.id));
    b.addEventListener('click', () => sel(b.dataset.id));
  });
  host.addEventListener('pointerleave', () => sel(null));
  host.querySelectorAll('.bubble').forEach((b) => b.addEventListener('blur', () => sel(null)));
}

/* =========================================================
   Sankey — where this month's paycheck goes
   ========================================================= */
export function sankey(host, { compact = false } = {}) {
  host.classList.add('chart');
  const cat = (id) => spending.categories.find((c) => c.id === id);
  const needs = spending.categories.filter((c) => c.group === 'needs');
  const wants = spending.categories.filter((c) => c.group === 'wants');
  const sum = (a) => a.reduce((s, c) => s + c.amount, 0);
  const groupVal = { needs: sum(needs), wants: sum(wants), saved: flow.saved.total, left: flow.left };
  const leaves = [
    ...needs.map((c) => ({ id: c.id, name: c.name, v: c.amount, parent: 'needs' })),
    ...wants.map((c) => ({ id: c.id, name: c.name, v: c.amount, parent: 'wants' })),
    ...flow.saved.map((c) => ({ id: c.id, name: c.name, v: c.amount, parent: 'saved' })),
    { id: 'leftover', name: 'Left over', v: flow.left, parent: 'left' },
  ];
  responsive(host, (W) => {
    const wide = W >= 620 && !compact;
    const H = wide ? 380 : compact ? 250 : 300;
    const nodeW = 14, padY = 10, gap = wide ? 9 : 10;
    const labelW = wide ? 150 : 124;
    const x0 = wide ? 4 : 4, x1 = wide ? (W - labelW - nodeW) / 2 + 2 : W - labelW - nodeW, x2 = W - labelW - nodeW;
    const col1 = flow.groups.map((g) => ({ ...g, v: groupVal[g.id] }));
    const maxGaps = Math.max((wide ? leaves.length : col1.length) - 1, 1) * gap;
    const k = (H - padY * 2 - maxGaps) / income;
    const stack = (arr) => {
      const total = arr.reduce((s, n) => s + n.v * k, 0) + (arr.length - 1) * gap;
      let y = (H - total) / 2;
      arr.forEach((n) => { n.y = y; n.h = Math.max(n.v * k, 3); y += n.h + gap; });
    };
    const inc = { id: 'income', name: 'Income', v: income, y: (H - income * k) / 2, h: income * k };
    stack(col1);
    if (wide) stack(leaves);
    const uid = `s${gid++}`;

    let links = '', nodes = '', labels = '';
    // income -> groups
    let cy = inc.y;
    col1.forEach((g) => {
      const h = g.v * k, ya = cy, yb = g.y;
      cy += h;
      const xm = (x0 + nodeW + x1) / 2;
      links += `<path class="lk" data-n="income ${g.id}" d="M${x0 + nodeW},${ya} C${xm},${ya} ${xm},${yb} ${x1},${yb} L${x1},${yb + h} C${xm},${yb + h} ${xm},${ya + h} ${x0 + nodeW},${ya + h}Z" fill="${g.color}" opacity=".45"/>`;
    });
    if (wide) {
      const cursors = {};
      col1.forEach((g) => (cursors[g.id] = g.y));
      leaves.forEach((l) => {
        const h = l.v * k, ya = cursors[l.parent], yb = l.y;
        cursors[l.parent] += h;
        const g = col1.find((c) => c.id === l.parent);
        const xm = (x1 + nodeW + x2) / 2;
        links += `<path class="lk" data-n="${l.parent} ${l.id}" d="M${x1 + nodeW},${ya} C${xm},${ya} ${xm},${yb} ${x2},${yb} L${x2},${yb + h} C${xm},${yb + h} ${xm},${ya + h} ${x1 + nodeW},${ya + h}Z" fill="${g.color}" opacity=".4"/>`;
      });
    }
    nodes += `<rect x="${x0}" y="${inc.y}" width="${nodeW}" height="${inc.h}" rx="7" fill="#2A2750"/>`;
    col1.forEach((g) => (nodes += `<rect class="nd" data-n="${g.id}" x="${x1}" y="${g.y}" width="${nodeW}" height="${g.h}" rx="7" fill="${g.color}"/>`));
    if (wide) leaves.forEach((l) => {
      const g = col1.find((c) => c.id === l.parent);
      nodes += `<rect class="nd" data-n="${l.id}" x="${x2}" y="${l.y}" width="${nodeW}" height="${l.h}" rx="6" fill="${g.color}"/>`;
    });

    const pill = (x, y, name, val, anchor = 'start', strong = false) =>
      `<g class="pl" transform="translate(${x} ${y})"><rect rx="11" height="22" y="-11"/><text text-anchor="${anchor}" dominant-baseline="central"><tspan class="n">${esc(name)}</tspan> <tspan class="v${strong ? ' s' : ''}">${money(val)}</tspan></text></g>`;
    labels += pill(x0 + nodeW + 8, inc.y + Math.min(inc.h / 2, 60), 'Income', income, 'start', true);
    col1.forEach((g) => {
      if (wide) labels += pill(x1 + nodeW + 8, g.y + g.h / 2, g.name, g.v);
      else labels += pill(x1 + nodeW + 8, g.y + g.h / 2, g.name, g.v);
    });
    if (wide) leaves.forEach((l) => (labels += pill(x2 + nodeW + 8, l.y + l.h / 2, l.name, l.v)));

    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Where ${money(income)} of income goes: needs ${money(groupVal.needs)}, wants ${money(groupVal.wants)}, saved ${money(groupVal.saved)}, left over ${money(groupVal.left)}">${links}${nodes}${labels}</svg>`;
    // size pills to their text
    host.querySelectorAll('.pl').forEach((p) => {
      const t = p.querySelector('text'), r = p.querySelector('rect'), b = t.getBBox();
      r.setAttribute('x', b.x - 9); r.setAttribute('width', b.width + 18);
    });
    // hover highlight
    const svg = host.querySelector('svg');
    const hl = (id) => {
      svg.querySelectorAll('.lk').forEach((l) => l.classList.toggle('is-dim', !!id && !l.dataset.n.split(' ').includes(id)));
    };
    svg.querySelectorAll('.nd').forEach((n) => {
      n.addEventListener('pointerenter', () => hl(n.dataset.n));
      n.addEventListener('pointerleave', () => hl(null));
    });
    svg.querySelectorAll('.lk').forEach((l) => {
      l.addEventListener('pointerenter', () => { svg.querySelectorAll('.lk').forEach((x) => x.classList.toggle('is-dim', x !== l)); });
      l.addEventListener('pointerleave', () => hl(null));
    });
  });
}

/* =========================================================
   Jar — a goal as a little character that fills up
   ========================================================= */
export function jarSvg(goal, { size = 120 } = {}) {
  const pct = Math.max(0, Math.min(1, goal.saved / goal.target));
  const id = `j${gid++}`;
  const level = 130 - pct * 100;
  let eyes, mouth;
  if (pct < 0.2) {
    eyes = '<path d="M43 78h8M69 78h8" class="jf"/>';
    mouth = '<path d="M54 92h12" class="jf"/>';
  } else if (pct < 0.5) {
    eyes = '<circle cx="47" cy="77" r="3.6" class="jd"/><circle cx="73" cy="77" r="3.6" class="jd"/>';
    mouth = '<path d="M52 90q8 6 16 0" class="jf"/>';
  } else if (pct < 0.85) {
    eyes = '<circle cx="47" cy="77" r="3.8" class="jd"/><circle cx="73" cy="77" r="3.8" class="jd"/>';
    mouth = '<path d="M50 89q10 10 20 0" class="jf"/>';
  } else {
    eyes = '<path d="M41 80q6-10 12 0M67 80q6-10 12 0" class="jf"/>';
    mouth = '<path d="M50 89h20q-2 12-10 12t-10-12Z" class="jd"/>';
  }
  const blush = pct >= 0.5 ? '<ellipse cx="38" cy="88" rx="6" ry="3.6" class="jb"/><ellipse cx="82" cy="88" rx="6" ry="3.6" class="jb"/>' : '';
  const sparks = pct >= 0.98 ? '<path d="M104 28l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4Z" class="jsp"/>' : '';
  return `<svg class="jar" viewBox="0 0 120 142" width="${size}" height="${size * 1.18}" aria-hidden="true">
    <defs><clipPath id="${id}"><rect x="22" y="30" width="76" height="100" rx="32"/></clipPath></defs>
    <ellipse cx="60" cy="136" rx="34" ry="4.5" fill="#2A2750" opacity=".12"/>
    <rect x="22" y="30" width="76" height="100" rx="32" class="glass"/>
    <g clip-path="url(#${id})">
      <g class="wave w2" style="--y:${level + 2}px"><path d="M0 0q15 -7 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0V140H0Z" fill="${goal.color}" opacity=".55"/></g>
      <g class="wave w1" style="--y:${level}px"><path d="M0 0q15 -6 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0V140H0Z" fill="${goal.color}"/></g>
      <circle class="bub" cx="40" cy="124" r="3" fill="#fff" opacity=".6"/><circle class="bub b2" cx="76" cy="124" r="2.2" fill="#fff" opacity=".6"/>
    </g>
    <rect x="22" y="30" width="76" height="100" rx="32" class="rim"/>
    <path d="M32 52q2-12 12-16" class="shine"/>
    <rect x="38" y="13" width="44" height="19" rx="8" fill="${goal.ink}"/>
    <rect x="42" y="17" width="14" height="4" rx="2" fill="#fff" opacity=".35"/>
    ${blush}${eyes}${mouth}${sparks}
  </svg>`;
}

/* =========================================================
   Weekly bars (category detail) & sparkline
   ========================================================= */
export function weeklyBars(c) {
  const weekBudget = c.budget / 4;
  const max = Math.max(...c.weekly, weekBudget) * 1.12;
  const labels = ['Oct 1–7', '8–14', '15–21', '22–26'];
  return `<div class="wk" role="img" aria-label="${esc(c.name)} by week: ${c.weekly.map((v, i) => `${labels[i]} ${money(v)}`).join(', ')}">
    <div class="wk-line" style="bottom:calc(28px + (100% - 28px) * ${weekBudget / max})"><span>Weekly budget ${money(weekBudget)}</span></div>
    ${c.weekly.map((v, i) => `<div class="wk-col"><div class="wk-track"><div class="wk-bar${v > weekBudget ? ' over' : ''}${i === 3 ? ' partial' : ''}" style="height:${(v / max) * 100}%;--c:${c.color}"><b>${money(v)}</b></div></div><small>${labels[i]}</small></div>`).join('')}
  </div>`;
}

export function sparkline(values, color, w = 84, h = 30) {
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => [2 + (i / (values.length - 1)) * (w - 4), 4 + (1 - (v - min) / (max - min || 1)) * (h - 8)]);
  const last = pts[pts.length - 1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${smoothLine(pts)}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/><circle cx="${last[0]}" cy="${last[1]}" r="3.2" fill="#fff" stroke="${color}" stroke-width="2"/></svg>`;
}
