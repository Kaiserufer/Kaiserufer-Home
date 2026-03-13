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

// CEST (Sommerzeit) prüfen: letzter Sonntag im März bis letzter Sonntag im Oktober
function isCEST(year, month, day) {
  if (month < 2 || month > 9) return false;
  if (month > 2 && month < 9) return true;
  if (month === 2) {
    const lastSunday = 31 - new Date(year, 2, 31).getDay();
    return day >= lastSunday;
  }
  const lastSunday = 31 - new Date(year, 9, 31).getDay();
  return day < lastSunday;
}

// Berlin-Datum (YYYY-MM-DD) → UTC CalDAV Start/End Strings
// Berlin Mitternacht = 23:00 UTC (CET) oder 22:00 UTC (CEST) des Vortages
function berlinDateToUTCRange(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const berlinOffset = isCEST(y, m - 1, d) ? 2 : 1;
  // Berlin 00:00 → UTC: Vortag (24 - offset):00
  const startUTC = new Date(Date.UTC(y, m - 1, d, -berlinOffset, 0, 0));
  // Berlin nächster Tag 00:00 → UTC
  const endUTC = new Date(Date.UTC(y, m - 1, d + 1, -berlinOffset, 0, 0));
  const fmt = (dt) =>
    `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}T${String(dt.getUTCHours()).padStart(2, "0")}${String(dt.getUTCMinutes()).padStart(2, "0")}00Z`;
  return { start: fmt(startUTC), end: fmt(endUTC) };
}

