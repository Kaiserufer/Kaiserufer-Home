export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email, password } = req.body || {};
  const validEmail = process.env.LOGIN_EMAIL;
  const validPass = process.env.LOGIN_PASS;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });
  if (email.toLowerCase().trim() === validEmail.toLowerCase() && password === validPass) {
    return res.status(200).json({ success: true });
  }
  return res.status(401).json({ success: false });
}
