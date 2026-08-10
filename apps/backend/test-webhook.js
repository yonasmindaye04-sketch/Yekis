const { Bot } = require("grammy");

async function test() {
  try {
    const bot = new Bot("8967646633:AAEyuRgAiHvx2Jn_DmvyBkfvFvJQIjNbpB4");
    await bot.api.setWebhook("https://drown-bodacious-yard.ngrok-free.dev/api/v1/telegram/telegram/webhook", {
      secret_token: "587e95fa8b1cfc40b00b1aedd7a9d1598d20a403e83f4219ecdc442e5762ab7a162fa69a433763427c8aa8bf799ba4e91fd0e279d19a5114cbdee2f8236f293e",
      drop_pending_updates: true,
    });
    console.log("Success");
  } catch (err) {
    console.error("Error setting webhook:", err.message);
    if (err.response) console.error(err.response);
    if (err.cause) console.error(err.cause);
  }
}

test();
