import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://oqjcbxnbododdqlbdekt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamNieG5ib2RvZGRxbGJkZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTg3NzAsImV4cCI6MjA4Njk5NDc3MH0.2Ig0I_Wd26LAX7FAVTUz9SdJFaLeAOh394pT3FT6i_w"
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { names } = req.body;
    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: "names array required" });
    }

    // Authenticate first (RLS requires authenticated user)
    const email = process.env.LOGIN_EMAIL;
    const pass = process.env.LOGIN_PASS;
    const { error: authErr } = await sb.auth.signInWithPassword({ email, password: pass });
    if (authErr) throw new Error("Auth failed: " + authErr.message);

    // Fetch all patients (now authenticated)
    const { data: patients, error } = await sb.from("patienten").select("id,vorname,nachname,ergotherapie");
    if (error) throw new Error("Supabase fetch: " + error.message);

    let updated = 0, alreadySet = 0, notFound = 0;
    const details = [];

    for (const name of names) {
      const parts = name.toLowerCase().trim().split(/\s+/).filter(p => p.length > 0);
      const patient = patients.find(p => {
        const full = `${p.vorname || ""} ${p.nachname || ""}`.toLowerCase();
        return parts.length > 0 && parts.every(part => full.includes(part));
      });

      if (!patient) {
        details.push({ name, status: "notfound" });
        notFound++;
        continue;
      }

      if (patient.ergotherapie) {
        details.push({ name, status: "already" });
        alreadySet++;
        continue;
      }

      const { error: upErr } = await sb.from("patienten").update({ ergotherapie: true }).eq("id", patient.id);
      if (upErr) {
        details.push({ name, status: "notfound" });
        notFound++;
        continue;
      }

      details.push({ name, status: "updated" });
      updated++;
    }

    const dbCount = patients ? patients.length : 0;
    return res.status(200).json({ ok: true, updated, alreadySet, notFound, details, debug: { dbCount } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
