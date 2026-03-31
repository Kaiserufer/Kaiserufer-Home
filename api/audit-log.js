import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://oqjcbxnbododdqlbdekt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamNieG5ib2RvZGRxbGJkZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTg3NzAsImV4cCI6MjA4Njk5NDc3MH0.2Ig0I_Wd26LAX7FAVTUz9SdJFaLeAOh394pT3FT6i_w"
);

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Neuen Audit-Eintrag speichern
    const { aktion, bereich, details, pat_id, pass_id, quelle } = req.body || {};
    if (!aktion) return res.status(400).json({ error: "aktion fehlt" });

    const entry = {
      id: Math.random().toString(36).substr(2, 12),
      datum: new Date().toISOString(),
      aktion,
      bereich: bereich || "SYSTEM",
      details: details || "",
      pat_id: pat_id || null,
      pass_id: pass_id || null,
      quelle: quelle || "SYSTEM",
    };

    const { error } = await sb.from("audit_log").insert(entry);
    if (error) {
      // Tabelle existiert noch nicht → in einstellungen speichern als Fallback
      const existing = await sb.from("einstellungen").select("value").eq("key", "audit_log").single();
      const entries = existing.data?.value ? JSON.parse(existing.data.value) : [];
      entries.push(entry);
      // Letzte 5000 Einträge behalten
      const trimmed = entries.slice(-5000);
      await sb.from("einstellungen").upsert({ key: "audit_log", value: JSON.stringify(trimmed) });
    }

    return res.status(200).json({ ok: true, id: entry.id });
  }

  if (req.method === "GET") {
    // Audit-Log abrufen
    const limit = parseInt(req.query.limit) || 200;
    const pat_id = req.query.pat_id;

    // Versuche audit_log Tabelle
    let query = sb.from("audit_log").select("*").order("datum", { ascending: false }).limit(limit);
    if (pat_id) query = query.eq("pat_id", pat_id);
    const { data, error } = await query;

    if (!error && data) {
      return res.status(200).json({ ok: true, entries: data });
    }

    // Fallback: aus einstellungen lesen
    const existing = await sb.from("einstellungen").select("value").eq("key", "audit_log").single();
    let entries = existing.data?.value ? JSON.parse(existing.data.value) : [];
    if (pat_id) entries = entries.filter(e => e.pat_id === pat_id);
    entries = entries.slice(-limit).reverse();

    return res.status(200).json({ ok: true, entries, source: "fallback" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
