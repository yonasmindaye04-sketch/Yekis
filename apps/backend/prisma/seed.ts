// === IMPORTS ===
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "argon2";

const prisma = new PrismaClient();

// === SEED DATA ===

const SKILLS = [
  { id: "web-development", nameEn: "Web Development", nameAm: "ድር መስሪያ", category: "DEVELOPMENT" as const, displayOrder: 1 },
  { id: "mobile-development", nameEn: "Mobile Development", nameAm: "ሞባይል መስሪያ", category: "DEVELOPMENT" as const, displayOrder: 2 },
  { id: "ui-ux-design", nameEn: "UI/UX Design", nameAm: "UI/UX ዲዛይን", category: "DESIGN" as const, displayOrder: 1 },
  { id: "graphic-design", nameEn: "Graphic Design", nameAm: "ግራፊክ ዲዛይን", category: "DESIGN" as const, displayOrder: 2 },
  { id: "content-writing", nameEn: "Content Writing", nameAm: "የይዘት መጻፍ", category: "WRITING" as const, displayOrder: 1 },
  { id: "translation", nameEn: "Translation", nameAm: "ትርጉም", category: "TRANSLATION" as const, displayOrder: 1 },
  { id: "digital-marketing", nameEn: "Digital Marketing", nameAm: "ዲጂታል ማርኬቲንግ", category: "MARKETING" as const, displayOrder: 1 },
  { id: "social-media-management", nameEn: "Social Media Management", nameAm: "ሶሻል ሚዲያ አስተዳደር", category: "MARKETING" as const, displayOrder: 2 },
  { id: "data-entry", nameEn: "Data Entry", nameAm: "ዳታ መግቢያ", category: "DATA_ENTRY" as const, displayOrder: 1 },
  { id: "video-editing", nameEn: "Video Editing", nameAm: "ቪዲዮ መስራት", category: "VIDEO_AUDIO" as const, displayOrder: 1 },
  { id: "accounting", nameEn: "Accounting", nameAm: "ሂሳብ", category: "BUSINESS" as const, displayOrder: 1 },
  { id: "virtual-assistant", nameEn: "Virtual Assistant", nameAm: "ምክርተኛ", category: "BUSINESS" as const, displayOrder: 2 },
  { id: "civil-engineering", nameEn: "Civil Engineering", nameAm: "ሲቪል ኢንጂነሪንግ", category: "ENGINEERING" as const, displayOrder: 1 },
];

