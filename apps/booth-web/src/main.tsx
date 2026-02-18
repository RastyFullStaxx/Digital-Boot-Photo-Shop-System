import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

const queryClient = new QueryClient();

let pendingToastTimer: number | undefined;

function showToast(message: string) {
  const existing = document.querySelector(".toast");
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  if (pendingToastTimer) {
    window.clearTimeout(pendingToastTimer);
  }

  pendingToastTimer = window.setTimeout(() => {
    toast.remove();
    pendingToastTimer = undefined;
  }, 2000);
}

function setKioskMode(enabled: boolean) {
  if (enabled) {
    document.body.classList.add("kiosk");
  } else {
    document.body.classList.remove("kiosk");
  }
  localStorage.setItem("booth:kiosk", enabled ? "1" : "0");
}

function initKioskMode() {
  const saved = localStorage.getItem("booth:kiosk");
  if (saved === "1") {
    setKioskMode(true);
  }
}

function toggleKiosk() {
  const enabled = document.body.classList.contains("kiosk");
  const next = !enabled;
  setKioskMode(next);
  showToast(next ? "Kiosk mode enabled" : "Kiosk mode disabled");
}

function initKioskControls() {
  const controls = document.createElement("div");
  controls.className = "floating-controls";
  controls.innerHTML = `
    <button type="button" class="secondary" id="kiosk-toggle">
      Toggle Kiosk
    </button>
  `;
  document.body.appendChild(controls);
  controls.querySelector("#kiosk-toggle")?.addEventListener("click", toggleKiosk);

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "k" && event.shiftKey) {
      toggleKiosk();
    }
  });
}

initKioskMode();
initKioskControls();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
