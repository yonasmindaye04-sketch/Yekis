-- ============================================================================
-- Demo data
--
-- The rows a local/dev environment needs to look like a populated marketplace:
-- the skills taxonomy, the staff accounts, the demo freelancer and four active
-- gigs.
--
-- This is a DATA migration, and it is written to be safe when some or all of
-- these rows already exist (for example because `prisma/seed.ts` has run):
--   * rows are matched by their natural keys (email, skill id, freelancer +
--     title, gig + tier), not by the fixed ids used below;
--   * every insert is guarded with NOT EXISTS / ON CONFLICT DO NOTHING.
-- That keeps it in sync with `prisma/seed.ts` instead of duplicating rows.
--
-- The password for all four accounts is `test1234` — documented demo
-- credentials. The hashes are Argon2id at the same parameters the app uses
-- (m=16384, t=3, p=4).
-- ============================================================================

-- ── Skills taxonomy ─────────────────────────────────────────────────────────
INSERT INTO "Skill" ("id", "nameEn", "nameAm", "category", "isActive", "displayOrder") VALUES
  ('web-development',         'Web Development',         'ድር መስሪያ',            'DEVELOPMENT', true, 1),
  ('mobile-development',      'Mobile Development',      'ሞባይል መስሪያ',          'DEVELOPMENT', true, 2),
  ('ui-ux-design',            'UI/UX Design',            'UI/UX ዲዛይን',         'DESIGN',      true, 1),
  ('graphic-design',          'Graphic Design',          'ግራፊክ ዲዛይን',         'DESIGN',      true, 2),
  ('content-writing',         'Content Writing',         'የይዘት መጻፍ',           'WRITING',     true, 1),
  ('translation',             'Translation',             'ትርጉም',               'TRANSLATION', true, 1),
  ('digital-marketing',       'Digital Marketing',       'ዲጂታል ማርኬቲንግ',       'MARKETING',   true, 1),
  ('social-media-management', 'Social Media Management', 'ሶሻል ሚዲያ አስተዳደር',   'MARKETING',   true, 2),
  ('data-entry',              'Data Entry',              'ዳታ መግቢያ',            'DATA_ENTRY',  true, 1),
  ('video-editing',           'Video Editing',           'ቪዲዮ መስራት',          'VIDEO_AUDIO', true, 1),
  ('accounting',              'Accounting',              'ሂሳብ',                 'BUSINESS',    true, 1),
  ('virtual-assistant',       'Virtual Assistant',       'ምክርተኛ',              'BUSINESS',    true, 2),
  ('civil-engineering',       'Civil Engineering',       'ሲቪል ኢንጂነሪንግ',       'ENGINEERING', true, 1)
ON CONFLICT ("id") DO NOTHING;

-- ── Staff accounts ──────────────────────────────────────────────────────────
INSERT INTO "User" (
  "id", "ucid", "email", "phone", "passwordHash", "role", "dateOfBirth",
  "staffRole", "firstName", "lastName", "cachedKycTier", "cachedKycStatus", "updatedAt"
)
SELECT
  'seed-user-admin', 'seed-ucid-admin', 'admin@yekis.et', '+251910011818',
  '$argon2id$v=19$m=16384,t=3,p=4$moKzIFyFuBOQSBofUzBkMA$8+FqJ8ALDHtSjPUbRFR+N7NihXxl2LDPwuqSbsrXcjk',
  'CLIENT', '1990-01-01'::timestamp, 'ADMIN', 'Admin', 'Yekis', 'TIER_1', 'VERIFIED', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'admin@yekis.et');

INSERT INTO "User" (
  "id", "ucid", "email", "phone", "passwordHash", "role", "dateOfBirth",
  "staffRole", "firstName", "lastName", "cachedKycTier", "cachedKycStatus", "updatedAt"
)
SELECT
  'seed-user-compliance', 'seed-ucid-compliance', 'compliance@yekis.et', '+251910011819',
  '$argon2id$v=19$m=16384,t=3,p=4$gUpYh3AuBL21X7r45L5fRQ$Rycs36OVHqzy6g/C9wCV8iGSUmy+uaC1BokytXyz9KU',
  'CLIENT', '1990-01-01'::timestamp, 'COMPLIANCE_OFFICER', 'Compliance', 'Yekis', 'TIER_1', 'VERIFIED', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'compliance@yekis.et');

INSERT INTO "User" (
  "id", "ucid", "email", "phone", "passwordHash", "role", "dateOfBirth",
  "staffRole", "firstName", "lastName", "cachedKycTier", "cachedKycStatus", "updatedAt"
)
SELECT
  'seed-user-support', 'seed-ucid-support', 'support@yekis.et', '+251910011820',
  '$argon2id$v=19$m=16384,t=3,p=4$FvBJBUoYey0Fe7AOBZDQxQ$GaC8L1tDm3TwcE39XdmWXZ8pbL0+gc0DPdy5hdeKV8s',
  'CLIENT', '1990-01-01'::timestamp, 'SUPPORT', 'Support', 'Yekis', 'TIER_1', 'PENDING', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'support@yekis.et');

