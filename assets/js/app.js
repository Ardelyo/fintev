import { createPip } from './mascot.js';
import { areaChart, runwayChart, bubbles, sankey, jarSvg, sparkline } from './charts.js';
import { initAsk, ask, hasHistory, resetChat, focusInput } from './ask.js';
import {
  TODAY, DAY_OF_MONTH, DAYS_IN_MONTH, user, money, accounts, history, netWorth, nwChange, spending, events, shortDate,
  transactions, subscriptions, goals, goalStatus, SAFE_NOW, state, on, currentMood,
} from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 3000);
}

/* ---------- pips & mood ---------- */
const pips = {};
const SAY = {
  calm: () => `<b>${money(SAFE_NOW)}</b> is free to spend today. Rent is already set aside — breathe.`,
  happy: () => `You’ve got room today. <b>${money(SAFE_NOW)}</b> is free to spend.`,
  worried: () => 'A few things are running hot. Want me to take a look?',
  joy: () => `Done! I’ll move <b>${money(state.planAmount)}</b> on the 15th.`,
};

function applyMood() {
  const m = currentMood();
  document.body.dataset.mood = m.key;
  $('#h-home').innerHTML = m.line;
  $('#mood-sub').textContent = m.sub;
  $('#say').innerHTML = SAY[m.key]();
  Object.values(pips).forEach((p) => p.setMood(m.pip));
}

