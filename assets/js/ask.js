// Ask Pip — an assistant that answers with visuals, not just sentences.
// Every reply is a short plain-language answer plus a live, interactive card.

import { createPip } from './mascot.js';
import { areaChart, runwayChart, sankey, jarSvg, weeklyBars, responsive } from './charts.js';
import {
  money, accounts, history, netWorth, nwChange, spending, flow, income, goals, subscriptions, events,
  shortDate, runway, SAFE_NOW, BUFFER, judgePurchase, trip, state, emit, transactions, DAY_OF_MONTH, DAYS_IN_MONTH, PAYDAYS,
} from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));

let ctx = {}, log, input, sendBtn, busy = false, turns = 0;

/* ---------- intent detection ---------- */
function detect(q) {
  const s = q.toLowerCase();
  if (/lisbon|trip|travel|vacation|holiday|flight/.test(s)) return 'plan';
  if (/subscri|cancel|unused|recurring/.test(s)) return 'subs';
  if (/paycheck|salary|income|where.*(go|went)|money go|flow|breakdown/.test(s)) return 'flow';
  if (/food|dining|restaurant|grocer|eat|coffee/.test(s)) return 'cat:food';
  if (/shopping|clothes|amazon|shop\b/.test(s)) return 'cat:shopping';
  if (/\brent\b|housing|mortgage/.test(s)) return 'cat:housing';
  if (/\bfun\b|movie|entertain|hobby/.test(s)) return 'cat:fun';
  if (/transport|uber|lyft|\bgas\b|bills/.test(s)) return 'cat:bills';
  if (/buy|afford|purchase|laptop|phone|camera|bike|sofa|\$\s?\d/.test(s)) return 'afford';
  if (/net ?worth|wealth|how much (do i|money do i) have|worth/.test(s)) return 'networth';
  if (/safe|runway|can i spend|forecast|payday|coming up|upcoming/.test(s)) return 'runway';
  if (/goal|emergency|saving|jar/.test(s)) return 'goals';
  if (/how am i|doing|month|budget|summary|overview|pace|spent/.test(s)) return 'month';
  return 'fallback';
}

const ITEMS = ['laptop', 'phone', 'bike', 'tv', 'sofa', 'camera', 'watch', 'shoes', 'headphones', 'ticket', 'concert', 'jacket'];
function parsePurchase(q) {
  const m = q.replace(/,/g, '').match(/\$\s?(\d+(?:\.\d+)?)(k)?|(\d+(?:\.\d+)?)\s?(?:dollars|usd|bucks)/i);
  let price = m ? parseFloat(m[1] || m[3]) * (m[2] ? 1000 : 1) : null;
  const item = ITEMS.find((i) => q.toLowerCase().includes(i)) || null;
  if (!price) price = item === 'laptop' ? 900 : item === 'phone' ? 800 : 600;
  return { price: Math.round(Math.min(price, 20000)), item };
}

/* ---------- visual cards ---------- */
function vizHead(eyebrow, title, chip = '') {
  return `<header class="viz-head"><div><p class="eyebrow">${eyebrow}</p><h3>${title}</h3></div>${chip}</header>`;
}

