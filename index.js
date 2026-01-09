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
  try {
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
    console.log("✓ Message sent to Telegram successfully");
  } catch (error) {
    console.error("❌ Failed to send Telegram message:");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error response:", error.response?.body);
    throw error; // Re-throw so the webhook handler can catch it
  }
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
      let statusMessage = status || eventType.replace("Deployment.", "").toUpperCase();

      // Map event types to emojis and status
      switch (eventType) {
        case "Deployment.queued":
          emoji = "⏳";
          statusMessage = "QUEUED";
          break;
        case "Deployment.initializing":
          emoji = "🔄";
          statusMessage = "INITIALIZING";
          break;
        case "Deployment.started":
          emoji = "▶️";
          statusMessage = "STARTED";
          break;
        case "Deployment.building":
          emoji = "⚒️";
          statusMessage = "BUILDING";
          break;
        case "Deployment.deploying":
          emoji = "🚀";
          statusMessage = "DEPLOYING";
          break;
        case "Deployment.succeeded":
          emoji = "✅";
          statusMessage = "SUCCESS";
          break;
        case "Deployment.failed":
        case "Deployment.crashed":
          emoji = "❌";
          statusMessage = "FAILED";
          break;
        case "Deployment.removed":
          emoji = "🗑️";
          statusMessage = "REMOVED";
          break;
        default:
          // Catch-all for any new Railway event types
          console.log(`⚠️ Unknown deployment event: ${eventType} - using generic handler`);
          statusMessage = eventType.replace("Deployment.", "").toUpperCase();
      }

      console.log(`📤 Sending Telegram message for: ${eventType} (${statusMessage})`);

      await sendMessage(
        `<b>Deployment: ${projectName}</b>\n${emoji} Status: <code>${statusMessage}</code>\n🌳 Environment: <code>${environmentName}</code>\n👨‍💻 Author: <code>${commitAuthor}</code>\n🕐 Time: <code>${new Date(timestamp).toLocaleString()}</code>`,
        "View Deployment",
        `https://railway.app/project/${projectId}/`
      );

      console.log(`✅ Telegram message sent successfully for ${eventType}`);
    } else {
      console.log("❌ Unhandled event type:", eventType);
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
