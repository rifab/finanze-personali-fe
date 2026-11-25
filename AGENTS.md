# Guida per gli agenti di sviluppo

- Comunicare e scrivere interfaccia, documentazione e messaggi di commit in italiano.
- Verificare `git status` prima di intervenire e preservare modifiche locali esistenti.
- Non copiare o mostrare valori di `.env`, credenziali, dati finanziari o contenuti dei CSV reali.
- Le date applicative sono stringhe locali `YYYY-MM-DD`; non introdurre slittamenti di fuso orario.
- Gli importi dei movimenti sono firmati: negativi per le uscite e positivi per le entrate.
- Le transazioni importate devono mantenere un identificatore deterministico per rendere idempotente la reimportazione.
- Non accorpare i movimenti in un singolo documento Firestore: conti, transazioni e importazioni restano collezioni separate.
- Le pianificazioni sono documenti separati in `financeSchedules`; le ricorrenze sono calcolate da date locali senza conversioni di fuso orario.
- Le ricorrenze mensili e annuali restano ancorate al giorno iniziale e si adattano ai mesi più corti. La fine può essere assente, una data oppure un numero di eventi.
- Gli avvisi nell'app e le notifiche mostrate alla riapertura non equivalgono a push a PWA chiusa: non dichiarare notifiche in background senza un backend pianificato.
- Ordinare i conti con `Conto corrente postale` per primo, `Libretto postale` per ultimo e gli altri alfabeticamente.
- Prima di consegnare una modifica eseguire `npm test`, `npm run build` e `git diff --check`.
- Non pubblicare regole Firestore o frontend senza verificare esplicitamente progetto e account selezionati.

