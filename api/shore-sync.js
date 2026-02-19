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
  const clientId = process.env.VITE_SHORE_CLIENT_ID;
  const clientSecret = process.env.VITE_SHORE_CLIENT_SECRET;
  const refreshToken = await getToken("shore_refresh_token");

  const res = await fetch("https://app.inventorum.com/api/auth/token/", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });

  if (!res.ok) throw new Error("Token-Refresh fehlgeschlagen: " + res.status);

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
    let kundenRes = await fetchKunden(token);

    // 2) Falls 401 → automatisch neuen Token holen und nochmal versuchen
    if (kundenRes.status === 401) {
      token = await refreshTokens();
      kundenRes = await fetchKunden(token);
    }

    if (!kundenRes.ok) throw new Error("Shore Fehler: " + kundenRes.status);

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

    // 4) Kunden-Daten umwandeln und in Supabase speichern
    let neu = 0;
    for (const k of allItems) {
      const id = "shore_" + (k.id || k.pk || Math.random().toString(36).substr(2, 9));
      const kunde = {
        id,
        vorname: k.first_name || k.firstName || "",
        nachname: k.last_name || k.lastName || k.company || "Unbekannt",
        email: k.email || "",
        telefon: k.phone || k.mobile || "",
        adresse: [k.address1, k.zipcode, k.city].filter(Boolean).join(", "),
        qr: "KU-" + Math.random().toString(36).substr(2, 8).toUpperCase(),
        erstellt: k.created || new Date().toISOString().split("T")[0],
        kennenlern: false,
        konvertiert: false,
        stammkunde: false,
        stammpreis: "",
      };

const result = await sb.from("patienten").insert(kunde);
return res.status(200).json({ error: "DEBUG: " + JSON.stringify({id: kunde.id, vorname: kunde.vorname, nachname: kunde.nachname, err: result.error, status: result.status}) });
    }

    return res.status(200).json({ ok: true, gesamt: allItems.length, neu });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