function renderHeader() {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  $('#hello').textContent = `Good ${part}, ${user.name}`;
  $('#today').textContent = TODAY.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/* ---------- home ---------- */
let nwRange = '6M';
function renderNW() {
  const whole = Math.floor(netWorth.value);
  const cents = Math.round((netWorth.value - whole) * 100).toString().padStart(2, '0');
  const num = $('#nw-num');
  num.innerHTML = `${money(whole)}<span class="cents">.${cents}</span>`;
  num.setAttribute('aria-label', money(netWorth.value, true));
  const ch = nwChange(nwRange);
  $('#nw-pct').innerHTML = `<svg><use href="#i-up"/></svg>${ch.pct.toFixed(1)}%`;
  $('#nw-delta').textContent = `+${money(ch.delta)} ${ch.label}`;
  $$('#nw-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.r === nwRange)));
  const n = { '3M': 4, '6M': 7, '1Y': 13 }[nwRange];
  areaChart($('#nw-chart'), {
    fullLabels: history.full.slice(-n), fit: true, height: window.innerWidth > 1080 ? 290 : 200, ticks: 2,
    series: [{ name: 'Net worth', color: '#B9A7FF', ink: '#5B41D6', values: history.total.slice(-n) }],
  });
}

function renderSafe() {
  $('#sts-num').textContent = money(SAFE_NOW);
  runwayChart($('#run-chart'), { height: 190 });
  $('#coming').innerHTML = events.slice(0, 3).map((e) => `<li><span class="c-d">${shortDate(e.d)}</span><span class="c-n">${esc(e.name)}</span><span class="c-a ${e.kind === 'income' ? 'in' : ''}">${e.kind === 'income' ? '+' : ''}${money(e.amount, true)}<small>${e.kind === 'income' ? 'incoming' : 'set aside ✓'}</small></span></li>`).join('');
}

function renderSpending() {
  const pct = (spending.spent / spending.budget) * 100, pace = (DAY_OF_MONTH / DAYS_IN_MONTH) * 100;
  $('#sp-num').textContent = money(spending.spent);
  $('#sp-sub').innerHTML = `of ${money(spending.budget)} in October · <b>${money(spending.budget - spending.spent)} left</b>`;
  $('#pace-fill').style.width = `${pct}%`;
  $('#pace-tick').style.left = `${pace}%`;
  const cap = $('#bub-cap');
  bubbles($('#bubbles'), {
    onSelect: (c) => {
      if (!c) { cap.textContent = 'Tap a blob to see its budget.'; cap.classList.remove('over'); return; }
      const over = c.amount > c.budget;
      cap.classList.toggle('over', over);
      cap.innerHTML = `<b>${c.name}</b> · ${money(c.amount)} of ${money(c.budget)} — ${over ? `${money(c.amount - c.budget)} over` : `${money(c.budget - c.amount)} left`}`;
    },
  });
}

function renderAccounts() {
  const total = netWorth.value;
  const alloc = $('#alloc');
  alloc.innerHTML = accounts.map((a) => `<span style="flex:${Math.max(a.balance / total, 0.1)};background:${a.color}" title="${esc(a.name)} ${Math.round((a.balance / total) * 100)}%"></span>`).join('');
  alloc.setAttribute('aria-label', 'Allocation: ' + accounts.map((a) => `${a.name} ${Math.round((a.balance / total) * 100)}%`).join(', '));
  $('#acct-list').innerHTML = accounts.map((a) => `<li class="acct">
    <i class="dot" style="background:${a.color}"></i>
    <div class="a-n"><p>${a.name}</p><small>${a.sub}</small></div>
    ${sparkline(history[a.id], a.ink)}
    <div class="a-v"><p>${money(a.balance, true)}</p><small class="${a.trend === 'down' ? 'dn' : ''}">${a.delta}</small></div></li>`).join('');
}

function renderJarRow() {
  $('#jar-row').innerHTML = goals.map((g) => {
    const st = goalStatus(g);
    return `<li><a href="#goals" class="jar-item" aria-label="${esc(g.name)}, ${Math.round((g.saved / g.target) * 100)} percent">
      ${jarSvg(g, { size: 78 })}
      <span class="j-t"><b>${g.name}</b><em>${Math.round((g.saved / g.target) * 100)}%</em><small class="${st.tone}">${st.text}</small></span></a></li>`;
  }).join('');
}

/* ---------- money ---------- */
let mRange = '1Y';
function renderMoneyChart() {
  const n = mRange === '1Y' ? 13 : 7;
  const sl = (a) => a.slice(-n);
  $$('#mn-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.r === mRange)));
  const ch = nwChange(mRange);
  $('#mn-sub').textContent = `Up ${money(ch.delta)} (${ch.pct.toFixed(1)}%) ${ch.label}. Slide across to read any month.`;
  areaChart($('#m-chart'), {
    fullLabels: sl(history.full), stacked: true, height: window.innerWidth > 1080 ? 340 : 240, ticks: 3,
    series: [
      { name: 'Brokerage', color: '#8CCBF5', ink: '#2F86C8', values: sl(history.brokerage) },
      { name: 'Savings', color: '#9BE3B8', ink: '#2E9F66', values: sl(history.savings) },
      { name: 'Checking', color: '#FFB39A', ink: '#D9633F', values: sl(history.checking) },
    ],
  });
  $('#m-legend').innerHTML = accounts.map((a) => `<li><i style="background:${a.color}"></i>${a.name} <b>${money(a.balance)}</b></li>`).join('');
}

function renderBudgets() {
  const pace = (DAY_OF_MONTH / DAYS_IN_MONTH) * 100;
  $('#bud-list').innerHTML = spending.categories.map((c) => {
    const pct = (c.amount / c.budget) * 100, over = c.amount > c.budget;
    const tone = over ? 'warn' : pct > pace + 6 ? 'tight' : 'ok';
    const label = over ? `${money(c.amount - c.budget)} over` : c.id === 'housing' ? 'Paid' : pct > pace + 6 ? 'A bit fast' : 'On pace';
    return `<li class="bud">
      <div class="bud-t"><span><i style="background:${c.color}"></i>${c.name}</span><b>${money(c.amount)} <small>of ${money(c.budget)}</small></b></div>
      <div class="meter"><span style="width:${Math.min(100, pct)}%;background:${c.color}"></span><i style="left:${pace}%"></i></div>
      <p class="bud-s ${tone}">${label}${over || tone === 'tight' ? '' : ` · ${money(c.budget - c.amount)} left`}</p></li>`;
  }).join('');
}

function renderSubs() {
  const live = subscriptions.filter((s) => !state.cancelled.has(s.id));
  const unused = live.filter((s) => s.unused);
  $('#ms-sub').textContent = unused.length ? `${unused.length} look forgotten — ${money(unused.reduce((a, s) => a + s.price, 0), true)} a month.` : 'Everything here is in use.';
  $('#sub-list').innerHTML = subscriptions.map((s) => {
    const gone = state.cancelled.has(s.id);
    return `<li class="${gone ? 'done' : ''}"><span class="sub-ico" style="--c:${s.unused ? '#FFD0C2' : '#CFEFD9'}">${s.name[0]}</span><span class="sub-n"><b>${s.name}</b><small class="${s.unused && !gone ? 'flag' : ''}">${gone ? 'Cancelled ✓' : s.note}</small></span><span class="sub-p">${money(s.price, true)}</span></li>`;
  }).join('');
}

const CAT_COLOR = Object.fromEntries(spending.categories.map((c) => [c.id, c.color]));
CAT_COLOR.income = '#9BE3B8'; CAT_COLOR.transfer = '#CDBFFF';
function renderTx() {
  $('#tx-list').innerHTML = transactions.map((t) => `<li class="tx"><span class="tx-i" style="background:${CAT_COLOR[t.cat] || '#ddd'}">${esc(t.name[0])}</span><span class="tx-n"><b>${esc(t.name)}</b><small>${t.date}</small></span><span class="tx-a ${t.amount > 0 ? 'in' : ''}">${t.amount > 0 ? '+' : ''}${money(t.amount, true)}</span></li>`).join('');
}

/* ---------- goals ---------- */
function renderGoals() {
  const sts = goals.map(goalStatus);
  const ok = sts.filter((s) => s.tone === 'ok').length;
  const nudge = goals.find((g, i) => sts[i].tone !== 'ok');
  $('#goals-sub').textContent = `${ok} of ${goals.length} goals are on track.${nudge ? ` ${nudge.name} could use a little nudge.` : ' Nothing needs your attention.'}`;
  $('#goal-grid').innerHTML = goals.map((g, i) => {
    const pct = Math.round((g.saved / g.target) * 100);
    return `<article class="card goal" style="--tint:${g.color}" data-id="${g.id}">
      <div class="goal-jar">${jarSvg(g, { size: 132 })}</div>
      <div class="goal-b">
        <h2>${g.name}</h2>
        <p class="muted">${g.note}</p>
        <p class="goal-amt"><b>${money(g.saved)}</b> of ${money(g.target)} <em>${pct}%</em></p>
        <p class="goal-st ${sts[i].tone}">${sts[i].text}</p>
        <div class="goal-act"><button class="btn btn-ink btn-sm" type="button" data-add="${g.id}"><svg class="i-xs"><use href="#i-plus"/></svg> $100</button><button class="btn btn-ghost btn-sm" type="button" data-q="${g.id === 'lisbon' ? 'Can I afford Lisbon in March?' : g.id === 'laptop' ? 'Can I buy a $900 laptop?' : 'What are my goals?'}">Ask Pip</button></div>
      </div></article>`;
  }).join('');
}

/* ---------- search ---------- */
function initSearch() {
  const overlay = $('#search'), input = $('#search-input'), list = $('#search-results');
  let opener = null;
  const index = [
    ...accounts.map((a) => ({ t: a.name, s: `Account · ${a.sub}`, v: money(a.balance), href: '#money' })),
    ...goals.map((g) => ({ t: g.name, s: `Goal · ${Math.round((g.saved / g.target) * 100)}% funded`, v: money(g.saved), href: '#goals' })),
    ...spending.categories.map((c) => ({ t: c.name, s: 'Spending', v: money(c.amount), href: '#money' })),
    ...subscriptions.map((s) => ({ t: s.name, s: 'Subscription', v: money(s.price, true), href: '#money' })),
    ...transactions.map((t) => ({ t: t.name, s: `Activity · ${t.date}`, v: money(t.amount, true), href: '#money' })),
  ];
  const render = () => {
    const q = input.value.trim(), ql = q.toLowerCase();
    const hits = index.filter((i) => ql && (i.t + ' ' + i.s).toLowerCase().includes(ql)).slice(0, 6);
    let html = q ? `<li><a href="#ask" data-ask="${esc(q)}"><span class="s-ic">✦</span><span><b>Ask Pip: “${esc(q)}”</b><small>Get an answer with visuals</small></span></a></li>` : '';
    html += hits.map((h) => `<li><a href="${h.href}"><span class="s-ic">•</span><span><b>${esc(h.t)}</b><small>${esc(h.s)}</small></span><em>${h.v}</em></a></li>`).join('');
    if (!q) html = ['Can I afford Lisbon in March?', 'Where did my paycheck go?', 'How am I doing this month?', 'What can I cancel?'].map((x) => `<li><a href="#ask" data-ask="${x}"><span class="s-ic">✦</span><span><b>${x}</b><small>Suggested</small></span></a></li>`).join('');
    list.innerHTML = html;
  };
  const open = () => { opener = document.activeElement; overlay.hidden = false; input.value = ''; render(); requestAnimationFrame(() => { overlay.classList.add('open'); input.focus(); }); };
  const close = () => { overlay.classList.remove('open'); overlay.hidden = true; opener?.focus?.(); };
  $('#search-btn').addEventListener('click', open);
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('a', list)?.click();
    if (e.key === 'ArrowDown') { e.preventDefault(); $('a', list)?.focus(); }
  });
  list.addEventListener('keydown', (e) => {
    const l = $$('a', list), i = l.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); l[Math.min(l.length - 1, i + 1)]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i <= 0 ? input : l[i - 1]).focus(); }
  });
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (a.dataset.ask) pending = a.dataset.ask;
    close();
  });
  $$('[data-close]', overlay).forEach((b) => b.addEventListener('click', close));
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('input, button, a', $('.search-panel'));
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay.hidden ? open() : close(); }
    if (e.key === '/' && overlay.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
}

