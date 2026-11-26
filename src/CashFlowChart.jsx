import { useMemo, useState } from "react";
import { cashFlowPeriods, chartScale, money, today } from "./model.js";

const monthNames = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const axisMoney = (value) => value >= 1000
  ? `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value / 1000)}k €`
  : `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value)} €`;

export default function CashFlowChart({ transactions, referenceMonth, valuesHidden, includeTransfers = false }) {
  const [mode, setMode] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 650px)").matches ? "month" : "year");
  const [activePeriod, setActivePeriod] = useState("");
  const safeMonth = /^\d{4}-\d{2}$/.test(referenceMonth) ? referenceMonth : today().slice(0, 7);
  const period = mode === "month" ? safeMonth : safeMonth.slice(0, 4);
  const rows = useMemo(() => cashFlowPeriods(transactions, period, { includeTransfers }), [transactions, period, includeTransfers]);
  const scale = chartScale(Math.max(...rows.flatMap((item) => [item.income, item.expenses]), 0));
  const title = mode === "month" ? `${monthNames[Number(safeMonth.slice(5, 7)) - 1]} ${safeMonth.slice(0, 4)}` : safeMonth.slice(0, 4);
  const incomeLabel = includeTransfers ? "Vendite" : "Entrate";
  const expenseLabel = includeTransfers ? "Acquisti" : "Uscite";
  const summary = rows.map((item) => `${item.label}: ${incomeLabel.toLocaleLowerCase("it")} ${money(item.income)}, ${expenseLabel.toLocaleLowerCase("it")} ${money(item.expenses)}`).join(", ");

  return <section className={`panel cashflow-card${valuesHidden ? " values-hidden" : ""}`}>
    <header>
      <div><h2>Andamento {includeTransfers ? "acquisti e vendite" : "entrate e uscite"}</h2><p>{title} · {includeTransfers ? "operazioni di investimento" : "trasferimenti esclusi"}</p></div>
      <div className="cashflow-header-actions">
        <div className="chart-period-toggle" aria-label="Periodo del grafico">
          <button type="button" aria-pressed={mode === "year"} onClick={() => { setMode("year"); setActivePeriod(""); }}>Annuale</button>
          <button type="button" aria-pressed={mode === "month"} onClick={() => { setMode("month"); setActivePeriod(""); }}>Mensile</button>
        </div>
        <div className="cashflow-legend" aria-label="Legenda grafico"><span className="income">{incomeLabel}</span><span className="expenses">{expenseLabel}</span></div>
      </div>
    </header>
    <div className="cashflow-chart-scroll">
      <div className={`cashflow-chart ${mode}`} role="group" aria-label={valuesHidden ? "Grafico dei movimenti con valori nascosti" : `Andamento ${title}. ${summary}`}>
        <div className="finance-chart-y-axis" aria-hidden="true">{scale.ticks.map((tick, index) => <span key={tick} style={{ top: `${index / (scale.ticks.length - 1) * 100}%` }}>{valuesHidden ? "•••" : axisMoney(tick)}</span>)}</div>
        <div className="cashflow-plot">
          <div className="finance-chart-grid" aria-hidden="true">{scale.ticks.map((tick, index) => <i key={tick} style={{ top: `${index / (scale.ticks.length - 1) * 100}%` }} />)}</div>
          <div className="cashflow-bars">
            {rows.map((item, index) => <div className="cashflow-col" key={item.key}>
              {activePeriod === item.key && !valuesHidden && <output className={`cashflow-tooltip ${index < 2 ? "start" : index > rows.length - 3 ? "end" : ""}`} aria-live="polite">
                <strong>{mode === "month" ? `${item.label} ${title}` : `${item.label} ${title}`}</strong>
                <span><i className="income" />{incomeLabel} {money(item.income)}</span>
                <span><i className="expenses" />{expenseLabel} {money(item.expenses)}</span>
              </output>}
              <button type="button" disabled={valuesHidden} onClick={() => setActivePeriod(activePeriod === item.key ? "" : item.key)} aria-label={valuesHidden ? `${item.label}: valori nascosti` : `${item.label}: ${incomeLabel.toLocaleLowerCase("it")} ${money(item.income)}, ${expenseLabel.toLocaleLowerCase("it")} ${money(item.expenses)}`} aria-expanded={activePeriod === item.key}>
                <i className="income-bar" style={{ height: `${valuesHidden ? 0 : item.income / scale.max * 100}%` }} />
                <i className="expense-bar" style={{ height: `${valuesHidden ? 0 : item.expenses / scale.max * 100}%` }} />
              </button>
              <span>{item.label}</span>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </section>;
}
