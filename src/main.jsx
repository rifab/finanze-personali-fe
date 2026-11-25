import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const controlledAtStartup = Boolean(navigator.serviceWorker.controller);
  let updateNotified = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!controlledAtStartup || updateNotified) return;
    updateNotified = true;
    window.__APP_UPDATE_AVAILABLE__ = true;
    window.dispatchEvent(new CustomEvent("app-update-available"));
  });
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(__APP_VERSION__)}`, { updateViaCache: "none" });
      const checkForUpdates = () => registration.update().catch(() => {});
      window.addEventListener("focus", checkForUpdates);
      document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && checkForUpdates());
      window.setInterval(checkForUpdates, 5 * 60 * 1000);
    } catch {
      // L'app resta utilizzabile online anche se il browser rifiuta la registrazione PWA.
    }
  });
}
