const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const QRCode = require("qrcode");

const app = express();
app.use(bodyParser.json());

const client = new Client();

let isClientReady = false;
let latestQr = null;

const port = process.env.PORT || 4000;
const openUrl = process.env.OPEN_URL || `http://localhost:${port}/`;

// Root route - "/" রুট
app.get("/", (req, res) => {
  res.send("WhatsApp Bot API is running!");
});

// QR কোড SVG রেন্ডার করার রুট
app.get("/qr", async (req, res) => {
  if (!latestQr) {
    if (isClientReady) {
      return res.send(
        "WhatsApp client is already authenticated. No QR code needed."
      );
    }
    return res.status(404).send("QR code not generated yet.");
  }
  try {
    const svg = await QRCode.toString(latestQr, { type: "svg" });
    res.type("svg").send(svg);
  } catch (err) {
    res.status(500).send("Failed to generate QR code");
  }
});

// মেসেজ পাঠানোর API
app.post("/send-message", async (req, res) => {
  if (!isClientReady) {
    return res.status(503).json({
      error: "WhatsApp client is not ready yet. Please try again later.",
    });
  }

  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: "number and message are required" });
  }

  try {
    const chatId = number + "@c.us";
    await client.sendMessage(chatId, message);
    res.json({ success: true, message: "Message sent!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp Client ইভেন্টস
client.on("qr", (qr) => {
  latestQr = qr;
  qrcode.generate(qr, { small: true });
  console.log(`Scan QR Code here: http://localhost:${port}/qr`);

  exec(`open "${openUrl}"`, (err) => {
    if (err) {
      console.error("Error opening browser:", err);
    } else {
      console.log("Browser opened to:", openUrl);
    }
  });
});

client.on("ready", () => {
  isClientReady = true;
  console.log("WhatsApp client is ready!");
});

client.on("disconnected", (reason) => {
  isClientReady = false;
  console.log("WhatsApp client disconnected:", reason);
  console.log("Please scan the QR code again...");
});

client.on("auth_failure", (msg) => {
  console.log("WhatsApp authentication failed:", msg);
  isClientReady = false;
});

// Client Initialize
client.initialize();

// Server Listen
app.listen(port, () => {
  console.log(`WhatsApp Bot API server running on http://localhost:${port}`);
});
