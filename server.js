const express = require("express");

const app = express();
app.use(express.json());

// ดึงค่าจาก Environment Variables
const WEBHOOK_URL = process.env.ADMIN_WEBHOOK;
const APP_SECRET = process.env.APP_SECRET;

// หน้าแรก (แก้ Cannot GET /)
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ฟังก์ชันส่ง Discord Webhook
async function sendWebhook(message) {
  if (!WEBHOOK_URL) return;

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message
      })
    });
  } catch (err) {
    console.error("Webhook error:", err.message);
  }
}

// สมัครสมาชิก
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing data" });
  }

  await sendWebhook(`🆕 New user registered: ${username}`);

  res.json({ message: "Register success" });
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing data" });
  }

  await sendWebhook(`🔐 User login: ${username}`);

  res.json({ message: "Login success" });
});

// ใช้ PORT ของ Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});
