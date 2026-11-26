# Finanze personali

PWA privata per gestire conti, entrate e uscite personali e importare i movimenti esportati da Wallet di BudgetBakers o Trade Republic.

## Funzionalità

- gestione di più conti e calcolo del saldo;
- classificazione dei conti che contengono anche investimenti, con storico di acquisti e vendite separato dalla liquidità;
- registrazione di entrate, uscite e trasferimenti;
- ricerca e filtri per conto, tipo e mese;
- pianificazione di pagamenti e accrediti singoli o ricorrenti, con importo in euro e avvisi di scadenza;
- riepilogo mensile e distribuzione delle spese per categoria;
- importazione CSV Wallet e Trade Republic con anteprima e riconoscimento dei duplicati;
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

Un conto può mantenere il proprio tipo bancario ed essere contemporaneamente marcato come investimento. Il saldo del conto rappresenta la liquidità; acquisti e vendite determinano invece il capitale netto storico investito. Le quotazioni di mercato e le plus/minusvalenze non realizzate non vengono gestite dall'app.

Le pianificazioni supportano uscite e entrate con importo in euro, eventi singoli e ricorrenze giornaliere, settimanali, mensili o annuali. L'intervallo è configurabile, per esempio ogni 2 settimane o ogni 2 anni; la serie può essere senza fine, terminare a una data oppure dopo un numero definito di eventi. La lista evidenzia importo e prossima scadenza per ciascun conto. Gli avvisi nell'interfaccia sono sempre disponibili; le notifiche di sistema vengono mostrate quando l'app è aperta o viene riaperta e il browser ha ricevuto il permesso. Da una scadenza si può aprire un movimento precompilato: il salvataggio del movimento e il completamento della scadenza avvengono insieme. Resta disponibile anche il completamento senza creare un movimento.

Nei conti di investimento si possono configurare piani di accumulo mensili indicando uno o più giorni, per esempio il 2 e il 16. Ogni scadenza apre un acquisto precompilato; soltanto la conferma salva l'operazione nello storico investimenti e avanza il PAC alla data successiva.

Nei selettori e nelle viste, il conto denominato `Conto corrente postale` ha priorità; `Libretto postale` viene mostrato per ultimo. Gli altri conti sono ordinati alfabeticamente.

## Importazione Wallet

L'importatore accetta il CSV Wallet separato da punto e virgola con queste colonne:

```text
account;category;currency;amount;ref_currency_amount;type;payment_type;note;date;transfer;payee;labels
```

La data conserva il giorno riportato nel CSV senza conversioni di fuso orario. Gli identificatori deterministici rendono idempotente la reimportazione dello stesso archivio, mantenendo comunque distinti eventuali movimenti identici.

## Importazione Trade Republic

L'importatore riconosce il CSV ufficiale delle operazioni Trade Republic. Per ogni riga calcola il movimento netto sommando importo, commissione e imposta. Versamenti, prelievi, acquisti e vendite vengono classificati come trasferimenti patrimoniali, così modificano la liquidità senza alterare i totali di entrate e spese. Interessi accreditati, dividendi, bonus e rettifiche fiscali restano invece movimenti reali.

La reimportazione usa l'identificativo dell'operazione fornito da Trade Republic per ignorare i duplicati. Se non esiste un conto di destinazione, l'app può creare `Trade Republic` con saldo iniziale zero e classificazione `Conto titoli`. La pagina Investimenti presenta prima il riepilogo complessivo e una scheda per ciascun conto; selezionando un conto si apre il dettaglio con acquisti, vendite, liquidità e operazioni paginate da 10, 15 o 25 elementi. Ogni operazione può essere modificata, duplicata o eliminata; la duplicazione crea un nuovo movimento manuale senza riutilizzare l'identificativo d'importazione. Non tenta di ricostruire il valore corrente di mercato.

## Aggiornamenti PWA

In produzione il service worker controlla la disponibilità di una nuova versione all'avvio, al ritorno nell'app e ogni ora. La nuova versione resta in attesa: l'avviso permette di scegliere `Più tardi` oppure `Aggiorna ora`, e impedisce l'aggiornamento mentre sono aperti moduli o anteprime di importazione. La pagina viene ricaricata soltanto dopo la conferma e l'attivazione effettiva del nuovo service worker.

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
