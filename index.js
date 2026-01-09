const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const fs = require("fs");
const router = express.Router();
const { Telegraf } = require("telegraf");

if (fs.existsSync(".env")) {
  dotenv.config();
}

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
  throw new Error(
    "Please set the TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables"
  );
}

const app = express();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PORT = process.env.PORT || 5000;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

async function sendMessage(message, buttontext, buttonurl) {
  await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
    parse_mode: "html",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: buttontext,
            url: buttonurl,
          },
        ],
      ],
    },
  });
}

router.post("/webhook", async (req, res) => {
  let data = req.body;

  console.log("Received webhook event:", JSON.stringify(data, null, 2));

  try {
    // Railway's new webhook payload structure
    const eventType = data.type;
    const status = data.details?.status;
    const projectName = data.resource?.project?.name;
    const projectId = data.resource?.project?.id;
    const environmentName = data.resource?.environment?.name;
    const commitAuthor = data.details?.commitAuthor || "Unknown";
    const timestamp = data.timestamp;

    // Handle deployment events
    if (eventType && eventType.startsWith("Deployment.")) {
      let emoji = "ℹ️";
      let statusMessage = status || eventType.replace("Deployment.", "");

      // Map event types to emojis and status
      if (eventType === "Deployment.succeeded") {
        emoji = "✅";
        statusMessage = "SUCCESS";
      } else if (eventType === "Deployment.building") {
        emoji = "⚒️";
        statusMessage = "BUILDING";
      } else if (eventType === "Deployment.deploying") {
        emoji = "🚀";
        statusMessage = "DEPLOYING";
      } else if (eventType === "Deployment.failed" || eventType === "Deployment.crashed") {
        emoji = "❌";
        statusMessage = "FAILED";
      }

      await sendMessage(
        `<b>Deployment: ${projectName}</b>\n${emoji} Status: <code>${statusMessage}</code>\n🌳 Environment: <code>${environmentName}</code>\n👨‍💻 Author: <code>${commitAuthor}</code>\n🕐 Time: <code>${new Date(timestamp).toLocaleString()}</code>`,
        "View Deployment",
        `https://railway.app/project/${projectId}/`
      );

      console.log(`✓ Telegram message sent for ${eventType}`);
    } else {
      console.log("Unhandled event type:", eventType);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => {
  res
    .status(405)
    .send(
      "405 Method Not Allowed. Please see the README.md - https://github.com/agam778/github-to-telegram#readme"
    );
});

app.get("/webhook", (req, res) => {
  res
    .status(405)
    .send(
      "405 Method Not Allowed. Please see the README.md - https://github.com/agam778/github-to-telegram#readme"
    );
});

app.use("/", router);

app.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  }
  console.log(`Server listening on port ${PORT}`);
});
