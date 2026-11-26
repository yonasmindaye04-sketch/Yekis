-- Persist per-user Yekis Guide onboarding and product tour progress.
-- Stored as JSONB on "User" and strictly scoped by req.user.id.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "guideProgress" JSONB;
