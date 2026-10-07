const fs = require('fs');
let content = fs.readFileSync('apps/backend/src/modules/bot/handlers/notifications.ts', 'utf8');

content = content.replace(
  /await bot\.api\.sendMessage\(user\.telegramChatId, message, \{[\s\S]*?\}\);/g,
  `try {
      await bot.api.sendMessage(user.telegramChatId, message, {
        parse_mode: "HTML", // Changed from MarkdownV2 per H4
        reply_markup: deepLink 
          ? { inline_keyboard: [[{ text: "View", url: deepLink }]] }
          : undefined,
      });
    } catch (err) {
      if (err.error_code === 403) {
         // Bot blocked, nullify chat ID (H4)
         await prisma.user.update({
            where: { id: userId },
            data: { telegramChatId: null }
         });
      }
      throw err;
    }`
);
fs.writeFileSync('apps/backend/src/modules/bot/handlers/notifications.ts', content);
