import { useEffect, useRef, useState } from "react";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
const UPDATE_TIMEOUT = 10000;

export default function PwaUpdatePrompt({ blocked = false }) {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activationTimer = useRef(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return undefined;
    let active = true;
    let registration;
    let updateTimer;
    let installingWorker;

    const offerUpdate = (worker) => {
      if (!active || !worker || !navigator.serviceWorker.controller) return;
      setWaitingWorker(worker);
      setDismissed(false);
      setError("");
    };
    const handleInstallingState = () => {
      if (installingWorker?.state === "installed") offerUpdate(registration?.waiting || installingWorker);
    };
    const handleUpdateFound = () => {
      installingWorker?.removeEventListener("statechange", handleInstallingState);
      installingWorker = registration?.installing;
      installingWorker?.addEventListener("statechange", handleInstallingState);
      if (installingWorker?.state === "installed") offerUpdate(registration?.waiting || installingWorker);
    };
    const checkForUpdates = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };

    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(__APP_VERSION__)}`, { updateViaCache: "none" }).then((nextRegistration) => {
      if (!active) return;
      registration = nextRegistration;
      offerUpdate(registration.waiting);
      registration.addEventListener("updatefound", handleUpdateFound);
      document.addEventListener("visibilitychange", checkForUpdates);
      window.addEventListener("focus", checkForUpdates);
      updateTimer = window.setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
      checkForUpdates();
    }).catch(() => {
      // L'app resta utilizzabile online anche se il browser rifiuta la registrazione PWA.
    });

    let reloading = false;
    const handleControllerChange = () => {
      if (reloading) return;
      reloading = true;
      if (activationTimer.current) window.clearTimeout(activationTimer.current);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      active = false;
      installingWorker?.removeEventListener("statechange", handleInstallingState);
      registration?.removeEventListener("updatefound", handleUpdateFound);
      document.removeEventListener("visibilitychange", checkForUpdates);
      window.removeEventListener("focus", checkForUpdates);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      if (updateTimer) window.clearInterval(updateTimer);
      if (activationTimer.current) window.clearTimeout(activationTimer.current);
    };
  }, []);

  const activateUpdate = () => {
    if (!waitingWorker || blocked || busy) return;
    setBusy(true);
    setError("");
    try {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      activationTimer.current = window.setTimeout(() => {
        activationTimer.current = null;
        setBusy(false);
        setError("Aggiornamento non completato. Riprova oppure chiudi e riapri l'app.");
      }, UPDATE_TIMEOUT);
    } catch {
      setBusy(false);
      setError("Impossibile avviare l'aggiornamento. Riprova oppure chiudi e riapri l'app.");
    }
  };

  if (!waitingWorker || dismissed) return null;
  return <>
    {busy && <div className="update-blocking-loader" role="status"><strong>Aggiornamento dell'app in corso…</strong></div>}
    <aside className="update-prompt" role="status" aria-live="polite" aria-label="Aggiornamento disponibile">
      <div>
        <strong>Nuova versione disponibile</strong>
        <span>{blocked ? "Concludi o annulla le modifiche aperte prima di aggiornare." : "Aggiorna l'app per utilizzare l'ultima versione."}</span>
        {error && <small role="alert">{error}</small>}
      </div>
      <div className="update-prompt-actions">
        <button type="button" className="ghost" disabled={busy} onClick={() => setDismissed(true)}>Più tardi</button>
        <button type="button" className="primary" disabled={blocked || busy} onClick={activateUpdate}>Aggiorna ora</button>
      </div>
    </aside>
  </>;
}
