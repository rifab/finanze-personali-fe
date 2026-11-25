import { useMemo, useState } from "react";
import { Bell, BellOff, BellRing, CalendarCheck, CalendarClock, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { dateLabel, duePaymentCount, paymentScheduleState, scheduleFrequencyLabels, today } from "./model.js";

const endModeLabels = { never: "Senza data di fine", date: "Fino a una data", count: "Dopo un numero di eventi" };

export function ScheduleForm({ accounts, transactions, initial, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    accountId: initial?.accountId || accounts[0]?.id || "",
    category: initial?.category || "",
    note: initial?.note || "",
    startDate: initial?.startDate || today(),
    frequency: initial?.frequency || "none",
    endMode: initial?.endMode || "never",
    endDate: initial?.endDate || "",
    occurrenceCount: initial?.occurrenceCount || 1
  }));
  const categories = useMemo(() => [...new Set(transactions.map((item) => item.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"it")), [transactions]);
  const change = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => key === "frequency" && value === "none" ? { ...current, frequency: value, endMode: "never", endDate: "", occurrenceCount: 1 } : { ...current, [key]: value });
  };
  function submit(event) {
    event.preventDefault();
    const recurring = form.frequency !== "none";
    const endMode = recurring ? form.endMode : "never";
    const endDate = endMode === "date" ? form.endDate : "";
    const occurrenceCount = endMode === "count" ? Number(form.occurrenceCount) : 0;
    const timingChanged = Boolean(initial) && (initial.startDate !== form.startDate || initial.frequency !== form.frequency || initial.endMode !== endMode || initial.endDate !== endDate || Number(initial.occurrenceCount || 0) !== occurrenceCount);
    onSave({
      ...initial,
      ...form,
      endMode,
      endDate,
      occurrenceCount,
      completedThrough: timingChanged ? "" : initial?.completedThrough || ""
    });
  }
  return <form onSubmit={submit}><div className="form-grid"><label>Nome<input autoFocus value={form.name} onChange={change("name")} maxLength="200" required/></label><label>Conto<select value={form.accountId} onChange={change("accountId")} required>{accounts.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Categoria<input list="schedule-categories" value={form.category} onChange={change("category")} maxLength="200" required/><datalist id="schedule-categories">{categories.map((item)=><option key={item} value={item}/>)}</datalist></label><label>Prima scadenza<input type="date" value={form.startDate} onChange={change("startDate")} required/></label><label>Ripetizione<select value={form.frequency} onChange={change("frequency")}>{Object.entries(scheduleFrequencyLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{form.frequency!=="none"&&<label>Termine<select value={form.endMode} onChange={change("endMode")}>{Object.entries(endModeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}{form.frequency!=="none"&&form.endMode==="date"&&<label>Data di fine<input type="date" min={form.startDate} value={form.endDate} onChange={change("endDate")} required/></label>}{form.frequency!=="none"&&form.endMode==="count"&&<label>Numero di eventi<input type="number" min="1" max="100000" step="1" value={form.occurrenceCount} onChange={change("occurrenceCount")} required/></label>}</div><label>Note<textarea value={form.note} onChange={change("note")} maxLength="5000" rows="3"/></label><div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Annulla</button><button className="primary">Salva pianificazione</button></div></form>;
}

function NotificationPanel({ permission, onEnable }) {
  const unsupported = permission === "unsupported", denied = permission === "denied", granted = permission === "granted";
  return <section className={`panel notification-panel ${granted?"enabled":denied?"denied":""}`}><div>{granted?<BellRing/>:denied||unsupported?<BellOff/>:<Bell/>}<span><strong>{granted?"Notifiche di sistema attive":denied?"Notifiche bloccate":unsupported?"Notifiche non supportate":"Attiva le notifiche di scadenza"}</strong><small>{granted?"Gli avvisi vengono mostrati quando l’app è aperta o viene riaperta.":denied?"Puoi riattivarle dalle impostazioni del browser.":unsupported?"Gli avvisi restano comunque visibili nell’app.":"Il browser chiederà il permesso una sola volta."}</small></span></div>{!granted&&!denied&&!unsupported&&<button className="ghost" onClick={onEnable}>Attiva notifiche</button>}</section>;
}

export default function PaymentSchedules({ accounts, transactions, schedules, notificationPermission, onEnableNotifications, onNew, onEdit, onDelete, onComplete }) {
  const referenceDate = today();
  const accountNames = new Map(accounts.map((item)=>[item.id,item.name]));
  const rows = schedules.map((item)=>({ item, state:paymentScheduleState(item,referenceDate) })).sort((a,b)=>{
    const aDate=a.state.dueDates[0]||a.state.nextDate||"9999-12-31",bDate=b.state.dueDates[0]||b.state.nextDate||"9999-12-31";
    return aDate.localeCompare(bDate)||a.item.name.localeCompare(b.item.name,"it");
  });
  const dueCount = duePaymentCount(schedules, referenceDate);
  return <><header className="page-heading"><div><p className="eyebrow">SCADENZE</p><h1>Pianificazioni</h1><p>Pagamenti singoli e ricorrenti con promemoria alla scadenza.</p></div><button className="primary" disabled={!accounts.length} onClick={onNew}><Plus size={18}/>Nuova pianificazione</button></header><NotificationPanel permission={notificationPermission} onEnable={onEnableNotifications}/><section className="schedule-summary"><article className="panel"><BellRing/><div><strong>{dueCount}</strong><span>Eventi da gestire</span></div></article><article className="panel"><CalendarClock/><div><strong>{schedules.length}</strong><span>Pianificazioni totali</span></div></article></section>{rows.length?<section className="schedule-list">{rows.map(({item,state})=>{const firstDue=state.dueDates[0];const status=state.overdue?"overdue":state.dueToday?"today":state.completed?"completed":"upcoming";const statusLabel=state.overdue?`${state.overdue} scadute`:state.dueToday?"Scade oggi":state.completed?"Completata":"Programmata";return <article className={`panel schedule-card ${status}`} key={item.id}><div className="schedule-card-icon">{state.completed?<CalendarCheck/>:<CalendarClock/>}</div><div className="schedule-card-main"><div><h2>{item.name}</h2><span className={`schedule-status ${status}`}>{statusLabel}</span></div><p>{item.category} · {accountNames.get(item.accountId)||"Conto rimosso"}</p>{item.note&&<small>{item.note}</small>}<div className="schedule-meta"><span><strong>{scheduleFrequencyLabels[item.frequency]||scheduleFrequencyLabels.none}</strong>{item.endMode==="date"?` · fino al ${dateLabel(item.endDate)}`:item.endMode==="count"?` · ${item.occurrenceCount} eventi`:item.frequency!=="none"?" · senza fine":""}</span><span>{firstDue?<>Da gestire: <strong>{dateLabel(firstDue)}</strong>{state.dueDates.length>1?` e altre ${state.dueDates.length-1}`:""}</>:state.nextDate?<>Prossima: <strong>{dateLabel(state.nextDate)}</strong></>:"Nessun evento futuro"}</span></div></div><div className="schedule-actions">{firstDue&&<button className="complete-button" onClick={()=>onComplete(item,firstDue)}><Check size={17}/>Segna eseguito</button>}<button className="icon-button" title="Modifica" aria-label={`Modifica ${item.name}`} onClick={()=>onEdit(item)}><Pencil size={17}/></button><button className="icon-button" title="Elimina" aria-label={`Elimina ${item.name}`} onClick={()=>onDelete(item)}><Trash2 size={17}/></button></div></article>})}</section>:<div className="panel schedule-empty"><CalendarClock size={38}/><h2>Nessuna pianificazione</h2><p>Aggiungi un pagamento singolo o ricorrente per ricevere un avviso alla scadenza.</p></div>}</>;
}