function tripPlanViz() {
  const el = h(`<section class="viz viz-plan" aria-label="Lisbon trip savings plan">
    ${vizHead('Trip plan', 'Lisbon · flying Mar 14', '<span class="verdict" data-v></span>')}
    <div class="stairs" data-stairs></div>
    <div class="plan-ctrl"><label for="plan-r${++turns}">Set aside each month</label><output data-amt></output></div>
    <input id="plan-r${turns}" class="range" type="range" min="0" max="${trip.max}" step="10" value="${state.planAmount}">
    <div class="src"><p class="src-t">Where it comes from</p><div class="src-bar" data-src></div><ul class="src-l" data-srcl></ul></div>
    <footer class="viz-actions">
      <button class="btn btn-ink" type="button" data-approve>Approve plan</button>
      <button class="btn btn-ghost" type="button" data-try>Try $300</button>
    </footer></section>`);
  el._mount = () => {
    const host = $('[data-stairs]', el), range = $('input', el), out = $('[data-amt]', el), chip = $('[data-v]', el);
    const approve = $('[data-approve]', el), tryBtn = $('[data-try]', el);
    let amt = state.planAmount;
    const labels = ['Today', 'Nov 15', 'Dec 15', 'Jan 15', 'Feb 15'];

    const rt = (x, y, w, hh, r) => { r = Math.min(r, hh / 2, w / 2); return `M${x},${y + hh}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hh}Z`; };
    const draw = () => {
      const W = host.clientWidth; if (!W) return;
      const H = 200, pad = { l: 4, r: 4, t: 34, b: 28 };
      const vals = [0, 1, 2, 3, 4].map((i) => trip.saved + amt * i);
      const yMax = Math.max(3300, Math.max(...vals) * 1.05);
      const Y = (v) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
      const colW = (W - pad.l - pad.r) / 5, bw = Math.min(56, colW * 0.64);
      const firstHit = vals.findIndex((v) => v >= trip.target);
      let s = '';
      vals.forEach((v, i) => {
        const x = pad.l + colW * (i + 0.5) - bw / 2, y0 = Y(0), ys = Y(trip.saved), yv = Y(v);
        const add = v > trip.saved;
        s += add ? `<path d="M${x},${y0}V${ys}H${x + bw}V${y0}Z" fill="#CDBFFF"/>` : `<path d="${rt(x, ys, bw, y0 - ys, 11)}" fill="#CDBFFF"/>`;
        if (add) s += `<path d="${rt(x, yv, bw, ys - yv, 11)}" fill="${i >= firstHit && firstHit >= 0 ? '#55D49B' : '#8FE3BB'}" class="grow" style="--i:${i}"/>`;
        const hit = i === firstHit;
        s += `<text x="${x + bw / 2}" y="${yv - 8}" text-anchor="middle" class="sv${hit ? ' hit' : ''}">${hit ? '✓ ' : ''}${money(v)}</text>`;
        s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="ax">${labels[i]}</text>`;
      });
      const ty = Y(trip.target);
      s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${ty}" y2="${ty}" class="tgt"/>`;
      s += `<g transform="translate(${W - pad.r} ${ty - 11})"><rect x="-122" y="-11" width="122" height="22" rx="11" class="tg-p"/><text x="-61" y="0" text-anchor="middle" dominant-baseline="central" class="tg-t">✈ Budget ${money(trip.target)}</text></g>`;
      host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Savings toward the trip, month by month">${s}</svg>`;
    };
    const update = () => {
      const remaining = trip.target - trip.saved, needed = amt > 0 ? Math.ceil(remaining / amt) : Infinity, ok = needed <= 4;
      const suggestion = Math.ceil(remaining / 4 / 10) * 10, short = trip.target - (trip.saved + amt * 4);
      range.value = amt;
      range.style.setProperty('--p', `${(amt / trip.max) * 100}%`);
      out.textContent = money(amt);
      chip.className = `verdict ${ok ? 'ok' : 'warn'}`;
      chip.textContent = ok ? `On track · by ${trip.months[needed - 1]} 15` : `Short ${money(short)} · try ${money(suggestion)}`;
      const subs = Math.min(amt, 41), dining = Math.min(Math.max(amt - subs, 0), 60), rest = Math.max(amt - subs - dining, 0);
      const seg = [['Unused subscriptions', subs, '#FFE48E'], ['Eating out a bit less', dining, '#A8EBC9'], ['Safe-to-spend', rest, '#CDBFFF']].filter((x) => x[1] > 0);
      $('[data-src]', el).innerHTML = seg.map(([, v, c]) => `<span style="flex:${v};background:${c}"></span>`).join('') || '<span style="flex:1;background:#eee"></span>';
      $('[data-srcl]', el).innerHTML = seg.map(([n, v, c]) => `<li><i style="background:${c}"></i>${n} <b>${money(v)}</b></li>`).join('');
      approve.dataset.ok = ok ? '1' : '';
      draw();
    };
    responsive(host, draw);
    range.addEventListener('input', () => { amt = +range.value; update(); });
    tryBtn.addEventListener('click', () => { amt = amt === 300 ? trip.recommended : 300; tryBtn.textContent = amt === 300 ? 'Back to $180' : 'Try $300'; update(); });
    approve.addEventListener('click', () => {
      if (!approve.dataset.ok) { ctx.toast?.(`That’s a bit short — try ${money(Math.ceil((trip.target - trip.saved) / 4 / 10) * 10)} a month.`); approve.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 }); return; }
      state.planAmount = amt; state.planApproved = true; state.celebrate = true;
      approve.textContent = '✓ Approved · moves on the 15th';
      approve.disabled = true;
      ctx.toast?.(`${money(amt)}/mo will move to your Lisbon trip on the 15th`);
      emit('plan'); emit('mood');
      el.closest('.msg-ai')?._pip?.setMood('joy');
      confetti(approve);
      setTimeout(() => { state.celebrate = false; emit('mood'); }, 7000);
    });
    update();
  };
  return el;
}

