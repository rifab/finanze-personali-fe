# Finanze personali

PWA privata per gestire conti, entrate e uscite personali e importare i movimenti esportati da Wallet di BudgetBakers.

## Funzionalità

- gestione di più conti e calcolo del saldo;
- registrazione di entrate, uscite e trasferimenti;
- ricerca e filtri per conto, tipo e mese;
- pianificazione di pagamenti singoli o ricorrenti con avvisi di scadenza;
- riepilogo mensile e distribuzione delle spese per categoria;
- importazione CSV Wallet con anteprima e riconoscimento dei duplicati;
- esportazione di un backup JSON completo;
- autenticazione Firebase Email/Password e archivio separato per utente;
- interfaccia responsive, tema chiaro e scuro e supporto PWA.

## Requisiti

- Node.js `^20.19.0 || >=22.12.0`;
- un progetto Firebase con Authentication Email/Password e Cloud Firestore;
- le variabili `VITE_FIREBASE_*` indicate in `.env.example`.

## Avvio locale

```sh
npm install
npm run dev
```

Creare prima un file `.env` locale partendo da `.env.example`. Il file `.env` non deve essere versionato.

## Struttura dei dati

L'app utilizza un progetto Firebase dedicato e salva ogni dominio in una collezione indipendente:

```text
users/{uid}/financeAccounts/{accountId}
users/{uid}/financeTransactions/{transactionId}
users/{uid}/financeImports/{importId}
users/{uid}/financeSchedules/{scheduleId}
```

I movimenti vengono salvati come documenti separati. Gli importi sono negativi per le uscite e positivi per le entrate.

Le pianificazioni supportano eventi singoli e ricorrenze giornaliere, settimanali, mensili o annuali, senza fine, fino a una data o per un numero definito di eventi. Gli avvisi nell'interfaccia sono sempre disponibili; le notifiche di sistema vengono mostrate quando l'app è aperta o viene riaperta e il browser ha ricevuto il permesso.

Nei selettori e nelle viste, il conto denominato `Conto corrente postale` ha priorità; `Libretto postale` viene mostrato per ultimo. Gli altri conti sono ordinati alfabeticamente.

## Importazione Wallet

L'importatore accetta il CSV Wallet separato da punto e virgola con queste colonne:

```text
account;category;currency;amount;ref_currency_amount;type;payment_type;note;date;transfer;payee;labels
```

La data conserva il giorno riportato nel CSV senza conversioni di fuso orario. Gli identificatori deterministici rendono idempotente la reimportazione dello stesso archivio, mantenendo comunque distinti eventuali movimenti identici.

## Verifiche

```sh
npm test
npm run build
git diff --check
```

## Pubblicazione

Le regole Firestore e il frontend vengono pubblicati separatamente:

```sh
npx firebase-tools use
npx firebase-tools deploy --only firestore:rules

npm run build
npx wrangler deploy
```

Prima di ogni pubblicazione verificare il progetto Firebase e l'account Cloudflare selezionati. Non includere `.env`, dati finanziari reali o file CSV nel repository.
