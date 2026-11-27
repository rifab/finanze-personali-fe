import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Landmark,
  Pencil,
  Plus,
  Repeat2,
  Search,
  ShoppingCart,
  Trash2,
  WalletCards,
} from "lucide-react";
import {
  accountBalance,
  chartScale,
  dateLabel,
  investmentActivity,
  filterInvestmentTransactions,
  investmentProductSummary,
  investmentSummary,
  investmentTransactionsForAccount,
  investmentTypes,
  money,
  paymentScheduleState,
  today,
} from "./model.js";

const investmentEndModeLabels = {
  never: "Senza data di fine",
  date: "Fino a una data",
  count: "Dopo un numero di acquisti"
};

const axisMoney = (value) => value >= 1000
  ? `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value / 1000)}k €`
  : `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value)} €`;

function InvestmentProductChart({ account, transactions, valuesHidden }) {
  const [activeProduct, setActiveProduct] = useState("");
  const products = investmentProductSummary(account.id, transactions);
  const scale = chartScale(Math.max(...products.flatMap((item) => [item.purchases, item.sales]), 0));
  const summary = products.map((item) => `${item.label}: acquisti ${money(item.purchases)}, vendite ${money(item.sales)}, netto ${money(item.net)}`).join(", ");

  if (!products.length) return null;
  return <section className={`panel investment-product-card${valuesHidden ? " values-hidden" : ""}`}>
    <header>
      <div><h2>Acquisti e vendite per prodotto</h2><p>Il valore sotto ogni prodotto è il capitale netto movimentato.</p></div>
      <div className="investment-chart-legend" aria-label="Legenda grafico"><span className="purchases">Acquisti</span><span className="sales">Vendite</span></div>
    </header>
    <div className="investment-product-chart" role="group" aria-label={valuesHidden ? "Grafico investimenti con valori nascosti" : `Investimenti per prodotto. ${summary}`}>
      <div className="finance-chart-y-axis" aria-hidden="true">{scale.ticks.map((tick, index) => <span key={tick} style={{ top: `${index / (scale.ticks.length - 1) * 100}%` }}>{valuesHidden ? "•••" : axisMoney(tick)}</span>)}</div>
      <div className="investment-product-plot">
        <div className="finance-chart-grid" aria-hidden="true">{scale.ticks.map((tick, index) => <i key={tick} style={{ top: `${index / (scale.ticks.length - 1) * 100}%` }} />)}</div>
        <div className="investment-product-bars">
          {products.map((item, index) => <div className="investment-product-col" key={item.id}>
            {activeProduct === item.id && !valuesHidden && <output className={`investment-chart-tooltip ${index === 0 ? "start" : index === products.length - 1 ? "end" : ""}`} aria-live="polite">
              <strong>{item.label}</strong>
              <span><i className="purchases" />Acquisti {money(item.purchases)}</span>
              <span><i className="sales" />Vendite {money(item.sales)}</span>
              <b>Netto {money(item.net)}</b>
            </output>}
            <button type="button" disabled={valuesHidden} onClick={() => setActiveProduct(activeProduct === item.id ? "" : item.id)} aria-label={valuesHidden ? `${item.label}: valori nascosti` : `${item.label}: acquisti ${money(item.purchases)}, vendite ${money(item.sales)}, netto ${money(item.net)}`} aria-expanded={activeProduct === item.id}>
              <i className="purchase-bar" style={{ height: `${valuesHidden ? 0 : item.purchases / scale.max * 100}%` }} />
              <i className="sale-bar" style={{ height: `${valuesHidden ? 0 : item.sales / scale.max * 100}%` }} />
            </button>
            <span title={item.label}>{item.label}</span>
            <b className={item.net < 0 ? "negative" : ""}>{valuesHidden ? "••••••" : money(item.net)}</b>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}

export function InvestmentScheduleForm({ account, initial, onSave, onClose }) {
  const [error, setError] = useState("");
  const [daysOpen, setDaysOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    name: initial?.name || "Piano di accumulo",
    product: initial?.product || "",
    amount: Math.abs(Number(initial?.amount) || 0),
    monthDays: initial?.monthDays?.length ? [...initial.monthDays] : [2, 16],
    startDate: initial?.startDate || today(),
    recurrenceInterval: initial?.recurrenceInterval || 1,
    endMode: initial?.endMode || "never",
    endDate: initial?.endDate || "",
    occurrenceCount: initial?.occurrenceCount || 1,
    note: initial?.note || ""
  }));
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggleMonthDay = (day) => {
    setForm((current) => ({
      ...current,
      monthDays: current.monthDays.includes(day)
        ? current.monthDays.filter((item) => item !== day)
        : [...current.monthDays, day].sort((a, b) => a - b)
    }));
    setError("");
  };
  function submit(event) {
    event.preventDefault();
    const monthDays = [...new Set(form.monthDays)].sort((a, b) => a - b);
    if (!monthDays.length) {
      setError("Indica almeno un giorno del mese compreso tra 1 e 31.");
      setDaysOpen(true);
      return;
    }
    const endMode = form.endMode;
    const endDate = endMode === "date" ? form.endDate : "";
    const occurrenceCount = endMode === "count" ? Number(form.occurrenceCount) : 0;
    const recurrenceInterval = Math.min(1000, Math.max(1, Number(form.recurrenceInterval) || 1));
    const timingChanged = Boolean(initial) && (
      initial.startDate !== form.startDate ||
      Number(initial.recurrenceInterval || 1) !== recurrenceInterval ||
      initial.monthDays?.join(",") !== monthDays.join(",") ||
      initial.endMode !== endMode ||
      initial.endDate !== endDate ||
      Number(initial.occurrenceCount || 0) !== occurrenceCount
    );
    const amount = Math.abs(Number(form.amount));
    onSave({
      ...initial,
      name: form.name,
      accountId: account.id,
      scheduleType: "investment",
      kind: "expense",
      amount: amount === 0 ? 0 : -amount,
      currency: "EUR",
      category: "Investimenti · Acquisto",
      note: form.note,
      product: form.product,
      startDate: form.startDate,
      frequency: "monthly",
      recurrenceInterval,
      monthDays,
      endMode,
      endDate,
      occurrenceCount,
      completedThrough: timingChanged ? "" : initial?.completedThrough || ""
    });
  }
  return (
    <form onSubmit={submit}>
      <p className="muted">Conto: <strong>{account.name}</strong></p>
      <div className="form-grid">
        <label>Nome piano<input autoFocus value={form.name} onChange={change("name")} maxLength="200" required /></label>
        <label>Prodotto<input value={form.product} onChange={change("product")} maxLength="500" required /></label>
        <label>Importo per acquisto<div className="currency-input"><span aria-hidden="true">€</span><input type="number" min="0.01" step="0.01" value={form.amount} onChange={change("amount")} required /></div></label>
        <div className={`month-day-picker${daysOpen ? " open" : ""}`}>
          <span className="month-day-label" id="month-day-label">Giorni del mese</span>
          <button
            type="button"
            className="month-day-trigger"
            aria-labelledby="month-day-label month-day-selection"
            aria-expanded={daysOpen}
            aria-controls="month-day-panel"
            onClick={() => setDaysOpen((current) => !current)}
          >
            <span id="month-day-selection">{form.monthDays.length ? form.monthDays.join(", ") : "Seleziona i giorni"}</span>
            <ChevronDown size={18} />
          </button>
          {daysOpen && <div className="month-day-panel" id="month-day-panel">
            <p>Seleziona uno o più giorni in cui effettuare l'acquisto.</p>
            <div className="month-day-grid" role="group" aria-label="Giorni del mese">
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <button
                  type="button"
                  key={day}
                  aria-pressed={form.monthDays.includes(day)}
                  aria-label={`Giorno ${day}`}
                  onClick={() => toggleMonthDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="month-day-panel-footer">
              <small>{form.monthDays.length ? `Selezionati: ${form.monthDays.join(", ")}. Nei mesi più corti viene usato l'ultimo giorno disponibile.` : "Seleziona almeno un giorno."}</small>
              <button type="button" className="ghost" onClick={() => setDaysOpen(false)} disabled={!form.monthDays.length}>Conferma</button>
            </div>
          </div>}
        </div>
        <label>Data di inizio<input type="date" value={form.startDate} onChange={change("startDate")} required /></label>
        <label>Ripeti ogni quanti mesi<input type="number" min="1" max="1000" step="1" value={form.recurrenceInterval} onChange={change("recurrenceInterval")} required /></label>
        <label>Termine<select value={form.endMode} onChange={change("endMode")}>{Object.entries(investmentEndModeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        {form.endMode === "date" && <label>Data di fine<input type="date" min={form.startDate} value={form.endDate} onChange={change("endDate")} required /></label>}
        {form.endMode === "count" && <label>Numero di acquisti<input type="number" min="1" max="100000" step="1" value={form.occurrenceCount} onChange={change("occurrenceCount")} required /></label>}
      </div>
      <label>Note<textarea value={form.note} onChange={change("note")} maxLength="5000" rows="3" /></label>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Annulla</button><button className="primary">Salva PAC</button></div>
    </form>
  );
}

function Amount({ children, hidden }) {
  return (
    <span
      className={`private-value${hidden ? " hidden" : ""}`}
      aria-label={hidden ? "Valore nascosto" : undefined}
    >
      {hidden ? "••••••" : children}
    </span>
  );
}

export function InvestmentSchedules({ account, schedules, valuesHidden, onNew, onEdit, onDelete, onRecord, dialog = false }) {
  const rows = schedules
    .filter((item) => item.scheduleType === "investment" && item.accountId === account.id)
    .map((item) => ({ item, state: paymentScheduleState(item, today()) }))
    .sort((a, b) => (a.state.dueDates[0] || a.state.nextDate || "9999-12-31").localeCompare(b.state.dueDates[0] || b.state.nextDate || "9999-12-31"));
  return (
    <section className={`${dialog ? "investment-plans-dialog" : "panel"} investment-plans`}>
      <header>
        <div><h2>Piani di accumulo</h2><p>Acquisti ricorrenti da confermare alla scadenza.</p></div>
        <button type="button" className="primary" onClick={() => onNew(account)}><Plus size={17} />Nuovo PAC</button>
      </header>
      {rows.length ? <div className="investment-plan-list">{rows.map(({ item, state }) => {
        const dueDate = state.dueDates[0] || state.nextDate;
        return <article className="investment-plan-row" key={item.id}>
          <span className="investment-card-icon"><Repeat2 /></span>
          <span className="investment-plan-main"><strong>{item.name}</strong><span>{item.product}</span><small>Ogni {Number(item.recurrenceInterval || 1) === 1 ? "mese" : `${item.recurrenceInterval} mesi`} il {item.monthDays.join(" e il ")}</small></span>
          <span className="investment-plan-value"><strong><Amount hidden={valuesHidden}>{money(item.amount)}</Amount></strong>{dueDate && <small>{state.dueDates[0] ? "Da registrare" : "Prossimo"}: {dateLabel(dueDate)}</small>}</span>
          <span className="investment-plan-actions">
            {dueDate && <button type="button" className="complete-button" onClick={() => onRecord(item, dueDate)}>Registra acquisto</button>}
            <button type="button" className="icon-button" onClick={() => onEdit(item)} aria-label={`Modifica ${item.name}`}><Pencil size={17} /></button>
            <button type="button" className="icon-button" onClick={() => onDelete(item)} aria-label={`Elimina ${item.name}`}><Trash2 size={17} /></button>
          </span>
        </article>;
      })}</div> : <p className="investment-plan-empty">Nessun piano di accumulo configurato per questo conto.</p>}
    </section>
  );
}

function InvestmentOperations({ account, transactions, valuesHidden, onEdit, onDuplicate, onDelete }) {
  const activity = investmentActivity(account.id, transactions);
  const movements = investmentTransactionsForAccount(account.id, transactions);
  const [operationType, setOperationType] = useState("all");
  const [product, setProduct] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const filteredMovements = filterInvestmentTransactions(movements, {
    type: operationType === "all" ? "" : operationType,
    product,
  });
  const pageCount = Math.max(1, Math.ceil(filteredMovements.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filteredMovements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => setPage(1), [account.id, operationType, product, pageSize]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="investment-history">
      <header>
        <div>
          <h3>Operazioni</h3>
          <span>
            {filteredMovements.length} risultati su {movements.length} · {activity.buyCount}{" "}
            {activity.buyCount === 1 ? "acquisto" : "acquisti"} · {activity.sellCount}{" "}
            {activity.sellCount === 1 ? "vendita" : "vendite"}
          </span>
        </div>
        <label>
          Elementi per pagina
          <div>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
            >
              {[10, 15, 25].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <ChevronDown size={15} />
          </div>
        </label>
      </header>

      <div className="investment-filters">
        <label>
          Tipo
          <select value={operationType} onChange={(event) => setOperationType(event.target.value)}>
            <option value="all">Tutti</option>
            <option value="buy">Acquisto</option>
            <option value="sell">Vendita</option>
          </select>
          <ChevronDown size={15} />
        </label>
        <label>
          Prodotto
          <span>
            <Search size={15} />
            <input
              type="search"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
              placeholder="Cerca prodotto"
            />
          </span>
        </label>
      </div>

      {visibleRows.length ? (
        <>
          <div className="investment-table" role="table" aria-label={`Operazioni di ${account.name}`}>
            <div role="rowgroup">
              <div className="investment-table-head" role="row">
                <span role="columnheader">Data</span>
                <span role="columnheader">Tipo</span>
                <span role="columnheader">Strumento</span>
                <span role="columnheader">Importo netto</span>
                <span role="columnheader">Azioni</span>
              </div>
              {visibleRows.map((item) => {
                const buy = String(item.paymentType || "").toUpperCase() === "BUY"
                  || item.category === "Investimenti · Acquisto";
                return (
                  <div className="investment-table-row" role="row" key={item.id}>
                    <time role="cell">{dateLabel(item.date)}</time>
                    <span role="cell" className={`investment-operation ${buy ? "buy" : "sell"}`}>
                      {buy ? "Acquisto" : "Vendita"}
                    </span>
                    <strong role="cell">{item.payee || item.note || "Strumento non indicato"}</strong>
                    <strong role="cell" className={buy ? "expense" : "income"}>
                      <Amount hidden={valuesHidden}>{money(item.amount)}</Amount>
                    </strong>
                    <span role="cell" className="investment-table-actions">
                      <button type="button" className="icon-button" onClick={() => onEdit(account, item)} aria-label={`Modifica ${item.payee || "operazione"}`} title="Modifica"><Pencil size={17} /></button>
                      <button type="button" className="icon-button" onClick={() => onDuplicate(account, item)} aria-label={`Duplica ${item.payee || "operazione"}`} title="Duplica"><Copy size={17} /></button>
                      <button type="button" className="icon-button" onClick={() => onDelete(item)} aria-label={`Elimina ${item.payee || "operazione"}`} title="Elimina"><Trash2 size={17} /></button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <footer className="investment-pagination">
            <span>Pagina {currentPage} di {pageCount}</span>
            <div>
              <button
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                aria-label={`Pagina precedente di ${account.name}`}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
                aria-label={`Pagina successiva di ${account.name}`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </footer>
        </>
      ) : (
        <p className="investment-history-empty">
          Nessuna operazione corrisponde ai filtri.
        </p>
      )}
    </div>
  );
}

function InvestmentAccountCard({ account, transactions, valuesHidden, onOpen }) {
  const activity = investmentActivity(account.id, transactions);
  const operationLabel = activity.firstDate
    ? `Operazioni dal ${dateLabel(activity.firstDate)} al ${dateLabel(activity.lastDate)}`
    : "Nessuna operazione di investimento importata";

  return (
    <button
      type="button"
      className="panel investment-account-card"
      onClick={() => onOpen(account.id)}
      aria-label={`Apri il dettaglio di ${account.name}`}
    >
      <span className="investment-account-card-heading">
        <span className="investment-card-icon"><BriefcaseBusiness /></span>
        <ChevronRight className="investment-account-chevron" aria-hidden="true" />
      </span>
      <span className="investment-kind">
        {investmentTypes[account.investmentType] || investmentTypes.other}
      </span>
      <strong className="investment-account-name">{account.name}</strong>
      <span className="investment-account-values">
        <span>
          <small>Capitale netto investito</small>
          <strong><Amount hidden={valuesHidden}>{money(activity.netInvested)}</Amount></strong>
        </span>
        <span>
          <small>Liquidità</small>
          <strong>
            <Amount hidden={valuesHidden}>{money(accountBalance(account, transactions))}</Amount>
          </strong>
        </span>
      </span>
      <small className="investment-account-period">
        <CalendarDays size={15} />{operationLabel}
      </small>
    </button>
  );
}

function InvestmentDetail({ account, transactions, valuesHidden, onBack, onEdit, onNewTransaction, onEditTransaction, onDuplicateTransaction, onDeleteTransaction, onManageSchedules }) {
  const activity = investmentActivity(account.id, transactions);

  return (
    <>
      <header className="page-heading investment-detail-heading">
        <div>
          <button type="button" className="investment-back" onClick={onBack}>
            <ArrowLeft size={18} />Tutti gli investimenti
          </button>
          <p className="eyebrow">
            {investmentTypes[account.investmentType] || investmentTypes.other}
          </p>
          <h1>{account.name}</h1>
          <p>Storico del capitale movimentato, senza quotazioni di mercato.</p>
        </div>
        <div className="investment-detail-actions">
          <button type="button" className="primary" onClick={() => onNewTransaction(account)}>
            <Plus size={18} />Nuova operazione
          </button>
          <button type="button" className="ghost" onClick={() => onManageSchedules(account)}>
            <Repeat2 size={17} />Piani di accumulo
          </button>
          <button type="button" className="ghost" onClick={() => onEdit(account)}>
            <Pencil size={17} />Modifica conto
          </button>
        </div>
      </header>

      <section className="investment-summary investment-detail-summary">
        <article className="panel">
          <BriefcaseBusiness />
          <div>
            <span>Capitale netto investito</span>
            <strong><Amount hidden={valuesHidden}>{money(activity.netInvested)}</Amount></strong>
          </div>
        </article>
        <article className="panel">
          <ShoppingCart />
          <div>
            <span>Acquisti storici</span>
            <strong><Amount hidden={valuesHidden}>{money(activity.purchases)}</Amount></strong>
          </div>
        </article>
        <article className="panel">
          <Landmark />
          <div>
            <span>Vendite storiche</span>
            <strong><Amount hidden={valuesHidden}>{money(activity.sales)}</Amount></strong>
          </div>
        </article>
        <article className="panel">
          <WalletCards />
          <div>
            <span>Liquidità</span>
            <strong>
              <Amount hidden={valuesHidden}>{money(accountBalance(account, transactions))}</Amount>
            </strong>
          </div>
        </article>
      </section>

      <section className="panel investment-detail-panel">
        <div className="investment-detail-period">
          <CalendarDays size={17} />
          {activity.firstDate
            ? `Operazioni dal ${dateLabel(activity.firstDate)} al ${dateLabel(activity.lastDate)}`
            : "Nessuna operazione di investimento importata"}
        </div>
        <InvestmentOperations
          account={account}
          transactions={transactions}
          valuesHidden={valuesHidden}
          onEdit={onEditTransaction}
          onDuplicate={onDuplicateTransaction}
          onDelete={onDeleteTransaction}
        />
      </section>

      <InvestmentProductChart account={account} transactions={transactions} valuesHidden={valuesHidden} />
    </>
  );
}

export default function Investments({ accounts, transactions, valuesHidden, onNew, onEdit, onNewTransaction, onEditTransaction, onDuplicateTransaction, onDeleteTransaction, onManageSchedules }) {
  const rows = accounts.filter((account) => account.isInvestment);
  const summary = investmentSummary(accounts, transactions);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const selectedAccount = rows.find((account) => account.id === selectedAccountId);

  useEffect(() => {
    if (selectedAccountId && !selectedAccount) setSelectedAccountId("");
  }, [selectedAccountId, selectedAccount]);

  if (selectedAccount) {
    return (
      <InvestmentDetail
        account={selectedAccount}
        transactions={transactions}
        valuesHidden={valuesHidden}
        onBack={() => setSelectedAccountId("")}
        onEdit={onEdit}
        onNewTransaction={onNewTransaction}
        onEditTransaction={onEditTransaction}
        onDuplicateTransaction={onDuplicateTransaction}
        onDeleteTransaction={onDeleteTransaction}
        onManageSchedules={onManageSchedules}
      />
    );
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">STORICO PATRIMONIALE</p>
          <h1>Investimenti</h1>
          <p>Riepilogo del capitale movimentato, senza quotazioni di mercato.</p>
        </div>
        <button className="primary" onClick={onNew}><Plus size={18} />Nuovo conto</button>
      </header>

      {rows.length ? (
        <>
          <section className="investment-summary">
            <article className="panel">
              <BriefcaseBusiness />
              <div>
                <span>Capitale netto investito</span>
                <strong><Amount hidden={valuesHidden}>{money(summary.investedValue)}</Amount></strong>
              </div>
            </article>
            <article className="panel">
              <ShoppingCart />
              <div>
                <span>Acquisti storici</span>
                <strong><Amount hidden={valuesHidden}>{money(summary.purchases)}</Amount></strong>
              </div>
            </article>
            <article className="panel">
              <Landmark />
              <div>
                <span>Vendite storiche</span>
                <strong><Amount hidden={valuesHidden}>{money(summary.sales)}</Amount></strong>
              </div>
            </article>
          </section>

          <section className="investment-accounts-section" aria-labelledby="investment-accounts-title">
            <div className="investment-section-heading">
              <div>
                <h2 id="investment-accounts-title">Conti di investimento</h2>
                <p>Seleziona un conto per consultarne operazioni e dettagli.</p>
              </div>
              <span>{rows.length} {rows.length === 1 ? "conto" : "conti"}</span>
            </div>
            <div className="investment-account-grid">
              {rows.map((account) => (
                <InvestmentAccountCard
                  key={account.id}
                  account={account}
                  transactions={transactions}
                  valuesHidden={valuesHidden}
                  onOpen={setSelectedAccountId}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="panel investment-empty">
          <BriefcaseBusiness size={42} />
          <h2>Nessun conto di investimento</h2>
          <p>Crea o modifica un conto e attiva “Contiene anche investimenti”.</p>
          <button className="primary" onClick={onNew}><Plus size={18} />Configura un conto</button>
        </section>
      )}
    </>
  );
}