// Heutiges Datum in Berlin berechnen (nicht Server-UTC)
function berlinToday() {
  const now = new Date();
  const berlinOffset = isCEST(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) ? 2 : 1;
  const berlin = new Date(now.getTime() + berlinOffset * 60 * 60 * 1000);
  return `${berlin.getUTCFullYear()}-${String(berlin.getUTCMonth() + 1).padStart(2, "0")}-${String(berlin.getUTCDate()).padStart(2, "0")}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const email = await getSetting("shore_caldav_email");
    const password = await getSetting("shore_caldav_password");
    if (!email || !password) {
      return res.status(200).json({ ok: true, appointments: [], error: "CalDAV-Zugangsdaten fehlen" });
    }

    // Berlin-Datum: ?date=YYYY-MM-DD oder heute (Berlin-Zeit)
    const todayISO = berlinToday();
    const dateParam = req.query.date || todayISO;
    const isToday = dateParam === todayISO;

    // Berlin-Tagesgrenzen → korrekte UTC-Zeiten für CalDAV
    const { start: utcStart, end: utcEnd } = berlinDateToUTCRange(dateParam);

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

    const caldavRes = await fetch(CALENDAR_URL, {
      method: "REPORT",
      headers: {
        "Authorization": "Basic " + Buffer.from(email + ":" + password).toString("base64"),
        "Content-Type": "application/xml; charset=utf-8",
        "Depth": "1",
      },
      body: xml,
    });

    if (!caldavRes.ok) {
      throw new Error(`CalDAV Fehler: ${caldavRes.status}`);
    }

    const xmlText = await caldavRes.text();

    // Load processed appointment UIDs (already deducted)
    const processedStr = await getSetting("shore_processed_appointments");
    const processedSet = new Set(processedStr ? JSON.parse(processedStr) : []);

    // Load existing patients for matching
    const { data: patienten } = await sb.from("patienten").select("*");

    // Parse VEVENT blocks
    const appointments = [];
    const calDataRegex = /<(?:cal|C):calendar-data[^>]*>([\s\S]*?)<\/(?:cal|C):calendar-data>/gi;
    let match;
    while ((match = calDataRegex.exec(xmlText)) !== null) {
      let ical = match[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

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
        const customer = get("X-CUSTOMER");
        const summary = get("SUMMARY");
        // Termine mit X-CUSTOMER ODER SUMMARY anzeigen (Kennenlernen, Yoga etc.)
        if (!customer && !summary) continue;

        const customerEmail = get("X-EMAIL");
        const service = get("X-SERVICE").replace(/\\,/g, ",");
        const rawEmployee = get("X-EMPLOYEE").replace(/\\,/g, ",");
        const employee = rawEmployee.split(/,\s*Ort:/)[0].trim();
        const dtstart = get("DTSTART");
        const dtend = get("DTEND");

        // Nur Termine anzeigen, deren DTSTART zum angefragten Berlin-Tag passt
        const expectedDate = dateParam.replace(/-/g, "");
        if (dtstart.length >= 8 && dtstart.substring(0, 8) !== expectedDate) continue;

        // Format time from 20260306T083000 → "08:30"
        const fmtTime = (dt) => {
          if (!dt || dt.length < 15) return "";
          return dt.substring(9, 11) + ":" + dt.substring(11, 13);
        };

        // Ergo-Termine ziehen nie HE ab → nie als "deducted" anzeigen
        const svcLower = (service || "").toLowerCase();
        const isErgo = /ergo|tdcs|neurofeedback/.test(svcLower);

        appointments.push({
          customer: customer || summary,
          customerEmail,
          service: service || summary || "Termin",
          employee: employee.split(",")[0].trim(),
          start: fmtTime(dtstart),
          end: fmtTime(dtend),
          startRaw: dtstart,
          deducted: isErgo ? false : (uid ? processedSet.has(uid) : false),
        });
      }
    }

    // Auto-create patients for unknown calendar customers (only for today)
    const created = [];
    if (patienten && isToday) {
      // Build email lookup for duplicate prevention
      const emailSet = new Set();
      for (const p of patienten) {
        if (p.email) emailSet.add(p.email.toLowerCase().trim());
      }
      const seen = new Set();
      for (const a of appointments) {
        const parts = (a.customer || "").toLowerCase().trim().split(/\s+/).filter(p => p.length > 0);
        if (parts.length === 0) continue;
        // Match by name
        const matchedByName = patienten.find(p => {
          const full = `${p.vorname || ""} ${p.nachname || ""}`.toLowerCase();
          return parts.every(part => full.includes(part));
        });
        if (matchedByName) continue;
        // Match by email
        const custEmail = (a.customerEmail || "").toLowerCase().trim();
        if (custEmail && emailSet.has(custEmail)) continue;
        const nameKey = a.customer.toLowerCase().trim();
        if (seen.has(nameKey)) continue;
        seen.add(nameKey);

        // Split name into vorname/nachname
        const nameParts = a.customer.trim().split(/\s+/);
        const vorname = nameParts.slice(0, -1).join(" ") || "";
        const nachname = nameParts.slice(-1)[0] || a.customer.trim();

        // Auto-categorize based on service
        const svcLower = (a.service || "").toLowerCase();
        const isErgo = /ergo|tdcs|neurofeedback/.test(svcLower);
        const isKennenlernen = /kennenlern/.test(svcLower);

        const id = "cal_" + Math.random().toString(36).substr(2, 9);
        const newPat = {
          id,
          vorname,
          nachname,
          email: a.customerEmail || "",
          telefon: "",
          adresse: "",
          qr: "KU-" + Math.random().toString(36).substr(2, 8).toUpperCase(),
          erstellt: new Date().toISOString().split("T")[0],
          kennenlern: isKennenlernen,
          konvertiert: false,
          stammkunde: false,
          stammpreis: null,
          therapie: !isErgo,
          ergotherapie: isErgo,
          sonstige: false,
        };
        const { error } = await sb.from("patienten").upsert(newPat, { onConflict: "id", ignoreDuplicates: true });
        if (!error) {
          created.push(a.customer);
          patienten.push(newPat);
          if (newPat.email) emailSet.add(newPat.email.toLowerCase().trim());
        }
      }
    }

    // Sort by start time
    appointments.sort((a, b) => (a.startRaw || "").localeCompare(b.startRaw || ""));

    return res.status(200).json({ ok: true, appointments, created });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
