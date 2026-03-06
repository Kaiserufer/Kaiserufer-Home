import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://oqjcbxnbododdqlbdekt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamNieG5ib2RvZGRxbGJkZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTg3NzAsImV4cCI6MjA4Njk5NDc3MH0.2Ig0I_Wd26LAX7FAVTUz9SdJFaLeAOh394pT3FT6i_w"
);

async function getToken(key) {
  const { data } = await sb.from("einstellungen").select("value").eq("key", key).single();
  return data?.value || "";
}

async function saveToken(key, value) {
  await sb.from("einstellungen").upsert({ key, value });
}

async function refreshTokens() {
  const clientId = process.env.VITE_SHORE_CLIENT_ID || process.env.SHORE_CLIENT_ID;
  const clientSecret = process.env.VITE_SHORE_CLIENT_SECRET || process.env.SHORE_CLIENT_SECRET;
  const refreshToken = await getToken("shore_refresh_token");

  if (!clientId || !clientSecret) throw new Error("Shore Client-ID oder Secret fehlt in Umgebungsvariablen");
  if (!refreshToken) throw new Error("Kein Refresh-Token in Supabase gespeichert");

  const res = await fetch("https://app.inventorum.com/api/auth/token/", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error("Token-Refresh fehlgeschlagen: " + res.status + (errBody ? " – " + errBody.slice(0, 200) : ""));
  }

  const data = await res.json();
  await saveToken("shore_access_token", data.access_token);
  await saveToken("shore_refresh_token", data.refresh_token);
  return data.access_token;
}

async function fetchKunden(token) {
  const res = await fetch("https://app.inventorum.com/api/customers/?limit=100", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "X-Api-Version": "12",
      "Accept": "application/json",
    },
  });
  return res;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // 1) Aktuellen Token versuchen
    let token = await getToken("shore_access_token");
    let kundenRes;

    // Falls Token leer → direkt refreshen
    if (!token) {
      token = await refreshTokens();
    }

    kundenRes = await fetchKunden(token);

    // 2) Falls 400 oder 401 → automatisch neuen Token holen und nochmal versuchen
    if (kundenRes.status === 400 || kundenRes.status === 401) {
      token = await refreshTokens();
      kundenRes = await fetchKunden(token);
    }

    if (!kundenRes.ok) {
      const errBody = await kundenRes.text().catch(() => "");
      throw new Error("Shore Fehler: " + kundenRes.status + (errBody ? " – " + errBody.slice(0, 200) : ""));
    }

    const kundenData = await kundenRes.json();
    const items = kundenData.data || kundenData || [];

    // 3) Alle Seiten laden (Paging)
    const total = kundenData.total || items.length;
    const allItems = [...items];
    let page = 2;
    while (allItems.length < total) {
      const r = await fetch(`https://app.inventorum.com/api/customers/?limit=100&page=${page}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Api-Version": "12",
          "Accept": "application/json",
        },
      });
      if (!r.ok) break;
      const d = await r.json();
      const p = d.data || d || [];
      if (p.length === 0) break;
      allItems.push(...p);
      page++;
    }

    // 4) Bestehende Patienten laden für Duplikat-Check (nur Name, nicht E-Mail — Familien teilen oft eine E-Mail)
    const { data: existing } = await sb.from("patienten").select("id,vorname,nachname,email,telefon,adresse");
    const nameMap = new Map();
    if (existing) {
      for (const p of existing) {
        const key = `${(p.vorname || "").trim()} ${(p.nachname || "").trim()}`.toLowerCase().trim();
        if (key.length > 1) nameMap.set(key, p);
      }
    }

    // 5) Kunden-Daten umwandeln und in Supabase speichern
    let neu = 0, aktualisiert = 0;
    for (const k of allItems) {
      const vorname = (k.first_name || k.firstName || "").trim();
      const nachname = (k.last_name || k.lastName || k.company || "Unbekannt").trim();
      const email = k.email || "";
      const telefon = k.phone || k.mobile || "";
      const adresse = [k.address1, k.zipcode, k.city].filter(Boolean).join(", ");
      const nameKey = `${vorname} ${nachname}`.toLowerCase().trim();

      // Prüfen ob schon ein Patient mit gleichem Namen existiert
      const match = nameMap.get(nameKey);
      if (match) {
        // Beste Daten zusammenführen
        const updates = {};
        if (email && email !== match.email) updates.email = email;
        if (telefon && telefon !== match.telefon) updates.telefon = telefon;
        if (adresse && adresse !== match.adresse) updates.adresse = adresse;
        if (Object.keys(updates).length > 0) {
          await sb.from("patienten").update(updates).eq("id", match.id);
          Object.assign(match, updates);
          aktualisiert++;
        }
        continue;
      }

      const id = "shore_" + (k.id || k.pk || Math.random().toString(36).substr(2, 9));
      const kunde = {
        id,
        vorname,
        nachname,
        email,
        telefon,
        adresse,
        qr: "KU-" + Math.random().toString(36).substr(2, 8).toUpperCase(),
        erstellt: k.created || new Date().toISOString().split("T")[0],
        kennenlern: false,
        konvertiert: false,
        stammkunde: false,
        stammpreis: null,
      };

      const { error } = await sb.from("patienten").upsert(kunde, { onConflict: "id", ignoreDuplicates: true });
      if (!error) {
        neu++;
        nameMap.set(nameKey, kunde);
      }
    }

    return res.status(200).json({ ok: true, gesamt: allItems.length, neu, aktualisiert });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
