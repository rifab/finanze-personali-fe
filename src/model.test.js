import test from "node:test";
import assert from "node:assert/strict";
import { accountBalance, categoryTotals, duePaymentCount, financeSummary, investmentActivity, investmentSummary, investmentTransactionsForAccount, paymentScheduleOccurrences, paymentScheduleState, sortAccountsByImportance } from "./model.js";

const accounts = [{ id: "a", initialBalance: 100 }, { id: "b", initialBalance: 20 }];
const transactions = [
  { id: "1", accountId: "a", date: "2026-11-02", kind: "expense", amount: -30, category: "Casa", isTransfer: false },
  { id: "2", accountId: "a", date: "2026-11-03", kind: "income", amount: 80, category: "Stipendio", isTransfer: false },
  { id: "3", accountId: "a", date: "2026-11-04", kind: "expense", amount: -10, category: "Trasferimenti", isTransfer: true },
  { id: "4", accountId: "b", date: "2026-11-04", kind: "income", amount: 10, category: "Trasferimenti", isTransfer: true },
  { id: "5", accountId: "b", date: "2026-10-04", kind: "expense", amount: -5, category: "Casa", isTransfer: false }
];

test("calcola il saldo di ogni conto dagli importi firmati", () => {
  assert.equal(accountBalance(accounts[0], transactions), 140);
  assert.equal(accountBalance(accounts[1], transactions), 25);
});

test("ricostruisce acquisti, vendite e capitale netto degli investimenti", () => {
  const investmentAccounts = [
    { id: "broker", initialBalance: 500, isInvestment: true },
    { id: "bank", initialBalance: 1000, isInvestment: false }
  ];
  const rows = [
    { accountId: "broker", date: "2026-08-04", amount: -101, paymentType: "BUY", category: "Investimenti · Acquisto" },
    { accountId: "broker", date: "2026-09-17", amount: 24, paymentType: "SELL", category: "Investimenti · Vendita" },
    { accountId: "broker", date: "2026-10-01", amount: 2, paymentType: "INTEREST_PAYMENT", category: "Interessi" }
  ];
  assert.deepEqual(investmentActivity("broker", rows), { purchases: 101, sales: 24, netInvested: 77, buyCount: 1, sellCount: 1, firstDate: "2026-08-04", lastDate: "2026-09-17" });
  assert.deepEqual(investmentTransactionsForAccount("broker", rows).map((item) => item.date), ["2026-09-17", "2026-08-04"]);
  assert.deepEqual(investmentSummary(investmentAccounts, rows), { count: 1, purchases: 101, sales: 24, investedValue: 77, liquidBalance: 425, total: 502 });
  assert.equal(financeSummary(investmentAccounts, rows, "2026-11").balance, 1502);
});

test("ordina prima il conto corrente postale e ultimo il libretto postale", () => {
  const ordered = sortAccountsByImportance([{ name: "Libretto postale" }, { name: "Contanti" }, { name: "Conto corrente postale" }, { name: "Carta" }]);
  assert.deepEqual(ordered.map((item) => item.name), ["Conto corrente postale", "Carta", "Contanti", "Libretto postale"]);
});

test("il riepilogo mensile esclude i trasferimenti da entrate e uscite", () => {
  assert.deepEqual(financeSummary(accounts, transactions, "2026-11"), { balance: 165, income: 80, expenses: 30, count: 4 });
});

test("aggrega le sole uscite ordinarie per categoria", () => {
  assert.deepEqual(categoryTotals(transactions), [{ label: "Casa", amount: 35 }]);
});

test("genera ricorrenze giornaliere e settimanali", () => {
  assert.deepEqual(paymentScheduleOccurrences({ startDate: "2026-11-01", frequency: "daily", endMode: "count", occurrenceCount: 3 }, "2026-12-31"), ["2026-11-01", "2026-11-02", "2026-11-03"]);
  assert.deepEqual(paymentScheduleOccurrences({ startDate: "2026-11-01", frequency: "weekly", endMode: "date", endDate: "2026-11-20" }, "2026-12-31"), ["2026-11-01", "2026-11-08", "2026-11-15"]);
});

test("mantiene l'ancoraggio mensile nei mesi più corti", () => {
  assert.deepEqual(paymentScheduleOccurrences({ startDate: "2026-01-31", frequency: "monthly", endMode: "count", occurrenceCount: 4 }, "2026-12-31"), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
});

test("adatta una ricorrenza annuale iniziata il 29 febbraio", () => {
  assert.deepEqual(paymentScheduleOccurrences({ startDate: "2024-02-29", frequency: "annual", endMode: "count", occurrenceCount: 3 }, "2027-01-01"), ["2024-02-29", "2025-02-28", "2026-02-28"]);
});

test("calcola scadenze da notificare e prossimo evento", () => {
  const schedule = { startDate: "2026-11-01", frequency: "weekly", endMode: "never", completedThrough: "2026-11-08" };
  assert.deepEqual(paymentScheduleState(schedule, "2026-11-25"), { dueDates: ["2026-11-15", "2026-11-22"], nextDate: "2026-11-29", completed: false, overdue: 2, dueToday: false });
  assert.equal(duePaymentCount([schedule, { startDate: "2026-11-25", frequency: "none", endMode: "never", completedThrough: "" }], "2026-11-25"), 3);
});

