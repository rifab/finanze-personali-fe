export const MAX_CSV_BYTES = 10 * 1024 * 1024;
export const WALLET_COLUMNS = ["account", "category", "currency", "amount", "ref_currency_amount", "type", "payment_type", "note", "date", "transfer", "payee", "labels"];
export const TRADE_REPUBLIC_COLUMNS = ["date", "category", "type", "name", "symbol", "shares", "price", "amount", "fee", "tax", "currency", "description", "transaction_id", "counterparty_name"];

function parseLine(text, delimiter) {
  const values = [];
  let value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(value); value = "";
    } else value += character;
  }
  values.push(value);
  return values;
}

export function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let line = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      line += character;
      if (quoted && text[index + 1] === '"') { line += text[index + 1]; index += 1; }
      else quoted = !quoted;
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      if (line.trim()) rows.push(parseLine(line, delimiter));
      line = "";
    } else line += character;
  }
  if (line.trim()) rows.push(parseLine(line, delimiter));
  return rows;
}

function stableHash(value) {
  let hash = 14695981039346656037n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return hash.toString(36);
}

const clean = (value) => String(value ?? "").trim();
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function csvNumber(value, rowNumber, column) {
  const normalized = clean(value);
  if (!normalized) return 0;
  const number = Number(normalized.replace(",", "."));
  if (!Number.isFinite(number)) throw new Error(`La riga ${rowNumber} contiene un valore non valido nella colonna ${column}.`);
  return number;
}