-- Demo freelancer. Sellers need role FREELANCER (or BOTH) and TIER_1 KYC:
-- both are enforced by POST /gigs.
INSERT INTO "User" (
  "id", "ucid", "email", "phone", "passwordHash", "role", "dateOfBirth",
  "firstName", "lastName", "bio", "profileVisibility", "isAvailableForWork",
  "cachedKycTier", "cachedKycStatus", "updatedAt"
)
SELECT
  'seed-user-seller', 'seed-ucid-seller', 'seller@yekis.et', '+251910011821',
  '$argon2id$v=19$m=16384,t=3,p=4$qsclWPYfiUk4DxJtxuNNyA$Tge+2pELQsV9dCLj/RciXYRr8mLOLmD1P/GnuN7bDq4',
  'FREELANCER', '1993-04-12'::timestamp,
  'Selam', 'Tadesse',
  'Brand and web designer helping Ethiopian businesses look established.',
  'PUBLIC', true, 'TIER_1', 'VERIFIED', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'seller@yekis.et');

-- ── KYC records ─────────────────────────────────────────────────────────────
-- Joined on email so this also fills in rows for accounts that already
-- existed under a different id.
INSERT INTO "KycRecord" ("id", "userId", "tier", "status", "updatedAt")
SELECT 'seed-kyc-admin', u."id", 'TIER_1', 'VERIFIED', CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'admin@yekis.et'
  AND NOT EXISTS (SELECT 1 FROM "KycRecord" k WHERE k."userId" = u."id");

INSERT INTO "KycRecord" ("id", "userId", "tier", "status", "updatedAt")
SELECT 'seed-kyc-compliance', u."id", 'TIER_1', 'VERIFIED', CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'compliance@yekis.et'
  AND NOT EXISTS (SELECT 1 FROM "KycRecord" k WHERE k."userId" = u."id");

INSERT INTO "KycRecord" ("id", "userId", "tier", "status", "updatedAt")
SELECT 'seed-kyc-support', u."id", 'TIER_1', 'PENDING', CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'support@yekis.et'
  AND NOT EXISTS (SELECT 1 FROM "KycRecord" k WHERE k."userId" = u."id");

INSERT INTO "KycRecord" ("id", "userId", "tier", "status", "updatedAt")
SELECT 'seed-kyc-seller', u."id", 'TIER_1', 'VERIFIED', CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'seller@yekis.et'
  AND NOT EXISTS (SELECT 1 FROM "KycRecord" k WHERE k."userId" = u."id");

-- ── Wallets ─────────────────────────────────────────────────────────────────
INSERT INTO "Wallet" ("id", "userId", "balanceMinor", "updatedAt")
SELECT 'seed-wallet-admin', u."id", 0, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'admin@yekis.et'
  AND NOT EXISTS (SELECT 1 FROM "Wallet" w WHERE w."userId" = u."id");

INSERT INTO "Wallet" ("id", "userId", "balanceMinor", "updatedAt")
SELECT 'seed-wallet-compliance', u."id", 0, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'compliance@yekis.et'
  AND NOT EXISTS (SELECT 1 FROM "Wallet" w WHERE w."userId" = u."id");

INSERT INTO "Wallet" ("id", "userId", "balanceMinor", "updatedAt")
SELECT 'seed-wallet-support', u."id", 0, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'support@yekis.et'
  AND NOT EXISTS (SELECT 1 FROM "Wallet" w WHERE w."userId" = u."id");

INSERT INTO "Wallet" ("id", "userId", "balanceMinor", "updatedAt")
SELECT 'seed-wallet-seller', u."id", 0, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'seller@yekis.et'
  AND NOT EXISTS (SELECT 1 FROM "Wallet" w WHERE w."userId" = u."id");

-- ── Demo gigs ───────────────────────────────────────────────────────────────
-- Written ACTIVE directly: publication is a staff decision
-- (POST /gigs/:id/moderation) and seed data has already had that decision
-- applied.
INSERT INTO "Gig" (
  "id", "freelancerId", "title", "category", "description", "tags",
  "requirements", "mediaUrls", "status", "autoAcceptOrders", "maxRevisions", "updatedAt"
)
SELECT
  'seed-gig-logo', u."id",
  'I will design a modern, professional logo for your brand',
  'GRAPHIC_DESIGN',
  'You get a distinctive logo built for your brand, not a template. I start with a short brief, send two concepts, refine the one you like, and hand over every file format you need. Work in Amharic or English, and I work with Ethiopian businesses and diaspora brands regularly.',
  '["logo","branding","identity"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  'ACTIVE', true, 2, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'seller@yekis.et'
  AND NOT EXISTS (
    SELECT 1 FROM "Gig" g
    WHERE g."freelancerId" = u."id"
      AND g."title" = 'I will design a modern, professional logo for your brand'
  );

