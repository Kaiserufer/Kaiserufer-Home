import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://oqjcbxnbododdqlbdekt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamNieG5ib2RvZGRxbGJkZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTg3NzAsImV4cCI6MjA4Njk5NDc3MH0.2Ig0I_Wd26LAX7FAVTUz9SdJFaLeAOh394pT3FT6i_w"
);

const CALENDAR_URL = "https://sync.shore.com/caldav/calendars/f3d4f000-9c74-42b0-b162-6c5fabd0d1f7";

async function getSetting(key) {
  const { data } = await sb.from("einstellungen").select("value").eq("key", key).single();
  return data?.value || "";
}

async function saveSetting(key, value) {
  await sb.from("einstellungen").upsert({ key, value });
}

// Berlin-Datum (YYYY-MM-DD) → UTC CalDAV Start/End Strings
function berlinDateToUTCRange(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const berlinOffset = isCEST(y, m - 1, d) ? 2 : 1;
  const startUTC = new Date(Date.UTC(y, m - 1, d, -berlinOffset, 0, 0));
  const endUTC = new Date(Date.UTC(y, m - 1, d + 1, -berlinOffset, 0, 0));
  const fmt = (dt) =>
    `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}T${String(dt.getUTCHours()).padStart(2, "0")}${String(dt.getUTCMinutes()).padStart(2, "0")}00Z`;
  return { start: fmt(startUTC), end: fmt(endUTC) };
}

// Heutiges Datum in Berlin berechnen
function berlinToday() {
  const now = new Date();
  const berlinOffset = isCEST(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) ? 2 : 1;
  const berlin = new Date(now.getTime() + berlinOffset * 60 * 60 * 1000);
  return `${berlin.getUTCFullYear()}-${String(berlin.getUTCMonth() + 1).padStart(2, "0")}-${String(berlin.getUTCDate()).padStart(2, "0")}`;
}

