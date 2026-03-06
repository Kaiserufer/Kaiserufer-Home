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

// Fetch today's appointments via CalDAV REPORT
async function fetchCalendarEvents(email, password) {
  const now = new Date();
  // Start of today (Berlin timezone approximation: use UTC-based date boundaries)
  const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}${String(tomorrowDate.getDate()).padStart(2, "0")}`;

  const xml = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${todayStr}T000000Z" end="${tomorrowStr}T235959Z"/>
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
        // Handle properties with params like DTSTART;TZID=Europe/Berlin:20260306T090000
        const re = new RegExp(`^${key}[;:](.*)$`, "mi");
        const m = block.match(re);
        if (!m) return "";
        let val = m[1];
        // If it has parameters (e.g. TZID=...), the value is after the last colon
        if (val.includes(":")) val = val.split(":").pop();
        return val.trim();
      };

      const uid = get("UID");
      const summary = get("SUMMARY");
      const customer = get("X-CUSTOMER");
      const service = get("X-SERVICE");
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

// Parse CalDAV datetime (20260306T090000) to JS Date (assuming Europe/Berlin)
function parseCalDateTime(dtStr) {
  if (!dtStr || dtStr.length < 15) return null;
  const y = parseInt(dtStr.substring(0, 4));
  const mo = parseInt(dtStr.substring(4, 6)) - 1;
  const d = parseInt(dtStr.substring(6, 8));
  const h = parseInt(dtStr.substring(9, 11));
  const mi = parseInt(dtStr.substring(11, 13));
  const s = parseInt(dtStr.substring(13, 15));
  // Create date as if it's local Berlin time
  // Vercel runs in UTC, Berlin is UTC+1 (winter) or UTC+2 (summer)
  // We subtract 1h as safe approximation; the exact offset doesn't matter much
  // since we only care about "has the appointment ended?"
  return new Date(Date.UTC(y, mo, d, h - 1, mi, s));
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

    // 4) Load patienten and paesse
    const { data: patienten } = await sb.from("patienten").select("*");
    const { data: paesse } = await sb.from("paesse").select("*");
    if (!patienten || !paesse) throw new Error("Datenbank-Abfrage fehlgeschlagen");

    const now = new Date();
    const deducted = [];

    for (const ev of events) {
      // Skip: no UID, already processed, cancelled, no customer
      if (!ev.uid || processedSet.has(ev.uid)) continue;
      if (ev.isCancelled) continue;
      if (!ev.customer && !ev.summary) continue;

      // Skip: appointment not yet ended
      const endTime = parseCalDateTime(ev.dtend);
      if (!endTime || endTime > now) continue;

      // Use X-CUSTOMER if available, otherwise SUMMARY
      const customerName = ev.customer || ev.summary;
      if (!customerName) continue;

      // Match to patient
      const pat = matchPatient(customerName, patienten);
      if (!pat) continue;

      // Find active pass with remaining HE
      const activePass = paesse.find(p =>
        p.pat_id === pat.id &&
        p.aktiv === true &&
        (p.he_genutzt || 0) < (p.he_total || 0)
      );
      if (!activePass) continue;

      // Deduct HE
      const newHeGenutzt = (activePass.he_genutzt || 0) + 1;
      await sb.from("paesse").update({ he_genutzt: newHeGenutzt }).eq("id", activePass.id);

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

      // Mark as processed
      processedSet.add(ev.uid);

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