/* ---------- router ---------- */
const VIEWS = ['home', 'ask', 'money', 'goals'];
const TITLES = { home: 'Today', ask: 'Ask Pip', money: 'Money', goals: 'Goals' };
let pending = null, first = true;
const LISBON = 'Can I afford Lisbon in March without touching my emergency fund?';

function moveIndicator() {
  const a = $('.nav a[aria-current="page"]'), ind = $('.nav-ind');
  if (!a) return;
  ind.style.setProperty('--x', `${a.offsetLeft}px`);
  ind.style.setProperty('--w', `${a.offsetWidth}px`);
}

function route() {
  let name = location.hash.slice(1);
  if (name === 'insights') name = 'money';
  if (!VIEWS.includes(name)) name = 'home';
  $$('.view').forEach((v) => (v.hidden = v.dataset.view !== name));
  $$('[data-nav]').forEach((a) => (a.dataset.nav === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.body.dataset.view = name;
  document.title = `${TITLES[name]} · Fintev`;
  moveIndicator();
  if (!first) { window.scrollTo({ top: 0, behavior: 'auto' }); $('#main').focus({ preventScroll: true }); }
  first = false;
  if (name === 'ask') {
    if (pending) { const q = pending; pending = null; ask(q); }
    else if (!hasHistory()) ask(LISBON);
    else focusInput();
  }
}

/* ---------- boot ---------- */
function boot() {
  renderHeader();
  pips.hero = createPip($('#hero-pip'), { mood: 'calm' });
  pips.brand = createPip($('#brand-pip'), { mood: 'calm', look: false, shadow: false });
  pips.nav = createPip($('#nav-pip'), { mood: 'calm', look: false, shadow: false });
  pips.goals = createPip($('#goals-pip'), { mood: 'calm' });

  renderNW(); renderSafe(); renderSpending(); renderAccounts(); renderJarRow();
  renderMoneyChart(); sankey($('#m-flow')); renderBudgets(); renderSubs(); renderTx(); renderGoals();
  initAsk({ toast });
  initSearch();
  applyMood();

  $('#nw-seg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { nwRange = b.dataset.r; renderNW(); } });
  $('#mn-seg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { mRange = b.dataset.r; renderMoneyChart(); } });
  $$('.seg').forEach((seg) => seg.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const bs = $$('button', seg), i = bs.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const nb = bs[(i + d + bs.length) % bs.length];
    nb.click(); nb.focus();
  }));

  $('#home-ask').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#home-q').value.trim(); pending = v || LISBON; $('#home-q').value = ''; location.hash = '#ask'; });
  // any element with data-q (outside the chat) starts a conversation
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b || b.closest('#chat-log')) return;
    pending = b.dataset.q;
    if (location.hash === '#ask') route(); else location.hash = '#ask';
  });
  $('#new-chat').addEventListener('click', () => { resetChat(); window.scrollTo({ top: 0 }); });

  $('#goal-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const g = goals.find((x) => x.id === b.dataset.add);
    const was = g.saved >= g.target;
    g.saved = Math.min(g.target, g.saved + 100);
    renderGoals(); renderJarRow();
    $(`[data-add="${g.id}"]`)?.focus();
    toast(g.saved >= g.target && !was ? `${g.name} is full — well done!` : `Moved $100 to ${g.name}`);
    if (g.saved >= g.target && !was) { state.celebrate = true; applyMood(); setTimeout(() => { state.celebrate = false; applyMood(); }, 6000); }
  });

  on('mood', applyMood);
  on('plan', () => { renderGoals(); renderJarRow(); });
  on('subs', renderSubs);

  window.addEventListener('hashchange', route);
  window.addEventListener('resize', moveIndicator);
  document.fonts?.ready.then(moveIndicator);
  route();
  document.documentElement.classList.add('ready');
}

boot();
