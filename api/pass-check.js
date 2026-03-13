import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://oqjcbxnbododdqlbdekt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamNieG5ib2RvZGRxbGJkZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTg3NzAsImV4cCI6MjA4Njk5NDc3MH0.2Ig0I_Wd26LAX7FAVTUz9SdJFaLeAOh394pT3FT6i_w"
);

// Shore Flossenpass products → internal pass types
const PASS_MAP = { basis: "BASIS", plus: "PLUS", deluxe: "DELUXE" };
const STANDARD_PRICES = { BASIS: 299, PLUS: 499, DELUXE: 899 };
// Preis → Typ Zuordnung für generische "Flossenpass" Produkte aus Shore
const PRICE_TO_TYPE = { 299: "BASIS", 350: "PLUS", 499: "PLUS", 899: "DELUXE" };

async function getSetting(key) {
  const { data } = await sb.from("einstellungen").select("value").eq("key", key).single();
  return data?.value || "";
}

async function saveSetting(key, value) {
  await sb.from("einstellungen").upsert({ key, value });
}

async function refreshTokens() {
  const clientId = process.env.VITE_SHORE_CLIENT_ID || process.env.SHORE_CLIENT_ID;
  const clientSecret = process.env.VITE_SHORE_CLIENT_SECRET || process.env.SHORE_CLIENT_SECRET;
  const refreshToken = await getSetting("shore_refresh_token");

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
  await saveSetting("shore_access_token", data.access_token);
  await saveSetting("shore_refresh_token", data.refresh_token);
  return data.access_token;
}

async function fetchOrders(token, startDate, endDate) {
  const url = `https://app.inventorum.com/api/orders/?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&limit=40`;
  return fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "X-Api-Version": "12",
      "Accept": "application/json",
    },
  });
}

function detectPassType(itemName, grossPrice) {
  const name = (itemName || "").toLowerCase();
  // Erst nach expliziten Typ-Keywords suchen (basis/plus/deluxe)
  for (const [keyword, type] of Object.entries(PASS_MAP)) {
    if (name.includes(keyword)) return type;
  }
  // Dann generische "Flossenpass" Produkte aus Shore über Preis zuordnen
  if (name.includes("flossenpass")) {
    const price = Math.round(parseFloat(grossPrice || 0));
    return PRICE_TO_TYPE[price] || "PLUS"; // Default PLUS bei unbekanntem Preis
  }
  return null;
}

export default async function handler(req, res) {
  // POST: Mark orders as processed
  if (req.method === "POST") {
    try {
      const { orderIds } = req.body;
      if (!orderIds?.length) return res.status(400).json({ error: "orderIds required" });

      const existing = await getSetting("pass_processed_orders");
      const processed = existing ? JSON.parse(existing) : [];
      const updated = [...new Set([...processed, ...orderIds])].slice(-500);
      await saveSetting("pass_processed_orders", JSON.stringify(updated));
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET: Check for new Flossenpass sales
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    let token = await getSetting("shore_access_token");

    // Falls Token leer → direkt refreshen
    if (!token) {
      token = await refreshTokens();
    }

    // ?hours=N erlaubt breitere Suche (z.B. /api/pass-check?hours=168 für 7 Tage)
    const hoursBack = parseInt(req.query?.hours) || 0;

    // Last check: default 48h ago
    const lastCheck = hoursBack > 0
      ? new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
      : (await getSetting("pass_check_last") || new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    // Format dates for Shore API (YYYY.MM.DD hh:mm:ss)
    const fmtShoreDate = (dt) => `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}:${String(dt.getSeconds()).padStart(2,"0")}`;
    const startDate = fmtShoreDate(new Date(lastCheck));
    const endDate = fmtShoreDate(new Date());

    // Processed order IDs
    const processedStr = await getSetting("pass_processed_orders");
    const processed = processedStr ? JSON.parse(processedStr) : [];

    // Fetch orders from Shore
    let ordersRes = await fetchOrders(token, startDate, endDate);
    if (ordersRes.status === 400 || ordersRes.status === 401) {
      token = await refreshTokens();
      ordersRes = await fetchOrders(token, startDate, endDate);
    }
    if (!ordersRes.ok) {
      const errBody = await ordersRes.text().catch(() => "");
      throw new Error("Shore Orders Fehler: " + ordersRes.status + (errBody ? " – " + errBody.slice(0, 200) : ""));
    }

    const ordersData = await ordersRes.json();
    const orders = ordersData.data || ordersData || [];

    // Debug: Alle Bestellungen und ihre Items loggen
    const debug = {
      timeRange: { start: startDate, end: endDate },
      totalOrders: orders.length,
      processedIds: processed.length,
      orders: orders.map(o => ({
        id: String(o.id || o.pk),
        skipped: processed.includes(String(o.id || o.pk)),
        customer: o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : null,
        basketItems: (o.basket?.items || []).map(i => i.name),
        directItems: (o.items || []).map(i => i.name),
        lineItems: (o.line_items || []).map(i => i.name || i.product_name || i.title),
        invoiceNumber: o.basket?.invoice_number || o.invoice_number || "",
        completedAt: o.completed_at || o.created || "",
      })),
    };

    // Find Flossenpass sales
    const pending = [];
    for (const order of orders) {
      const oid = String(order.id || order.pk);
      if (processed.includes(oid)) continue;

      // Check basket items – auch line_items als Fallback prüfen
      const items = order.basket?.items || order.items || order.line_items || [];
      for (const item of items) {
        const itemName = item.name || item.product_name || item.title || "";
        const itemPrice = item.gross_price || item.price || item.total || 0;
        const passType = detectPassType(itemName, itemPrice);
        if (!passType) continue;

        const standardPrice = STANDARD_PRICES[passType];
        const actualPrice = parseFloat(item.gross_price || item.price || item.total || 0);

        pending.push({
          orderId: oid,
          customer: order.customer ? {
            shoreId: String(order.customer.id || order.customer.pk || ""),
            name: `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim(),
            email: order.customer.email || "",
          } : null,
          passType,
          price: actualPrice,
          standardPrice,
          priceMatch: Math.abs(actualPrice - standardPrice) < 1,
          date: order.completed_at || order.created || new Date().toISOString(),
          productName: itemName,
          invoiceNumber: order.basket?.invoice_number || order.invoice_number || "",
          receiptPdf: order.basket?.receipt?.pdf || order.receipt?.pdf || "",
        });
      }
    }

    // Nur bei Erfolg last-check aktualisieren (nicht bei manuellem Re-Check)
    if (!hoursBack) {
      await saveSetting("pass_check_last", new Date().toISOString());
    }

    return res.status(200).json({ ok: true, pending, debug });
  } catch (e) {
    // Fehler zurückgeben OHNE pass_check_last zu aktualisieren
    return res.status(500).json({ error: e.message });
  }
}