// Fetch today's appointments via CalDAV REPORT
async function fetchCalendarEvents(email, password) {
  const { start: utcStart, end: utcEnd } = berlinDateToUTCRange(berlinToday());

  const xml = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${utcStart}" end="${utcEnd}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

  const res = await fetch(CALENDAR_URL, {
    method: "REPORT",
    headers: {
      "Authorization": "Basic " + Buffer.from(email + ":" + password).toString("base64"),
      "Content-Type": "application/xml; charset=utf-8",
      "Depth": "1",
    },
    body: xml,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CalDAV Fehler: ${res.status} – ${body.slice(0, 200)}`);
  }

  return await res.text();
}

// Parse iCalendar VEVENT data from CalDAV XML response
function parseEvents(xmlText) {
  const events = [];
  // Extract calendar-data sections
  const calDataRegex = /<(?:cal|C):calendar-data[^>]*>([\s\S]*?)<\/(?:cal|C):calendar-data>/gi;
  let match;
  while ((match = calDataRegex.exec(xmlText)) !== null) {
    let ical = match[1];
    // Unescape XML entities
    ical = ical.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

    // Extract VEVENT blocks
    const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
    let vm;
    while ((vm = veventRegex.exec(ical)) !== null) {
      const block = vm[1];
      const get = (key) => {
        // Match property with optional params: KEY;PARAM=VAL:value or KEY:value
        const re = new RegExp(`^${key}(;[^:]*)?:(.*)$`, "mi");
        const m = block.match(re);
        if (!m) return "";
        return (m[2] || "").trim();
      };

      const uid = get("UID");
      const summary = get("SUMMARY");
      const customer = get("X-CUSTOMER");
      const service = get("X-SERVICE").replace(/\\,/g, ",");
      const email = get("X-EMAIL");
      const dtstart = get("DTSTART");
      const dtend = get("DTEND");

      // Check for cancellation
      const status = get("STATUS");
      const isCancelled = status.toUpperCase() === "CANCELLED";

      events.push({ uid, summary, customer, service, email, dtstart, dtend, isCancelled });
    }
  }
  return events;
}

// Parse CalDAV datetime (20260306T090000) to JS Date (Europe/Berlin)
function parseCalDateTime(dtStr) {
  if (!dtStr || dtStr.length < 15) return null;
  const y = parseInt(dtStr.substring(0, 4));
  const mo = parseInt(dtStr.substring(4, 6)) - 1;
  const d = parseInt(dtStr.substring(6, 8));
  const h = parseInt(dtStr.substring(9, 11));
  const mi = parseInt(dtStr.substring(11, 13));
  const s = parseInt(dtStr.substring(13, 15));
  // Determine Berlin offset: CET (UTC+1) or CEST (UTC+2)
  // CEST starts last Sunday of March, ends last Sunday of October
  const berlinOffset = isCEST(y, mo, d) ? 2 : 1;
  return new Date(Date.UTC(y, mo, d, h - berlinOffset, mi, s));
}

// Check if a date falls in Central European Summer Time (CEST)
function isCEST(year, month, day) {
  // month is 0-indexed: March=2, October=9
  if (month < 2 || month > 9) return false; // Nov-Feb → CET
  if (month > 2 && month < 9) return true;   // Apr-Sep → CEST
  // March: CEST starts last Sunday at 02:00
  if (month === 2) {
    const lastSunday = 31 - new Date(year, 2, 31).getDay();
    return day >= lastSunday;
  }
  // October: CEST ends last Sunday at 03:00
  const lastSunday = 31 - new Date(year, 9, 31).getDay();
  return day < lastSunday;
}

// Match customer name from CalDAV to patienten record
function matchPatient(customerName, patienten) {
  if (!customerName) return null;
  const parts = customerName.toLowerCase().trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0) return null;
  return patienten.find(p => {
    const full = `${p.vorname || ""} ${p.nachname || ""}`.toLowerCase();
    return parts.every(part => full.includes(part));
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // 1) Get CalDAV credentials
    const email = await getSetting("shore_caldav_email");
    const password = await getSetting("shore_caldav_password");
    if (!email || !password) {
      return res.status(200).json({ ok: true, deducted: [], error: "CalDAV-Zugangsdaten fehlen in Einstellungen" });
    }

    // 2) Fetch today's events
    const xmlResponse = await fetchCalendarEvents(email, password);
    const events = parseEvents(xmlResponse);

    // 3) Load processed UIDs
    const processedStr = await getSetting("shore_processed_appointments");
    const processed = processedStr ? JSON.parse(processedStr) : [];
    const processedSet = new Set(processed);

    // 4) Load patienten, paesse, and today's logs (to prevent double deductions)
    const { data: patienten } = await sb.from("patienten").select("*");
    const { data: paesse } = await sb.from("paesse").select("*");
    const todayStr = berlinToday();
    const { data: todayLogs } = await sb.from("log").select("*").eq("typ", "HAUPTEINHEIT").gte("datum", todayStr + "T00:00:00").lte("datum", todayStr + "T23:59:59");
    if (!patienten || !paesse) throw new Error("Datenbank-Abfrage fehlgeschlagen");
    // Set of pat_ids that already had HE deducted today (by SHORE auto-deduct specifically)
    const alreadyDeductedToday = new Set((todayLogs || []).filter(l => l.quelle === "SHORE").map(l => l.pat_id));

    const now = new Date();
    const deducted = [];

    for (const ev of events) {
      // Skip: no UID, cancelled, no customer
      if (!ev.uid) continue;
      // Only skip if already processed AND there's a real log entry for this patient today
      if (processedSet.has(ev.uid)) {
        // Verify the deduction actually happened by checking logs
        const custName = ev.customer || ev.summary;
        if (custName) {
          const pat = matchPatient(custName, patienten);
          if (pat && alreadyDeductedToday.has(pat.id)) continue; // Really was deducted, skip
          // UID was marked processed but no log entry → remove from processed (retry)
          processedSet.delete(ev.uid);
        } else {
          continue;
        }
      }
      if (ev.isCancelled) continue;
      if (!ev.customer && !ev.summary) continue;

      // Skip: appointment not yet ended
      const endTime = parseCalDateTime(ev.dtend);
      if (!endTime || endTime > now) continue;

      // Skip: Ergotherapie-Termine ziehen keine Flossenpass-HE ab
      const svcLower = (ev.service || "").toLowerCase();
      if (/ergo|tdcs|neurofeedback/.test(svcLower)) {
        processedSet.add(ev.uid);
        continue;
      }

      // Use X-CUSTOMER if available, otherwise SUMMARY
      const customerName = ev.customer || ev.summary;
      if (!customerName) continue;

      // Match to patient
      const pat = matchPatient(customerName, patienten);
      if (!pat) continue;

      // Skip if this patient already had HE deducted today — but DON'T mark as processed
      // so the calendar won't show "HE abgezogen" when nothing was actually deducted
      if (alreadyDeductedToday.has(pat.id)) {
        continue;
      }

      // Find active pass with remaining HE (oldest first, so old pass gets used up before new one)
      // A pass is "used up" if both HE and GA are fully consumed (or both are 0/0)
      const isPassUsedUp = (p) => {
        if ((p.he_total || 0) === 0 && (p.bs_total || 0) === 0) return true;
        return (p.he_genutzt ?? 0) >= (p.he_total ?? 1) && (p.bs_genutzt ?? 0) >= (p.bs_total ?? 1);
      };
      const activePass = paesse
        .filter(p => p.pat_id === pat.id && !isPassUsedUp(p) && (p.he_genutzt || 0) < (p.he_total || 0))
        .sort((a, b) => (a.datum || "").localeCompare(b.datum || ""))[0];
      if (!activePass) continue;

      // Deduct HE
      const newHeGenutzt = (activePass.he_genutzt || 0) + 1;
      const { error: updateErr } = await sb.from("paesse").update({ he_genutzt: newHeGenutzt }).eq("id", activePass.id);
      if (updateErr) continue; // Skip if update failed — don't mark as processed

      // Create log entry
      const logId = Math.random().toString(36).substr(2, 9);
      await sb.from("log").insert({
        id: logId,
        pat_id: pat.id,
        pass_id: activePass.id,
        typ: "HAUPTEINHEIT",
        quelle: "SHORE",
        datum: new Date().toISOString(),
        notiz: `Auto: ${ev.service || "Termin"} (${customerName})`,
      });

      // Mark as processed only after successful deduction
      processedSet.add(ev.uid);

      // Track this patient as deducted today (prevent second auto-deduct for multiple appointments)
      alreadyDeductedToday.add(pat.id);

      // Update local pass reference for subsequent iterations
      activePass.he_genutzt = newHeGenutzt;

      deducted.push({
        patient: `${pat.vorname || ""} ${pat.nachname || ""}`.trim(),
        service: ev.service || ev.summary,
        passTyp: activePass.typ || activePass.custom_name || "Flossenpass",
        heGenutzt: newHeGenutzt,
        heTotal: activePass.he_total,
      });
    }

    // 5) Save processed UIDs (keep last 1000)
    const updatedProcessed = [...processedSet].slice(-1000);
    await saveSetting("shore_processed_appointments", JSON.stringify(updatedProcessed));

    return res.status(200).json({
      ok: true,
      events: events.length,
      deducted,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
