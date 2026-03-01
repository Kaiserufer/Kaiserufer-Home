// Kaiserufer Shore Tag Sync - Popup Logic
// Uses Vercel API endpoint for Supabase operations (bypasses RLS)

const API_URL = "https://home.kaiserufer.com/api/ergo-sync";

const statusEl = document.getElementById("status");
const inspectBox = document.getElementById("inspect-box");
const resultsEl = document.getElementById("results");
const btnInspect = document.getElementById("btn-inspect");
const btnSync = document.getElementById("btn-sync");

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = "status visible " + type;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToContent(tab, message) {
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (e) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    return await chrome.tabs.sendMessage(tab.id, message);
  }
}

// ---- INSPECT ----
btnInspect.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.url?.includes("shore.com")) {
    setStatus("Bitte Shore öffnen (my.shore.com)", "error");
    return;
  }

  setStatus("Inspiziere Seite...", "loading");
  btnInspect.disabled = true;

  try {
    const info = await sendToContent(tab, { action: "INSPECT" });
    inspectBox.className = "inspect-box visible";
    let output = `URL: ${info.url}\n\n`;
    if (info.hints?.length) {
      output += info.hints.join("\n");
    }
    inspectBox.textContent = output;
    setStatus("Inspektion abgeschlossen", "success");
  } catch (e) {
    setStatus("Fehler: " + e.message, "error");
  }

  btnInspect.disabled = false;
});

// ---- SYNC ----
btnSync.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.url?.includes("shore.com")) {
    setStatus("Bitte Shore öffnen (my.shore.com)", "error");
    return;
  }

  setStatus("Lese Ergo-Kunden aus Shore...", "loading");
  btnSync.disabled = true;
  resultsEl.className = "results";

  try {
    // 1. Scrape Ergo customers from calendar
    const shoreData = await sendToContent(tab, { action: "SCRAPE" });

    if (shoreData.error) {
      setStatus(shoreData.error, "error");
      btnSync.disabled = false;
      return;
    }

    if (!shoreData.customers?.length) {
      setStatus("Keine Ergo-Kunden gefunden", "error");
      btnSync.disabled = false;
      return;
    }

    const names = shoreData.customers.map(c => c.name);
    const email = document.getElementById("inp-email").value.trim();
    const password = document.getElementById("inp-pass").value;

    if (!email || !password) {
      setStatus("Bitte E-Mail und Passwort eingeben", "error");
      btnSync.disabled = false;
      return;
    }

    setStatus(`${names.length} Ergo-Kunden gefunden, sende an Server...`, "loading");

    // 2. Send names + credentials to Vercel API for matching + updating
    const apiRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names, email, password })
    });

    if (!apiRes.ok) {
      const err = await apiRes.json().catch(() => ({}));
      throw new Error(err.error || "API Fehler: " + apiRes.status);
    }

    const result = await apiRes.json();

    // 3. Show results
    setStatus(`Fertig: ${result.updated} aktualisiert, ${result.alreadySet} bereits gesetzt, ${result.notFound} nicht gefunden`, "success");
    showResults(result.updated, result.alreadySet, result.notFound, result.details || []);

  } catch (e) {
    setStatus("Fehler: " + e.message, "error");
  }

  btnSync.disabled = false;
});

function showResults(updated, alreadySet, notFound, details) {
  resultsEl.className = "results visible";

  let html = `<h3>Ergebnis</h3>`;
  html += `<div class="result-summary">`;
  html += `<div class="result-badge updated">${updated} aktualisiert</div>`;
  html += `<div class="result-badge already">${alreadySet} bereits</div>`;
  html += `<div class="result-badge notfound">${notFound} nicht gefunden</div>`;
  html += `</div>`;

  if (details.length > 0) {
    html += `<div class="result-list">`;
    details.forEach(d => {
      const tagClass = d.status === "updated" ? "tag-updated" : d.status === "already" ? "tag-already" : "tag-notfound";
      const tagText = d.status === "updated" ? "aktualisiert" : d.status === "already" ? "bereits" : "nicht gefunden";
      html += `<div class="result-item"><span class="name">${escapeHtml(d.name)}</span><span class="tag ${tagClass}">${tagText}</span></div>`;
    });
    html += `</div>`;
  }

  resultsEl.innerHTML = html;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
