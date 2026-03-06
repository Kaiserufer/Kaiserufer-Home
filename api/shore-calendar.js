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

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const email = await getSetting("shore_caldav_email");
    const password = await getSetting("shore_caldav_password");
    if (!email || !password) {
      return res.status(200).json({ ok: true, appointments: [], error: "CalDAV-Zugangsdaten fehlen" });
    }

    // Build date range for today
    const now = new Date();
    const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, "0")}${String(tomorrow.getDate()).padStart(2, "0")}`;

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

        const customer = get("X-CUSTOMER");
        if (!customer) continue; // Only customer appointments

        const service = get("X-SERVICE");
        const rawEmployee = get("X-EMPLOYEE").replace(/\\,/g, ",");
        const employee = rawEmployee.split(/,\s*Ort:/)[0].trim();
        const dtstart = get("DTSTART");
        const dtend = get("DTEND");

        // Format time from 20260306T083000 → "08:30"
        const fmtTime = (dt) => {
          if (!dt || dt.length < 15) return "";
          return dt.substring(9, 11) + ":" + dt.substring(11, 13);
        };

        appointments.push({
          customer,
          service: service || "Termin",
          employee: employee.split(",")[0].trim(),
          start: fmtTime(dtstart),
          end: fmtTime(dtend),
          startRaw: dtstart,
        });
      }
    }

    // Sort by start time
    appointments.sort((a, b) => (a.startRaw || "").localeCompare(b.startRaw || ""));

    return res.status(200).json({ ok: true, appointments });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
