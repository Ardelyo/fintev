// Demo data for Fintev. Everything is illustrative but internally consistent:
// accounts sum to net worth, categories sum to spent, the paycheck flow sums to income.
// The story is anchored to a fixed "today" so the numbers always make sense.

export const TODAY = new Date(2026, 9, 26); // Monday, 26 Oct 2026
export const DAY_OF_MONTH = 26;
export const DAYS_IN_MONTH = 31;
export const dateAt = (offset) => new Date(2026, 9, 26 + offset);
export const shortDate = (offset) => dateAt(offset).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const user = { name: 'John' };

export const money = (n, cents = false) =>
  (n < 0 ? '−' : '') +
  '$' +
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

/* ---------- accounts & net worth ---------- */
export const accounts = [
  { id: 'brokerage', name: 'Brokerage', sub: 'Index portfolio', balance: 197390.28, delta: '+1.9% · 1M', trend: 'up', color: '#8CCBF5', ink: '#2F86C8' },
  { id: 'savings', name: 'High-yield savings', sub: '4.6% APY', balance: 42300.0, delta: '+$15.80', trend: 'up', color: '#9BE3B8', ink: '#2E9F66' },
  { id: 'checking', name: 'Everyday checking', sub: '•• 4021', balance: 8920.13, delta: '−$212 today', trend: 'down', color: '#FFB39A', ink: '#D9633F' },
];

