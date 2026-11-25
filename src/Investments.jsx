import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Pencil,
  Plus,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import {
  accountBalance,
  dateLabel,
  investmentActivity,
  investmentSummary,
  investmentTransactionsForAccount,
  investmentTypes,
  money,
} from "./model.js";

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

function InvestmentOperations({ account, transactions, valuesHidden }) {
  const activity = investmentActivity(account.id, transactions);
  const movements = investmentTransactionsForAccount(account.id, transactions);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(movements.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = movements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => setPage(1), [account.id, pageSize]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="investment-history">
      <header>
        <div>
          <h3>Operazioni</h3>
          <span>
            {movements.length} totali · {activity.buyCount}{" "}
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

      {visibleRows.length ? (
        <>
          <div className="investment-table" role="table" aria-label={`Operazioni di ${account.name}`}>
            <div className="investment-table-head" role="row">
              <span role="columnheader">Data</span>
              <span role="columnheader">Tipo</span>
              <span role="columnheader">Strumento</span>
              <span role="columnheader">Importo netto</span>
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
                </div>
              );
            })}
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
          Nessun acquisto o vendita registrato per questo conto.
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

function InvestmentDetail({ account, transactions, valuesHidden, onBack, onEdit }) {
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
        <button type="button" className="ghost" onClick={() => onEdit(account)}>
          <Pencil size={17} />Modifica conto
        </button>
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
        />
      </section>
    </>
  );
}

export default function Investments({ accounts, transactions, valuesHidden, onNew, onEdit }) {
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
