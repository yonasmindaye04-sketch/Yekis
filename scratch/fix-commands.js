const fs = require('fs');
let content = fs.readFileSync('apps/backend/src/modules/bot/handlers/commands.ts', 'utf8');

content = content.replace(
  /import \{\s*issueTelegramLoginCode,\s*TELEGRAM_CODE_TTL_SECONDS,\s*\} from "\.\.\/\.\.\/auth\/telegram-code\.service\.js";/g,
  'import { approveWebLogin, denyWebLogin } from "../../auth/telegram-code.service.js";'
);

content = content.replace(
  /if \(payload === "web_auth".*?\}\n    \}/s,
  `if (payload?.startsWith("wl_")) {
      const sid = payload.slice(3);
      const kb = new InlineKeyboard()
        .text("✅ Approve", \`wl:ok:\${sid}\`)
        .text("❌ Deny", \`wl:no:\${sid}\`);
      await ctx.reply(
        \`<b>Sign in to Yekis web?</b>\\n\\nA browser is requesting access to your account.\\n\\n\` + 
        \`<i>If you did not request this, press Deny.</i>\`,
        { reply_markup: kb, parse_mode: "HTML" },
      );
      return;
    }`
);

fs.writeFileSync('apps/backend/src/modules/bot/handlers/commands.ts', content);