function confetti(from) {
  if (reduced()) return;
  const r = from.getBoundingClientRect();
  const colors = ['#FF9FCF', '#7DDCAB', '#FFD764', '#B9A7FF', '#8CCCF0'];
  for (let i = 0; i < 26; i++) {
    const d = document.createElement('i');
    d.className = 'confetti';
    const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 140;
    d.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${colors[i % 5]};--x:${Math.cos(a) * v}px;--y:${Math.sin(a) * v - 80}px;--r:${Math.random() * 540}deg;border-radius:${i % 3 ? '50%' : '3px'}`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1400);
  }
}

const VERDICT = { ok: ['ok', 'Yes — comfortably'], tight: ['tight', 'Yes, but tight'], no: ['warn', 'Not yet'] };
function affordViz(price, item) {
  const J = judgePurchase(price);
  const [cls, label] = VERDICT[J.verdict];
  const back = runway.findIndex((v, d) => d >= J.lowDay && v - price >= BUFFER);
  const el = h(`<section class="viz viz-afford" aria-label="Purchase check">
    ${vizHead('Purchase check', `${money(price)} ${item || 'purchase'}`, `<span class="verdict ${cls}">${label}</span>`)}
    <div class="rw" data-rw></div>
    <dl class="stats">
      <div><dt>Safe to spend</dt><dd>${money(SAFE_NOW)} <span>→</span> ${money(Math.max(0, SAFE_NOW - price))}${SAFE_NOW - price < 0 ? '<em>over by ' + money(price - SAFE_NOW) + '</em>' : ''}</dd></div>
      <div><dt>Lowest point</dt><dd class="${J.low < BUFFER ? 'bad' : ''}">${money(Math.max(0, J.low))} <small>${shortDate(J.lowDay)}</small></dd></div>
      <div><dt>${back >= 0 && J.low < BUFFER + 200 ? 'Back to comfy' : 'Safety margin'}</dt><dd>${back >= 0 && J.low < BUFFER + 200 ? `${shortDate(back)} <small>payday</small>` : `${money(Math.max(0, J.low - BUFFER))} <small>above buffer</small>`}</dd></div>
    </dl></section>`);
  el._mount = () => runwayChart($('[data-rw]', el), { purchase: price, height: 200 });
  el._extra = { J, back };
  return el;
}

function flowViz() {
  const pct = (v) => Math.round((v / income) * 100);
  const needs = spending.categories.filter((c) => c.group === 'needs').reduce((s, c) => s + c.amount, 0);
  const wants = spending.categories.filter((c) => c.group === 'wants').reduce((s, c) => s + c.amount, 0);
  const el = h(`<section class="viz viz-flow" aria-label="Where your paycheck goes">
    ${vizHead('This month', `Where ${money(income)} goes`)}
    <div class="sk" data-sk></div>
    <ul class="pcts"><li style="--c:#8CCBF5"><b>${pct(needs)}%</b> Needs</li><li style="--c:#FFA98A"><b>${pct(wants)}%</b> Wants</li><li style="--c:#6BD9A4"><b>${pct(flow.saved.total)}%</b> Saved</li><li style="--c:#FFD960"><b>${pct(flow.left)}%</b> Left over</li></ul></section>`);
  el._mount = () => sankey($('[data-sk]', el), { compact: false });
  return el;
}

function categoryViz(id) {
  const c = spending.categories.find((x) => x.id === id);
  const over = c.amount > c.budget, pct = Math.round((c.amount / c.budget) * 100);
  const diff = Math.round(((c.amount - c.last) / c.last) * 100);
  const tx = transactions.filter((t) => t.cat === id).slice(0, 3);
  const el = h(`<section class="viz viz-cat" aria-label="${esc(c.name)} spending">
    ${vizHead(c.name, `${money(c.amount)} <span class="of">of ${money(c.budget)}</span>`, `<span class="verdict ${over ? 'warn' : pct > 90 ? 'tight' : 'ok'}">${over ? `${money(c.amount - c.budget)} over` : `${money(c.budget - c.amount)} left`}</span>`)}
    <div class="meter"><span style="width:${Math.min(100, pct)}%;background:${c.color}"></span><i style="left:${(DAY_OF_MONTH / DAYS_IN_MONTH) * 100}%" title="Where the month is"></i></div>
    <p class="meter-l"><span>${pct}% of budget used</span><span>${Math.round((DAY_OF_MONTH / DAYS_IN_MONTH) * 100)}% of the month gone</span></p>
    ${c.weekly.some((v) => v) && c.id !== 'housing' ? weeklyBars(c) : ''}
    <div class="rows">${tx.map((t) => `<div class="row"><span>${esc(t.name)}<small>${t.date}</small></span><b>${money(t.amount, true)}</b></div>`).join('')}
      <div class="row soft"><span>vs last month</span><b class="${diff > 0 ? 'bad' : 'good'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}% <small>(${money(c.last)})</small></b></div></div></section>`);
  return el;
}

function subsViz() {
  const live = () => subscriptions.filter((s) => !state.cancelled.has(s.id));
  const el = h(`<section class="viz viz-subs" aria-label="Subscriptions">
    ${vizHead('Recurring', 'What you pay for every month', `<span class="verdict warn" data-chip></span>`)}
    <ul class="subs">${subscriptions.map((s) => `<li data-id="${s.id}" class="${state.cancelled.has(s.id) ? 'done' : ''}">
      <span class="sub-ico" style="--c:${s.unused ? '#FFD0C2' : '#CFEFD9'}">${s.name[0]}</span>
      <span class="sub-n"><b>${s.name}</b><small class="${s.unused ? 'flag' : ''}">${state.cancelled.has(s.id) ? 'Cancelled ✓' : s.note}</small></span>
      <span class="sub-p">${money(s.price, true)}</span>
      <label class="sw" title="Cancel"><input type="checkbox" role="switch" aria-label="Cancel ${s.name}" ${s.unused && !state.cancelled.has(s.id) ? 'checked' : ''} ${state.cancelled.has(s.id) ? 'disabled' : ''}><span></span></label></li>`).join('')}</ul>
    <p class="sub-tot" data-tot></p>
    <footer class="viz-actions"><button class="btn btn-ink" type="button" data-cancel>Cancel selected</button></footer></section>`);
  el._mount = () => {
    const btn = $('[data-cancel]', el), tot = $('[data-tot]', el), chip = $('[data-chip]', el);
    const picked = () => $$('input:checked:not(:disabled)', el).map((i) => i.closest('li').dataset.id);
    const refresh = () => {
      const ids = picked(), sum = subscriptions.filter((s) => ids.includes(s.id)).reduce((a, s) => a + s.price, 0);
      const unusedLeft = live().filter((s) => s.unused).length;
      chip.className = `verdict ${unusedLeft ? 'warn' : 'ok'}`;
      chip.textContent = unusedLeft ? `${unusedLeft} unused` : 'All in use';
      tot.innerHTML = ids.length ? `Cancelling ${ids.length} frees <b>${money(sum, true)}/mo</b> · <b>${money(sum * 12)}</b> a year` : 'Nothing selected.';
      btn.disabled = !ids.length;
    };
    $$('input', el).forEach((i) => i.addEventListener('change', refresh));
    btn.addEventListener('click', () => {
      const ids = picked(), sum = subscriptions.filter((s) => ids.includes(s.id)).reduce((a, s) => a + s.price, 0);
      ids.forEach((id) => { state.cancelled.add(id); const li = $(`li[data-id="${id}"]`, el); li.classList.add('done'); $('small', li).textContent = 'Cancelled ✓'; $('input', li).checked = false; $('input', li).disabled = true; });
      el.closest('.msg-ai')?._pip?.setMood('happy');
      ctx.toast?.(`Cancelled — you’ll keep ${money(sum, true)} a month`);
      emit('subs');
      refresh();
    });
    refresh();
  };
  return el;
}

function netWorthViz() {
  const ch = nwChange('1Y'), m = nwChange('1M');
  const el = h(`<section class="viz viz-nw" aria-label="Net worth">
    ${vizHead('You’re worth', `<span class="big">${money(netWorth.value)}</span>`, `<span class="verdict ok">+${money(m.delta)} this month</span>`)}
    <div class="nwc" data-nwc></div>
    <div class="alloc">${accounts.map((a) => `<span style="flex:${a.balance};background:${a.color}" title="${esc(a.name)}"></span>`).join('')}</div>
    <ul class="alloc-l">${accounts.map((a) => `<li><i style="background:${a.color}"></i>${a.name} <b>${Math.round((a.balance / netWorth.value) * 100)}%</b></li>`).join('')}</ul>
    <p class="viz-foot">Up <b>${money(ch.delta)}</b> (${ch.pct.toFixed(1)}%) over the past year.</p></section>`);
  el._mount = () => areaChart($('[data-nwc]', el), { fullLabels: history.full, series: [{ name: 'Net worth', color: '#B9A7FF', ink: '#6F55E0', values: history.total }], fit: true, height: 170, ticks: 2 });
  return el;
}

function runwayViz() {
  const next = events.slice(0, 5);
  const el = h(`<section class="viz viz-run" aria-label="Safe to spend forecast">
    ${vizHead('Free to spend', `<span class="big">${money(SAFE_NOW)}</span>`, '<span class="verdict ok">Next 30 days</span>')}
    <div class="rw" data-rw></div>
    <ul class="ev-list">${next.map((e) => `<li><span class="ev-d">${shortDate(e.d)}</span><span class="ev-n">${esc(e.name)}${e.flag ? `<em>${e.flag}</em>` : ''}</span><span class="ev-a ${e.kind === 'income' ? 'in' : ''}">${e.kind === 'income' ? '+' : ''}${money(e.amount, true)}<small>${e.kind === 'income' ? 'incoming' : 'set aside ✓'}</small></span></li>`).join('')}</ul></section>`);
  el._mount = () => runwayChart($('[data-rw]', el), { height: 190 });
  return el;
}

function goalsViz() {
  const el = h(`<section class="viz viz-goals" aria-label="Goals">
    ${vizHead('Saving toward', 'Your four goals')}
    <ul class="jars">${goals.map((g) => `<li>${jarSvg(g, { size: 74 })}<b>${Math.round((g.saved / g.target) * 100)}%</b><span>${g.name}</span><small>${money(g.saved)} of ${money(g.target)}</small></li>`).join('')}</ul></section>`);
  return el;
}

function monthViz() {
  const pct = Math.round((spending.spent / spending.budget) * 100), elapsed = Math.round((DAY_OF_MONTH / DAYS_IN_MONTH) * 100);
  const over = spending.categories.filter((c) => c.amount > c.budget);
  const el = h(`<section class="viz viz-month" aria-label="Month so far">
    ${vizHead('October so far', `${money(spending.spent)} <span class="of">of ${money(spending.budget)}</span>`, '<span class="verdict ok">On pace</span>')}
    <div class="meter lg"><span style="width:${pct}%"></span><i style="left:${elapsed}%"></i></div>
    <p class="meter-l"><span>${pct}% of budget</span><span>▲ today · ${elapsed}% of the month</span></p>
    <ul class="insights">
      <li class="good"><i>✓</i><span><b>Spending is on pace.</b> ${money(spending.budget - spending.spent)} left for the last ${DAYS_IN_MONTH - DAY_OF_MONTH} days.</span></li>
      ${over.map((c) => `<li class="warn"><i>!</i><span><b>${c.name} is ${money(c.amount - c.budget)} over.</b> Most of it was one purchase on Oct 23.</span></li>`).join('')}
      <li class="good"><i>★</i><span><b>You’re saving ${Math.round((flow.saved.total / income) * 100)}% of income.</b> Most people aim for 20%.</span></li>
    </ul></section>`);
  return el;
}

/* ---------- intents ---------- */
const STEP = {
  accounts: ['Read 3 linked accounts', '$248.6k'],
  tx: ['Scanned 214 transactions', 'Oct – Mar'],
  subs: ['Found 2 unused subscriptions', '$41/mo'],
  sim: ['Simulated 3 savings plans', 'Best $180/mo'],
};

function build(q) {
  const id = detect(q);
  const s = (...a) => a;
  switch (id) {
    case 'plan': {
      const left = trip.target - trip.saved;
      return { steps: s(STEP.accounts, STEP.tx, STEP.subs, STEP.sim), mood: 'happy', viz: [tripPlanViz()],
        text: `<p class="lead">Yes. Set aside <b>${money(trip.recommended)}</b> a month and you’ll reach ${money(trip.target)} by February.</p><p class="note">You need ${money(left)} more. Your emergency fund stays at 6.2 months of expenses, and $41 of the ${money(trip.recommended)} comes from two subscriptions you rarely open. Drag the slider to see what changes.</p>`,
        chips: ['What can I cancel?', 'Where did my paycheck go?', 'Can I buy a $900 laptop?'] };
    }
    case 'afford': {
      const { price, item } = parsePurchase(q);
      const viz = affordViz(price, item);
      const { J, back } = viz._extra;
      const lead = J.verdict === 'ok' ? `Yes — ${money(price)} fits comfortably.` : J.verdict === 'tight' ? `You can, but it gets tight for a few days.` : `Not right now — ${money(price)} is more than you can safely spend.`;
      const note = J.verdict === 'no'
        ? (J.when != null ? `If you wait until <b>${shortDate(J.when)}</b> it fits without touching your buffer.` : `It’s bigger than your free cash for the whole month. Splitting it into 3 payments of ${money(Math.ceil(price / 3))}, or saving toward it, would be gentler.`)
        : J.verdict === 'tight'
          ? `Your safe-to-spend would dip to <b>${money(Math.max(0, J.low))}</b> on ${shortDate(J.lowDay)}, then recover on payday${back >= 0 ? ` (${shortDate(back)})` : ''}. Rent and bills are already set aside, so they’re safe either way.`
          : `Your lowest point stays at <b>${money(J.low)}</b> — comfortably above your ${money(BUFFER)} buffer. Bills are already set aside.`;
      return { steps: s(STEP.accounts, ['Checked upcoming bills', '8 events'], ['Projected the next 30 days', 'Daily $52'], ['Tested the purchase', money(price)]),
        mood: J.verdict === 'ok' ? 'happy' : J.verdict === 'tight' ? 'curious' : 'worried', viz: [viz],
        text: `<p class="lead">${lead}</p><p class="note">${note}</p>`,
        chips: [`What if it’s ${money(Math.round(price / 2))}?`, `What if it’s ${money(price * 2)}?`, 'Where did my paycheck go?'] };
    }
    case 'flow':
      return { steps: s(STEP.accounts, ['Matched 214 transactions to categories', '5 groups'], ['Compared with your paychecks', money(income)]), mood: 'calm', viz: [flowViz()],
        text: `<p class="lead">You keep about <b>${Math.round((flow.saved.total / income) * 100)}%</b> of what you earn — and ${money(flow.left)} is still unassigned.</p><p class="note">Needs take the smallest slice. Hover a block to follow one ribbon from paycheck to the places it lands.</p>`,
        chips: ['How am I doing this month?', 'How much did I spend on food?', 'What can I cancel?'] };
    case 'subs': {
      const unused = subscriptions.filter((x) => x.unused && !state.cancelled.has(x.id));
      const sum = unused.reduce((a, x) => a + x.price, 0);
      return { steps: s(['Listed recurring payments', '4 found'], ['Checked when you last used each', '90 days'], ['Estimated what you’d keep', money(sum * 12) + '/yr']), mood: unused.length ? 'curious' : 'happy', viz: [subsViz()],
        text: unused.length
          ? `<p class="lead">Two subscriptions look forgotten — cancelling them frees <b>${money(sum, true)}</b> a month.</p><p class="note">That’s ${money(sum * 12)} a year, and it’s what funds most of your Lisbon plan. I left the ones you use alone.</p>`
          : `<p class="lead">Nice — everything you pay for is something you use.</p><p class="note">I’ll tell you if anything goes quiet for 60 days.</p>`,
        chips: ['Can I afford Lisbon in March?', 'How am I doing this month?'] };
    }
    case 'networth':
      return { steps: s(STEP.accounts, ['Pulled 12 months of balances', 'Oct ’25 →']), mood: 'happy', viz: [netWorthViz()],
        text: `<p class="lead">You’re worth <b>${money(netWorth.value, true)}</b> — up ${money(nwChange('1M').delta)} this month.</p><p class="note">Most of it, ${Math.round((accounts[0].balance / netWorth.value) * 100)}%, sits in your index portfolio. Slide across the chart to see any month.</p>`,
        chips: ['Where did my paycheck go?', 'What are my goals?'] };
    case 'runway':
      return { steps: s(STEP.accounts, ['Checked upcoming bills', '8 events'], ['Projected the next 30 days', 'Daily $52']), mood: 'calm', viz: [runwayViz()],
        text: `<p class="lead"><b>${money(SAFE_NOW)}</b> is free to spend today.</p><p class="note">That’s what’s left after bills, savings and a $1,000 buffer are set aside. Your typical day costs about $52, and payday on ${shortDate(PAYDAYS[0])} tops it up again.</p>`,
        chips: ['Can I buy a $900 laptop?', 'What can I cancel?'] };
    case 'goals':
      return { steps: s(STEP.accounts, ['Checked your 4 goals', '4 active'], ['Projected finish dates', '2 on track']), mood: 'happy', viz: [goalsViz()],
        text: `<p class="lead">Two of your four goals are on track.</p><p class="note">Your emergency fund is nearly full at 88%. The laptop fund needs about $60 more a month, and the home fund is the long game.</p>`,
        chips: ['Can I afford Lisbon in March?', 'Can I buy a $900 laptop?'] };
    case 'month':
      return { steps: s(STEP.accounts, STEP.tx, ['Compared with your budget', money(spending.budget)]), mood: 'calm', viz: [monthViz()],
        text: `<p class="lead">You’re doing fine — right on pace with ${money(spending.budget - spending.spent)} to spare.</p><p class="note">Only one category needs a look. Everything else is comfortably inside budget.</p>`,
        chips: ['Where did my paycheck go?', 'How much did I spend on shopping?'] };
    default:
      if (id.startsWith('cat:')) {
        const c = spending.categories.find((x) => x.id === id.slice(4));
        const over = c.amount > c.budget;
        return { steps: s(STEP.tx, [`Grouped ${c.name.toLowerCase()} purchases`, '4 weeks'], ['Compared with last month', money(c.last)]), mood: over ? 'curious' : 'happy', viz: [categoryViz(c.id)],
          text: `<p class="lead">You’ve spent <b>${money(c.amount)}</b> on ${c.name.toLowerCase()} — ${over ? `${money(c.amount - c.budget)} over your budget.` : `${money(c.budget - c.amount)} left in your budget.`}</p><p class="note">${c.id === 'food' ? 'Weekly spending is steadily dropping, and you’re ' + Math.round((1 - c.amount / c.last) * 100) + '% below last month.' : c.id === 'shopping' ? 'One Apple Store purchase on Oct 23 tipped it over.' : 'Here’s how it looked week by week.'}</p>`,
          chips: ['How am I doing this month?', 'Where did my paycheck go?'] };
      }
      return { steps: [['Looking for what you meant', '…']], mood: 'curious', viz: [],
        text: `<p class="lead">Hmm, I’m not sure what you mean yet.</p><p class="note">I can look at your spending, bills, goals, trips and big purchases. Try one of these:</p>`,
        chips: ['How am I doing this month?', 'Can I buy a $900 laptop?', 'What can I cancel?', 'Can I afford Lisbon in March?'] };
  }
}

/* ---------- conversation ---------- */
function toBottom(el, block = 'start') {
  el.scrollIntoView({ block, behavior: reduced() ? 'auto' : 'smooth' });
}

export async function ask(q) {
  q = q.trim();
  if (!q || busy) return;
  busy = true;
  sendBtn.disabled = true;
  $('#ask-empty')?.remove();
  $$('.chips-follow', log).forEach((c) => c.remove());

  const u = h(`<div class="msg-user">${esc(q)}</div>`);
  log.appendChild(u);

  const r = build(q);
  const ai = h(`<article class="msg-ai" aria-live="polite">
    <header class="ai-head"><span class="ai-pip"></span><span class="ai-t"><strong>Pip</strong><small>Reading your accounts…</small></span></header>
    <ol class="trace">${r.steps.map(([a, b]) => `<li><span class="tk"></span><span>${a}</span><b>${b}</b></li>`).join('')}</ol>
    <div class="ai-body"></div></article>`);
  log.appendChild(ai);
  ai._pip = createPip($('.ai-pip', ai), { mood: 'thinking', look: false, shadow: false });
  toBottom(u, 'center');

  const t0 = performance.now();
  const lis = $$('.trace li', ai);
  for (const li of lis) {
    li.classList.add('run');
    await wait(520);
    li.classList.remove('run');
    li.classList.add('done');
  }
  const secs = Math.max(1, Math.round((performance.now() - t0) / 1000));
  $('small', ai).textContent = `Reasoned over your data · ${secs}s`;
  ai._pip.setMood(r.mood);

  const body = $('.ai-body', ai);
  body.innerHTML = `<div class="answer">${r.text}</div>`;
  for (const v of r.viz) {
    const wrap = h('<div class="viz-wrap"></div>');
    wrap.appendChild(v);
    body.appendChild(wrap);
    requestAnimationFrame(() => v._mount?.());
  }
  if (r.chips?.length) {
    body.appendChild(h(`<div class="chips-follow">${r.chips.map((c) => `<button type="button">${esc(c)}</button>`).join('')}</div>`));
  }
  const tr = $('.ai-head', ai);
  tr.setAttribute('role', 'button'); tr.tabIndex = 0;
  const toggle = () => { const t = $('.trace', ai); t.hidden = !t.hidden; tr.classList.toggle('closed', t.hidden); };
  tr.addEventListener('click', toggle);
  tr.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle()));
  setTimeout(() => { $('.trace', ai).hidden = true; tr.classList.add('closed'); }, 900);

  await wait(80);
  toBottom(ai, 'start');
  busy = false;
  sendBtn.disabled = false;
}

