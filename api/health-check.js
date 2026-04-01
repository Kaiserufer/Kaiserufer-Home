import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://oqjcbxnbododdqlbdekt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamNieG5ib2RvZGRxbGJkZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTg3NzAsImV4cCI6MjA4Njk5NDc3MH0.2Ig0I_Wd26LAX7FAVTUz9SdJFaLeAOh394pT3FT6i_w"
);

const STANDARD_PRICES = { BASIS: 299, PLUS: 499, DELUXE: 899 };
const OLD_PRICES = [350, 399, 759]; // Alte Stammkunden-Preise
const ALL_VALID_PRICES = [0, 299, 350, 399, 499, 759, 899];

// Bekannte Netto-Preise und ihr Brutto-Gegenstück (19% MwSt.)
const NETTO_TO_BRUTTO = {
  251.26: 299, 251.2605042017: 299,
  293.28: 349, 294.12: 350,
  335.29: 399, 335.2941176471: 399,
  419.33: 499, 419.3277310924: 499,
  637.82: 759, 637.8151260504: 759,
  755.46: 899, 755.4621848739: 899,
};

async function getSetting(key) {
  const { data } = await sb.from("einstellungen").select("value").eq("key", key).single();
  return data?.value || "";
}

function berlinToday() {
  const now = new Date();
  const mo = now.getUTCMonth();
  const d = now.getUTCDate();
  const isCEST = (mo > 2 && mo < 9) || (mo === 2 && d >= 31 - new Date(now.getUTCFullYear(), 2, 31).getDay()) || (mo === 9 && d < 31 - new Date(now.getUTCFullYear(), 9, 31).getDay());
  const berlinOffset = isCEST ? 2 : 1;
  const berlin = new Date(now.getTime() + berlinOffset * 60 * 60 * 1000);
  return `${berlin.getUTCFullYear()}-${String(berlin.getUTCMonth() + 1).padStart(2, "0")}-${String(berlin.getUTCDate()).padStart(2, "0")}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const autofix = req.query.fix !== "false"; // Default: auto-fix enabled
  const results = { timestamp: new Date().toISOString(), checks: [], fixes: [], warnings: [], errors: [] };

  try {
    // Load all data
    const [patRes, passRes, logRes, einzelRes, auditRes] = await Promise.all([
      sb.from("patienten").select("*"),
      sb.from("paesse").select("*"),
      sb.from("log").select("*"),
      sb.from("einzel").select("*"),
      sb.from("einstellungen").select("value").eq("key", "audit_log").single(),
    ]);

    const patienten = patRes.data || [];
    const paesse = passRes.data || [];
    const logs = logRes.data || [];
    const einzel = einzelRes.data || [];
    const todayStr = berlinToday();

    // ── MANUELL-SCHUTZ: Alle Pässe/Patienten mit manuellen Änderungen identifizieren ──
    // Alles was manuell eingegeben oder korrigiert wurde, wird NIEMALS vom System verändert.
    let auditEntries = [];
    try {
      // Versuche audit_log Tabelle
      const { data: auditData, error: auditErr } = await sb.from("audit_log").select("*");
      if (!auditErr && auditData) {
        auditEntries = auditData;
      } else if (auditRes.data?.value) {
        auditEntries = JSON.parse(auditRes.data.value);
      }
    } catch (e) { /* Audit nicht verfügbar — trotzdem weitermachen */ }

    // Set von Pass-IDs die manuell bearbeitet wurden (MANUELL/INTERN Quelle)
    const manuallyEditedPasses = new Set();
    const manuallyEditedPatients = new Set();
    for (const entry of auditEntries) {
      if (entry.quelle === "MANUELL" || entry.quelle === "INTERN") {
        if (entry.pass_id) manuallyEditedPasses.add(entry.pass_id);
        if (entry.pat_id) manuallyEditedPatients.add(entry.pat_id);
      }
    }
    // Auch Log-Einträge mit quelle=MANUELL als Schutz
    for (const l of logs) {
      if (l.quelle === "MANUELL") {
        if (l.pass_id) manuallyEditedPasses.add(l.pass_id);
        if (l.pat_id) manuallyEditedPatients.add(l.pat_id);
      }
    }

    const patMap = new Map(patienten.map(p => [p.id, p]));
    const passMap = new Map(paesse.map(p => [p.id, p]));

    // ══════════════════════════════════════════
    // 1. HE/GA-ZÄHLER vs. LOG (KRITISCH)
    // Nur AUFWÄRTS korrigieren — nie Einheiten reduzieren!
    // Korrektur-Logs (HE/GA zurückgeben) berücksichtigen
    // ══════════════════════════════════════════
    results.checks.push("HE/GA-Zähler vs. Log-Einträge");

    for (const pass of paesse) {
      const passLogs = logs.filter(l => l.pass_id === pass.id);
      const heFromLog = passLogs.filter(l => l.typ === "HAUPTEINHEIT").length;
      const gaFromLog = passLogs.filter(l => l.typ === "BS").length;

      // Korrektur-Logs: "HE +N zurück" oder "GA +N zurück" geben Einheiten zurück
      const heKorr = passLogs.filter(l => l.typ === "KORREKTUR" && (l.notiz || "").includes("HE"))
        .reduce((s, l) => { const m = (l.notiz || "").match(/\+(\d+)/); return s + (m ? parseInt(m[1]) : 0); }, 0);
      const gaKorr = passLogs.filter(l => l.typ === "KORREKTUR" && (l.notiz || "").includes("GA"))
        .reduce((s, l) => { const m = (l.notiz || "").match(/\+(\d+)/); return s + (m ? parseInt(m[1]) : 0); }, 0);

      const expectedHE = Math.max(0, heFromLog - heKorr);
      const expectedGA = Math.max(0, gaFromLog - gaKorr);

      // Nur aufwärts korrigieren: wenn Log mehr Einheiten zeigt als der Zähler
      // ★ MANUELL-SCHUTZ: Bei manuell bearbeiteten Pässen NUR warnen, nie auto-fixen
      const isManual = manuallyEditedPasses.has(pass.id);

      if (expectedHE > (pass.he_genutzt || 0)) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;

        if (isManual) {
          results.warnings.push(`HE-Differenz (manuell geschützt): ${name} Pass ${pass.rechnung || pass.id} — Zähler: ${pass.he_genutzt}, Logs: ${expectedHE}. Manuell gesetzt → nicht verändert.`);
        } else if (autofix) {
          await sb.from("paesse").update({ he_genutzt: expectedHE }).eq("id", pass.id);
          results.fixes.push(`HE-Zähler erhöht: ${name} Pass ${pass.rechnung || pass.id} — ${pass.he_genutzt}→${expectedHE} (${heFromLog} Logs, ${heKorr} Korrekturen)`);
        } else {
          results.errors.push(`HE zu niedrig: ${name} Pass ${pass.rechnung || pass.id} — DB sagt ${pass.he_genutzt}, erwartet ${expectedHE}`);
        }
      }

      if (expectedGA > (pass.bs_genutzt || 0)) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;

        if (isManual) {
          results.warnings.push(`GA-Differenz (manuell geschützt): ${name} Pass ${pass.rechnung || pass.id} — Zähler: ${pass.bs_genutzt}, Logs: ${expectedGA}. Manuell gesetzt → nicht verändert.`);
        } else if (autofix) {
          await sb.from("paesse").update({ bs_genutzt: expectedGA }).eq("id", pass.id);
          results.fixes.push(`GA-Zähler erhöht: ${name} Pass ${pass.rechnung || pass.id} — ${pass.bs_genutzt}→${expectedGA}`);
        } else {
          results.errors.push(`GA zu niedrig: ${name} Pass ${pass.rechnung || pass.id} — DB sagt ${pass.bs_genutzt}, erwartet ${expectedGA}`);
        }
      }

      // Warnung wenn Zähler HÖHER als erwartet (manuell eingetragen, aber nicht verringern)
      if ((pass.he_genutzt || 0) > expectedHE && expectedHE >= 0) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;
        if ((pass.he_genutzt || 0) - expectedHE > 0) {
          results.warnings.push(`HE-Zähler höher als Logs: ${name} Pass ${pass.rechnung || pass.id} — Zähler: ${pass.he_genutzt}, Logs: ${expectedHE} (manuell eingetragen?)`);
        }
      }
    }

    // ══════════════════════════════════════════
    // 2. NETTO-PREISE → BRUTTO
    // ══════════════════════════════════════════
    results.checks.push("Netto-Preis-Erkennung");

    for (const pass of paesse) {
      const preis = pass.preis || 0;
      if (preis === 0) continue;

      // ★ MANUELL-SCHUTZ: Manuell gesetzte Preise NIEMALS ändern
      if (manuallyEditedPasses.has(pass.id)) continue;

      // Check if price matches a known netto value
      const rounded4 = Math.round(preis * 10000) / 10000;
      const bruttoMatch = NETTO_TO_BRUTTO[rounded4] || NETTO_TO_BRUTTO[Math.round(preis * 100) / 100];

      if (bruttoMatch) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;

        if (autofix) {
          await sb.from("paesse").update({ preis: bruttoMatch }).eq("id", pass.id);
          results.fixes.push(`Netto→Brutto korrigiert: ${name} Pass ${pass.rechnung || pass.id} — ${preis}€→${bruttoMatch}€`);
        } else {
          results.errors.push(`Netto-Preis: ${name} Pass ${pass.rechnung || pass.id} — ${preis}€ (sollte ${bruttoMatch}€ brutto sein)`);
        }
      }

      // Check for prices with too many decimals (Shore artifact)
      const prStr = String(preis);
      if (prStr.includes(".") && prStr.split(".")[1].length > 2) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;

        if (!bruttoMatch) {
          // Round to 2 decimals if no brutto match found
          const rounded = Math.round(preis * 100) / 100;
          if (autofix) {
            await sb.from("paesse").update({ preis: rounded }).eq("id", pass.id);
            results.fixes.push(`Preis gerundet: ${name} Pass ${pass.rechnung || pass.id} — ${preis}€→${rounded}€`);
          } else {
            results.warnings.push(`Dezimal-Preis: ${name} Pass ${pass.rechnung || pass.id} — ${preis}€`);
          }
        }
      }
    }

    // ══════════════════════════════════════════
    // 3. ÜBERVERBRAUCH (he_genutzt > he_total)
    // ══════════════════════════════════════════
    results.checks.push("Überverbrauch-Prüfung");

    for (const pass of paesse) {
      if ((pass.he_genutzt || 0) > (pass.he_total || 0) && (pass.he_total || 0) > 0) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;
        results.errors.push(`Überverbrauch HE: ${name} Pass ${pass.rechnung || pass.id} — ${pass.he_genutzt}/${pass.he_total}`);
      }
      if ((pass.bs_genutzt || 0) > (pass.bs_total || 0) && (pass.bs_total || 0) > 0) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;
        results.errors.push(`Überverbrauch GA: ${name} Pass ${pass.rechnung || pass.id} — ${pass.bs_genutzt}/${pass.bs_total}`);
      }
    }

    // ══════════════════════════════════════════
    // 4. AUFGEBRAUCHTE ABER AKTIVE PÄSSE
    // ══════════════════════════════════════════
    results.checks.push("Aufgebrauchte aktive Pässe");

    for (const pass of paesse) {
      if (!pass.aktiv) continue;
      const isZero = (pass.he_total || 0) === 0 && (pass.bs_total || 0) === 0;
      const heDone = isZero || (pass.he_genutzt || 0) >= (pass.he_total || 1);
      const gaDone = isZero || (pass.bs_genutzt || 0) >= (pass.bs_total || 1);
      if (heDone && gaDone) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;
        results.warnings.push(`Aufgebraucht aber aktiv: ${name} Pass ${pass.rechnung || pass.id} (HE ${pass.he_genutzt}/${pass.he_total}, GA ${pass.bs_genutzt}/${pass.bs_total})`);
        // Nicht auto-fixen: aktiv-Status wird in der UI bewusst gesetzt
      }
    }

    // ══════════════════════════════════════════
    // 5. DOPPELTE AKTIVE PÄSSE
    // ══════════════════════════════════════════
    results.checks.push("Doppelte aktive Pässe");

    const aktivPerPat = {};
    for (const pass of paesse) {
      const isZero = (pass.he_total || 0) === 0 && (pass.bs_total || 0) === 0;
      const heDone = isZero || (pass.he_genutzt || 0) >= (pass.he_total || 1);
      const gaDone = isZero || (pass.bs_genutzt || 0) >= (pass.bs_total || 1);
      if (heDone && gaDone) continue; // Aufgebraucht = nicht wirklich aktiv
      if (!aktivPerPat[pass.pat_id]) aktivPerPat[pass.pat_id] = [];
      aktivPerPat[pass.pat_id].push(pass);
    }

    for (const [patId, passes] of Object.entries(aktivPerPat)) {
      if (passes.length > 1) {
        const pat = patMap.get(patId);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : patId;
        const sorted = passes.sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
        const info = sorted.map(p => `${p.rechnung || p.id} (${p.datum}, ${p.he_genutzt}/${p.he_total} HE)`).join(", ");
        results.warnings.push(`Mehrere aktive Pässe: ${name} — ${info}. Ältester wird zuerst verbraucht.`);
      }
    }

    // ══════════════════════════════════════════
    // 6. DOPPELTE RECHNUNGSNUMMERN
    // ══════════════════════════════════════════
    results.checks.push("Doppelte Rechnungsnummern");

    const rechnungen = {};
    for (const pass of paesse) {
      if (!pass.rechnung) continue;
      if (!rechnungen[pass.rechnung]) rechnungen[pass.rechnung] = [];
      rechnungen[pass.rechnung].push(pass);
    }
    for (const [rn, passes] of Object.entries(rechnungen)) {
      if (passes.length > 1) {
        const names = passes.map(p => {
          const pat = patMap.get(p.pat_id);
          return pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : p.pat_id;
        });
        results.warnings.push(`Doppelte Rechnung ${rn}: ${names.join(", ")}`);
      }
    }

    // ══════════════════════════════════════════
    // 7. BEZAHLT-STATUS BEI AUFGEBRAUCHTEN
    // ══════════════════════════════════════════
    results.checks.push("Bezahlt-Status");

    for (const pass of paesse) {
      const isZero = (pass.he_total || 0) === 0 && (pass.bs_total || 0) === 0;
      const heDone = isZero || (pass.he_genutzt || 0) >= (pass.he_total || 1);
      const gaDone = isZero || (pass.bs_genutzt || 0) >= (pass.bs_total || 1);
      if (heDone && gaDone && !pass.bezahlt) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;
        results.warnings.push(`Aufgebraucht aber OFFEN: ${name} Pass ${pass.rechnung || pass.id} (${pass.preis || 0}€)`);
      }
    }

    // ══════════════════════════════════════════
    // 8. VERWAISTE DATEN
    // ══════════════════════════════════════════
    results.checks.push("Verwaiste Daten");

    for (const pass of paesse) {
      if (!patMap.has(pass.pat_id)) {
        results.errors.push(`Verwaister Pass: ${pass.id} (Rechnung ${pass.rechnung || "–"}) → Patient ${pass.pat_id} existiert nicht`);
      }
    }

    for (const l of logs) {
      if (l.pass_id && !passMap.has(l.pass_id)) {
        // Log zeigt auf gelöschten Pass — nur warnen wenn es kein PASS_GELOESCHT ist
        if (l.typ !== "PASS_GELOESCHT") {
          results.warnings.push(`Verwaister Log: ${l.id} (${l.typ}) → Pass ${l.pass_id} existiert nicht mehr`);
        }
      }
    }

    // ══════════════════════════════════════════
    // 9. DOPPELTE AUTO-ABZÜGE AM SELBEN TAG
    // ══════════════════════════════════════════
    results.checks.push("Doppelte Auto-Abzüge heute");

    const todayLogs = logs.filter(l => l.typ === "HAUPTEINHEIT" && l.quelle === "SHORE" && (l.datum || "").startsWith(todayStr));
    const todayPatDeducts = {};
    for (const l of todayLogs) {
      if (!todayPatDeducts[l.pat_id]) todayPatDeducts[l.pat_id] = [];
      todayPatDeducts[l.pat_id].push(l);
    }
    for (const [patId, dedLogs] of Object.entries(todayPatDeducts)) {
      if (dedLogs.length > 1) {
        const pat = patMap.get(patId);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : patId;
        results.errors.push(`Doppelter Auto-Abzug heute: ${name} — ${dedLogs.length}x HE abgezogen (SHORE)`);
      }
    }

    // ══════════════════════════════════════════
    // 10. SHORE CALDAV VERBINDUNG
    // ══════════════════════════════════════════
    results.checks.push("Shore CalDAV Verbindung");

    try {
      const email = await getSetting("shore_caldav_email");
      const password = await getSetting("shore_caldav_password");
      if (!email || !password) {
        results.errors.push("CalDAV-Zugangsdaten fehlen");
      } else {
        const caldavRes = await fetch("https://sync.shore.com/caldav/calendars/f3d4f000-9c74-42b0-b162-6c5fabd0d1f7", {
          method: "PROPFIND",
          headers: {
            "Authorization": "Basic " + Buffer.from(email + ":" + password).toString("base64"),
            "Depth": "0",
          },
        });
        if (caldavRes.ok || caldavRes.status === 207) {
          results.checks.push("CalDAV OK ✓");
        } else {
          results.errors.push(`CalDAV Fehler: Status ${caldavRes.status}`);
        }
      }
    } catch (e) {
      results.errors.push(`CalDAV nicht erreichbar: ${e.message}`);
    }

    // ══════════════════════════════════════════
    // 11. SHORE POS TOKEN
    // ══════════════════════════════════════════
    results.checks.push("Shore POS Token");

    try {
      const token = await getSetting("shore_access_token");
      if (!token) {
        results.warnings.push("Kein Shore POS Token gespeichert");
      } else {
        const testRes = await fetch("https://app.inventorum.com/api/orders/?limit=1", {
          headers: { "Authorization": `Bearer ${token}`, "X-Api-Version": "8", "Accept": "application/json" },
        });
        if (testRes.ok) {
          results.checks.push("Shore POS OK ✓");
        } else if (testRes.status === 401) {
          results.warnings.push("Shore POS Token abgelaufen — wird beim nächsten pass-check erneuert");
        } else {
          results.warnings.push(`Shore POS Fehler: Status ${testRes.status}`);
        }
      }
    } catch (e) {
      results.warnings.push(`Shore POS nicht erreichbar: ${e.message}`);
    }

    // ══════════════════════════════════════════
    // 12. PROCESSED-LISTE OVERFLOW
    // ══════════════════════════════════════════
    results.checks.push("Processed-Listen Größe");

    const processedAppts = await getSetting("shore_processed_appointments");
    const processedOrders = await getSetting("pass_processed_orders");
    const apptCount = processedAppts ? JSON.parse(processedAppts).length : 0;
    const orderCount = processedOrders ? JSON.parse(processedOrders).length : 0;

    if (apptCount > 800) results.warnings.push(`Processed Appointments: ${apptCount}/1000 — nähert sich dem Limit`);
    if (orderCount > 400) results.warnings.push(`Processed Orders: ${orderCount}/500 — nähert sich dem Limit`);

    // ══════════════════════════════════════════
    // 13. PATIENTEN-DUPLIKATE
    // ══════════════════════════════════════════
    results.checks.push("Patienten-Duplikate");

    const nameMap = {};
    for (const pat of patienten) {
      if (pat.mitarbeiter) continue;
      const fullName = `${(pat.vorname || "").toLowerCase().trim()} ${(pat.nachname || "").toLowerCase().trim()}`.trim();
      if (!fullName || fullName.length < 3) continue;
      if (!nameMap[fullName]) nameMap[fullName] = [];
      nameMap[fullName].push(pat);
    }
    for (const [name, pats] of Object.entries(nameMap)) {
      if (pats.length > 1) {
        const ids = pats.map(p => p.id).join(", ");
        results.warnings.push(`Mögliches Duplikat: "${name}" (${pats.length}x) — IDs: ${ids}`);
      }
    }

    // ══════════════════════════════════════════
    // 14. FEHLENDE KATEGORISIERUNG
    // ══════════════════════════════════════════
    results.checks.push("Patienten-Kategorisierung");

    // ★ MANUELL-SCHUTZ: Manuell bearbeitete Patienten nicht auto-kategorisieren
    const uncategorized = patienten.filter(p => !p.mitarbeiter && !p.therapie && !p.ergotherapie && !p.sonstige && !manuallyEditedPatients.has(p.id));
    if (uncategorized.length > 0) {
      if (autofix) {
        for (const p of uncategorized) {
          await sb.from("patienten").update({ therapie: true }).eq("id", p.id);
        }
        results.fixes.push(`${uncategorized.length} Patienten als Therapie kategorisiert (fehlte)`);
      } else {
        results.warnings.push(`${uncategorized.length} Patienten ohne Kategorisierung`);
      }
    }

    // ══════════════════════════════════════════
    // 15. ZUKUNFTS-/VERGANGENHEITS-DATEN
    // ══════════════════════════════════════════
    results.checks.push("Datum-Plausibilität");

    const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    for (const pass of paesse) {
      if (pass.datum && pass.datum > tomorrow) {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;
        results.warnings.push(`Zukunfts-Datum: ${name} Pass ${pass.rechnung || pass.id} — ${pass.datum}`);
      }
      if (pass.datum && pass.datum < "2020-01-01") {
        const pat = patMap.get(pass.pat_id);
        const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;
        results.warnings.push(`Unrealistisches Datum: ${name} Pass ${pass.rechnung || pass.id} — ${pass.datum}`);
      }
    }

    // ══════════════════════════════════════════
    // 16. PDF-RECHNUNGS-VALIDIERUNG
    // Vergleicht hinterlegte PDF-Dateinamen mit Pass-Daten
    // Format: Kaiserufer-{RechnungsNr}-{YYYYMMDD}.pdf oder Kaiserufer-{RechnungsNr}.pdf
    // NUR Warnungen — ändert NICHTS automatisch
    // ══════════════════════════════════════════
    results.checks.push("PDF-Rechnungs-Validierung");

    for (const pass of paesse) {
      if (!pass.rechnung_pdf) continue;
      const pdfUrl = pass.rechnung_pdf;
      // Dateiname aus URL extrahieren
      const filename = pdfUrl.split("/").pop() || "";
      if (!filename.toLowerCase().endsWith(".pdf")) continue;

      const pat = patMap.get(pass.pat_id);
      const name = pat ? `${pat.vorname || ""} ${pat.nachname || ""}`.trim() : pass.pat_id;

      // Muster: Kaiserufer-459.pdf oder Kaiserufer-459-20260310.pdf
      const match = filename.match(/Kaiserufer[_-](\d+)(?:[_-](\d{8}))?/i);
      if (!match) {
        results.warnings.push(`PDF-Dateiname unbekanntes Format: ${name} — "${filename}" (Pass ${pass.rechnung || pass.id})`);
        continue;
      }

      const pdfRechnung = match[1]; // z.B. "459"
      const pdfDateStr = match[2]; // z.B. "20260310" oder undefined

      // Rechnungsnummer prüfen
      const passRechnung = (pass.rechnung || "").replace(/[^0-9]/g, ""); // Nur Ziffern
      if (pdfRechnung && passRechnung && pdfRechnung !== passRechnung) {
        results.warnings.push(`PDF-Rechnung stimmt nicht: ${name} — PDF sagt RN ${pdfRechnung}, Pass sagt "${pass.rechnung}". Bitte prüfen.`);
      }

      // Datum prüfen (wenn im Dateinamen vorhanden)
      if (pdfDateStr && pass.datum) {
        const pdfDate = `${pdfDateStr.substring(0, 4)}-${pdfDateStr.substring(4, 6)}-${pdfDateStr.substring(6, 8)}`;
        const passDate = (pass.datum || "").substring(0, 10);
        if (pdfDate !== passDate) {
          results.warnings.push(`PDF-Datum stimmt nicht: ${name} — PDF sagt ${pdfDate}, Pass sagt ${passDate}. Bitte prüfen.`);
        }
      }
    }

    // ══════════════════════════════════════════
    // ZUSAMMENFASSUNG
    // ══════════════════════════════════════════
    results.summary = {
      patienten: patienten.length,
      paesse: paesse.length,
      logs: logs.length,
      checks: results.checks.length,
      fixes: results.fixes.length,
      warnings: results.warnings.length,
      errors: results.errors.length,
      healthy: results.errors.length === 0,
    };

    return res.status(200).json(results);
  } catch (e) {
    return res.status(500).json({ error: e.message, results });
  }
}
