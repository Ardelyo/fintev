// Demo data for Fintev. All figures are illustrative and internally consistent:
// accounts sum to net worth, categories sum to spent, etc.

export const user = { name: 'John', initials: 'J' };

export const accounts = [
  { id: 'brokerage', name: 'Brokerage', sub: 'Index portfolio', balance: 197390.28, delta: '+1.9% · 1M', trend: 'up', color: 'var(--acc-1)' },
  { id: 'savings', name: 'High-yield savings', sub: '4.6% APY', balance: 42300.0, delta: '+$15.80', trend: 'up', color: 'var(--acc-2)' },
  { id: 'checking', name: 'Everyday checking', sub: '•• 4021', balance: 8920.13, delta: '−$212 today', trend: 'down', color: 'var(--acc-3)' },
];

export const netWorth = {
  value: accounts.reduce((s, a) => s + a.balance, 0),
  syncedMinutes: 2,
  ranges: {
    '1W': { pct: 0.4, delta: 982, label: 'this week' },
    '1M': { pct: 1.4, delta: 3412, label: 'this month' },
    '1Y': { pct: 12.8, delta: 28214, label: 'this year' },
  },
};

// Safe-to-spend forecast: key points (day offset from today -> amount).
// Peaks line up with paydays / refunds; troughs with rent and card payments.
export const safeToSpend = {
  today: 1240,
  horizon: 30,
  keys: [
    [0, 1240], [3, 820], [6, 1360], [9, 560], [13, 1580], [16, 640],
    [20, 1290], [23, 520], [26, 1420], [28, 980], [30, 760],
  ],
};

export const spending = {
  budget: 5200,
  categories: [
    { id: 'housing', name: 'Housing', amount: 1850, color: 'var(--cat-1)' },
    { id: 'food', name: 'Food & dining', amount: 920, color: 'var(--cat-2)' },
    { id: 'shopping', name: 'Shopping', amount: 860, color: 'var(--cat-3)' },
    { id: 'bills', name: 'Transport & bills', amount: 590, color: 'var(--cat-4)' },
  ],
};
spending.spent = spending.categories.reduce((s, c) => s + c.amount, 0);

export const cashflow = [
  { m: 'Jun', income: 7400, spend: 4980 },
  { m: 'Jul', income: 7400, spend: 5310 },
  { m: 'Aug', income: 7650, spend: 4620 },
  { m: 'Sep', income: 7400, spend: 5050 },
  { m: 'Oct', income: 7400, spend: 4870 },
  { m: 'Nov', income: 7400, spend: 4220 },
];

export const transactions = [
  { date: 'Nov 6', name: 'Blue Bottle Coffee', cat: 'food', amount: -6.5, acct: 'checking' },
  { date: 'Nov 6', name: 'Transfer to savings', cat: 'transfer', amount: -205.5, acct: 'checking' },
  { date: 'Nov 5', name: 'Payroll · Northwind', cat: 'income', amount: 3700, acct: 'checking' },
  { date: 'Nov 4', name: 'Lyft', cat: 'bills', amount: -18.4, acct: 'checking' },
  { date: 'Nov 3', name: 'Whole Foods Market', cat: 'food', amount: -86.12, acct: 'checking' },
  { date: 'Nov 2', name: 'Streamly', cat: 'bills', amount: -15.99, acct: 'checking', flag: 'Unused 74 days' },
  { date: 'Nov 1', name: 'Rent · Harbor Lofts', cat: 'housing', amount: -1850, acct: 'checking' },
  { date: 'Nov 1', name: 'CloudBox Pro', cat: 'bills', amount: -24.99, acct: 'checking', flag: 'Unused 51 days' },
  { date: 'Oct 31', name: 'Apple Store', cat: 'shopping', amount: -129, acct: 'checking' },
  { date: 'Oct 30', name: 'Shell', cat: 'bills', amount: -42.1, acct: 'checking' },
];

export const goals = [
  { id: 'emergency', name: 'Emergency fund', saved: 26400, target: 30000, note: '6.2 months of expenses', color: 'var(--acc-2)' },
  { id: 'lisbon', name: 'Lisbon trip', saved: 2180, target: 2840, note: 'March 14', color: 'var(--cat-3)' },
  { id: 'laptop', name: 'New laptop', saved: 960, target: 2400, note: 'by June', color: 'var(--acc-1)' },
  { id: 'home', name: 'Home down payment', saved: 18500, target: 90000, note: 'by 2030', color: 'var(--cat-1)' },
];

// Trip scenario used by "Ask".
export const scenario = {
  title: 'Lisbon, March 14',
  budget: 2840,
  saved: 2180,
  // Contributions land on the 15th of each month before the trip.
  months: ['Nov', 'Dec', 'Jan', 'Feb'],
  monthsLong: ['November', 'December', 'January', 'February'],
  recommended: 180,
  max: 600,
};
