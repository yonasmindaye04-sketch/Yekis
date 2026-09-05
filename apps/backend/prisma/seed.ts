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
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());