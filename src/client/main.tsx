import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");

window.addEventListener("error", (event) => {
  const target = document.getElementById("root");
  if (target) {
    target.innerHTML = `<main><font color="#f5f2ff"><strong>Gestald Vote</strong></font><p><font color="#ffb4b4">JavaScript error: ${escapeHtml(event.message)}</font></p></main>`;
  }
});

if (!root) {
  throw new Error("Root element was not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