INSERT INTO "Gig" (
  "id", "freelancerId", "title", "category", "description", "tags",
  "requirements", "mediaUrls", "status", "autoAcceptOrders", "maxRevisions", "updatedAt"
)
SELECT
  'seed-gig-landing', u."id",
  'I will build a fast, responsive landing page for your business',
  'WEB_APP_DEVELOPMENT',
  'A single, focused page that loads quickly on the mobile connections most of your customers actually use. You get a clean design, a working contact form, and everything set up so you can update the text yourself afterwards. No templates that look like everyone else.',
  '["landing page","web","responsive"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  'ACTIVE', true, 2, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'seller@yekis.et'
  AND NOT EXISTS (
    SELECT 1 FROM "Gig" g
    WHERE g."freelancerId" = u."id"
      AND g."title" = 'I will build a fast, responsive landing page for your business'
  );

INSERT INTO "Gig" (
  "id", "freelancerId", "title", "category", "description", "tags",
  "requirements", "mediaUrls", "status", "autoAcceptOrders", "maxRevisions", "updatedAt"
)
SELECT
  'seed-gig-translation', u."id",
  'I will translate your documents between Amharic and English',
  'TRANSLATION',
  'Accurate translation of business, legal or personal documents, delivered as a side-by-side Word file so you can check every line against the original. I work on contracts, letters, manuals and marketing copy, and I flag anything ambiguous rather than guessing.',
  '["translation","amharic","english"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  'ACTIVE', true, 2, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'seller@yekis.et'
  AND NOT EXISTS (
    SELECT 1 FROM "Gig" g
    WHERE g."freelancerId" = u."id"
      AND g."title" = 'I will translate your documents between Amharic and English'
  );

INSERT INTO "Gig" (
  "id", "freelancerId", "title", "category", "description", "tags",
  "requirements", "mediaUrls", "status", "autoAcceptOrders", "maxRevisions", "updatedAt"
)
SELECT
  'seed-gig-content', u."id",
  'I will write clear, engaging website copy for your pages',
  'CONTENT_WRITING',
  'Plain, specific writing that says what you do and why someone should choose you — without the filler. I research your competitors first so the copy is genuinely differentiated, and I deliver in a document you can hand straight to whoever is building the site.',
  '["copywriting","seo","content"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  'ACTIVE', true, 2, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = 'seller@yekis.et'
  AND NOT EXISTS (
    SELECT 1 FROM "Gig" g
    WHERE g."freelancerId" = u."id"
      AND g."title" = 'I will write clear, engaging website copy for your pages'
  );

-- ── Gig packages ────────────────────────────────────────────────────────────
INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-logo-basic', g."id", 'BASIC', 'Essential logo',
  'One concept, one revision round, files in PNG and SVG.', 3, 1, 150000
FROM "Gig" g
WHERE g."title" = 'I will design a modern, professional logo for your brand'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'BASIC');

INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-logo-standard', g."id", 'STANDARD', 'Logo with brand kit',
  'Two concepts, colour palette, font pairing and social media avatar sizes.', 5, 2, 350000
FROM "Gig" g
WHERE g."title" = 'I will design a modern, professional logo for your brand'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'STANDARD');

INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-logo-premium', g."id", 'PREMIUM', 'Full brand identity',
  'Everything in Standard plus business card, letterhead and a brand usage guide.', 10, 4, 800000
FROM "Gig" g
WHERE g."title" = 'I will design a modern, professional logo for your brand'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'PREMIUM');

INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-landing-basic', g."id", 'BASIC', 'Single page',
  'One page, up to five sections, mobile ready, contact form.', 5, 1, 250000
FROM "Gig" g
WHERE g."title" = 'I will build a fast, responsive landing page for your business'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'BASIC');

INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-landing-standard', g."id", 'STANDARD', 'Page with content',
  'Everything in Basic plus copywriting for each section and basic SEO setup.', 8, 2, 450000
FROM "Gig" g
WHERE g."title" = 'I will build a fast, responsive landing page for your business'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'STANDARD');

INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-translation-basic', g."id", 'BASIC', 'Up to 1,000 words',
  'Side-by-side Word document, delivered in 3 days.', 3, 1, 80000
FROM "Gig" g
WHERE g."title" = 'I will translate your documents between Amharic and English'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'BASIC');

INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-translation-standard', g."id", 'STANDARD', 'Up to 5,000 words',
  'Side-by-side document plus a summary of key terms.', 7, 2, 300000
FROM "Gig" g
WHERE g."title" = 'I will translate your documents between Amharic and English'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'STANDARD');

INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-content-basic', g."id", 'BASIC', 'One page of copy',
  'Around 400 words for a single page, one revision round.', 2, 1, 60000
FROM "Gig" g
WHERE g."title" = 'I will write clear, engaging website copy for your pages'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'BASIC');

INSERT INTO "GigPackage" (
  "id", "gigId", "tier", "title", "description", "deliveryDays", "revisionsIncluded", "priceMinor"
)
SELECT 'seed-pkg-content-standard', g."id", 'STANDARD', 'Up to five pages',
  'Around 2,000 words across five pages, with SEO headings.', 6, 2, 220000
FROM "Gig" g
WHERE g."title" = 'I will write clear, engaging website copy for your pages'
  AND NOT EXISTS (SELECT 1 FROM "GigPackage" p WHERE p."gigId" = g."id" AND p."tier" = 'STANDARD');
