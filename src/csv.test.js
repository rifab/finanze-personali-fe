import test from "node:test";
import assert from "node:assert/strict";
import { parseDelimited, parseTradeRepublicCsv, parseWalletCsv } from "./csv.js";

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

const tradeHeader = '"datetime","date","account_type","category","type","asset_class","name","symbol","shares","price","amount","fee","tax","currency","original_amount","original_currency","fx_rate","description","transaction_id","counterparty_name","counterparty_iban","payment_reference","mcc_code"';

test("converte il CSV Trade Republic usando l'importo netto", () => {
  const csv = `${tradeHeader}\n"2026-08-04T10:00:00Z","2026-08-04","DEFAULT","CASH","TRANSFER_INSTANT_INBOUND","","","","","","100.000000","","","EUR","","","","Versamento","cash-1","Intestatario","","",""\n"2026-08-05T10:00:00Z","2026-08-05","DEFAULT","TRADING","BUY","STOCK","Titolo prova","TEST","1.0000000000","59.4000000000","-59.40","-1.00","","EUR","","","","Acquisto","buy-1","","","",""\n"2026-10-01T10:00:00Z","2026-10-01","DEFAULT","CASH","INTEREST_PAYMENT","","","","","","0.570000","","-0.14","EUR","","","","Interessi","interest-1","","","",""`;
  const parsed = parseTradeRepublicCsv(csv, "TradeRepublic");
  assert.equal(parsed.transactions.length, 3);
  assert.equal(parsed.balance, 40.03);
  assert.equal(parsed.transactions[1].amount, -60.4);
  assert.equal(parsed.transactions[1].isTransfer, true);
  assert.equal(parsed.transactions[2].amount, 0.43);
  assert.equal(parsed.transactions[2].category, "Interessi");
  assert.deepEqual(parsed.accounts, ["TradeRepublic"]);
  assert.deepEqual(parsed.investment, { purchases: 60.4, sales: 0, netInvested: 60.4 });
  assert.equal(parsed.accountDefaults.isInvestment, true);
});

test("assegna ID Trade Republic stabili e rifiuta tipi sconosciuti", () => {
  const row = '"2026-08-04T10:00:00Z","2026-08-04","DEFAULT","CASH","REFERRAL","","","","","","10","","","EUR","","","","Bonus","ref-1","","","",""';
  const first = parseTradeRepublicCsv(`${tradeHeader}\n${row}`);
  const second = parseTradeRepublicCsv(`${tradeHeader}\n${row}`);
  assert.equal(first.transactions[0].sourceId, second.transactions[0].sourceId);
  assert.throws(() => parseTradeRepublicCsv(`${tradeHeader}\n${row.replace("REFERRAL", "UNKNOWN")}`), /non supportato/);
});
