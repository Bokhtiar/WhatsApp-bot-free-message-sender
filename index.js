const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const client = new Client();

let isClientReady = false;

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isClientReady = true;
    console.log('WhatsApp client is ready!');
});

// API endpoint to send WhatsApp message
app.post('/send-message', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ error: 'WhatsApp client is not ready yet. Please try again later.' });
    }
    const { number } = req.body;
    if (!number) {
        return res.status(400).json({ error: 'number is required' });
    }
    try {
        const chatId = number + '@c.us';
        const fixedMessage = 
`*Bill Submitted!*\n
Thank you for your payment.\n
_Your bill has been received and is being processed._\n
\n
*Details:*\n
- Date: 2024-06-07\n
- Amount: $100\n
\n
If you have questions, reply to this message.`;
        await client.sendMessage(chatId, fixedMessage);
        res.json({ success: true, message: 'Message sent!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

client.initialize();

app.listen(3000, () => {
    console.log('API server running on http://localhost:3000');
});
