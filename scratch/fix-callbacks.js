const fs = require('fs');
let content = fs.readFileSync('apps/backend/src/modules/bot/handlers/callbacks.ts', 'utf8');

const importStatement = `import { approveWebLogin, denyWebLogin } from "../../auth/telegram-code.service.js";\n`;

content = importStatement + content;

const newCallbacks = `
  bot.callbackQuery(/^wl:ok:(.+)$/, async (ctx) => {
    const sid = ctx.match[1];
    if (!ctx.session.userId) {
      await ctx.answerCallbackQuery("You must be registered first.");
      return;
    }
    if (!ctx.session.telegramUserId) {
      await ctx.answerCallbackQuery("Error identifying your Telegram account.");
      return;
    }
    try {
      await approveWebLogin(sid, BigInt(ctx.session.telegramUserId), ctx.session.userId);
      await ctx.editMessageText("✅ <b>Login Approved</b>\\n\\nYou can now return to your browser.", { parse_mode: "HTML" });
    } catch (err: any) {
      await ctx.editMessageText(\`❌ <b>Login Failed</b>\\n\\n\${err.message}\`, { parse_mode: "HTML" });
    }
  });

  bot.callbackQuery(/^wl:no:(.+)$/, async (ctx) => {
    const sid = ctx.match[1];
    try {
      await denyWebLogin(sid);
      await ctx.editMessageText("❌ <b>Login Denied</b>\\n\\nThe browser will not be granted access.", { parse_mode: "HTML" });
    } catch (err) {
      await ctx.editMessageText("❌ <b>Login Denied</b>", { parse_mode: "HTML" });
    }
  });
`;

content = content.replace(
  '    registerStaffHandlers(bot);',
  '    registerStaffHandlers(bot);\n' + newCallbacks
);

fs.writeFileSync('apps/backend/src/modules/bot/handlers/callbacks.ts', content);
