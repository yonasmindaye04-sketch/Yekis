const fs = require('fs');
let content = fs.readFileSync('apps/backend/src/modules/escrow/escrow.routes.ts', 'utf8');

content = content.replace(
  /escrowRouter\.post\([\s\S]*?"\/wallet\/withdraw",[\s\S]*?async \(req: AuthedRequest, res\) => \{/,
  `escrowRouter.post(
    "/wallet/withdraw",
    requireAuth,
    requireKycVerified("TIER_2"),
    async (req: AuthedRequest, res) => {
      // C3: Enforce step-up / recent authentication for money movement
      if (!req.user?.iat || (Date.now() / 1000 - req.user.iat) > 300) {
        return res.status(401).json({ 
          error: "REAUTH_REQUIRED", 
          message: "Withdrawal requires recent authentication (within 5 minutes)." 
        });
      }`
);

fs.writeFileSync('apps/backend/src/modules/escrow/escrow.routes.ts', content);
