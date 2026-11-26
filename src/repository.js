import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase.js";
import { normalizePaymentSchedule } from "./model.js";

const pathFor = (uid, name) => collection(db, "users", uid, name);
const withId = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const accountIdFor = (name) => {
  let hash = 14695981039346656037n;
  for (const character of name.normalize("NFC").toLocaleLowerCase("it")) {
    hash ^= BigInt(character.charCodeAt(0));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return `wallet-account-${hash.toString(36)}`;
};

export function observeFinance(uid, onAccounts, onTransactions, onImports, onSchedules, onError) {
  return [
    onSnapshot(pathFor(uid, "financeAccounts"), (snapshot) => onAccounts(withId(snapshot)), onError),
    onSnapshot(pathFor(uid, "financeTransactions"), (snapshot) => onTransactions(withId(snapshot)), onError),
    onSnapshot(pathFor(uid, "financeImports"), (snapshot) => onImports(withId(snapshot)), onError),
    onSnapshot(pathFor(uid, "financeSchedules"), (snapshot) => onSchedules(withId(snapshot).map(normalizePaymentSchedule)), onError)
  ];
}

export function saveAccount(uid, account) {
  const id = account.id;
  const { id: _id, ...data } = account;
  return setDoc(doc(db, "users", uid, "financeAccounts", id), { ...data, updatedAt: serverTimestamp(), createdAt: data.createdAt || serverTimestamp() }, { merge: true });
}

export function saveTransaction(uid, transaction) {
  const id = transaction.id;
  const { id: _id, ...data } = transaction;
  return setDoc(doc(db, "users", uid, "financeTransactions", id), { ...data, updatedAt: serverTimestamp(), createdAt: data.createdAt || serverTimestamp() }, { merge: true });
}

export const removeAccount = (uid, id) => deleteDoc(doc(db, "users", uid, "financeAccounts", id));
export const removeTransaction = (uid, id) => deleteDoc(doc(db, "users", uid, "financeTransactions", id));

export function saveSchedule(uid, schedule) {
  const id = schedule.id;
  const { id: _id, ...data } = schedule;
  return setDoc(doc(db, "users", uid, "financeSchedules", id), { ...data, updatedAt: serverTimestamp(), createdAt: data.createdAt || serverTimestamp() }, { merge: true });
}

export function saveScheduledTransaction(uid, transaction, schedule, dueDate) {
  const batch = writeBatch(db);
  const { id: transactionId, ...transactionData } = transaction;
  batch.set(doc(db, "users", uid, "financeTransactions", transactionId), {
    ...transactionData,
    createdAt: transactionData.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, "users", uid, "financeSchedules", schedule.id), {
    completedThrough: dueDate,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return batch.commit();
}

export const removeSchedule = (uid, id) => deleteDoc(doc(db, "users", uid, "financeSchedules", id));

export async function importFinanceCsv(uid, fileName, parsed, existingAccounts, existingIds) {
  const source = parsed.source || "wallet-csv";
  const importId = `${source.replace(/[^a-z0-9-]/g, "")}-import-${Date.now()}`;
  const accountByName = new Map(existingAccounts.map((item) => [item.name.toLocaleLowerCase("it"), item]));
  const newAccounts = [];
  for (const name of parsed.accounts) {
    const key = name.toLocaleLowerCase("it");
    if (accountByName.has(key)) continue;
    const account = { id: accountIdFor(name), name, type: "current", currency: "EUR", initialBalance: 0, ...(parsed.accountDefaults || {}) };
    accountByName.set(key, account); newAccounts.push(account);
  }
  const rows = parsed.transactions.map((item) => ({ ...item, id: item.sourceId, accountId: accountByName.get(item.accountName.toLocaleLowerCase("it")).id, importId }))
    .filter((item) => !existingIds.has(item.id));
  const operations = [
    ...newAccounts.map((item) => ({ kind: "account", item })),
    ...rows.map((item) => ({ kind: "transaction", item }))
  ];
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = writeBatch(db);
    for (const operation of operations.slice(offset, offset + 400)) {
      if (operation.kind === "account") {
        const { id, ...data } = operation.item;
        batch.set(doc(db, "users", uid, "financeAccounts", id), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        const { id, accountName: _accountName, ...data } = operation.item;
        batch.set(doc(db, "users", uid, "financeTransactions", id), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    }
    await batch.commit();
  }
  await setDoc(doc(db, "users", uid, "financeImports", importId), {
    fileName: fileName.slice(0, 300), source, rowCount: parsed.transactions.length,
    newCount: rows.length, duplicateCount: parsed.transactions.length - rows.length, createdAt: serverTimestamp()
  });
  return { imported: rows.length, duplicates: parsed.transactions.length - rows.length, accounts: newAccounts.length };
}

export const importWallet = importFinanceCsv;

