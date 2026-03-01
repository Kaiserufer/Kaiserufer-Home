const SUPABASE_URL = "https://oqjcbxnbododdqlbdekt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamNieG5ib2RvZGRxbGJkZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTg3NzAsImV4cCI6MjA4Njk5NDc3MH0.2Ig0I_Wd26LAX7FAVTUz9SdJFaLeAOh394pT3FT6i_w";

const sbHeaders = {
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json"
};

async function fetchAllPatients() {
  // Fetch all patients (not just shore_*) for name matching from calendar
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patienten?select=id,vorname,nachname,ergotherapie,sonstige,therapie&limit=1000`,
    { headers: { ...sbHeaders, "Prefer": "return=representation" } }
  );
  if (!res.ok) throw new Error("Supabase Fehler: " + res.status);
  return res.json();
}

async function updatePatientService(patientId, fields) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patienten?id=eq.${encodeURIComponent(patientId)}`,
    { method: "PATCH", headers: { ...sbHeaders, "Prefer": "return=minimal" }, body: JSON.stringify(fields) }
  );
  if (!res.ok) throw new Error("Update fehlgeschlagen für " + patientId + ": " + res.status);
  return true;
}
