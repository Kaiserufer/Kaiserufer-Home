import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://oqjcbxnbododdqlbdekt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamNieG5ib2RvZGRxbGJkZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTg3NzAsImV4cCI6MjA4Njk5NDc3MH0.2Ig0I_Wd26LAX7FAVTUz9SdJFaLeAOh394pT3FT6i_w"
);

// Shore Flossenpass products → internal pass types
const PASS_MAP = { basis: "BASIS", plus: "PLUS", deluxe: "DELUXE" };
const STANDARD_PRICES = { BASIS: 299, PLUS: 499, DELUXE: 899 };

async function getSetting(key) {
  const { data } = await sb.from("einstellungen").select("value").eq("key", key).single();
  return data?.value || "";
}

async function saveSetting(key, value) {
  await sb.from("einstellungen").upsert({ key, value });
}

async function refreshTokens() {
  const clientId = process.env.VITE_SHORE_CLIENT_ID;
  const clientSecret = process.env.VITE_SHORE_CLIENT_SECRET;
  const refreshToken = await getSetting("shore_refresh_token");

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
  await saveSetting("shore_access_token", data.access_token);
  await saveSetting("shore_refresh_token", data.refresh_token);
  return data.access_token;
}

async function fetchOrders(token, startDate) {
  const url = `https://app.inventorum.com/api/orders/?start=${encodeURIComponent(startDate)}&limit=40`;
  return fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "X-Api-Version": "12",
      "Accept": "application/json",
    },
  });
}

function detectPassType(itemName) {
  const name = (itemName || "").toLowerCase();
  for (const [keyword, type] of Object.entries(PASS_MAP)) {
    if (name.includes(keyword)) return type;
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

    // Last check: default 48h ago
    const lastCheck = await getSetting("pass_check_last") ||
      new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Format start date for Shore API (YYYY.MM.DD hh:mm:ss)
    const d = new Date(lastCheck);
    const startDate = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;

    // Processed order IDs
    const processedStr = await getSetting("pass_processed_orders");
    const processed = processedStr ? JSON.parse(processedStr) : [];

    // Fetch orders from Shore
    let ordersRes = await fetchOrders(token, startDate);
    if (ordersRes.status === 401) {
      token = await refreshTokens();
      ordersRes = await fetchOrders(token, startDate);
    }
    if (!ordersRes.ok) throw new Error("Shore Orders Fehler: " + ordersRes.status);

    const ordersData = await ordersRes.json();
    const orders = ordersData.data || ordersData || [];

    // Find Flossenpass sales
    const pending = [];
    for (const order of orders) {
      const oid = String(order.id || order.pk);
      if (processed.includes(oid)) continue;

      // Check basket items
      const items = order.basket?.items || order.items || [];
      for (const item of items) {
        const passType = detectPassType(item.name);
        if (!passType) continue;

        const standardPrice = STANDARD_PRICES[passType];
        const actualPrice = parseFloat(item.gross_price || item.price || 0);

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
          productName: item.name,
          invoiceNumber: order.basket?.invoice_number || order.invoice_number || "",
          receiptPdf: order.basket?.receipt?.pdf || order.receipt?.pdf || "",
        });
      }
    }

    // Update last check time
    await saveSetting("pass_check_last", new Date().toISOString());

    return res.status(200).json({ ok: true, pending });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
