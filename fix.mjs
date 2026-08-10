import fs from 'fs';

function replaceInFile(path, from, to) {
    if (fs.existsSync(path)) {
        let content = fs.readFileSync(path, 'utf8');
        content = content.replace(from, to);
        content = content.replace(from, to); // In case of multiples, though a regex is better
        fs.writeFileSync(path, content);
    }
}

replaceInFile('apps/backend/src/middleware/hardBlock.ts', 'if (tierOrder[kyc.tier] < tierOrder[requiredTier])', 'if (tierOrder[kyc.tier as "TIER_1" | "TIER_2" | "TIER_3"] < tierOrder[requiredTier])');
replaceInFile('apps/backend/src/middleware/requireKycVerified.ts', 'if (tierOrder[kyc.tier] < tierOrder[requiredTier])', 'if (tierOrder[kyc.tier as "TIER_1" | "TIER_2" | "TIER_3"] < tierOrder[requiredTier])');

let auth = fs.readFileSync('apps/backend/src/modules/auth/auth.service.ts', 'utf8');
auth = auth.replace('async (tx) =>', 'async (tx: any) =>');
if (!auth.includes('export async function createAuthTokens')) {
    auth += `
export async function createAuthTokens(user: any) {
  const accessToken = await new import("jose").SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(new TextEncoder().encode(env.JWT_ACCESS_SECRET));

  const refreshToken = await new import("jose").SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(new TextEncoder().encode(env.JWT_REFRESH_SECRET));

  return { accessToken, refreshToken };
}
`;
}
fs.writeFileSync('apps/backend/src/modules/auth/auth.service.ts', auth);

let envTs = fs.readFileSync('apps/backend/src/config/env.ts', 'utf8');
if (!envTs.includes('TELEGRAM_BOT_TOKEN')) {
    envTs = envTs.replace('SENTRY_DSN: z.string().optional(),', `SENTRY_DSN: z.string().optional(),\n  TELEGRAM_BOT_TOKEN: z.string().optional(),\n  TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().default(86400),`);
    fs.writeFileSync('apps/backend/src/config/env.ts', envTs);
}

replaceInFile('apps/backend/src/modules/contracts/contracts.service.ts', 'async (tx) =>', 'async (tx: any) =>');
replaceInFile('apps/backend/src/modules/disputes/disputes.routes.ts', 'req.params.contractId)', 'req.params.contractId as string)');
replaceInFile('apps/backend/src/modules/disputes/disputes.routes.ts', 'disputeId: req.params.id,', 'disputeId: req.params.id as string,');
replaceInFile('apps/backend/src/modules/kyc/fayda.client.ts', "'../lib/logger.js'", "'../../lib/logger.js'");
replaceInFile('apps/backend/src/modules/kyc/pep.client.ts', "'../lib/logger.js'", "'../../lib/logger.js'");
replaceInFile('apps/backend/src/modules/kyc/kyc.service.ts', 'documents.map((d) =>', 'documents.map((d: any) =>');

console.log('Fixes applied.');
