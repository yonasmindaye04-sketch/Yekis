const fs = require('fs');
let content = fs.readFileSync('apps/backend/src/modules/bot/bot.service.ts', 'utf8');

const imports = `import { sequentialize } from "@grammyjs/runner";\nimport { dedupeMiddleware } from "./middleware/dedupe.middleware.js";\n`;
content = content.replace('import { authMiddleware }', imports + 'import { authMiddleware }');

const oldUseRegex = /    \/\/ Session storage[\s\S]*?bot\.use\(authMiddleware\);/;

const newUseBlock = `    // Logging middleware (first to capture everything)
    bot.use(loggingMiddleware);

    // H2: Webhook idempotency (drop duplicate updates early)
    bot.use(dedupeMiddleware);

    // H3: Rate limiting before expensive DB/session calls
    bot.use(rateLimitMiddleware);

    // H2: Sequentialize keyed by chat to prevent session write loss
    bot.use(sequentialize((ctx) => {
      const chat = ctx.chat?.id.toString();
      return chat ? chat : undefined;
    }));

    // Session storage (Redis with versioning)
    const sessionStorage = createRedisSessionStorage();
    bot.use(
      session({
        initial: () => createInitialSessionData(),
        storage: sessionStorage,
      }),
    );
  
    // Must come immediately after the session plugin and before ANY middleware
    // that reads ctx.session
    bot.use(requireChatSession());
  
    // Auth middleware (attaches user, role, KYC to session)
    // Run this BEFORE conversations so scenes have access to authenticated user
    bot.use(authMiddleware);

    // Conversations plugin for scenes
    bot.use(conversations());
  
    // Scene timeout enforcement MUST be after conversations
    bot.use(sceneTimeoutMiddleware);

    // I18n middleware
    bot.use(i18nMiddleware);`;

content = content.replace(oldUseRegex, newUseBlock);

fs.writeFileSync('apps/backend/src/modules/bot/bot.service.ts', content);
