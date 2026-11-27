import test from "node:test";
import assert from "node:assert/strict";
import { accountBalance, cashFlowPeriods, categoryTotals, chartScale, createInvestmentTransaction, duplicateTransaction, duePaymentCount, filterInvestmentTransactions, filterTransactionsByPeriod, financeSummary, investmentActivity, investmentProductSummary, investmentSummary, investmentTransactionDraft, investmentTransactionsForAccount, isInvestmentTransaction, normalizePaymentSchedule, paymentScheduleOccurrences, paymentScheduleState, paymentTypeLabel, scheduledTransactionDraft, sortAccountsByImportance } from "./model.js";

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

test("filtra i movimenti per mese o per intervallo inclusivo di date", () => {
  assert.deepEqual(filterTransactionsByPeriod(transactions, { month: "2026-11" }).map((item) => item.id), ["1", "2", "3", "4"]);
  assert.deepEqual(filterTransactionsByPeriod(transactions, { from: "2026-11-03", to: "2026-11-04" }).map((item) => item.id), ["2", "3", "4"]);
});

test("aggrega entrate e uscite per anno o per giorno escludendo i trasferimenti", () => {
  const annual = cashFlowPeriods(transactions, "2026");
  assert.deepEqual(annual[9], { key: "2026-10", label: "Ott", income: 0, expenses: 5 });
  assert.deepEqual(annual[10], { key: "2026-11", label: "Nov", income: 80, expenses: 30 });
  const monthly = cashFlowPeriods(transactions, "2026-11");
  assert.equal(monthly.length, 30);
  assert.deepEqual(monthly[1], { key: "2026-11-02", label: "2", income: 0, expenses: 30 });
  assert.deepEqual(monthly[2], { key: "2026-11-03", label: "3", income: 80, expenses: 0 });
  assert.deepEqual(monthly[3], { key: "2026-11-04", label: "4", income: 0, expenses: 0 });
  assert.deepEqual(cashFlowPeriods(transactions, "2026-11", { includeTransfers: true })[3], { key: "2026-11-04", label: "4", income: 10, expenses: 10 });
});

test("duplica un movimento senza gli identificativi e i metadati di origine", () => {
  const original = { id: "original", accountId: "a", amount: -30, source: "wallet-csv", sourceId: "csv-row", importId: "import-1", createdAt: 1, updatedAt: 2 };
  const copy = duplicateTransaction(original);
  assert.deepEqual(copy, { accountId: "a", amount: -30, source: "manual", sourceId: "" });
  assert.equal(original.id, "original");
});

