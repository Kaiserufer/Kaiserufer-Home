export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessToken = process.env.VITE_SHORE_ACCESS_TOKEN;
  const allKunden = [];
  let page = 1;
  let total = null;

  try {
    // Alle Seiten laden (max 30 pro Seite)
    while (true) {
      const r = await fetch(`https://app.inventorum.com/api/customers/?limit=30&page=${page}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Accept": "application/json",
          "X-Api-Version": "12",
        },
      });

      if (!r.ok) throw new Error("Shore Fehler: " + r.status);
      const json = await r.json();
      if (total === null) total = json.total;
      allKunden.push(...(json.data || []));
      if (allKunden.length >= total) break;
      page++;
    }

    // Kunden für Supabase formatieren
    const formatted = allKunden.map((k) => ({
      id: `shore_${k.id}`,
      vorname: k.first_name || "",
      nachname: k.last_name || k.company || "",
      email: k.email || "",
      telefon: k.phone_number || "",
      adresse: k.billing_address
        ? [k.billing_address.address1, k.billing_address.zipcode, k.billing_address.city].filter(Boolean).join(", ")
        : "",
      qr: `KU-${String(k.id).padStart(8,"0")}`,
      erstellt: new Date().toISOString().split("T")[0],
      kennenlern: false,
      konvertiert: false,
      stammkunde: false,
      stammpreis: "",
    }));

    res.status(200).json({ kunden: formatted, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
