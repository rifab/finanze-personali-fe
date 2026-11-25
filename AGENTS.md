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
- Un conto può avere `isInvestment` senza perdere il tipo bancario: `initialBalance` e tutti i movimenti descrivono la liquidità, mentre acquisti e vendite determinano il capitale netto storico investito. Non gestire quotazioni di mercato o plus/minusvalenze non realizzate.
- Nell'import Trade Republic il saldo liquido deriva da `amount + fee + tax`; versamenti, prelievi, acquisti e vendite sono trasferimenti patrimoniali, mentre interessi, dividendi, bonus e rettifiche fiscali sono movimenti ordinari. Lo storico degli investimenti usa gli importi netti di acquisti e vendite.
- La pagina Investimenti separa riepilogo e dettaglio: mostra prima i totali e le schede dei conti, poi apre acquisti, vendite e liquidità del conto selezionato. La lista delle operazioni usa 10 elementi predefiniti, con opzioni 10, 15 e 25.
- Sotto i 950 px la barra inferiore è la navigazione primaria: le sue quattro destinazioni non vengono duplicate nella sidebar “Altro”, che resta sopra la barra e contiene soltanto le sezioni secondarie, tema e profilo. Altezza, spaziatura, safe area e distanza dei messaggi flottanti seguono il pattern di `spese-auto-fe`; conservare `viewport-fit=cover` nel meta viewport per applicare la safe area su iOS.
- Nei modali mobile i campi, in particolare le date native, devono restare comprimibili nel form senza generare scorrimento orizzontale; il contenitore rispetta la viewport dinamica e le safe area della PWA.
- Quando cambia `public/sw.js`, incrementare il nome della cache. Gli aggiornamenti PWA devono proporre il pulsante `Aggiorna ora` senza ricaricare automaticamente la pagina.
- Prima di consegnare una modifica eseguire `npm test`, `npm run build` e `git diff --check`.
- Wrangler resta bloccato esattamente alla `4.151.0`: la `4.168.0` richiede `cloudflare@5.2.0` ma tenta di caricare il file assente `cloudflare/shims/web`. L'override di `undici` mantiene sicura la toolchain della versione bloccata; non usare `npm audit fix --force` finché l'incompatibilità non è risolta a monte.
- Lo sviluppo resta locale: non pubblicare regole Firestore o frontend. La pubblicazione viene eseguita dall'utente.

