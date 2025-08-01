const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "pQYtARRZe1FK/AVXXyl3RiQuIdJfl+2XPbqvQlHjAq6Oq9ijlUVrQWPuTXYmWQ/ePulmU1zX2teNMSBIegpKv9bCqmSA89XrKNwGXSzWqbQF42uYORXyRqJ8sohNN1N/Xwvd+2DiqZfasPvd2GVgLQdB04t89/1O/w1cDnyilFU=",
    channelSecret: process.env.CHANNEL_SECRET || "e412165c549ba71f588b2e1d84c3e676",
};

const app = express();

// Health-check endpoint
app.get('/', (req, res) => res.send('Bot is running!'));

// LINE Webhook
app.post('/webhook', line.middleware(config), async (req, res) => {
    res.sendStatus(200); // Acknowledge to LINE

    const events = req.body.events || [];
    await Promise.all(events.map(handleEvent));
});

const client = new line.Client(config);

// CoinCap uses lowercase symbols like "bitcoin", not "btc"
const coinMap = {
    btc: 'bitcoin',
    eth: 'ethereum',
    doge: 'dogecoin',
    sol: 'solana',
    ada: 'cardano',
    xrp: 'ripple',
    link: 'chainlink',
    dot: 'polkadot',
    ltc: 'litecoin',
    uni: 'uniswap',
};

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return;

    const msg = event.message.text.trim().toLowerCase();
    const coinId = coinMap[msg];

    if (!coinId) {
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `❌ I don't recognize that symbol. Try: ${Object.keys(coinMap).join(', ')}`
        });
    }

    try {
        const res = await axios.get(`https://api.coincap.io/v2/assets/${coinId}`);
        const price = parseFloat(res.data.data.priceUsd);

        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `💰 ${msg.toUpperCase()} = $${price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
            })} USD`
        });
    } catch (err) {
        console.error('Fetch error:', err.message);
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `⚠️ Could not fetch price. Please try again later.`
        });
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Listening on port ${PORT}`));
