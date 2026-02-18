export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessToken = process.env.VITE_SHORE_ACCESS_TOKEN;

  try {
    // Kunden aus Shore laden
    const kundenRes = await fetch("https://api.shore.com/v1/customers?per_page=100", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!kundenRes.ok) throw new Error("Shore Fehler: " + kundenRes.status);
    const { customers } = await kundenRes.json();

    // Kunden für Supabase formatieren
    const formatted = customers.map((k) => ({
      id: `shore_${k.id}`,
      vorname: k.first_name || "",
      nachname: k.last_name || "",
      email: k.email || "",
      telefon: k.phone || "",
      adresse: k.address || "",
      qr: `KU-${k.id.toString().substring(0, 8).toUpperCase()}`,
      erstellt: k.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      kennenlern: false,
      konvertiert: false,
      stammkunde: false,
      stammpreis: "",
    }));

    res.status(200).json({ kunden: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
