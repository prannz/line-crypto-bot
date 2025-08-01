const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: "pQYtARRZe1FK/AVXXyl3RiQuIdJfl+2XPbqvQlHjAq6Oq9ijlUVrQWPuTXYmWQ/ePulmU1zX2teNMSBIegpKv9bCqmSA89XrKNwGXSzWqbQF42uYORXyRqJ8sohNN1N/Xwvd+2DiqZfasPvd2GVgLQdB04t89/1O/w1cDnyilFU=",
  channelSecret:  "e412165c549ba71f588b2e1d84c3e676",
};

const app = express();

// Health-check (so GET / returns 200)
app.get('/', (req, res) => res.send('Bot is running!'));

// Webhook—no global bodyParser, just LINE’s middleware
app.post('/webhook', line.middleware(config), async (req, res) => {
  // 1) Reply 200 immediately
  res.sendStatus(200);

  // 2) Then process events
  const events = req.body.events || [];
  await Promise.all(events.map(handleEvent));
});

const client = new line.Client(config);
const coinMap = { btc:'bitcoin', eth:'ethereum', doge:'dogecoin', /*…*/ };

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
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    const price = data[coinId]?.usd;
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `💰 ${msg.toUpperCase()} = $${price.toLocaleString()} USD`
    });
  } catch (err) {
    console.error('Fetch error', err);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `⚠️ Could not fetch price; please try again later.`
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
