const fs = require('fs');
let content = fs.readFileSync('apps/backend/src/modules/bot/middleware/auth.middleware.ts', 'utf8');

content = content.replace(
  /if \(!user\) \{\s*\/\/ No account bound to this Telegram identity yet[\s\S]*?if \(user\) \{/,
  `if (!user) {
    // Check legacy email
    user = await prisma.user.findUnique({
      where: { email: \`telegram+\${telegramId}@yekis.local\` },
      select: userSelect,
    }) as unknown as ResolvedUser | null;
  }

  // C5: Strict Onboarding - Do not auto-provision here
  if (!user) {
    ctx.session.userId = undefined;
    ctx.session.role = undefined;
    ctx.session.kycTier = undefined;
    ctx.session.kycStatus = undefined;
    ctx.session.staffRole = undefined;
    ctx.session.loginBlocked = "You are not registered. Please sign in via the web.";
    ctx.session.language = from.language_code === "am" ? "am" : "en";
    ctx.session.telegramUserId = telegramId;
    ctx.session.telegramChatId = chat.id;
    return next();
  }

  ctx.session.loginBlocked = undefined;

  if (user) {`
);

fs.writeFileSync('apps/backend/src/modules/bot/middleware/auth.middleware.ts', content);
