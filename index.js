const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const QRCode = require('qrcode');

const app = express();
app.use(bodyParser.json());

const client = new Client();

let isClientReady = false;
let latestQr = null;

const port = process.env.PORT || 4000;
const openUrl = process.env.OPEN_URL || `http://localhost:${port}/`;

client.on('qr', (qr) => {
    latestQr = qr; // Store the latest QR code string
    qrcode.generate(qr, { small: true });

    // Open the configurable URL in the default browser (macOS)
    console.log(`Attempting to open browser to ${openUrl}`);
    exec(`open "${openUrl}"`, (err) => {
        if (err) {
            console.error('Error opening browser:', err);
        } else {
            console.log('Browser opened to:', openUrl);
        }
    });
});

client.on('ready', () => {
    isClientReady = true;
    console.log('WhatsApp client is ready!');
});

client.on('disconnected', (reason) => {
    isClientReady = false;
    console.log('WhatsApp client was disconnected:', reason);
    console.log('Please scan the QR code again...');
});

client.on('auth_failure', (msg) => {
    console.log('WhatsApp authentication failed:', msg);
    isClientReady = false;
});

// API endpoint to send WhatsApp message
// app.post('/send-message', async (req, res) => {
//     if (!isClientReady) {
//         return res.status(503).json({ error: 'WhatsApp client is not ready yet. Please try again later.' });
//     }
//     const { number, fixedMessage } = req.body;

//     if (!number) {
//         return res.status(400).json({ error: 'number is required' });
//     }
//     if (!fixedMessage) {
//         return res.status(400).json({ error: 'fixedMessage is required' });
//     }
//     try {
//         const chatId = number + '@c.us';
//         console.log('Sending message to:', chatId);
//         console.log('Message:', fixedMessage);
        
//         await client.sendMessage(chatId, fixedMessage);
//         console.log('Message sent successfully!');
//         res.json({ success: true, message: 'Message sent!' });
//     } catch (err) {
//         console.error('Error sending message:', err);
        
//         // Check if it's a session error
//         if (err.message.includes('getChat') || err.message.includes('Evaluation failed')) {
//             isClientReady = false;
//             return res.status(503).json({ 
//                 error: 'WhatsApp session expired. Please re-authenticate by scanning the QR code again.',
//                 details: err.message 
//             });
//         }
        
//         res.status(500).json({ error: err.message });
//     }
// });

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
    const chatId = number + "@c.us"; // WhatsApp চ্যাট আইডি ফরম্যাট

    await client.sendMessage(chatId, message); // Laravel থেকে আসা মেসেজ পাঠানো হচ্ছে

    res.json({ success: true, message: "Message sent!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Add this route for GET /
app.get('/', (req, res) => {
  res.send('WhatsApp Bot API is running!');
});

app.get('/status', (req, res) => {
    res.json({
        isClientReady,
        hasQrCode: !!latestQr,
        message: isClientReady ? 'WhatsApp client is ready' : 'WhatsApp client is not ready'
    });
});

app.get('/qr', async (req, res) => {
  if (!latestQr) {
    if (isClientReady) {
      return res.send('WhatsApp client is already authenticated. No QR code needed.');
    }
    return res.status(404).send('QR code not generated yet.');
  }
  try {
    const svg = await QRCode.toString(latestQr, { type: 'svg' });
    res.type('svg').send(svg);
  } catch (err) {
    res.status(500).send('Failed to generate QR code');
  }
});

client.initialize();

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
