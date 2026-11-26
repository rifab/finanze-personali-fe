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
export function chartScale(value, intervals = 4) {
  const maximum = Math.max(Number(value) || 0, 1);
  const rawStep = maximum / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const niceStep = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 2.5 ? 2.5 : normalizedStep <= 5 ? 5 : 10;
  const step = niceStep * magnitude;
  const max = Math.ceil(maximum / step) * step;
  const tickCount = Math.round(max / step);
  return { max, ticks: Array.from({ length: tickCount + 1 }, (_, index) => max - step * index) };
}
export const dateLabel = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
};
export function duplicateTransaction(transaction) {
  const { id, createdAt, updatedAt, importId, sourceId, ...copy } = transaction;
  return { ...copy, source: "manual", sourceId: "" };
}
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const uid = (prefix = "item") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function normalizePaymentSchedule(schedule = {}) {
  const numericAmount = Number(schedule.amount) || 0;
  const kind = schedule.kind === "income" || (!schedule.kind && numericAmount > 0) ? "income" : "expense";
  const absoluteAmount = Math.abs(numericAmount);
  const numericInterval = Number(schedule.recurrenceInterval);
  const recurrenceInterval = Number.isInteger(numericInterval) && numericInterval >= 1 && numericInterval <= 1000 ? numericInterval : 1;
  const scheduleType = schedule.scheduleType === "investment" ? "investment" : "payment";
  const monthDays = [...new Set((Array.isArray(schedule.monthDays) ? schedule.monthDays : [])
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 31))].sort((a, b) => a - b);
  return {
    ...schedule,
    scheduleType,
    kind,
    amount: absoluteAmount === 0 ? 0 : kind === "income" ? absoluteAmount : -absoluteAmount,
    currency: "EUR",
    recurrenceInterval,
    product: scheduleType === "investment" ? String(schedule.product || "") : "",
    monthDays: scheduleType === "investment" ? monthDays : []
  };
}

export function scheduledTransactionDraft(schedule, dueDate) {
  return {
    accountId: schedule.accountId,
    date: dueDate,
    kind: schedule.kind,
    amount: Number(schedule.amount) || 0,
    currency: "EUR",
    category: schedule.category,
    note: schedule.note || "",
    payee: schedule.name,
    labels: [],
    isTransfer: false,
    paymentType: "",
    source: "manual",
    sourceId: ""
  };
}

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

export const isInvestmentTransaction = (transaction) => Boolean(investmentMovementType(transaction));

export function investmentTransactionsForAccount(accountId, transactions) {
  return transactions
    .filter((item) => item.accountId === accountId && investmentMovementType(item))
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || String(b.id || "").localeCompare(String(a.id || "")));
}

export function filterInvestmentTransactions(transactions, { type = "", product = "" } = {}) {
  const query = product.trim().toLocaleLowerCase("it");
  return transactions.filter((item) => {
    const name = String(item.payee || item.note || "").toLocaleLowerCase("it");
    return (!type || investmentMovementType(item) === type) && (!query || name.includes(query));
  });
}

export function investmentTransactionDraft(transaction, { duplicate = false } = {}) {
  const source = duplicate ? duplicateTransaction(transaction) : { ...transaction };
  return {
    ...source,
    type: investmentMovementType(transaction) || "buy",
    amount: Math.abs(Number(transaction?.amount) || 0),
    product: String(transaction?.payee || transaction?.note || "")
  };
}

