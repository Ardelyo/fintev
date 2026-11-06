import { dotMatrix } from './dotmatrix.js';
import { user, accounts, netWorth, safeToSpend, spending, cashflow, transactions, goals, scenario } from './data.js';

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const SVGNS = 'http://www.w3.org/2000/svg';
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (n, cents = true) => (cents ? usd : usd0).format(n).replace('-', '−');
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2800);
}

/* ---------- header ---------- */
function renderHeader() {
  const now = new Date();
  const h = now.getHours();
  const part = h < 5 ? 'evening' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  $('#greeting').textContent = `Good ${part}, ${user.name}`;
  $('#today').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  $('#sp-month').textContent = month;
  $('#ct-month').textContent = month;
}

/* ---------- net worth ---------- */
function renderNetWorth(range = '1M') {
  const whole = Math.floor(netWorth.value);
  const cents = Math.round((netWorth.value - whole) * 100).toString().padStart(2, '0');
  dotMatrix($('#nw-value'), `$${whole.toLocaleString('en-US')}`, { label: money(netWorth.value) });
  dotMatrix($('#nw-cents'), `.${cents}`, { label: '', animate: true, radius: 0.55 });
  $('#nw-cents').setAttribute('aria-hidden', 'true');
  setRange(range, false);
}

function setRange(range, animate = true) {
  const r = netWorth.ranges[range];
  $$('.segmented button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.range === range)));
  const pct = $('#nw-pct');
  pct.textContent = `↗ ${r.pct}%`;
  $('#nw-delta').textContent = `+${money(r.delta, false)} ${r.label}`;
  if (animate && !reduceMotion()) {
    pct.animate([{ transform: 'scale(.85)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
  }
}

/* ---------- safe-to-spend wave ---------- */
// Monotone cubic interpolation (Fritsch–Carlson) so peaks sit exactly on key points.
function monotone(keys) {
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]), n = keys.length;
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  return (x) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

function renderWave() {
  const host = $('#wave');
  const f = monotone(safeToSpend.keys);
  const peaks = safeToSpend.keys.filter((k, i, a) => i > 0 && i < a.length - 1 && k[1] > a[i - 1][1] && k[1] > a[i + 1][1]);
  const start = new Date();
  const dayLabel = (d) => {
    const dt = new Date(start);
    dt.setDate(dt.getDate() + d);
    return d === 0 ? 'Today' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const ticks = [0, 8, 15, 22, 30];

  const draw = () => {
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    const pad = { l: 8, r: 8, t: 14, b: 30 };
    const maxY = 1700, minY = 300;
    const X = (d) => pad.l + (d / safeToSpend.horizon) * (W - pad.l - pad.r);
    const Y = (v) => pad.t + (1 - (v - minY) / (maxY - minY)) * (H - pad.t - pad.b);
    let path = '';
    for (let s = 0; s <= safeToSpend.horizon * 8; s++) {
      const d = s / 8;
      path += `${s ? 'L' : 'M'}${X(d).toFixed(1)},${Y(f(d)).toFixed(1)}`;
    }
    const base = H - pad.b + 4;
    host.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <defs>
          <linearGradient id="wave-stroke" x1="0" x2="${W}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="var(--wave)" stop-opacity=".15"/>
            <stop offset=".12" stop-color="var(--wave)" stop-opacity="1"/>
            <stop offset=".86" stop-color="var(--wave)" stop-opacity="1"/>
            <stop offset="1" stop-color="var(--wave)" stop-opacity=".25"/>
          </linearGradient>
        </defs>
        <line x1="${pad.l}" x2="${W - pad.r}" y1="${base}" y2="${base}" class="wave-base"/>
        <path d="${path}" class="wave-line" stroke="url(#wave-stroke)" pathLength="1"/>
        ${peaks.map(([d, v]) => `<circle class="wave-peak" cx="${X(d)}" cy="${Y(v)}" r="5.5"/>`).join('')}
        ${ticks.map((d, i) => `<text x="${X(d)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}" class="wave-tick">${dayLabel(d)}</text>`).join('')}
        <g class="wave-cursor" opacity="0">
          <line y1="${pad.t - 6}" y2="${base}" />
          <circle r="5" />
        </g>
      </svg>
      <div class="wave-tip" hidden></div>`;

    const svg = $('svg', host), cursor = $('.wave-cursor', host), tip = $('.wave-tip', host);
    const move = (clientX) => {
      const rect = svg.getBoundingClientRect();
      const d = Math.max(0, Math.min(safeToSpend.horizon, Math.round(((clientX - rect.left - pad.l) / (W - pad.l - pad.r)) * safeToSpend.horizon)));
      const v = f(d);
      cursor.setAttribute('transform', `translate(${X(d)},0)`);
      $('circle', cursor).setAttribute('cy', Y(v));
      cursor.setAttribute('opacity', '1');
      tip.hidden = false;
      tip.innerHTML = `<b>${money(Math.round(v / 10) * 10, false)}</b> safe · ${dayLabel(d)}`;
      const tx = Math.max(60, Math.min(W - 60, X(d)));
      tip.style.transform = `translate(${tx}px, ${Y(v) - 44}px) translate(-50%, 0)`;
    };
    const leave = () => { cursor.setAttribute('opacity', '0'); tip.hidden = true; };
    svg.addEventListener('pointermove', (e) => move(e.clientX));
    svg.addEventListener('pointerdown', (e) => move(e.clientX));
    svg.addEventListener('pointerleave', leave);
  };
  draw();
  new ResizeObserver(() => draw()).observe(host);
}

/* ---------- spending gauge ---------- */
function renderGauge() {
  const svg = $('#gauge');
  const N = 27, cx = 160, cy = 158, R = 134;
  const frac = spending.spent / spending.budget;
  // category ranges along [0, frac]
  let acc = 0;
  const ranges = spending.categories.map((c) => {
    const a = acc, b = acc + (c.amount / spending.spent) * frac;
    acc = b;
    return { ...c, a, b, mid: (a + b) / 2, span: b - a };
  });
  let html = '';
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const ang = Math.PI - t * Math.PI;
    const x = cx + R * Math.cos(ang), y = cy - R * Math.sin(ang);
    let r = 2.8, fill = 'var(--track)', cat = '';
    if (t <= frac + 0.001) {
      const c = ranges.find((g) => t <= g.b + 0.001) || ranges[ranges.length - 1];
      const z = (t - c.mid) / Math.max(c.span * 0.42, 0.04);
      r = 3.3 + 3.4 * Math.exp(-z * z);
      fill = c.color;
      cat = c.id;
    }
    html += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${fill}" ${cat ? `data-cat="${cat}"` : ''} style="--i:${i}"/>`;
  }
  svg.innerHTML = html;

  const showTotal = () => {
    dotMatrix($('#sp-value'), money(spending.spent, false), { label: `${money(spending.spent, false)} spent`, animate: false });
    $('#sp-sub').innerHTML = `spent · <strong>${money(spending.budget - spending.spent, false)} left</strong>`;
    $$('circle', svg).forEach((c) => c.classList.remove('is-dim'));
    $$('#sp-legend li').forEach((li) => li.classList.remove('is-active'));
  };
  const showCat = (id) => {
    const c = spending.categories.find((x) => x.id === id);
    dotMatrix($('#sp-value'), money(c.amount, false), { label: `${c.name} ${money(c.amount, false)}`, animate: false });
    $('#sp-sub').innerHTML = `<strong>${c.name}</strong> · ${Math.round((c.amount / spending.spent) * 100)}%`;
    $$('circle', svg).forEach((el) => el.classList.toggle('is-dim', el.dataset.cat !== id));
    $$('#sp-legend li').forEach((li) => li.classList.toggle('is-active', li.dataset.cat === id));
  };

  const legend = $('#sp-legend');
  legend.innerHTML = spending.categories
    .map((c) => `<li data-cat="${c.id}"><button type="button"><i style="background:${c.color}"></i>${c.name}</button></li>`)
    .join('');
  $$('button', legend).forEach((b) => {
    const id = b.parentElement.dataset.cat;
    b.addEventListener('mouseenter', () => showCat(id));
    b.addEventListener('focus', () => showCat(id));
    b.addEventListener('mouseleave', showTotal);
    b.addEventListener('blur', showTotal);
  });
  svg.addEventListener('pointerover', (e) => e.target.dataset?.cat && showCat(e.target.dataset.cat));
  svg.addEventListener('pointerleave', showTotal);

  dotMatrix($('#sp-value'), money(spending.spent, false), { label: `${money(spending.spent, false)} spent` });
  $('#sp-sub').innerHTML = `spent · <strong>${money(spending.budget - spending.spent, false)} left</strong>`;
}

/* ---------- accounts ---------- */
function acctRow(a) {
  return `<li class="acct">
    <i class="acct-tick" style="background:${a.color}"></i>
    <div class="acct-name"><p>${a.name}</p><small>${a.sub}</small></div>
    <div class="acct-val"><p>${money(a.balance)}</p><small class="${a.trend === 'down' ? 'is-down' : ''}">${a.delta}</small></div>
  </li>`;
}

function renderAccounts() {
  const total = netWorth.value;
  const alloc = $('#alloc');
  alloc.innerHTML = accounts
    .map((a) => `<span style="flex:${Math.max(a.balance / total, 0.12)};background:${a.color}" title="${a.name} · ${Math.round((a.balance / total) * 100)}%"></span>`)
    .join('');
  alloc.setAttribute('aria-label', 'Allocation: ' + accounts.map((a) => `${a.name} ${Math.round((a.balance / total) * 100)}%`).join(', '));
  $('#acct-list').innerHTML = accounts.map(acctRow).join('');
  $('#acct-list-2').innerHTML = accounts.map(acctRow).join('');
}

/* ---------- Ask: scenario ---------- */
const sc = { amount: scenario.recommended };

function planFor(x) {
  const remaining = scenario.budget - scenario.saved;
  const needed = x > 0 ? Math.ceil(remaining / x) : Infinity;
  const onTrack = needed <= scenario.months.length;
  const projected = Math.min(scenario.budget, scenario.saved + x * scenario.months.length);
  const suggestion = Math.ceil(remaining / scenario.months.length / 10) * 10;
  return { remaining, needed, onTrack, projected, suggestion };
}

function renderRing() {
  const svg = $('#ring');
  const c = 130, r = 96;
  const pt = (p, rad = r) => {
    const a = Math.PI - p * 2 * Math.PI;
    return [c + rad * Math.cos(a), c + rad * Math.sin(a)];
  };
  const arc = (p0, p1, rad = r) => {
    if (p1 - p0 >= 0.9999) p1 = p0 + 0.9999;
    const [x0, y0] = pt(p0, rad), [x1, y1] = pt(p1, rad);
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${rad},${rad} 0 ${p1 - p0 > 0.5 ? 1 : 0} 0 ${x1.toFixed(2)},${y1.toFixed(2)}`;
  };
  const p0 = scenario.saved / scenario.budget;
  const x = sc.amount;
  const plan = planFor(x);
  const pEnd = plan.projected / scenario.budget;

  // month markers along the projected part
  let markers = '';
  let lastP = -1;
  scenario.months.forEach((m, i) => {
    const total = scenario.saved + x * (i + 1);
    if (x <= 0 || scenario.saved + x * i >= scenario.budget) return;
    const p = Math.min(1, total / scenario.budget);
    const [mx, my] = pt(p);
    markers += `<circle cx="${mx}" cy="${my}" r="3.2" class="ring-mark"/>`;
    if (p - lastP > 0.05) {
      const [lx, ly] = pt(p, r + 20);
      const rot = (180 - p * 360) + 90; // tangent orientation
      const deg = ((rot % 360) + 360) % 360;
      const flipText = deg > 90 && deg < 270;
      markers += `<text x="${lx}" y="${ly}" class="ring-label" text-anchor="middle" dominant-baseline="middle" transform="rotate(${flipText ? deg - 180 : deg} ${lx} ${ly})">${m}</text>`;
      lastP = p;
    }
  });

  const [ex, ey] = pt(p0);
  const a = Math.PI - p0 * 2 * Math.PI;
  const dir = (Math.atan2(-Math.cos(a), Math.sin(a)) * 180) / Math.PI; // direction of travel
  const [sx, sy] = pt(0);

  svg.innerHTML = `
    <path d="${arc(0, 1)}" class="ring-track"/>
    ${pEnd > p0 ? `<path d="${arc(p0, pEnd)}" class="ring-proj"/>` : ''}
    <path d="${arc(0, p0)}" class="ring-solid"/>
    ${markers}
    <g transform="translate(${ex} ${ey}) rotate(${dir})"><path d="M-5,-6 L3,0 L-5,6" class="ring-arrow"/></g>
    <circle cx="${sx}" cy="${sy}" r="7" class="ring-start"/>
  `;
}

function updateScenario() {
  const x = sc.amount;
  const plan = planFor(x);
  dotMatrix($('#setaside-value'), money(x, false), { label: `${money(x, false)} per month`, animate: false });
  $('#setaside').value = x;
  $('#setaside').setAttribute('aria-valuetext', `${money(x, false)} per month`);
  const pct = (x / scenario.max) * 100;
  $('#ticks').style.setProperty('--val', `${pct}%`);
  $$('#ticks i').forEach((t) => t.classList.toggle('is-on', +t.dataset.v <= x));

  const status = $('#plan-status');
  if (plan.onTrack) {
    const m = scenario.months[plan.needed - 1];
    status.textContent = `On track · reach ${money(scenario.budget, false)} by ${m} 15`;
    status.classList.remove('is-warn');
    $('#ans-lead').innerHTML = `Yes. Set aside ${money(x, false)} a month <sup class="fn" tabindex="0" title="Auto-transfer from Everyday checking on the 15th">1</sup> and you’ll reach ${money(scenario.budget, false)} by ${scenario.monthsLong[plan.needed - 1]}. <sup class="fn" tabindex="0" title="Projection assumes no change to income">2</sup>`;
  } else {
    const short = scenario.budget - plan.projected;
    status.textContent = `Short ${money(short, false)} by March 14 · try ${money(plan.suggestion, false)}/mo`;
    status.classList.add('is-warn');
    $('#ans-lead').innerHTML = `Not at ${money(x, false)} a month — you’d be ${money(short, false)} short by March 14. <sup class="fn" tabindex="0" title="Four transfers before the trip: Nov–Feb">1</sup> ${money(plan.suggestion, false)} a month gets you there.`;
  }
  renderRing();
}

function initScenario() {
  const ticks = $('#ticks');
  let html = '';
  for (let v = 0; v <= scenario.max; v += 20) html += `<i data-v="${v}" class="${v % 100 === 0 ? 'is-major' : ''}"></i>`;
  ticks.innerHTML = html + '<b class="tick-thumb"></b>';
  dotMatrix($('#trip-budget'), money(scenario.budget, false), { label: `Trip budget ${money(scenario.budget, false)}` });
  $('.ring-sub').textContent = `${money(scenario.saved, false)} saved · ${Math.round((scenario.saved / scenario.budget) * 100)}%`;
  $('#setaside').addEventListener('input', (e) => {
    sc.amount = +e.target.value;
    updateScenario();
  });
  $('#btn-adjust').addEventListener('click', () => {
    sc.amount = scenario.recommended;
    updateScenario();
    toast(`Reset to the recommended ${money(scenario.recommended, false)}/mo`);
  });
  $('#btn-repeat').addEventListener('click', () => {
    sc.amount = sc.amount === 300 ? scenario.recommended : 300;
    updateScenario();
    toast(`Comparing ${money(sc.amount, false)}/mo`);
  });
  $('#btn-approve').addEventListener('click', () => {
    const plan = planFor(sc.amount);
    if (!plan.onTrack) {
      toast(`Raise the set-aside to at least ${money(plan.suggestion, false)} to fund the trip`);
      return;
    }
    const btn = $('#btn-approve');
    btn.textContent = 'Plan approved ✓';
    btn.classList.add('is-done');
    const g = goals.find((x) => x.id === 'lisbon');
    g.note = `${money(sc.amount, false)}/mo · auto`;
    renderGoals();
    toast(`${money(sc.amount, false)}/mo auto-transfer starts Nov 15`);
    setTimeout(() => { btn.textContent = 'Approve plan'; btn.classList.remove('is-done'); }, 3200);
  });
  // replace the static lead paragraph with a dynamic one
  $('.answer-lead').id = 'ans-lead';
  updateScenario();
}

/* ---------- Ask: chat ---------- */
let stepsPlayed = false;
function playSteps() {
  if (stepsPlayed) return;
  stepsPlayed = true;
  const items = $$('#steps li');
  const answer = $('#answer');
  if (reduceMotion()) {
    items.forEach((li) => li.classList.add('is-done'));
    answer.classList.add('is-in');
    return;
  }
  answer.classList.remove('is-in');
  items.forEach((li, i) => {
    li.classList.remove('is-done');
    setTimeout(() => li.classList.add('is-running'), i * 520);
    setTimeout(() => { li.classList.remove('is-running'); li.classList.add('is-done'); }, i * 520 + 480);
  });
  setTimeout(() => answer.classList.add('is-in'), items.length * 520 + 120);
}

function reply(q) {
  const s = q.toLowerCase();
  const food = spending.categories.find((c) => c.id === 'food');
  if (/food|dining|restaurant|grocer/.test(s)) return `You’ve spent ${money(food.amount, false)} on food & dining this month — 22% of spending. Groceries were ${money(86.12)} at Whole Foods; the rest is mostly eating out.`;
  if (/net ?worth|worth|total|how much do i have/.test(s)) return `Your net worth is ${money(netWorth.value)}, up 1.4% (+$3,412) this month. Brokerage makes up ${Math.round((accounts[0].balance / netWorth.value) * 100)}% of it.`;
  if (/subscri|cancel/.test(s)) return 'Two subscriptions look unused: Streamly ($15.99, last opened 74 days ago) and CloudBox Pro ($24.99, 51 days). Cancelling both frees $41 a month.';
  if (/spend|spent|budget|left/.test(s)) return `You’ve spent ${money(spending.spent, false)} of your ${money(spending.budget, false)} budget — ${money(spending.budget - spending.spent, false)} left. Housing is the largest category at ${money(1850, false)}.`;
  if (/sav|apy|interest|emergency/.test(s)) return `High-yield savings holds ${money(42300, false)} at 4.6% APY — about $162 of interest a month. Your emergency fund covers 6.2 months of expenses.`;
  if (/lisbon|trip|travel|afford|vacation/.test(s)) return `For Lisbon you need ${money(scenario.budget - scenario.saved, false)} more by March 14. ${money(sc.amount, false)} a month ${planFor(sc.amount).onTrack ? 'gets you there' : 'is not quite enough'} — adjust the plan on the right.`;
  if (/safe|afford today|can i spend/.test(s)) return `${money(safeToSpend.today, false)} is safe to spend today after upcoming bills. It dips to around $520 before your next paycheck.`;
  if (/invest|brokerage|stock|portfolio/.test(s)) return `Your brokerage is ${money(accounts[0].balance)}, up 1.9% over the past month in a broad index portfolio.`;
  return 'I can look at your net worth, spending, savings, subscriptions and trip plans. Try “How much did I spend on food?”';
}

function addMessage(text, who) {
  const log = $('#chat-log');
  const el = document.createElement('div');
  if (who === 'user') {
    el.className = 'msg msg-user';
    el.textContent = text;
  } else {
    el.className = 'msg-ai msg-ai-simple';
    el.innerHTML = `<div class="ai-who static"><span class="ai-avatar"><svg><use href="#i-sparkle"/></svg></span><span><strong>Fintev</strong><small>Thinking…</small></span></div><p class="answer-lead typing"><span></span><span></span><span></span></p>`;
  }
  log.appendChild(el);
  log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' });
  return el;
}

function initChat() {
  $('.ai-who').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    $('#steps').hidden = open;
  });
  const ask = (q) => {
    q = q.trim();
    if (!q) return;
    addMessage(q, 'user');
    const el = addMessage('', 'ai');
    const started = performance.now();
    setTimeout(() => {
      const secs = Math.max(1, Math.round((performance.now() - started) / 1000));
      $('small', el).textContent = `Reasoned over your data · ${secs}s`;
      const p = $('.answer-lead', el);
      p.classList.remove('typing');
      p.innerHTML = escapeHtml(reply(q));
      const log = $('#chat-log');
      log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }, reduceMotion() ? 100 : 900);
  };
  $('#ask-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#ask-input');
    ask(input.value);
    input.value = '';
  });
  $$('#chips button').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
}

/* ---------- insights ---------- */
function renderFlow() {
  const per = 300, step = 7.2, r = 2.6;
  const H = 214, colW = 100;
  let html = `<svg viewBox="0 0 ${cashflow.length * colW} ${H}" aria-hidden="true">`;
  cashflow.forEach((m, i) => {
    const cx = i * colW + colW / 2;
    const col = (val, x, cls) => {
      const n = Math.round(val / per);
      let s = '';
      for (let k = 0; k < n; k++) s += `<circle cx="${x}" cy="${H - 26 - k * step}" r="${r}" class="${cls}" style="--k:${k}"/>`;
      return s;
    };
    const last = i === cashflow.length - 1;
    html += `<g class="flow-col${last ? ' is-current' : ''}"><title>${m.m}: income ${money(m.income, false)}, spending ${money(m.spend, false)}</title>`;
    html += col(m.income, cx - 7, 'in') + col(m.spend, cx + 7, 'out');
    html += `<text x="${cx}" y="${H - 4}" text-anchor="middle">${m.m}</text></g>`;
  });
  html += '</svg>';
  const flow = $('#flow');
  flow.innerHTML = html;
  flow.setAttribute('role', 'img');
  flow.setAttribute('aria-label', 'Cash flow: ' + cashflow.map((m) => `${m.m} income ${money(m.income, false)}, spending ${money(m.spend, false)}`).join('; '));
  const avg = cashflow.reduce((s, m) => s + (m.income - m.spend), 0) / cashflow.length;
  $('#flow-avg').textContent = money(Math.round(avg), false);
}

function renderCategories() {
  const max = Math.max(...spending.categories.map((c) => c.amount));
  $('#cat-list').innerHTML = spending.categories
    .map(
      (c) => `<li>
      <div class="cat-row"><span><i style="background:${c.color}"></i>${c.name}</span><span>${money(c.amount, false)} <small>${Math.round((c.amount / spending.spent) * 100)}%</small></span></div>
      <div class="bar"><span style="width:${(c.amount / max) * 100}%;background:${c.color}"></span></div>
    </li>`,
    )
    .join('') +
    `<li class="cat-total"><span>Total spent</span><span>${money(spending.spent, false)} <small>of ${money(spending.budget, false)}</small></span></li>`;
}

const catColor = { food: 'var(--cat-2)', bills: 'var(--cat-4)', housing: 'var(--cat-1)', shopping: 'var(--cat-3)', income: 'var(--acc-2)', transfer: 'var(--acc-1)' };
function txRow(t) {
  return `<li class="tx">
    <span class="tx-ico" style="--c:${catColor[t.cat] || 'var(--ink-3)'}">${t.name[0]}</span>
    <div class="tx-name"><p>${t.name}</p><small>${t.date}${t.flag ? ` · <em>${t.flag}</em>` : ''}</small></div>
    <p class="tx-amt ${t.amount > 0 ? 'is-in' : ''}">${t.amount > 0 ? '+' : ''}${money(t.amount)}</p>
  </li>`;
}
function renderTransactions() {
  $('#tx-list').innerHTML = transactions.map(txRow).join('');
}

/* ---------- goals ---------- */
function goalRing(g) {
  const N = 44, R = 46, c = 56;
  const filled = Math.round((g.saved / g.target) * N);
  let s = '';
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    const on = i < filled;
    s += `<circle cx="${(c + R * Math.cos(a)).toFixed(2)}" cy="${(c + R * Math.sin(a)).toFixed(2)}" r="${on ? 2.7 : 2}" fill="${on ? g.color : 'var(--track)'}"/>`;
  }
  return `<svg viewBox="0 0 112 112" aria-hidden="true">${s}</svg>`;
}

function renderGoals() {
  const grid = $('#goal-grid');
  grid.innerHTML = goals
    .map((g) => {
      const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
      return `<article class="card goal" data-goal="${g.id}">
        <div class="goal-ring">${goalRing(g)}<span class="dm dm-sm goal-pct" data-pct="${pct}"></span></div>
        <div class="goal-body">
          <h2 class="card-title">${g.name}</h2>
          <p class="card-sub">${g.note}</p>
          <p class="goal-amt"><strong>${money(g.saved, false)}</strong> of ${money(g.target, false)}</p>
          <div class="goal-actions">
            <button type="button" class="chip-btn" data-add="${g.id}">+ $100</button>
            ${g.id === 'lisbon' ? '<a class="chip-btn ghost" href="#ask">Plan with Fintev</a>' : ''}
          </div>
        </div>
      </article>`;
    })
    .join('');
  $$('.goal-pct', grid).forEach((el) => dotMatrix(el, `${el.dataset.pct}%`, { label: `${el.dataset.pct} percent`, animate: false }));
  $$('[data-add]', grid).forEach((b) =>
    b.addEventListener('click', () => {
      const g = goals.find((x) => x.id === b.dataset.add);
      g.saved = Math.min(g.target, g.saved + 100);
      renderGoals();
      $(`[data-add="${g.id}"]`).focus();
      toast(`Moved $100 to ${g.name}`);
    }),
  );
}

/* ---------- search ---------- */
function initSearch() {
  const overlay = $('#search'), input = $('#search-input'), list = $('#search-results');
  let opener = null;
  const index = [
    ...accounts.map((a) => ({ title: a.name, sub: `Account · ${a.sub}`, value: money(a.balance), href: '#insights' })),
    ...goals.map((g) => ({ title: g.name, sub: `Goal · ${Math.round((g.saved / g.target) * 100)}% funded`, value: money(g.saved, false), href: '#goals' })),
    ...transactions.map((t) => ({ title: t.name, sub: `Activity · ${t.date}`, value: money(t.amount), href: '#insights' })),
    ...spending.categories.map((c) => ({ title: c.name, sub: 'Spending category', value: money(c.amount, false), href: '#insights' })),
    { title: 'Ask Fintev', sub: 'AI assistant', value: '', href: '#ask' },
  ];
  const render = () => {
    const q = input.value.trim().toLowerCase();
    const hits = index.filter((i) => !q || (i.title + ' ' + i.sub).toLowerCase().includes(q)).slice(0, 8);
    list.innerHTML = hits.length
      ? hits.map((h) => `<li role="option"><a href="${h.href}"><span><b>${escapeHtml(h.title)}</b><small>${escapeHtml(h.sub)}</small></span><em>${h.value}</em></a></li>`).join('')
      : `<li class="empty">No results for “${escapeHtml(input.value)}”</li>`;
  };
  const open = () => {
    opener = document.activeElement;
    overlay.hidden = false;
    input.value = '';
    render();
    requestAnimationFrame(() => { overlay.classList.add('is-open'); input.focus(); });
  };
  const close = () => {
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    opener?.focus?.();
  };
  $$('.search-btn').forEach((b) => b.addEventListener('click', open));
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('a', list)?.click();
    if (e.key === 'ArrowDown') { e.preventDefault(); $('a', list)?.focus(); }
  });
  list.addEventListener('keydown', (e) => {
    const links = $$('a', list), i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); links[Math.min(links.length - 1, i + 1)]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i <= 0 ? input : links[i - 1]).focus(); }
  });
  list.addEventListener('click', (e) => e.target.closest('a') && close());
  $$('[data-close]', overlay).forEach((b) => b.addEventListener('click', close));
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('input, button, a', overlay.querySelector('.search-panel'));
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay.hidden ? open() : close(); }
    if (e.key === '/' && overlay.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
}

/* ---------- sync ---------- */
function initSync() {
  $$('.sync-btn').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.sync-btn').forEach((x) => x.classList.add('is-syncing'));
      $('#nw-sub').textContent = '3 accounts · syncing…';
      setTimeout(() => {
        $$('.sync-btn').forEach((x) => x.classList.remove('is-syncing'));
        $('#nw-sub').textContent = '3 accounts · synced just now';
        toast('All 3 accounts are up to date');
      }, 1300);
    }),
  );
}

/* ---------- router ---------- */
const VIEWS = ['home', 'ask', 'insights', 'goals'];
let first = true;
function route() {
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  $$('.view').forEach((v) => (v.hidden = v.dataset.view !== name));
  $$('[data-nav]').forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.body.dataset.view = name;
  const active = $(`.pill [data-nav="${name}"]`);
  const ind = $('.pill-indicator');
  ind.style.opacity = active ? '1' : '0';
  if (active) {
    ind.style.setProperty('--x', `${active.offsetLeft}px`);
    ind.style.setProperty('--y', `${active.offsetTop}px`);
  }
  if (name === 'ask') playSteps();
  if (!first) {
    $('#main').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  first = false;
  document.title = `${{ home: 'Overview', ask: 'Ask', insights: 'Insights', goals: 'Goals' }[name]} · Fintev`;
}

/* ---------- boot ---------- */
function boot() {
  renderHeader();
  renderNetWorth('1M');
  dotMatrix($('#sts-value'), money(safeToSpend.today, false), { label: `${money(safeToSpend.today, false)} safe to spend` });
  renderWave();
  renderGauge();
  renderAccounts();
  initScenario();
  initChat();
  renderFlow();
  renderCategories();
  renderTransactions();
  renderGoals();
  initSearch();
  initSync();

  $$('.segmented button').forEach((b) => b.addEventListener('click', () => setRange(b.dataset.range)));
  $('.segmented').addEventListener('keydown', (e) => {
    const btns = $$('.segmented button');
    const i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = btns[(i + d + btns.length) % btns.length];
    setRange(next.dataset.range);
    next.focus();
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('resize', () => {
    const active = $(`.pill [aria-current="page"]`);
    if (active) {
      const ind = $('.pill-indicator');
      ind.style.setProperty('--x', `${active.offsetLeft}px`);
      ind.style.setProperty('--y', `${active.offsetTop}px`);
    }
  });
  route();
  document.documentElement.classList.add('is-ready');
}

boot();