export function parseWalletCsv(text) {
  const table = parseDelimited(String(text || "").replace(/^\uFEFF/, ""));
  if (table.length < 2) throw new Error("Il CSV non contiene movimenti.");
  const headers = table[0].map((value) => clean(value).toLowerCase());
  const missing = WALLET_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Il CSV Wallet non contiene le colonne richieste: ${missing.join(", ")}.`);
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const occurrences = new Map();
  const accounts = new Set();
  const categories = new Set();
  const transactions = table.slice(1).map((values, rowIndex) => {
    const row = Object.fromEntries(headers.map((header) => [header, clean(values[indexes[header]])]));
    const numeric = Number(row.amount.replace(",", "."));
    if (!row.account || !row.category || !Number.isFinite(numeric) || !/^\d{4}-\d{2}-\d{2}/.test(row.date)) {
      throw new Error(`La riga ${rowIndex + 2} contiene conto, categoria, importo o data non validi.`);
    }
    if (row.currency !== "EUR") throw new Error(`La riga ${rowIndex + 2} usa una valuta non supportata (${row.currency || "assente"}).`);
    const normalizedType = row.type.toLocaleLowerCase("it");
    const kind = normalizedType === "uscita" ? "expense" : normalizedType === "entrata" ? "income" : "";
    if (!kind) throw new Error(`La riga ${rowIndex + 2} contiene un tipo non riconosciuto.`);
    if ((kind === "expense" && numeric > 0) || (kind === "income" && numeric < 0)) throw new Error(`La riga ${rowIndex + 2} ha un importo incoerente con il tipo.`);
    const canonical = WALLET_COLUMNS.map((column) => row[column]).join("\u001f");
    const hash = stableHash(canonical);
    const occurrence = (occurrences.get(hash) || 0) + 1;
    occurrences.set(hash, occurrence);
    accounts.add(row.account); categories.add(row.category);
    return {
      sourceId: `wallet-${hash}-${occurrence}`,
      accountName: row.account,
      date: row.date.slice(0, 10),
      kind,
      amount: numeric,
      currency: row.currency,
      category: row.category,
      note: row.note,
      payee: row.payee,
      labels: row.labels ? row.labels.split(",").map(clean).filter(Boolean) : [],
      isTransfer: row.transfer.toLowerCase() === "true",
      paymentType: row.payment_type,
      source: "wallet-csv"
    };
  });
  return { transactions, accounts: [...accounts].sort((a, b) => a.localeCompare(b, "it")), categories: [...categories].sort((a, b) => a.localeCompare(b, "it")) };
}

const tradeRepublicTypes = {
  TRANSFER_INSTANT_INBOUND: { category: "Trasferimenti", transfer: true },
  TRANSFER_INSTANT_OUTBOUND: { category: "Trasferimenti", transfer: true },
  BUY: { category: "Investimenti · Acquisto", transfer: true },
  SELL: { category: "Investimenti · Vendita", transfer: true },
  INTEREST_PAYMENT: { category: "Interessi", transfer: false },
  DIVIDEND: { category: "Dividendi", transfer: false },
  REFERRAL: { category: "Bonus", transfer: false },
  TAX_OPTIMIZATION: { category: "Rettifiche fiscali", transfer: false }
};

export function parseTradeRepublicCsv(text, accountName = "Trade Republic") {
  const table = parseDelimited(String(text || "").replace(/^\uFEFF/, ""), ",");
  if (table.length < 2) throw new Error("Il CSV Trade Republic non contiene operazioni.");
  const headers = table[0].map((value) => clean(value).toLowerCase());
  const missing = TRADE_REPUBLIC_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Il CSV Trade Republic non contiene le colonne richieste: ${missing.join(", ")}.`);
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const categories = new Set();
  const transactions = table.slice(1).map((values, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const row = Object.fromEntries(headers.map((header) => [header, clean(values[indexes[header]])]));
    const mapping = tradeRepublicTypes[row.type];
    if (!mapping) throw new Error(`La riga ${rowNumber} contiene un tipo Trade Republic non supportato (${row.type || "assente"}).`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error(`La riga ${rowNumber} contiene una data non valida.`);
    if (row.currency !== "EUR") throw new Error(`La riga ${rowNumber} usa una valuta non supportata (${row.currency || "assente"}).`);
    if (!row.transaction_id) throw new Error(`La riga ${rowNumber} non contiene l'identificativo dell'operazione.`);
    const amount = roundMoney(csvNumber(row.amount, rowNumber, "amount") + csvNumber(row.fee, rowNumber, "fee") + csvNumber(row.tax, rowNumber, "tax"));
    if (amount === 0) throw new Error(`La riga ${rowNumber} non produce alcun movimento monetario.`);
    const sourceId = `trade-republic-${stableHash(row.transaction_id)}`;
    const assetDetails = [row.symbol, row.shares ? `${row.shares} quote` : "", row.price ? `prezzo ${row.price} EUR` : ""].filter(Boolean).join(" · ");
    categories.add(mapping.category);
    return {
      sourceId,
      accountName: clean(accountName) || "Trade Republic",
      date: row.date,
      kind: amount < 0 ? "expense" : "income",
      amount,
      currency: "EUR",
      category: mapping.category,
      note: [row.description, assetDetails].filter(Boolean).join(" · ").slice(0, 5000),
      payee: (row.name || row.counterparty_name).slice(0, 500),
      labels: [row.type, row.category].filter(Boolean),
      isTransfer: mapping.transfer,
      paymentType: row.type,
      source: "trade-republic-csv"
    };
  });
  const dates = transactions.map((item) => item.date).sort();
  const purchases = roundMoney(transactions.filter((item) => item.paymentType === "BUY").reduce((total, item) => total + Math.abs(item.amount), 0));
  const sales = roundMoney(transactions.filter((item) => item.paymentType === "SELL").reduce((total, item) => total + Math.abs(item.amount), 0));
  return {
    source: "trade-republic-csv",
    transactions,
    accounts: [clean(accountName) || "Trade Republic"],
    categories: [...categories].sort((a, b) => a.localeCompare(b, "it")),
    balance: roundMoney(transactions.reduce((total, item) => total + item.amount, 0)),
    investment: { purchases, sales, netInvested: roundMoney(purchases - sales) },
    accountDefaults: {
      type: "current",
      currency: "EUR",
      initialBalance: 0,
      isInvestment: true,
      investmentType: "brokerage",
      investmentValue: 0,
      investmentValueDate: dates.at(-1)
    }
  };
}

export function csvFileError(file) {
  if (!file?.name?.toLocaleLowerCase("it").endsWith(".csv")) return "Seleziona un file in formato CSV.";
  if (!Number.isFinite(file.size) || file.size <= 0) return "Il file CSV è vuoto o non leggibile.";
  if (file.size > MAX_CSV_BYTES) return "Il file CSV supera il limite di 10 MB.";
  return "";
}