test("mostra le etichette italiane dei tipi di pagamento senza alterare valori importati", () => {
  assert.equal(paymentTypeLabel("credit_card"), "Carta di credito");
  assert.equal(paymentTypeLabel("bank_transfer"), "Bonifico bancario");
  assert.equal(paymentTypeLabel("TIPO_IMPORTATO"), "TIPO_IMPORTATO");
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

test("filtra le operazioni di investimento per tipo e prodotto", () => {
  const rows = [
    { id: "buy", paymentType: "BUY", payee: "ETF Globale" },
    { id: "sell", paymentType: "SELL", payee: "ETF Globale" },
    { id: "note", category: "Investimenti · Acquisto", note: "Fondo obbligazionario" }
  ];
  assert.deepEqual(filterInvestmentTransactions(rows, { type: "buy" }).map((item) => item.id), ["buy", "note"]);
  assert.deepEqual(filterInvestmentTransactions(rows, { product: "globale" }).map((item) => item.id), ["buy", "sell"]);
  assert.deepEqual(filterInvestmentTransactions(rows, { type: "sell", product: "globale" }).map((item) => item.id), ["sell"]);
  assert.equal(isInvestmentTransaction(rows[0]), true);
  assert.equal(isInvestmentTransaction({ category: "Spesa", paymentType: "CARD" }), false);
});

test("crea acquisti e vendite firmati sul conto selezionato", () => {
  const purchase = createInvestmentTransaction("broker", { type: "buy", date: "2026-11-25", amount: 25, product: " ETF globale ", note: "" });
  const sale = createInvestmentTransaction("broker", { type: "sell", date: "2026-11-26", amount: 10, product: "ETF globale", note: "" });
  assert.deepEqual([purchase.accountId, purchase.kind, purchase.amount, purchase.category, purchase.payee, purchase.paymentType, purchase.isTransfer], ["broker", "expense", -25, "Investimenti · Acquisto", "ETF globale", "BUY", true]);
  assert.deepEqual([sale.accountId, sale.kind, sale.amount, sale.category, sale.paymentType, sale.isTransfer], ["broker", "income", 10, "Investimenti · Vendita", "SELL", true]);
});

test("prepara la modifica e la duplicazione di un'operazione di investimento", () => {
  const original = { id: "buy", accountId: "broker", date: "2026-11-16", amount: -50, paymentType: "BUY", payee: "ETF globale", note: "PAC", source: "trade-republic-csv", sourceId: "trade-row", importId: "import" };
  const edit = investmentTransactionDraft(original);
  const copy = investmentTransactionDraft(original, { duplicate: true });
  assert.deepEqual([edit.id, edit.type, edit.amount, edit.product, edit.sourceId], ["buy", "buy", 50, "ETF globale", "trade-row"]);
  assert.deepEqual([copy.id, copy.type, copy.amount, copy.product, copy.source, copy.sourceId, copy.importId], [undefined, "buy", 50, "ETF globale", "manual", "", undefined]);
});

test("calcola una scala leggibile e il riepilogo per prodotto", () => {
  assert.deepEqual(chartScale(620), { max: 800, ticks: [800, 600, 400, 200, 0] });
  const rows = investmentProductSummary("broker", [
    { id: "1", accountId: "broker", amount: -100, paymentType: "BUY", payee: "ETF Globale" },
    { id: "2", accountId: "broker", amount: -50, paymentType: "BUY", payee: "etf globale" },
    { id: "3", accountId: "broker", amount: 40, paymentType: "SELL", payee: "ETF Globale" },
    { id: "4", accountId: "broker", amount: 25, paymentType: "SELL", payee: "Azione" },
    { id: "5", accountId: "other", amount: -999, paymentType: "BUY", payee: "Altro conto" }
  ]);
  assert.deepEqual(rows, [
    { id: "etf globale", label: "ETF Globale", purchases: 150, sales: 40, net: 110 },
    { id: "azione", label: "Azione", purchases: 0, sales: 25, net: -25 }
  ]);
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

test("genera ricorrenze ogni cinque mesi e ogni due anni", () => {
  assert.deepEqual(paymentScheduleOccurrences({ startDate: "2026-01-31", frequency: "monthly", recurrenceInterval: 5, endMode: "count", occurrenceCount: 3 }, "2027-12-31"), ["2026-01-31", "2026-06-30", "2026-11-30"]);
  assert.deepEqual(paymentScheduleOccurrences({ startDate: "2024-02-29", frequency: "annual", recurrenceInterval: 2, endMode: "count", occurrenceCount: 3 }, "2030-01-01"), ["2024-02-29", "2026-02-28", "2028-02-29"]);
});

test("genera un PAC nei giorni 2 e 16 di ogni mese", () => {
  assert.deepEqual(paymentScheduleOccurrences({ startDate: "2026-01-01", frequency: "monthly", recurrenceInterval: 1, monthDays: [2, 16], endMode: "count", occurrenceCount: 5 }, "2026-12-31"), ["2026-01-02", "2026-01-16", "2026-02-02", "2026-02-16", "2026-03-02"]);
  assert.deepEqual(paymentScheduleOccurrences({ startDate: "2026-01-10", frequency: "monthly", recurrenceInterval: 1, monthDays: [2, 16], endMode: "count", occurrenceCount: 2 }, "2026-12-31"), ["2026-01-16", "2026-02-02"]);
});

test("mantiene futura una pianificazione biennale nell'anno intermedio", () => {
  const schedule = { startDate: "2026-01-01", frequency: "annual", recurrenceInterval: 2, endMode: "never", completedThrough: "2026-01-01" };
  assert.deepEqual(paymentScheduleState(schedule, "2027-11-26"), { dueDates: [], nextDate: "2028-01-01", completed: false, overdue: 0, dueToday: false });
});

test("calcola scadenze da notificare e prossimo evento", () => {
  const schedule = { startDate: "2026-11-01", frequency: "weekly", endMode: "never", completedThrough: "2026-11-08" };
  assert.deepEqual(paymentScheduleState(schedule, "2026-11-25"), { dueDates: ["2026-11-15", "2026-11-22"], nextDate: "2026-11-29", completed: false, overdue: 2, dueToday: false });
  assert.equal(duePaymentCount([schedule, { startDate: "2026-11-25", frequency: "none", endMode: "never", completedThrough: "" }], "2026-11-25"), 3);
});

test("normalizza tipo, valuta, segno e intervallo degli importi pianificati", () => {
  assert.deepEqual(normalizePaymentSchedule({ name: "Canone", amount: 12 }), { name: "Canone", scheduleType: "payment", kind: "income", amount: 12, currency: "EUR", paymentType: "", recurrenceInterval: 1, product: "", monthDays: [] });
  assert.deepEqual(normalizePaymentSchedule({ name: "Canone", kind: "expense", amount: 12, recurrenceInterval: 2, paymentType: "credit_card" }), { name: "Canone", scheduleType: "payment", kind: "expense", amount: -12, currency: "EUR", paymentType: "credit_card", recurrenceInterval: 2, product: "", monthDays: [] });
  assert.deepEqual(normalizePaymentSchedule({ name: "Storico" }), { name: "Storico", scheduleType: "payment", kind: "expense", amount: 0, currency: "EUR", paymentType: "", recurrenceInterval: 1, product: "", monthDays: [] });
  assert.deepEqual(normalizePaymentSchedule({ name: "PAC", scheduleType: "investment", kind: "expense", amount: -100, product: "ETF", monthDays: [16, 2, 16] }), { name: "PAC", scheduleType: "investment", kind: "expense", amount: -100, currency: "EUR", paymentType: "", recurrenceInterval: 1, product: "ETF", monthDays: [2, 16] });
});

test("precompila un movimento dalla scadenza pianificata", () => {
  assert.deepEqual(scheduledTransactionDraft({ accountId: "conto-1", kind: "expense", amount: -49.9, category: "Acquisti", note: "Rinnovo", name: "Amazon Prime", paymentType: "credit_card" }, "2026-11-26"), {
    accountId: "conto-1", date: "2026-11-26", kind: "expense", amount: -49.9, currency: "EUR", category: "Acquisti", note: "Rinnovo", payee: "Amazon Prime", labels: [], isTransfer: false, paymentType: "credit_card", source: "manual", sourceId: ""
  });
});

