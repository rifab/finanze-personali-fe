import test from "node:test";
import assert from "node:assert/strict";
import { parseDelimited, parseWalletCsv } from "./csv.js";

const header = "account;category;currency;amount;ref_currency_amount;type;payment_type;note;date;transfer;payee;labels";

test("legge campi CSV con separatori, virgolette e righe nelle note", () => {
  const rows = parseDelimited('a;b;"nota; estesa"\r\n1;2;"prima riga\nseconda riga"');
  assert.deepEqual(rows, [["a", "b", "nota; estesa"], ["1", "2", "prima riga\nseconda riga"]]);
});

test("converte il formato Wallet conservando giorno, segno e trasferimento", () => {
  const parsed = parseWalletCsv(`${header}\nConto;Casa;EUR;-12.50;-12.50;Uscita;;\"Spesa; prova\";2026-11-22T01:23:00Z;true;Negozio;uno,due\nConto;Entrate;EUR;50;50;Entrata;;Rimborso;2026-11-23T00:00:00Z;false;;`);
  assert.equal(parsed.transactions.length, 2);
  assert.deepEqual(parsed.accounts, ["Conto"]);
  assert.equal(parsed.transactions[0].date, "2026-11-22");
  assert.equal(parsed.transactions[0].amount, -12.5);
  assert.equal(parsed.transactions[0].kind, "expense");
  assert.equal(parsed.transactions[0].isTransfer, true);
  assert.deepEqual(parsed.transactions[0].labels, ["uno", "due"]);
  assert.equal(parsed.transactions[1].kind, "income");
});

test("assegna ID stabili e mantiene distinte le righe identiche", () => {
  const row = "Conto;Casa;EUR;-10;-10;Uscita;;Nota;2026-01-01T00:00:00Z;false;;";
  const first = parseWalletCsv(`${header}\n${row}\n${row}`);
  const second = parseWalletCsv(`${header}\n${row}\n${row}`);
  assert.notEqual(first.transactions[0].sourceId, first.transactions[1].sourceId);
  assert.deepEqual(first.transactions.map((item) => item.sourceId), second.transactions.map((item) => item.sourceId));
});

test("rifiuta valute, tipi e segni incoerenti", () => {
  assert.throws(() => parseWalletCsv(`${header}\nConto;Casa;USD;-10;-10;Uscita;;;2026-01-01;false;;`), /valuta/);
  assert.throws(() => parseWalletCsv(`${header}\nConto;Casa;EUR;10;10;Uscita;;;2026-01-01;false;;`), /incoerente/);
});
