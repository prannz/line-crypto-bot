const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const line = require('@line/bot-sdk');

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
app.use(bodyParser.json());
app.post('/webhook', line.middleware(config), async (req, res) => {
    const events = req.body.events;
    const promises = events.map(handleEvent);
    await Promise.all(promises);
    res.status(200).end();
});

const client = new line.Client(config);

const coinMap = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'doge': 'dogecoin',
    'sol': 'solana',
    'ada': 'cardano',
    'xrp': 'ripple',
    'link': 'chainlink',
    'dot': 'polkadot',
    'ltc': 'litecoin',
    'uni': 'uniswap',
};

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return;

    const userText = event.message.text.trim().toLowerCase();
    const coinId = coinMap[userText];

    if (!coinId) {
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `❌ I don't recognize that symbol.\nTry one of: ${Object.keys(coinMap).join(', ')}`
        });
    }

    try {
        const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        const price = res.data[coinId]?.usd;
        if (!price) throw new Error();

        const formatted = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `💰 The current price of ${userText.toUpperCase()} is ${formatted} USD.`
        });
    } catch (err) {
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `⚠️ Sorry, I couldn't fetch the price. Try again later.`
        });
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