export function initAsk(c) {
  ctx = c;
  log = $('#chat-log');
  input = $('#ask-input');
  sendBtn = $('#ask-send');
  $('#ask-form').addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; ask(v); });
  log.addEventListener('click', (e) => {
    const b = e.target.closest('.chips-follow button, .prompt');
    if (b) ask(b.dataset.q || b.textContent);
  });
  resetChat();
}

const PROMPTS = [
  ['Can I afford Lisbon in March?', 'Plan a trip with a slider', '✈'],
  ['Can I buy a $900 laptop?', 'See what it does to your month', '💻'],
  ['Where did my paycheck go?', 'Follow every dollar', '💸'],
  ['What can I cancel?', 'Find forgotten subscriptions', '✂'],
];
export function resetChat() {
  log.innerHTML = `<div id="ask-empty" class="ask-empty"><div class="empty-pip"></div><h2>What’s on your <em>mind</em>?</h2><p>Ask anything about your money. I’ll answer in plain words — and show you.</p>
    <div class="prompts">${PROMPTS.map(([q, d, i], k) => `<button class="prompt" type="button" style="--k:${k}" data-q="${esc(q)}"><span>${i}</span><b>${q}</b><small>${d}</small></button>`).join('')}</div></div>`;
  createPip($('.empty-pip', log), { mood: 'curious' });
}

export const hasHistory = () => !!$('.msg-user', log);
export const focusInput = () => input?.focus({ preventScroll: true });
