export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.ANTHROPIC_KEY;
  if (!key) return res.status(500).json({ error: "API key not configured" });
  try {
    const { content, messages, system, max_tokens = 4000 } = req.body;
    const apiMessages = messages || [{ role: "user", content }];
    const apiBody = { model: "claude-sonnet-4-20250514", max_tokens, messages: apiMessages };
    if (system) apiBody.system = system;
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(apiBody),
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || "API error" });
    const text = data.content?.map(c => c.text || "").join("") || "";
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