export function investmentProductSummary(accountId, transactions) {
  const products = new Map();
  investmentTransactionsForAccount(accountId, transactions).forEach((transaction) => {
    const label = String(transaction.payee || transaction.note || "Strumento non indicato").trim() || "Strumento non indicato";
    const key = label.toLocaleLowerCase("it");
    const current = products.get(key) || { id: key, label, purchases: 0, sales: 0 };
    const amount = Math.abs(Number(transaction.amount) || 0);
    if (investmentMovementType(transaction) === "buy") current.purchases += amount;
    else current.sales += amount;
    products.set(key, current);
  });
  return [...products.values()]
    .map((item) => ({ ...item, net: item.purchases - item.sales }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.label.localeCompare(b.label, "it"));
}

export function createInvestmentTransaction(accountId, { type, date, amount, product, note }) {
  const buy = type === "buy";
  const absoluteAmount = Math.abs(Number(amount) || 0);
  return {
    accountId,
    date,
    kind: buy ? "expense" : "income",
    amount: buy ? -absoluteAmount : absoluteAmount,
    category: buy ? "Investimenti · Acquisto" : "Investimenti · Vendita",
    payee: String(product || "").trim(),
    note,
    isTransfer: true,
    currency: "EUR",
    labels: [],
    paymentType: buy ? "BUY" : "SELL",
    source: "manual",
    sourceId: ""
  };
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

export function filterTransactionsByPeriod(transactions, { month = "", from = "", to = "" } = {}) {
  return transactions.filter((item) => {
    const date = String(item.date || "");
    return (!month || date.startsWith(month)) && (!from || (date && date >= from)) && (!to || (date && date <= to));
  });
}

const shortMonths = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export function cashFlowPeriods(transactions, period, { includeTransfers = false } = {}) {
  const match = String(period || "").match(/^(\d{4})(?:-(\d{2}))?$/);
  if (!match) return [];
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : 0;
  if (match[2] && (month < 1 || month > 12)) return [];
  const length = month ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 12;
  return Array.from({ length }, (_, index) => {
    const number = index + 1;
    const key = month
      ? `${match[1]}-${match[2]}-${String(number).padStart(2, "0")}`
      : `${match[1]}-${String(number).padStart(2, "0")}`;
    const rows = transactions.filter((item) => (includeTransfers || !item.isTransfer) && (month ? item.date === key : item.date?.startsWith(key)));
    return {
      key,
      label: month ? String(number) : shortMonths[index],
      income: rows.filter((item) => item.kind === "income").reduce((total, item) => total + Math.abs(Number(item.amount) || 0), 0),
      expenses: rows.filter((item) => item.kind === "expense").reduce((total, item) => total + Math.abs(Number(item.amount) || 0), 0)
    };
  });
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
const occurrenceDate = (startDate, frequency, recurrenceInterval, index) => {
  const parts = dateParts(startDate);
  if (!parts) return "";
  const [year, month, day] = parts;
  if (frequency === "daily") return addCalendarDays(startDate, index * recurrenceInterval);
  if (frequency === "weekly") return addCalendarDays(startDate, index * 7 * recurrenceInterval);
  const monthInterval = (frequency === "annual" ? 12 : 1) * recurrenceInterval;
  const targetIndex = month - 1 + index * monthInterval;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return isoDate(new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay))));
};

const monthlyDayOccurrences = (schedule, throughDate, maximum, recurrenceInterval) => {
  const [startYear, startMonth] = dateParts(schedule.startDate);
  const monthDays = [...new Set(schedule.monthDays.map(Number))].filter((day) => Number.isInteger(day) && day >= 1 && day <= 31).sort((a, b) => a - b);
  const dates = [];
  for (let period = 0; period < 100000 && dates.length < maximum; period += 1) {
    const targetIndex = startMonth - 1 + period * recurrenceInterval;
    const targetYear = startYear + Math.floor(targetIndex / 12);
    const targetMonth = ((targetIndex % 12) + 12) % 12;
    const monthStart = isoDate(new Date(Date.UTC(targetYear, targetMonth, 1)));
    if (monthStart > throughDate) break;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    for (const configuredDay of monthDays) {
      const date = isoDate(new Date(Date.UTC(targetYear, targetMonth, Math.min(configuredDay, lastDay))));
      if (date < schedule.startDate || dates.at(-1) === date) continue;
      if (date > throughDate || (schedule.endMode === "date" && schedule.endDate && date > schedule.endDate)) continue;
      dates.push(date);
      if (dates.length >= maximum) break;
    }
  }
  return dates;
};

export function paymentScheduleOccurrences(schedule, throughDate) {
  if (!dateParts(schedule?.startDate) || !dateParts(throughDate) || schedule.startDate > throughDate) return [];
  const frequency = schedule.frequency || "none";
  const recurrenceInterval = Math.max(1, Math.min(1000, Number(schedule.recurrenceInterval) || 1));
  const maximum = frequency === "none" ? 1 : schedule.endMode === "count" ? Math.max(0, Number(schedule.occurrenceCount) || 0) : 100000;
  if (frequency === "monthly" && Array.isArray(schedule.monthDays) && schedule.monthDays.length) {
    return monthlyDayOccurrences(schedule, throughDate, maximum, recurrenceInterval);
  }
  const dates = [];
  for (let index = 0; index < maximum; index += 1) {
    const date = occurrenceDate(schedule.startDate, frequency, recurrenceInterval, index);
    if (!date || date > throughDate || (schedule.endMode === "date" && schedule.endDate && date > schedule.endDate)) break;
    dates.push(date);
  }
  return dates;
}

export function paymentScheduleState(schedule, referenceDate) {
  const recurrenceInterval = Math.max(1, Math.min(1000, Number(schedule.recurrenceInterval) || 1));
  const horizonDays = schedule.frequency === "annual" ? 366 * (recurrenceInterval + 1)
    : schedule.frequency === "monthly" ? 32 * (recurrenceInterval + 1)
      : schedule.frequency === "weekly" ? 7 * (recurrenceInterval + 1)
        : schedule.frequency === "daily" ? recurrenceInterval + 1
          : 370;
  const horizon = addCalendarDays(referenceDate, horizonDays);
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

