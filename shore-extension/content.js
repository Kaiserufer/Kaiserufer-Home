// Kaiserufer Shore Tag Sync - Content Script
// Scrapes Ergotherapie customers from Shore calendar list view

const ERGO_TAGS = ["ergotherapie", "ergo kinder", "neurofeedback", "ergo"];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "INSPECT") {
    sendResponse(inspectPage());
    return true;
  }
  if (msg.action === "SCRAPE") {
    sendResponse(scrapeErgoFromCalendar());
    return true;
  }
});

function inspectPage() {
  const info = { url: window.location.href, hints: [] };
  const isCalendar = window.location.pathname.includes("calendar");

  if (isCalendar) {
    // Find all appointment items
    const appointments = document.querySelectorAll('[class*="ListItem-styles---appointment"]');
    info.hints.push(`Termine gefunden: ${appointments.length}`);

    // Extract and show unique customers with their service
    const seen = new Map();
    appointments.forEach(appt => {
      const custEl = appt.querySelector('[class*="ListItem-styles---customer"]');
      const text = appt.textContent || "";
      const custName = custEl ? custEl.textContent.trim() : "?";

      // Find service type in text
      let service = "unbekannt";
      const textLower = text.toLowerCase();
      for (const tag of ERGO_TAGS) {
        if (textLower.includes(tag)) { service = tag; break; }
      }

      if (custName && custName !== "?" && !seen.has(custName)) {
        seen.set(custName, service);
      }
    });

    info.hints.push(`\nEindeutige Kunden: ${seen.size}`);
    let ergoCount = 0;
    seen.forEach((service, name) => {
      const isErgo = ERGO_TAGS.some(t => service.toLowerCase().includes(t));
      if (isErgo) ergoCount++;
      info.hints.push(`  ${isErgo ? "✓" : "✗"} ${name} → ${service}`);
    });
    info.hints.push(`\nDavon Ergo: ${ergoCount}`);
  } else {
    // Customer list
    const rows = document.querySelectorAll("tr.ant-v5-table-row");
    info.hints.push(`Kundenzeilen: ${rows.length}`);
    rows.forEach((row, i) => {
      const name = row.querySelector('[data-testid="customer-name"]')?.textContent?.trim() || "?";
      const groups = row.querySelector('[data-testid="customer-groups"]')?.textContent?.trim() || "(leer)";
      info.hints.push(`${i + 1}. ${name} | Gruppen: ${groups || "(leer)"}`);
    });
  }

  return info;
}

function scrapeErgoFromCalendar() {
  const results = { customers: [], error: null };

  const appointments = document.querySelectorAll('[class*="ListItem-styles---appointment"]');

  if (appointments.length === 0) {
    results.error = "Keine Termine gefunden. Bitte Kalender-Listenansicht öffnen.";
    return results;
  }

  const seen = new Set();

  appointments.forEach(appt => {
    const text = (appt.textContent || "").toLowerCase();

    // Check if this appointment is an Ergo service
    const isErgo = ERGO_TAGS.some(tag => text.includes(tag));
    if (!isErgo) return;

    // Get customer name from the dedicated element
    const custEl = appt.querySelector('[class*="ListItem-styles---customer"]');
    if (!custEl) return;

    let name = custEl.textContent.trim();

    // Name might have phone number attached - split at + or digits after name
    // Pattern: "Maya Voss+4917643526773" → "Maya Voss"
    name = name.replace(/\+?\d{6,}.*$/, "").trim();

    if (name && name.length > 1 && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      results.customers.push({ shoreId: null, name, tags: ["ergo"] });
    }
  });

  if (results.customers.length === 0) {
    results.error = "Keine Ergo-Kunden in den Terminen gefunden.";
  }

  return results;
}
