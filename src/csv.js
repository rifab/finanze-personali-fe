export const MAX_CSV_BYTES = 10 * 1024 * 1024;
export const WALLET_COLUMNS = ["account", "category", "currency", "amount", "ref_currency_amount", "type", "payment_type", "note", "date", "transfer", "payee", "labels"];

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

export function csvFileError(file) {
  if (!file?.name?.toLocaleLowerCase("it").endsWith(".csv")) return "Seleziona un file in formato CSV.";
  if (!Number.isFinite(file.size) || file.size <= 0) return "Il file CSV è vuoto o non leggibile.";
  if (file.size > MAX_CSV_BYTES) return "Il file CSV supera il limite di 10 MB.";
  return "";
}

