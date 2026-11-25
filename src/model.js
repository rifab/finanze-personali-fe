export const accountTypes = {
  current: "Conto corrente",
  cash: "Contanti",
  savings: "Risparmio",
  card: "Carta",
  other: "Altro"
};

export const investmentTypes = {
  brokerage: "Conto titoli",
  pension: "Fondo pensione",
  crypto: "Criptovalute",
  managed: "Gestione patrimoniale",
  crowdfunding: "Crowdfunding",
  other: "Altro investimento"
};

export const scheduleFrequencyLabels = {
  none: "Una volta",
  daily: "Ogni giorno",
  weekly: "Ogni settimana",
  monthly: "Ogni mese",
  annual: "Ogni anno"
};

export const money = (value) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
export const dateLabel = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
};
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const uid = (prefix = "item") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function accountBalance(account, transactions) {
  return (Number(account.initialBalance) || 0) + transactions
    .filter((item) => item.accountId === account.id)
    .reduce((total, item) => total + (Number(item.amount) || 0), 0);
}

const investmentMovementType = (transaction) => {
  const paymentType = String(transaction?.paymentType || "").toUpperCase();
  const category = String(transaction?.category || "").toLocaleLowerCase("it");
  if (paymentType === "BUY" || category === "investimenti · acquisto") return "buy";
  if (paymentType === "SELL" || category === "investimenti · vendita") return "sell";
  return "";
};

export function investmentTransactionsForAccount(accountId, transactions) {
  return transactions
    .filter((item) => item.accountId === accountId && investmentMovementType(item))
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || String(b.id || "").localeCompare(String(a.id || "")));
}

export function investmentActivity(accountId, transactions) {
  const rows = investmentTransactionsForAccount(accountId, transactions);
  const buys = rows.filter((item) => investmentMovementType(item) === "buy");
  const sells = rows.filter((item) => investmentMovementType(item) === "sell");
  const purchases = buys.reduce((total, item) => total + Math.abs(Number(item.amount) || 0), 0);
  const sales = sells.reduce((total, item) => total + Math.abs(Number(item.amount) || 0), 0);
  const dates = rows.map((item) => item.date).filter(Boolean).sort();
  return {
    purchases,
    sales,
    netInvested: purchases - sales,
    buyCount: buys.length,
    sellCount: sells.length,
    firstDate: dates[0] || "",
    lastDate: dates.at(-1) || ""
  };
}

export function investmentSummary(accounts, transactions) {
  const investmentAccounts = accounts.filter((account) => account.isInvestment);
  const activities = investmentAccounts.map((account) => investmentActivity(account.id, transactions));
  const purchases = activities.reduce((total, activity) => total + activity.purchases, 0);
  const sales = activities.reduce((total, activity) => total + activity.sales, 0);
  const investedValue = purchases - sales;
  const liquidBalance = investmentAccounts.reduce((total, account) => total + accountBalance(account, transactions), 0);
  return { count: investmentAccounts.length, purchases, sales, investedValue, liquidBalance, total: investedValue + liquidBalance };
}

export function sortAccountsByImportance(accounts) {
  const rank = (account) => {
    const name = String(account?.name || "").trim().toLocaleLowerCase("it");
    if (name.includes("conto corrente postale")) return 0;
    if (name.includes("libretto postale")) return 2;
    return 1;
  };
  return [...accounts].sort((a, b) => rank(a) - rank(b) || String(a.name || "").localeCompare(String(b.name || ""), "it"));
}

export function financeSummary(accounts, transactions, month) {
  const inMonth = transactions.filter((item) => item.date?.startsWith(month));
  const ordinary = inMonth.filter((item) => !item.isTransfer);
  const historicalInvestments = investmentSummary(accounts, transactions).investedValue;
  return {
    balance: accounts.reduce((total, account) => total + accountBalance(account, transactions), 0) + historicalInvestments,
    income: ordinary.filter((item) => item.kind === "income").reduce((total, item) => total + Math.abs(Number(item.amount) || 0), 0),
    expenses: ordinary.filter((item) => item.kind === "expense").reduce((total, item) => total + Math.abs(Number(item.amount) || 0), 0),
    count: inMonth.length
  };
}

export function categoryTotals(transactions) {
  const totals = new Map();
  for (const item of transactions) {
    if (item.kind !== "expense" || item.isTransfer) continue;
    totals.set(item.category, (totals.get(item.category) || 0) + Math.abs(Number(item.amount) || 0));
  }
  return [...totals.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, "it"));
}

const dateParts = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2] ? parts : null;
};
const isoDate = (date) => date.toISOString().slice(0, 10);
const addCalendarDays = (value, days) => {
  const parts = dateParts(value);
  return parts ? isoDate(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days))) : "";
};
const occurrenceDate = (startDate, frequency, index) => {
  const parts = dateParts(startDate);
  if (!parts) return "";
  const [year, month, day] = parts;
  if (frequency === "daily") return addCalendarDays(startDate, index);
  if (frequency === "weekly") return addCalendarDays(startDate, index * 7);
  const interval = frequency === "annual" ? 12 : 1;
  const targetIndex = month - 1 + index * interval;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return isoDate(new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay))));
};

export function paymentScheduleOccurrences(schedule, throughDate) {
  if (!dateParts(schedule?.startDate) || !dateParts(throughDate) || schedule.startDate > throughDate) return [];
  const frequency = schedule.frequency || "none";
  const maximum = frequency === "none" ? 1 : schedule.endMode === "count" ? Math.max(0, Number(schedule.occurrenceCount) || 0) : 100000;
  const dates = [];
  for (let index = 0; index < maximum; index += 1) {
    const date = occurrenceDate(schedule.startDate, frequency, index);
    if (!date || date > throughDate || (schedule.endMode === "date" && schedule.endDate && date > schedule.endDate)) break;
    dates.push(date);
  }
  return dates;
}

export function paymentScheduleState(schedule, referenceDate) {
  const horizon = addCalendarDays(referenceDate, 370);
  const occurrences = paymentScheduleOccurrences(schedule, horizon);
  const pending = occurrences.filter((date) => !schedule.completedThrough || date > schedule.completedThrough);
  const dueDates = pending.filter((date) => date <= referenceDate);
  const nextDate = pending.find((date) => date > referenceDate) || "";
  return {
    dueDates,
    nextDate,
    completed: dueDates.length === 0 && !nextDate,
    overdue: dueDates.filter((date) => date < referenceDate).length,
    dueToday: dueDates.includes(referenceDate)
  };
}

export function duePaymentCount(schedules, referenceDate) {
  return schedules.reduce((total, schedule) => total + paymentScheduleState(schedule, referenceDate).dueDates.length, 0);
}

