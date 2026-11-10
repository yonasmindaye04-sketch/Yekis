-- ============================================================================
-- Rotate the seeded demo credentials
--
-- Earlier data migrations inserted the demo staff/seller/client accounts with
-- a shared, publicly documented password (its Argon2id hashes appear in the
-- 20261022* migrations). Those hashes are compromised by definition: the
-- plaintext was committed to the repository.
--
-- This migration replaces exactly those known hashes with a hash of a random
-- value that is not stored anywhere. The matching rows therefore become
-- unusable for login until an operator deliberately runs `prisma/seed.ts`
-- with SEED_DEMO_PASSWORD (local/staging only) or provisions real staff
-- accounts. Rows whose password has already been changed are left untouched.
--
-- `sessionVersion` is bumped so access and refresh tokens issued before the
-- rotation stop validating as well.
-- ============================================================================

UPDATE "User"
SET
  "passwordHash" = '$argon2id$v=19$m=16384,t=3,p=4$WO/Z0Lx9BHEYn8EqtEPhGg$0/A554eG7mGhzzBIhIPS2X2/1Fds/5ZtQ8Z2w6RmKFg',
  "sessionVersion" = "sessionVersion" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "passwordHash" IN (
  '$argon2id$v=19$m=16384,t=3,p=4$moKzIFyFuBOQSBofUzBkMA$8+FqJ8ALDHtSjPUbRFR+N7NihXxl2LDPwuqSbsrXcjk',
  '$argon2id$v=19$m=16384,t=3,p=4$gUpYh3AuBL21X7r45L5fRQ$Rycs36OVHqzy6g/C9wCV8iGSUmy+uaC1BokytXyz9KU',
  '$argon2id$v=19$m=16384,t=3,p=4$FvBJBUoYey0Fe7AOBZDQxQ$GaC8L1tDm3TwcE39XdmWXZ8pbL0+gc0DPdy5hdeKV8s',
  '$argon2id$v=19$m=16384,t=3,p=4$qsclWPYfiUk4DxJtxuNNyA$Tge+2pELQsV9dCLj/RciXYRr8mLOLmD1P/GnuN7bDq4'
);