// === MAIN ===
async function main() {
  console.log("🌱 Seeding skills taxonomy...");

  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { id: skill.id },
      update: {
        nameEn: skill.nameEn,
        nameAm: skill.nameAm,
        category: skill.category,
        displayOrder: skill.displayOrder,
      },
      create: skill,
    });
  }

  console.log(`  ✅ ${SKILLS.length} skills seeded`);

  console.log("🌱 Seeding admin user...");

  await prisma.user.upsert({
    where: { email: "admin@yekis.et" },
    update: {},
    create: {
      email: "admin@yekis.et",
      phone: "+251910011818",
      passwordHash: await bcrypt.hash("test1234"),
      role: "CLIENT",
      dateOfBirth: new Date("1990-01-01"),
      staffRole: "ADMIN",
      firstName: "Admin",
      lastName: "Yekis",
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    },
  });

  console.log("  ✅ Admin user seeded");

  console.log("🌱 Seeding compliance officer user...");

  await prisma.user.upsert({
    where: { email: "compliance@yekis.et" },
    update: { staffRole: "COMPLIANCE_OFFICER" },
    create: {
      email: "compliance@yekis.et",
      phone: "+251910011819",
      passwordHash: await bcrypt.hash("test1234"),
      role: "CLIENT",
      dateOfBirth: new Date("1990-01-01"),
      staffRole: "COMPLIANCE_OFFICER",
      firstName: "Compliance",
      lastName: "Yekis",
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    },
  });

  console.log("  ✅ Compliance officer user seeded");

  console.log("🌱 Seeding customer support user...");

  await prisma.user.upsert({
    where: { email: "support@yekis.et" },
    update: { staffRole: "SUPPORT" },
    create: {
      email: "support@yekis.et",
      phone: "+251910011820",
      passwordHash: await bcrypt.hash("test1234"),
      role: "CLIENT",
      dateOfBirth: new Date("1990-01-01"),
      staffRole: "SUPPORT",
      firstName: "Support",
      lastName: "Yekis",
      kyc: { create: { tier: "TIER_1", status: "PENDING" } },
      wallet: { create: { balanceMinor: 0 } },
    },
  });

  console.log("  ✅ Customer support user seeded");

  console.log("🌱 Seeding demo freelancer + gigs...");

  // Sellers need role FREELANCER (or BOTH) and TIER_1 KYC: both are enforced by
  // POST /gigs. The gigs are written ACTIVE directly rather than through the
  // API, because publication is a staff decision (POST /gigs/:id/moderation)
  // and seed data has already had that decision applied.
  const seller = await prisma.user.upsert({
    where: { email: "seller@yekis.et" },
    update: {},
    create: {
      email: "seller@yekis.et",
      phone: "+251910011821",
      passwordHash: await bcrypt.hash("test1234"),
      role: "FREELANCER",
      dateOfBirth: new Date("1993-04-12"),
      firstName: "Selam",
      lastName: "Tadesse",
      bio: "Brand and web designer helping Ethiopian businesses look established.",
      profileVisibility: "PUBLIC",
      isAvailableForWork: true,
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    },
  });

  console.log("  ✅ Demo freelancer seeded (seller@yekis.et / test1234)");

  const GIGS = [
    {
      slug: "demo-logo",
      title: "I will design a modern, professional logo for your brand",
      category: "GRAPHIC_DESIGN" as const,
      description:
        "You get a distinctive logo built for your brand, not a template. I start with a short brief, send two concepts, refine the one you like, and hand over every file format you need. Work in Amharic or English, and I work with Ethiopian businesses and diaspora brands regularly.",
      tags: ["logo", "branding", "identity"],
      packages: [
        { tier: "BASIC" as const, title: "Essential logo", description: "One concept, one revision round, files in PNG and SVG.", deliveryDays: 3, revisionsIncluded: 1, priceMinor: 150_000 },
        { tier: "STANDARD" as const, title: "Logo with brand kit", description: "Two concepts, colour palette, font pairing and social media avatar sizes.", deliveryDays: 5, revisionsIncluded: 2, priceMinor: 350_000 },
        { tier: "PREMIUM" as const, title: "Full brand identity", description: "Everything in Standard plus business card, letterhead and a brand usage guide.", deliveryDays: 10, revisionsIncluded: 4, priceMinor: 800_000 },
      ],
    },
    {
      slug: "demo-landing",
      title: "I will build a fast, responsive landing page for your business",
      category: "WEB_APP_DEVELOPMENT" as const,
      description:
        "A single, focused page that loads quickly on the mobile connections most of your customers actually use. You get a clean design, a working contact form, and everything set up so you can update the text yourself afterwards. No templates that look like everyone else.",
      tags: ["landing page", "web", "responsive"],
      packages: [
        { tier: "BASIC" as const, title: "Single page", description: "One page, up to five sections, mobile ready, contact form.", deliveryDays: 5, revisionsIncluded: 1, priceMinor: 250_000 },
        { tier: "STANDARD" as const, title: "Page with content", description: "Everything in Basic plus copywriting for each section and basic SEO setup.", deliveryDays: 8, revisionsIncluded: 2, priceMinor: 450_000 },
      ],
    },
    {
      slug: "demo-translation",
      title: "I will translate your documents between Amharic and English",
      category: "TRANSLATION" as const,
      description:
        "Accurate translation of business, legal or personal documents, delivered as a side-by-side Word file so you can check every line against the original. I work on contracts, letters, manuals and marketing copy, and I flag anything ambiguous rather than guessing.",
      tags: ["translation", "amharic", "english"],
      packages: [
        { tier: "BASIC" as const, title: "Up to 1,000 words", description: "Side-by-side Word document, delivered in 3 days.", deliveryDays: 3, revisionsIncluded: 1, priceMinor: 80_000 },
        { tier: "STANDARD" as const, title: "Up to 5,000 words", description: "Side-by-side document plus a summary of key terms.", deliveryDays: 7, revisionsIncluded: 2, priceMinor: 300_000 },
      ],
    },
    {
      slug: "demo-content",
      title: "I will write clear, engaging website copy for your pages",
      category: "CONTENT_WRITING" as const,
      description:
        "Plain, specific writing that says what you do and why someone should choose you — without the filler. I research your competitors first so the copy is genuinely differentiated, and I deliver in a document you can hand straight to whoever is building the site.",
      tags: ["copywriting", "seo", "content"],
      packages: [
        { tier: "BASIC" as const, title: "One page of copy", description: "Around 400 words for a single page, one revision round.", deliveryDays: 2, revisionsIncluded: 1, priceMinor: 60_000 },
        { tier: "STANDARD" as const, title: "Up to five pages", description: "Around 2,000 words across five pages, with SEO headings.", deliveryDays: 6, revisionsIncluded: 2, priceMinor: 220_000 },
      ],
    },
  ];

  for (const g of GIGS) {
    // Keyed on the slug in the title so re-running the seed is idempotent
    // without needing a dedicated slug column on the model.
    const existing = await prisma.gig.findFirst({
      where: { freelancerId: seller.id, title: g.title },
    });
    if (existing) continue;

    await prisma.gig.create({
      data: {
        freelancerId: seller.id,
        title: g.title,
        category: g.category,
        description: g.description,
        tags: g.tags,
        requirements: [],
        mediaUrls: [],
        // Seed data is treated as already-approved.
        status: "ACTIVE",
        autoAcceptOrders: true,
        maxRevisions: 2,
        packages: { create: g.packages },
      },
    });
  }

  console.log(`  ✅ ${GIGS.length} gigs seeded`);

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());