import { type Language } from "../i18n";

export interface LocalizableSkill {
  id?: string;
  name?: string | null;
  nameEn?: string | null;
  nameAm?: string | null;
}

const SKILL_TRANSLATIONS: Record<
  string,
  { am: string; om: string; ti: string }
> = {
  "web-development": { am: "ድር መስሪያ", om: "Misooma Weebii", ti: "ምዕባለ ዌብ" },
  "web development": { am: "ድር መስሪያ", om: "Misooma Weebii", ti: "ምዕባለ ዌብ" },
  "mobile-development": { am: "ሞባይል መስሪያ", om: "Misooma Appii Mobaayilaa", ti: "ምዕባለ ሞባይል" },
  "mobile development": { am: "ሞባይል መስሪያ", om: "Misooma Appii Mobaayilaa", ti: "ምዕባለ ሞባይል" },
  "ui-ux-design": { am: "UI/UX ዲዛይን", om: "Dizaayinii UI/UX", ti: "ዲዛይን UI/UX" },
  "ui/ux design": { am: "UI/UX ዲዛይን", om: "Dizaayinii UI/UX", ti: "ዲዛይን UI/UX" },
  "graphic-design": { am: "ግራፊክ ዲዛይን", om: "Dizaayinii Giraafiksii", ti: "ግራፊክ ዲዛይን" },
  "graphic design": { am: "ግራፊክ ዲዛይን", om: "Dizaayinii Giraafiksii", ti: "ግራፊክ ዲዛይን" },
  "content-writing": { am: "የይዘት መጻፍ", om: "Barreessuu Qabiyyee", ti: "ጽሕፈት ትሕዝቶ" },
  "content writing": { am: "የይዘት መጻፍ", om: "Barreessuu Qabiyyee", ti: "ጽሕፈት ትሕዝቶ" },
  translation: { am: "ትርጉም", om: "Hiikkaa Afaanii", ti: "ትርጉም" },
  "digital-marketing": { am: "ዲጂታል ማርኬቲንግ", om: "Gabaa Dijitaalaa", ti: "ዲጂታል ማርኬቲንግ" },
  "digital marketing": { am: "ዲጂታል ማርኬቲንግ", om: "Gabaa Dijitaalaa", ti: "ዲጂታል ማርኬቲንግ" },
  "social-media-management": { am: "ሶሻል ሚዲያ አስተዳደር", om: "Bulchiinsa Miidiyaa Hawaasaa", ti: "ምሕደራ ማሕበራዊ ሚድያ" },
  "social media management": { am: "ሶሻል ሚዲያ አስተዳደር", om: "Bulchiinsa Miidiyaa Hawaasaa", ti: "ምሕደራ ማሕበራዊ ሚድያ" },
  "data-entry": { am: "ዳታ መግቢያ", om: "Galchii Daataa", ti: "ምእታው ዳታ" },
  "data entry": { am: "ዳታ መግቢያ", om: "Galchii Daataa", ti: "ምእታው ዳታ" },
  "video-editing": { am: "ቪዲዮ መስራት", om: "Gulaallii Viidiyoo", ti: "ምድላው ቪድዮ" },
  "video editing": { am: "ቪዲዮ መስራት", om: "Gulaallii Viidiyoo", ti: "ምድላው ቪድዮ" },
  accounting: { am: "ሂሳብ", om: "Herrega", ti: "ሕሳብ" },
  "virtual-assistant": { am: "ምክርተኛ", om: "Gargaaraa Toora Interneetii", ti: "ቨርቹዋል ሓጋዚ" },
  "virtual assistant": { am: "ምክርተኛ", om: "Gargaaraa Toora Interneetii", ti: "ቨርቹዋል ሓጋዚ" },
  "civil-engineering": { am: "ሲቪል ኢንጂነሪንግ", om: "Injiinariingii Siivilii", ti: "ሲቪል ኢንጂነሪንግ" },
  "civil engineering": { am: "ሲቪል ኢንጂነሪንግ", om: "Injiinariingii Siivilii", ti: "ሲቪል ኢንጂነሪንግ" },
  "web & mobile": { am: "ድር እና ሞባይል", om: "Weeb & Mobaayila", ti: "ዌብን ሞባይልን" },
  "full-stack web": { am: "ፉል-ስታክ ድር ልማት", om: "Misooma Weebii Guutuu", ti: "ፉል-ስታክ ዌብ" },
  "react / node.js": { am: "React / Node.js", om: "React / Node.js", ti: "React / Node.js" },
  "brand & ui": { am: "ብራንድ እና UI ዲዛይን", om: "Dizaayinii Biraandii & UI", ti: "ብራንድን UI ዲዛይንን" },
  "seo & social": { am: "SEO እና ማኅበራዊ ሚዲያ", om: "SEO fi Miidiyaa Hawaasaa", ti: "SEOን ማሕበራዊ ሚድያን" },
  "localisation": { am: "ትርጉም እና አካባቢያዊ ማስማማት", om: "Hiikkaa fi Qopheessa Afaanii", ti: "ትርጉምን ምስምማዕን" },
  "bi & dashboards": { am: "BI እና ዳሽቦርዶች", om: "BI & Daashboordota", ti: "BIን ዳሽቦርዳትን" },
  "video & motion": { am: "ቪዲዮ እና ሞሽን ግራፊክስ", om: "Viidiyoo & Mooshinii", ti: "ቪድዮን ሞሽን ግራፊክስን" },
  "telebirr integration": { am: "የቴሌብር ውህደት", om: "Walitti Hidhaa Telebirr", ti: "ውህደት ቴሌብር" },
  "cbe birr": { am: "CBE ብር", om: "CBE Birr", ti: "CBE ብር" },
  "typescript": { am: "TypeScript", om: "TypeScript", ti: "TypeScript" },
  "postgresql": { am: "PostgreSQL", om: "PostgreSQL", ti: "PostgreSQL" },
  "flutter": { am: "Flutter", om: "Flutter", ti: "Flutter" },
  "figma": { am: "Figma", om: "Figma", ti: "Figma" },
  "illustrator": { am: "Adobe Illustrator", om: "Adobe Illustrator", ti: "Adobe Illustrator" },
  "motion": { am: "ሞሽን ዲዛይን", om: "Dizaayinii Mooshinii", ti: "ሞሽን ዲዛይን" },
};

export function localizeSkillName(
  skill: LocalizableSkill | string,
  language: Language,
): string {
  const normalized: LocalizableSkill =
    typeof skill === "string" ? { name: skill } : skill;
  if (language === "am" && normalized.nameAm) return normalized.nameAm;
  const rawName =
    normalized.nameEn || normalized.name || normalized.id || "";
  if (language === "en") return rawName;
  const byId = normalized.id
    ? SKILL_TRANSLATIONS[normalized.id.toLowerCase()]
    : undefined;
  const byName = SKILL_TRANSLATIONS[rawName.trim().toLowerCase()];
  const match = byId ?? byName;
  if (match && language in match) {
    return match[language as "am" | "om" | "ti"];
  }
  if (language === "am" && normalized.nameAm) return normalized.nameAm;
  return rawName;
}