export const history = {
  labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  brokerage: [171000, 168400, 172900, 176800, 174200, 181500, 185200, 183900, 188300, 190100, 192400, 194600, 197390.28],
  savings: [29000, 30000, 31100, 32200, 33200, 34300, 35400, 36500, 37500, 38500, 39600, 40900, 42300],
  checking: [6200, 7800, 6900, 8300, 7100, 9100, 7600, 8800, 8200, 9400, 7700, 9698.41, 8920.13],
};
history.full = history.labels.map((_, i) => new Date(2025, 9 + i, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
history.total = history.brokerage.map((v, i) => v + history.savings[i] + history.checking[i]);

export const netWorth = { value: accounts.reduce((s, a) => s + a.balance, 0) };
export const nwRanges = {
  '1M': { n: 2, label: 'this month' },
  '3M': { n: 4, label: 'in 3 months' },
  '6M': { n: 7, label: 'in 6 months' },
  '1Y': { n: 13, label: 'this year' },
};
export function nwChange(range) {
  const n = nwRanges[range].n;
  const first = history.total[history.total.length - n];
  const last = history.total[history.total.length - 1];
  return { delta: last - first, pct: ((last - first) / first) * 100, label: nwRanges[range].label };
}

/* ---------- spending ---------- */
export const spending = {
  budget: 5200,
  categories: [
    { id: 'housing', name: 'Housing', amount: 1850, budget: 1850, group: 'needs', color: '#CDBFFF', ink: '#6F55E0', weekly: [1850, 0, 0, 0], last: 1850 },
    { id: 'food', name: 'Food & dining', amount: 920, budget: 1000, group: 'wants', color: '#A8EBC9', ink: '#2E9F66', weekly: [260, 240, 215, 205], last: 1010 },
    { id: 'shopping', name: 'Shopping', amount: 640, budget: 600, group: 'wants', color: '#FFB89E', ink: '#D9633F', weekly: [90, 310, 150, 90], last: 520 },
    { id: 'bills', name: 'Bills & transport', amount: 460, budget: 650, group: 'needs', color: '#9ED8F7', ink: '#2F86C8', weekly: [120, 110, 130, 100], last: 480 },
    { id: 'fun', name: 'Fun', amount: 350, budget: 1100, group: 'wants', color: '#FFE48E', ink: '#B58A00', weekly: [60, 40, 180, 70], last: 410 },
  ],
};
spending.spent = spending.categories.reduce((s, c) => s + c.amount, 0); // 4,220

// Where this month's paycheck goes (sums to income).
export const income = 7400;
export const flow = {
  groups: [
    { id: 'needs', name: 'Needs', color: '#8CCBF5' },
    { id: 'wants', name: 'Wants', color: '#FFA98A' },
    { id: 'saved', name: 'Saved', color: '#6BD9A4' },
    { id: 'left', name: 'Left over', color: '#FFD960' },
  ],
  saved: [
    { id: 'invest', name: 'Investing', amount: 1400 },
    { id: 'emergency', name: 'Emergency fund', amount: 720 },
    { id: 'trip', name: 'Lisbon trip', amount: 180 },
  ],
};
flow.saved.total = flow.saved.reduce((s, c) => s + c.amount, 0); // 2,300
flow.left = income - spending.spent - flow.saved.total; // 880

/* ---------- activity, recurring ---------- */
export const transactions = [
  { date: 'Oct 26', name: 'Blue Bottle Coffee', cat: 'food', amount: -6.5 },
  { date: 'Oct 26', name: 'Transfer to savings', cat: 'transfer', amount: -205.5 },
  { date: 'Oct 25', name: 'Whole Foods Market', cat: 'food', amount: -86.12 },
  { date: 'Oct 24', name: 'Lyft', cat: 'bills', amount: -18.4 },
  { date: 'Oct 23', name: 'Apple Store', cat: 'shopping', amount: -129 },
  { date: 'Oct 22', name: 'Cinema Lumière', cat: 'fun', amount: -32 },
  { date: 'Oct 20', name: 'Shell', cat: 'bills', amount: -42.1 },
  { date: 'Oct 16', name: 'Payroll · Northwind', cat: 'income', amount: 3700 },
];

export const subscriptions = [
  { id: 'streamly', name: 'Streamly', price: 15.99, note: 'Last opened 74 days ago', unused: true },
  { id: 'cloudbox', name: 'CloudBox Pro', price: 24.99, note: 'Last opened 51 days ago', unused: true },
  { id: 'tunebox', name: 'Tunebox', price: 11.99, note: 'Played every day', unused: false },
  { id: 'atlas', name: 'Atlas Fitness', price: 49, note: 'Visited 2× a week', unused: false },
];

// Upcoming money events. Bills are already "set aside", so they never dent safe-to-spend.
export const events = [
  { d: 2, name: 'Streamly', amount: -15.99, kind: 'bill', flag: 'Unused' },
  { d: 4, name: 'Payday · Northwind', amount: 3700, kind: 'income' },
  { d: 6, name: 'Rent · Harbor Lofts', amount: -1850, kind: 'bill' },
  { d: 6, name: 'CloudBox Pro', amount: -24.99, kind: 'bill', flag: 'Unused' },
  { d: 10, name: 'Credit card', amount: -820, kind: 'bill' },
  { d: 14, name: 'Electric & internet', amount: -118, kind: 'bill' },
  { d: 18, name: 'Payday · Northwind', amount: 3700, kind: 'income' },
  { d: 20, name: 'Car insurance', amount: -164, kind: 'bill' },
];

/* ---------- safe to spend ---------- */
export const PAYDAYS = [4, 18];
export const SAFE_NOW = 1240;
export const DAILY_BURN = 52;
const PAY_TOPUP = 880; // the part of each paycheck that is free to spend
export const HORIZON = 30;
export const runway = [SAFE_NOW];
for (let d = 1; d <= HORIZON; d++) runway.push(runway[d - 1] - DAILY_BURN + (PAYDAYS.includes(d) ? PAY_TOPUP : 0));
export const BUFFER = 300; // lowest comfortable level when judging a purchase

/** Judge a purchase against the runway. */
export function judgePurchase(price) {
  const after = runway.map((v) => v - price);
  let minI = 0;
  after.forEach((v, i) => { if (v < after[minI]) minI = i; });
  const low = after[minI];
  let verdict = 'ok';
  if (low < 0) verdict = 'no';
  else if (low < BUFFER + 200) verdict = 'tight';
  // earliest day a purchase would keep the rest of the month above the buffer
  let when = null;
  for (let d = 0; d <= HORIZON; d++) {
    const m = Math.min(...runway.slice(d)) - price;
    if (m >= BUFFER) { when = d; break; }
  }
  return { low, lowDay: minI, verdict, when };
}

/* ---------- goals ---------- */
export const goals = [
  { id: 'emergency', name: 'Emergency fund', saved: 26400, target: 30000, note: '6.2 months of expenses', monthly: 720, color: '#9BE3B8', ink: '#2E9F66' },
  { id: 'lisbon', name: 'Lisbon trip', saved: 2180, target: 2840, note: 'Flying Mar 14', monthly: 180, color: '#FFD0E6', ink: '#D14C93' },
  { id: 'laptop', name: 'New laptop', saved: 960, target: 2400, note: 'Aiming for June', monthly: 120, monthsLeft: 8, color: '#CDBFFF', ink: '#6F55E0' },
  { id: 'home', name: 'Home down payment', saved: 18500, target: 90000, note: 'Target 2030', monthly: 600, monthsLeft: 50, color: '#9ED8F7', ink: '#2F86C8' },
];

export const trip = {
  target: 2840,
  saved: 2180,
  // contributions land on the 15th: Nov, Dec, Jan, Feb — then the trip on Mar 14
  months: ['Nov', 'Dec', 'Jan', 'Feb'],
  monthsLong: ['November', 'December', 'January', 'February'],
  recommended: 180,
  max: 600,
};

/* ---------- tiny store ---------- */
export const state = { planAmount: trip.recommended, planApproved: false, cancelled: new Set(), celebrate: false };
const bus = {};
export const on = (e, fn) => ((bus[e] ||= []).push(fn), fn);
export const emit = (e, p) => (bus[e] || []).forEach((fn) => fn(p));

/* ---------- mood ---------- */
export function currentMood() {
  const elapsed = DAY_OF_MONTH / DAYS_IN_MONTH;
  const pace = spending.spent / spending.budget / elapsed;
  const over = spending.categories.filter((c) => c.amount > c.budget);
  const watch = over.length ? `${over[0].name} is ${money(over[0].amount - over[0].budget)} over budget.` : 'Nothing is over budget.';
  if (state.celebrate) return { key: 'joy', pip: 'joy', line: 'That’s a <em>win</em>.', sub: 'Plan approved — future you says thanks.', pace };
  if (pace > 1.12) return { key: 'worried', pip: 'worried', line: 'Let’s go <em>gently</em> this week.', sub: `You’re spending a little faster than the month. ${watch}`, pace };
  if (pace < 0.88) return { key: 'happy', pip: 'happy', line: 'Today looks <em>bright</em>.', sub: `You’re spending slower than the month. ${watch}`, pace };
  return { key: 'calm', pip: 'calm', line: 'Money feels <em>calm</em> today.', sub: `You’re right on pace this month. ${watch}`, pace };
}

/** Plain-language status for a goal. */
export function goalStatus(g) {
  const remaining = g.target - g.saved;
  if (remaining <= 0) return { tone: 'ok', text: 'Done — enjoy it!' };
  if (g.id === 'lisbon') {
    const per = state.planAmount, need = per > 0 ? Math.ceil(remaining / per) : Infinity;
    return need <= 4 ? { tone: 'ok', text: `On track · ready by ${trip.months[need - 1]} 15` } : { tone: 'warn', text: `Needs ${money(Math.ceil(remaining / 4 / 10) * 10)}/mo` };
  }
  if (g.monthsLeft) {
    const need = remaining / g.monthsLeft;
    return g.monthly >= need * 0.97 ? { tone: 'ok', text: 'On track' } : { tone: need > g.monthly * 1.6 ? 'warn' : 'tight', text: `Needs ${money(Math.ceil(need / 10) * 10)}/mo · now ${money(g.monthly)}` };
  }
  const m = Math.ceil(remaining / g.monthly);
  return { tone: 'ok', text: `On track · full in ${m} months` };
}
