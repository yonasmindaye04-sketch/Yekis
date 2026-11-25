import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { api, type UpdateProfilePayload } from "./api/client";
import {
  YekisAvatar,
  loadAvatarOverride,
  saveAvatarOverride,
} from "./components/YekisAvatar";
import { compressAvatarImage } from "./lib/avatarImage";
import { localizeSkillName } from "./lib/skillLabels";
import { type Language, useI18n } from "./i18n";
import "./ProfilePage.css";

type ProfileEditCopy = {
  failedLoad: string;
  stepPhoto: string;
  stepBioWithMin: (bioLabel: string, min: number) => string;
  stepThreeSkills: string;
  stepFaydaKyc: string;
  couldNotProcessImage: string;
  firstNameRequired: string;
  firstNameMax: string;
  lastNameRequired: string;
  lastNameMax: string;
  bioMax: (max: number) => string;
  skillLimit: (max: number) => string;
  projectTitleRequired: string;
  invalidUrl: string;
  resolveHighlighted: string;
  failedSave: string;
  yourMarketplaceName: string;
  asideAria: string;
  uploadCustomPhotoAria: string;
  marketplaceMember: string;
  notMarkedAvailable: string;
  processing: string;
  changePhoto: string;
  uploadPhoto: string;
  removeBtn: string;
  customPhotoActiveHint: string;
  photoUploadHint: string;
  completeStepsHint: string;
  sectionsAria: string;
  sectionsHeading: string;
  personalSectionDesc: string;
  bioHint: (min: number) => string;
  filterSkillsLabel: string;
  filterSkillsPlaceholder: string;
  skillsUnavailableNote: string;
  noMatchingSkills: (query: string) => string;
  primaryTag: string;
  projectNumber: (index: number) => string;
  thumbnailUrlLabel: string;
  liveProjectLinkLabel: string;
  unsavedChanges: string;
};

const PROFILE_EDIT_COPY: Record<Language, ProfileEditCopy> = {
  en: {
    failedLoad: "Failed to load your profile.",
    stepPhoto: "Profile photo",
    stepBioWithMin: (bioLabel, min) => `${bioLabel} (${min}+ chars)`,
    stepThreeSkills: "3+ selected skills",
    stepFaydaKyc: "Fayda KYC verification",
    couldNotProcessImage: "Could not process image.",
    firstNameRequired: "First name is required.",
    firstNameMax: "First name must be 50 characters or fewer.",
    lastNameRequired: "Last name is required.",
    lastNameMax: "Last name must be 50 characters or fewer.",
    bioMax: (max) => `Bio cannot exceed ${max} characters.`,
    skillLimit: (max) => `You can select up to ${max} skills.`,
    projectTitleRequired: "Enter a project title or remove this empty item.",
    invalidUrl: "Enter a valid http:// or https:// URL.",
    resolveHighlighted: "Please resolve the highlighted fields before saving.",
    failedSave: "Failed to save changes",
    yourMarketplaceName: "Your Marketplace Name",
    asideAria: "Profile overview and readiness",
    uploadCustomPhotoAria: "Upload custom profile picture",
    marketplaceMember: "Marketplace Member",
    notMarkedAvailable: "Not marked available",
    processing: "Processing...",
    changePhoto: "Change Photo",
    uploadPhoto: "Upload Photo",
    removeBtn: "Remove",
    customPhotoActiveHint: "Custom photo active across contracts, chat, and public profile.",
    photoUploadHint: "JPG, PNG, WEBP, or GIF up to 10 MB. Without a photo, Yekis shows your generated avatar.",
    completeStepsHint: "Complete each milestone below to reach 100% visibility.",
    sectionsAria: "Profile editor sections",
    sectionsHeading: "Sections",
    personalSectionDesc: "Your public display name and summary shown across search results, proposals, and contracts.",
    bioHint: (min) => `Write at least ${min} characters highlighting your experience and outcomes. Avoid sharing phone numbers or external contact links.`,
    filterSkillsLabel: "Filter skills",
    filterSkillsPlaceholder: "Filter by skill or category...",
    skillsUnavailableNote: "Skill taxonomy options are currently unavailable. Save your other profile updates and try refreshing later.",
    noMatchingSkills: (query) => `No skills match “${query}”.`,
    primaryTag: "Primary",
    projectNumber: (index) => `Project #${index}`,
    thumbnailUrlLabel: "Thumbnail Image URL",
    liveProjectLinkLabel: "Live Project Link",
    unsavedChanges: "Unsaved profile changes",
  },
  am: {
    failedLoad: "መገለጫዎን መጫን አልተቻለም።",
    stepPhoto: "የመገለጫ ፎቶ",
    stepBioWithMin: (bioLabel, min) => `${bioLabel} (${min}+ ፊደላት)`,
    stepThreeSkills: "3+ የተመረጡ ክህሎቶች",
    stepFaydaKyc: "የፋይዳ KYC ማረጋገጫ",
    couldNotProcessImage: "ምስሉን ማስኬድ አልተቻለም።",
    firstNameRequired: "የመጀመሪያ ስም ያስፈልጋል።",
    firstNameMax: "የመጀመሪያ ስም 50 ፊደላት ወይም ከዚያ በታች መሆን አለበት።",
    lastNameRequired: "የአባት ስም ያስፈልጋል።",
    lastNameMax: "የአባት ስም 50 ፊደላት ወይም ከዚያ በታች መሆን አለበት።",
    bioMax: (max) => `መግለጫው ከ${max} ፊደላት መብለጥ አይችልም።`,
    skillLimit: (max) => `እስከ ${max} ክህሎቶች መምረጥ ይችላሉ።`,
    projectTitleRequired: "የፕሮጀክት ርዕስ ያስገቡ ወይም ይህን ባዶ ንጥል ያስወግዱ።",
    invalidUrl: "ትክክለኛ የhttp:// ወይም https:// አድራሻ ያስገቡ።",
    resolveHighlighted: "እባክዎ ከማስቀመጥዎ በፊት የደመቁትን ሳጥኖች ያስተካክሉ።",
    failedSave: "ለውጦችን ማስቀመጥ አልተቻለም",
    yourMarketplaceName: "የገበያ ቦታ ስምዎ",
    asideAria: "የመገለጫ አጠቃላይ ዕይታ እና ዝግጁነት",
    uploadCustomPhotoAria: "የግል መገለጫ ፎቶ ይጫኑ",
    marketplaceMember: "የገበያ ቦታ አባል",
    notMarkedAvailable: "ዝግጁ ተብሎ አልተመዘገበም",
    processing: "በማስኬድ ላይ...",
    changePhoto: "ፎቶ ቀይር",
    uploadPhoto: "ፎቶ ጫን",
    removeBtn: "አስወግድ",
    customPhotoActiveHint: "ብጁ ፎቶ በውሎች፣ በውይይት እና በሕዝብ መገለጫ ላይ ንቁ ነው።",
    photoUploadHint: "JPG፣ PNG፣ WEBP ወይም GIF እስከ 10 MB። ፎቶ ከሌለ YeKis በራስ-ሰር የተፈጠረ አቫታር ያሳያል።",
    completeStepsHint: "100% ታይነት ለማግኘት ከታች ያሉትን እያንዳንዱን እርምጃ ያጠናቅቁ።",
    sectionsAria: "የመገለጫ አርታዒ ክፍሎች",
    sectionsHeading: "ክፍሎች",
    personalSectionDesc: "በፍለጋ ውጤቶች፣ በሥራ ሐሳቦች እና በውሎች ላይ የሚታይ የሕዝብ ስምዎ እና ማጠቃለያዎ።",
    bioHint: (min) => `ልምድዎን እና ውጤቶችዎን የሚያጎላ ቢያንስ ${min} ፊደላት ይጻፉ። የስልክ ቁጥር ወይም የውጭ መገናኛ አገናኞችን አያጋሩ።`,
    filterSkillsLabel: "ክህሎቶችን ያጣሩ",
    filterSkillsPlaceholder: "በክህሎት ወይም በዘርፍ ያጣሩ...",
    skillsUnavailableNote: "የክህሎት ዝርዝሮች ለጊዜው አይገኙም። ሌሎች የመገለጫ ማሻሻያዎችን ያስቀምጡና ቆይተው እንደገና ይሞክሩ።",
    noMatchingSkills: (query) => `ከ“${query}” ጋር የሚዛመድ ክህሎት የለም።`,
    primaryTag: "ዋና",
    projectNumber: (index) => `ፕሮጀክት #${index}`,
    thumbnailUrlLabel: "የቅድመ-ዕይታ ምስል URL",
    liveProjectLinkLabel: "የቀጥታ ፕሮጀክት አገናኝ",
    unsavedChanges: "ያልተቀመጡ የመገለጫ ለውጦች",
  },
  om: {
    failedLoad: "Piroofaayilii keessan fe'uun hin danda'amne.",
    stepPhoto: "Suuraa piroofaayilii",
    stepBioWithMin: (bioLabel, min) => `${bioLabel} (arfiilee ${min}+)`,
    stepThreeSkills: "Ogummaalee 3+ filataman",
    stepFaydaKyc: "Mirkaneessa Fayda KYC",
    couldNotProcessImage: "Suuraa qindeessuun hin danda'amne.",
    firstNameRequired: "Maqaan duraa barbaachisaa dha.",
    firstNameMax: "Maqaan duraa arfiilee 50 ykn isaa gadi ta'uu qaba.",
    lastNameRequired: "Maqaan akaakayyuu barbaachisaa dha.",
    lastNameMax: "Maqaan akaakayyuu arfiilee 50 ykn isaa gadi ta'uu qaba.",
    bioMax: (max) => `Ibsi arfiilee ${max} caaluu hin danda'u.`,
    skillLimit: (max) => `Hanga ogummaa ${max} filachuu dandeessu.`,
    projectTitleRequired: "Mataduree pirojektii galchaa ykn isa duwwaa kana balleessaa.",
    invalidUrl: "URL sirrii http:// ykn https:// galchaa.",
    resolveHighlighted: "Maaloo olkaa'uun dura iddoowwan mul'atan sirreessaa.",
    failedSave: "Jijjiirama olkaa'uun hin danda'amne",
    yourMarketplaceName: "Maqaa Gabaa Keessanii",
    asideAria: "Ilaalcha waliigalaa fi qophii piroofaayilii",
    uploadCustomPhotoAria: "Suuraa piroofaayilii dhuunfaa fe'i",
    marketplaceMember: "Miseensa Gabaa",
    notMarkedAvailable: "Akka qophiitti hin mallatteeffamne",
    processing: "Qindeessaa jira...",
    changePhoto: "Suuraa Jijjiiri",
    uploadPhoto: "Suuraa Fe'i",
    removeBtn: "Balleessi",
    customPhotoActiveHint: "Suuraan dhuunfaa waliigaltee, chaaatii fi piroofaayilii ummataa irratti hojiirra jira.",
    photoUploadHint: "JPG, PNG, WEBP, ykn GIF hanga MB 10. Suuraa malee YeKis avataara kee mul'isa.",
    completeStepsHint: "Mul'achuu %100 argachuuf tarkaanfiiwwan armaan gadii hunda xumuraa.",
    sectionsAria: "Kutaalee gulaalaa piroofaayilii",
    sectionsHeading: "Kutaalee",
    personalSectionDesc: "Maqaa mul'ataa ummataa fi cuunfaa bu'aa barbaaddii, yaada hojii fi waliigaltee keessatti mul'atu.",
    bioHint: (min) => `Muuxannoo fi bu'aa keessan kan ibsu yoo xiqqaate arfiilee ${min} barreessaa. Lakkoofsa bilbilaa ykn liinkii alaa hin qoodinaa.`,
    filterSkillsLabel: "Ogummaalee calali",
    filterSkillsPlaceholder: "Ogummaa ykn ramaddiin calali...",
    skillsUnavailableNote: "Filannoowwan tarree ogummaa amma hin argaman. Fooyya'iinsa biraa olkaa'aatii booda haaromsaa.",
    noMatchingSkills: (query) => `Ogummaan “${query}” wajjin walsimu hin jiru.`,
    primaryTag: "Ijoo",
    projectNumber: (index) => `Pirojektii #${index}`,
    thumbnailUrlLabel: "URL Suuraa Dur-argii",
    liveProjectLinkLabel: "Liinkii Pirojektii Kallattii",
    unsavedChanges: "Jijjiirama piroofaayilii hin olkaa'amne",
  },
  ti: {
    failedLoad: "ፕሮፋይልኩም ምጽዓን ኣይተኻእለን።",
    stepPhoto: "ስእሊ ፕሮፋይል",
    stepBioWithMin: (bioLabel, min) => `${bioLabel} (${min}+ ፊደላት)`,
    stepThreeSkills: "3+ ዝተመርጹ ክእለታት",
    stepFaydaKyc: "ምርግጋጽ ፋይዳ KYC",
    couldNotProcessImage: "ነቲ ስእሊ ምስላጥ ኣይተኻእለን።",
    firstNameRequired: "ቀዳማይ ስም የድሊ።",
    firstNameMax: "ቀዳማይ ስም 50 ፊደላት ወይ ካብኡ ዝውሕድ ክኸውን ኣለዎ።",
    lastNameRequired: "ስም ኣቦ የድሊ።",
    lastNameMax: "ስም ኣቦ 50 ፊደላት ወይ ካብኡ ዝውሕድ ክኸውን ኣለዎ።",
    bioMax: (max) => `መግለጺ ካብ ${max} ፊደላት ክሓልፍ ኣይክእልን።`,
    skillLimit: (max) => `ክሳብ ${max} ክእለታት ክትመርጹ ትኽእሉ።`,
    projectTitleRequired: "ኣርእስቲ ፕሮጀክት የእትዉ ወይ ነዚ ባዶ ኣልግስዎ።",
    invalidUrl: "ቅኑዕ ኣድራሻ http:// ወይ https:// የእትዉ።",
    resolveHighlighted: "በጃኹም ቅድሚ ምዕቃብኩም ነቶም ዝደመቑ ቦታታት ኣተዓራርዩ።",
    failedSave: "ለውጥታት ምዕቃብ ኣይተኻእለን",
    yourMarketplaceName: "ስም ዕዳጋኹም",
    asideAria: "ሓፈሻዊ ትርኢትን ድሉውነትን ፕሮፋይል",
    uploadCustomPhotoAria: "ውልቃዊ ስእሊ ፕሮፋይል ጽዓኑ",
    marketplaceMember: "ኣባል ዕዳጋ",
    notMarkedAvailable: "ከም ድሉው ኣይተመዝገበን",
    processing: "የሰላስል ኣሎ...",
    changePhoto: "ስእሊ ቀይር",
    uploadPhoto: "ስእሊ ጽዓን",
    removeBtn: "ኣልግስ",
    customPhotoActiveHint: "ውልቃዊ ስእሊ ኣብ ውዕላት፣ ዕላልን ህዝባዊ ፕሮፋይልን ንጡፍ እዩ።",
    photoUploadHint: "JPG፣ PNG፣ WEBP ወይ GIF ክሳብ 10 MB። ብዘይ ስእሊ YeKis ዝተፈጥረ ኣቫታር የርኢ።",
    completeStepsHint: "100% ተራእይነት ንምርካብ ነፍሲ ወከፍ ስጉምቲ ታሕቲ ዛዝሙ።",
    sectionsAria: "ክፍልታት ኣርታዒ ፕሮፋይል",
    sectionsHeading: "ክፍልታት",
    personalSectionDesc: "ኣብ ውጽኢት ምድላይ፣ እማመታትን ውዕላትን ዝረአ ህዝባዊ ስምኩምን መጠቓለልን።",
    bioHint: (min) => `ተመክሮኹምን ውጽኢታትኩምን ዘጉልሕ ብውሑዱ ${min} ፊደላት ጽሓፉ። ቁጽሪ ስልኪ ወይ ደጋዊ ሊንክ ኣይተካፍሉ።`,
    filterSkillsLabel: "ክእለታት ኣጻሪ",
    filterSkillsPlaceholder: "ብክእለት ወይ ዓውዲ ኣጻሪ...",
    skillsUnavailableNote: "ኣማራጺታት ክእለት ንሕጂ ኣይርከቡን። ካልኦት ምምሕያሻት ፕሮፋይል ዓቂብኩም ጸኒሕኩም ፈትኑ።",
    noMatchingSkills: (query) => `ምስ “${query}” ዝሰማማዕ ክእለት የለን።`,
    primaryTag: "ቀንዲ",
    projectNumber: (index) => `ፕሮጀክት #${index}`,
    thumbnailUrlLabel: "URL ንእሽቶ ስእሊ",
    liveProjectLinkLabel: "ሊንክ ህያው ፕሮጀክት",
    unsavedChanges: "ዘይተዓቀቡ ለውጥታት ፕሮፋይል",
  },
};

interface SkillTaxonomy {
  id: string;
  name?: string;
  nameEn?: string;
  nameAm?: string;
  category?: string | null;
}

export interface PortfolioProjectDraft {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  projectUrl?: string;
}

const PORTFOLIO_STORAGE_PREFIX = "yekis_portfolio_";
const MAX_SKILLS_ALLOWED = 10;
const MAX_PORTFOLIO_ITEMS = 20;
const BIO_MAX_LENGTH = 2000;
const BIO_RECOMMENDED_MIN = 50;

export function loadLocalPortfolio(userId: string): PortfolioProjectDraft[] {
  try {
    const raw = localStorage.getItem(`${PORTFOLIO_STORAGE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalPortfolio(
  userId: string,
  items: PortfolioProjectDraft[],
): void {
  try {
    localStorage.setItem(
      `${PORTFOLIO_STORAGE_PREFIX}${userId}`,
      JSON.stringify(items),
    );
  } catch {
    // ignore storage errors
  }
}

function isValidHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

interface ProfileFormState {
  firstName: string;
  lastName: string;
  bio: string;
  primarySkillId: string;
  skillIds: string[];
  isAvailableForWork: boolean;
  /** Narrowed to the API's enum so an arbitrary string cannot reach PATCH. */
  profileVisibility: NonNullable<UpdateProfilePayload["profileVisibility"]>;
  avatarUrl: string | null;
  profileCompleteness?: number;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  bio?: string;
  portfolio?: Record<string, { title?: string; thumbnailUrl?: string; projectUrl?: string }>;
}

export interface ProfileEditPageProps {
  onSaved?: () => void;
  role?: string;
}

const SUPPORTS_NATIVE_SWITCH =
  typeof HTMLInputElement !== "undefined" &&
  "switch" in HTMLInputElement.prototype;

export const ProfileEditPage = ({ onSaved, role }: ProfileEditPageProps = {}) => {
  const { t, language: lang } = useI18n();
  const pr = t.workspace.profile;
  const copy = PROFILE_EDIT_COPY[lang] ?? PROFILE_EDIT_COPY.en;
  const uid = useId();

  const [userId, setUserId] = useState<string>("me");
  const [accountRole, setAccountRole] = useState<string>(role ?? "FREELANCER");
  const [kycVerified, setKycVerified] = useState<boolean>(false);
  const [formData, setFormData] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    bio: "",
    primarySkillId: "",
    skillIds: [],
    isAvailableForWork: false,
    profileVisibility: "PUBLIC",
    avatarUrl: null,
  });
  const [portfolioItems, setPortfolioItems] = useState<PortfolioProjectDraft[]>([]);
  const [avatarSeed, setAvatarSeed] = useState<string>("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [skillTaxonomy, setSkillTaxonomy] = useState<SkillTaxonomy[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillLimitNote, setSkillLimitNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const lastNameInputRef = useRef<HTMLInputElement | null>(null);
  const bioInputRef = useRef<HTMLTextAreaElement | null>(null);
  const serverPortfolioIdsRef = useRef<Set<string>>(new Set());

  const photoSectionRef = useRef<HTMLDivElement | null>(null);
  const personalSectionRef = useRef<HTMLElement | null>(null);
  const skillsSectionRef = useRef<HTMLElement | null>(null);
  const portfolioSectionRef = useRef<HTMLElement | null>(null);
  const preferencesSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Resolve own id first (the edit page edits the signed-in user), then
    // pull the full public-profile projection which carries names/bio/skills.
    api
      .getMe()
      .then((me) =>
        Promise.all([
          api.getPublicProfile(me.id),
          api.getSkills().catch(() => []),
        ]).then(([profileRes, skillsRes]) => ({ me, profileRes, skillsRes })),
      )
      .then(({ me, profileRes, skillsRes }) => {
        if (cancelled) return;
        setUserId(me.id);
        setAccountRole(role ?? me.role ?? "FREELANCER");
        setKycVerified(me.kyc?.status === "VERIFIED");

        const storedOverride = loadAvatarOverride(me.id);
        setAvatarSeed(storedOverride?.seed || me.id);

        const p = profileRes as {
          firstName?: string;
          lastName?: string;
          bio?: string;
          primarySkillId?: string | null;
          skills?: { id: string }[];
          portfolio?: Array<{
            id: string;
            title: string;
            description?: string | null;
            thumbnailUrl?: string | null;
            projectUrl?: string | null;
          }>;
          isAvailableForWork?: boolean;
          profileVisibility?: UpdateProfilePayload["profileVisibility"];
          avatarUrl?: string | null;
          profileCompleteness?: number;
          kyc?: { status?: string } | null;
        };

        if (p.kyc?.status === "VERIFIED") {
          setKycVerified(true);
        }

        const storedAvatar =
          storedOverride && "avatarUrl" in storedOverride
            ? (storedOverride.avatarUrl ?? null)
            : (p.avatarUrl ?? me.avatarUrl ?? null);

        // Older builds kept the JPEG itself in localStorage and sent it as
        // `avatarUrl`. That value can never be saved (the column is 500
        // characters), so drop it rather than resurrecting it on Save.
        const resolvedAvatarUrl =
          storedAvatar && storedAvatar.startsWith("data:") ? null : storedAvatar;
        if (storedAvatar && storedAvatar.startsWith("data:")) {
          saveAvatarOverride(me.id, {
            avatarUrl: null,
            seed: storedOverride?.seed || me.id,
          });
        }

        const primaryId = p.primarySkillId ?? "";
        const rawSkillIds = (p.skills ?? []).map((s) => s.id);
        const normalizedSkillIds =
          primaryId && !rawSkillIds.includes(primaryId)
            ? [primaryId, ...rawSkillIds]
            : rawSkillIds;

        const nextForm: ProfileFormState = {
          firstName: p.firstName ?? me.firstName ?? "",
          lastName: p.lastName ?? me.lastName ?? "",
          bio: p.bio ?? "",
          primarySkillId: primaryId,
          skillIds: normalizedSkillIds,
          isAvailableForWork: p.isAvailableForWork ?? false,
          profileVisibility: p.profileVisibility ?? "PUBLIC",
          avatarUrl: resolvedAvatarUrl,
          profileCompleteness:
            p.profileCompleteness ?? me.profileCompleteness ?? undefined,
        };
        setFormData(nextForm);

        const serverPortfolio: PortfolioProjectDraft[] = (p.portfolio ?? []).map(
          (item) => ({
            id: item.id,
            title: item.title,
            description: item.description ?? "",
            thumbnailUrl: item.thumbnailUrl ?? "",
            projectUrl: item.projectUrl ?? "",
          }),
        );
        serverPortfolioIdsRef.current = new Set(serverPortfolio.map((i) => i.id));

        const localPortfolio = loadLocalPortfolio(me.id);
        const effectivePortfolio =
          serverPortfolio.length > 0 ? serverPortfolio : localPortfolio;
        setPortfolioItems(effectivePortfolio);

        setInitialSnapshot(
          JSON.stringify({
            firstName: nextForm.firstName,
            lastName: nextForm.lastName,
            bio: nextForm.bio,
            primarySkillId: nextForm.primarySkillId,
            skillIds: nextForm.skillIds,
            isAvailableForWork: nextForm.isAvailableForWork,
            profileVisibility: nextForm.profileVisibility,
            avatarUrl: nextForm.avatarUrl,
            portfolio: effectivePortfolio,
          }),
        );

        const s = skillsRes as
          | { items?: SkillTaxonomy[] }
          | SkillTaxonomy[]
          | null;
        setSkillTaxonomy(Array.isArray(s) ? s : (s?.items ?? []));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : copy.failedLoad,
          );
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [copy.failedLoad, role]);

  // Mirrors backend computeProfileCompleteness() in apps/backend/src/modules/profiles/profile.service.ts
  const completenessBreakdown = useMemo(() => {
    const hasPhoto = Boolean(formData.avatarUrl);
    const hasFullName = Boolean(
      formData.firstName.trim() && formData.lastName.trim(),
    );
    const hasBio = formData.bio.trim().length >= BIO_RECOMMENDED_MIN;
    const hasPrimarySkill = Boolean(formData.primarySkillId);
    const totalSkillsCount =
      formData.primarySkillId &&
      !formData.skillIds.includes(formData.primarySkillId)
        ? formData.skillIds.length + 1
        : formData.skillIds.length;
    const hasThreeSkills = totalSkillsCount >= 3;
    const hasPortfolio = portfolioItems.some(
      (item) => item.title.trim().length > 0,
    );

    const steps = [
      {
        id: "photo",
        label: copy.stepPhoto,
        points: 15,
        done: hasPhoto,
        target: "photo" as const,
      },
      {
        id: "name",
        label: `${pr.firstNameLabel} & ${pr.lastNameLabel}`,
        points: 10,
        done: hasFullName,
        target: "personal" as const,
      },
      {
        id: "bio",
        label: copy.stepBioWithMin(pr.bioLabel, BIO_RECOMMENDED_MIN),
        points: 20,
        done: hasBio,
        target: "personal" as const,
      },
      {
        id: "primary-skill",
        label: pr.primarySkillLabel,
        points: 10,
        done: hasPrimarySkill,
        target: "skills" as const,
      },
      {
        id: "skills-count",
        label: copy.stepThreeSkills,
        points: 15,
        done: hasThreeSkills,
        target: "skills" as const,
      },
      {
        id: "portfolio",
        label: pr.portfolioTitle,
        points: 15,
        done: hasPortfolio,
        target: "portfolio" as const,
      },
      {
        id: "kyc",
        label: copy.stepFaydaKyc,
        points: 15,
        done: kycVerified,
        target: null,
      },
    ];

    const score = steps.reduce((sum, s) => sum + (s.done ? s.points : 0), 0);
    return { score: Math.min(100, score), steps };
  }, [copy, formData, portfolioItems, kycVerified, pr]);

  const liveCompleteness = completenessBreakdown.score;

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    const current = JSON.stringify({
      firstName: formData.firstName,
      lastName: formData.lastName,
      bio: formData.bio,
      primarySkillId: formData.primarySkillId,
      skillIds: formData.skillIds,
      isAvailableForWork: formData.isAvailableForWork,
      profileVisibility: formData.profileVisibility,
      avatarUrl: formData.avatarUrl,
      portfolio: portfolioItems,
    });
    return current !== initialSnapshot;
  }, [formData, portfolioItems, initialSnapshot]);

  const skillName = (skill: SkillTaxonomy) => localizeSkillName(skill, lang);

  const filteredSkills = useMemo(() => {
    const q = skillSearch.trim().toLowerCase();
    if (!q) return skillTaxonomy;
    return skillTaxonomy.filter((s) =>
      `${s.nameEn ?? ""} ${s.nameAm ?? ""} ${localizeSkillName(s, lang)} ${s.name ?? ""} ${s.category ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [lang, skillTaxonomy, skillSearch]);

  const primarySkillLabelText = useMemo(() => {
    const found = skillTaxonomy.find((s) => s.id === formData.primarySkillId);
    return found ? skillName(found) : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillTaxonomy, formData.primarySkillId, lang]);

  const jumpToSection = (
    target: "photo" | "personal" | "skills" | "portfolio" | "preferences",
  ) => {
    const el =
      target === "photo"
        ? photoSectionRef.current
        : target === "personal"
          ? personalSectionRef.current
          : target === "skills"
            ? skillsSectionRef.current
            : target === "portfolio"
              ? portfolioSectionRef.current
              : preferencesSectionRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (target === "personal") {
      window.setTimeout(() => firstNameInputRef.current?.focus({ preventScroll: true }), 220);
    }
  };

  const handlePhotoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      // The photo is uploaded now and applied immediately; the rest of the
      // form still waits for "Save Changes". Sending the image itself in the
      // PATCH is what used to overflow User.avatarUrl and fail the whole save.
      const compressed = await compressAvatarImage(file);
      const { avatarUrl } = await api.uploadAvatar(compressed);
      setFormData((prev) => ({ ...prev, avatarUrl }));
      saveAvatarOverride(userId, { avatarUrl, seed: avatarSeed });
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : copy.couldNotProcessImage,
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveCustomPhoto = () => {
    setPhotoError(null);
    setFormData((prev) => ({ ...prev, avatarUrl: null }));
    saveAvatarOverride(userId, { avatarUrl: null, seed: avatarSeed });
  };

  const validateSingleField = (
    name: "firstName" | "lastName" | "bio",
    value: string,
  ): string | undefined => {
    if (name === "firstName") {
      if (!value.trim()) return copy.firstNameRequired;
      if (value.trim().length > 50) return copy.firstNameMax;
    }
    if (name === "lastName") {
      if (!value.trim()) return copy.lastNameRequired;
      if (value.trim().length > 50) return copy.lastNameMax;
    }
    if (name === "bio" && value.length > BIO_MAX_LENGTH) {
      return copy.bioMax(BIO_MAX_LENGTH);
    }
    return undefined;
  };

  const handleFieldChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setSaveSuccess(false);
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === "primarySkillId") {
      setSkillLimitNote(null);
      setFormData((prev) => {
        if (!value) {
          return { ...prev, primarySkillId: "" };
        }
        const alreadyHas = prev.skillIds.includes(value);
        let nextSkillIds = prev.skillIds;
        if (!alreadyHas) {
          nextSkillIds =
            prev.skillIds.length >= MAX_SKILLS_ALLOWED
              ? [value, ...prev.skillIds.slice(0, MAX_SKILLS_ALLOWED - 1)]
              : [value, ...prev.skillIds];
        }
        return {
          ...prev,
          primarySkillId: value,
          skillIds: nextSkillIds,
        };
      });
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "firstName" || name === "lastName" || name === "bio") {
      if (fieldErrors[name]) {
        const msg = validateSingleField(name, value);
        setFieldErrors((prev) => ({ ...prev, [name]: msg }));
      }
    }
  };

  const handleFieldBlur = (name: "firstName" | "lastName" | "bio") => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const msg = validateSingleField(name, formData[name]);
    setFieldErrors((prev) => ({ ...prev, [name]: msg }));
  };

  const handleVisibilityChange = (
    val: NonNullable<UpdateProfilePayload["profileVisibility"]>,
  ) => {
    setSaveSuccess(false);
    setFormData((prev) => ({ ...prev, profileVisibility: val }));
  };

  const toggleSkill = (id: string) => {
    setSaveSuccess(false);
    setSkillLimitNote(null);
    setFormData((prev) => {
      const exists = prev.skillIds.includes(id);
      if (exists) {
        const nextSkills = prev.skillIds.filter((s) => s !== id);
        return {
          ...prev,
          skillIds: nextSkills,
          primarySkillId: prev.primarySkillId === id ? "" : prev.primarySkillId,
        };
      }
      if (prev.skillIds.length >= MAX_SKILLS_ALLOWED) {
        setSkillLimitNote(copy.skillLimit(MAX_SKILLS_ALLOWED));
        return prev;
      }
      return {
        ...prev,
        skillIds: [...prev.skillIds, id],
      };
    });
  };

  const addPortfolioProject = () => {
    if (portfolioItems.length >= MAX_PORTFOLIO_ITEMS) return;
    setSaveSuccess(false);
    setPortfolioItems((prev) => [
      ...prev,
      {
        id: `pf-${Date.now()}`,
        title: "",
        description: "",
        thumbnailUrl: "",
        projectUrl: "",
      },
    ]);
  };

  const updatePortfolioProject = (
    id: string,
    field: keyof Omit<PortfolioProjectDraft, "id">,
    value: string,
  ) => {
    setSaveSuccess(false);
    setPortfolioItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
    if (fieldErrors.portfolio?.[id]) {
      setFieldErrors((prev) => {
        const nextPortfolio = { ...(prev.portfolio ?? {}) };
        delete nextPortfolio[id];
        return { ...prev, portfolio: nextPortfolio };
      });
    }
  };

  const removePortfolioProject = (id: string) => {
    setSaveSuccess(false);
    setPortfolioItems((prev) => prev.filter((item) => item.id !== id));
    if (fieldErrors.portfolio?.[id]) {
      setFieldErrors((prev) => {
        const nextPortfolio = { ...(prev.portfolio ?? {}) };
        delete nextPortfolio[id];
        return { ...prev, portfolio: nextPortfolio };
      });
    }
  };

  const validateAllBeforeSubmit = (): boolean => {
    const nextErrors: FieldErrors = {};
    const firstErr = validateSingleField("firstName", formData.firstName);
    const lastErr = validateSingleField("lastName", formData.lastName);
    const bioErr = validateSingleField("bio", formData.bio);
    if (firstErr) nextErrors.firstName = firstErr;
    if (lastErr) nextErrors.lastName = lastErr;
    if (bioErr) nextErrors.bio = bioErr;

    const portfolioErrs: NonNullable<FieldErrors["portfolio"]> = {};
    for (const item of portfolioItems) {
      const hasAnyContent =
        item.title.trim().length > 0 ||
        item.description.trim().length > 0 ||
        item.thumbnailUrl.trim().length > 0 ||
        (item.projectUrl?.trim().length ?? 0) > 0;
      if (!hasAnyContent) continue;

      const itemErr: {
        title?: string;
        thumbnailUrl?: string;
        projectUrl?: string;
      } = {};
      if (!item.title.trim()) {
        itemErr.title = copy.projectTitleRequired;
      }
      if (!isValidHttpUrl(item.thumbnailUrl)) {
        itemErr.thumbnailUrl = copy.invalidUrl;
      }
      if (item.projectUrl && !isValidHttpUrl(item.projectUrl)) {
        itemErr.projectUrl = copy.invalidUrl;
      }
      if (Object.keys(itemErr).length > 0) {
        portfolioErrs[item.id] = itemErr;
      }
    }
    if (Object.keys(portfolioErrs).length > 0) {
      nextErrors.portfolio = portfolioErrs;
    }

    setFieldErrors(nextErrors);
    setTouched({ firstName: true, lastName: true, bio: true });

    if (nextErrors.firstName) {
      firstNameInputRef.current?.focus();
      return false;
    }
    if (nextErrors.lastName) {
      lastNameInputRef.current?.focus();
      return false;
    }
    if (nextErrors.bio) {
      bioInputRef.current?.focus();
      return false;
    }
    if (nextErrors.portfolio && Object.keys(nextErrors.portfolio).length > 0) {
      const firstBadId = Object.keys(nextErrors.portfolio)[0];
      const badEl = document.getElementById(`${uid}-pf-${firstBadId}-title`);
      badEl?.focus();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!validateAllBeforeSubmit()) {
      setSaveError(copy.resolveHighlighted);
      return;
    }

    setSaving(true);
    try {
      const cleanedDrafts = portfolioItems
        .map((item) => ({
          ...item,
          title: item.title.trim(),
          description: item.description.trim(),
          thumbnailUrl: item.thumbnailUrl.trim(),
          projectUrl: (item.projectUrl ?? "").trim(),
        }))
        .filter((item) => item.title.length > 0);

      // Persist portfolio mutations to the backend first so updateProfile's
      // completeness recalculation includes the updated portfolio rows.
      const keptServerIds = new Set(
        cleanedDrafts
          .filter((item) => serverPortfolioIdsRef.current.has(item.id))
          .map((item) => item.id),
      );
      const removedServerIds = [...serverPortfolioIdsRef.current].filter(
        (id) => !keptServerIds.has(id),
      );

      for (const removedId of removedServerIds) {
        await api.deletePortfolioItem(removedId);
      }

      const syncedPortfolio: PortfolioProjectDraft[] = [];
      for (let i = 0; i < cleanedDrafts.length; i += 1) {
        const draft = cleanedDrafts[i];
        const payload = {
          title: draft.title,
          description: draft.description || undefined,
          thumbnailUrl: draft.thumbnailUrl || undefined,
          projectUrl: draft.projectUrl || undefined,
          displayOrder: i + 1,
        };

        if (serverPortfolioIdsRef.current.has(draft.id)) {
          const updated = (await api.updatePortfolioItem(draft.id, payload)) as {
            id?: string;
            title?: string;
            description?: string | null;
            thumbnailUrl?: string | null;
            projectUrl?: string | null;
          } | null;
          syncedPortfolio.push({
            id: updated?.id ?? draft.id,
            title: updated?.title ?? draft.title,
            description: updated?.description ?? draft.description,
            thumbnailUrl: updated?.thumbnailUrl ?? draft.thumbnailUrl,
            projectUrl: updated?.projectUrl ?? draft.projectUrl,
          });
        } else {
          const created = (await api.createPortfolioItem(payload)) as {
            id?: string;
            title?: string;
            description?: string | null;
            thumbnailUrl?: string | null;
            projectUrl?: string | null;
          } | null;
          syncedPortfolio.push({
            id: created?.id ?? draft.id,
            title: created?.title ?? draft.title,
            description: created?.description ?? draft.description,
            thumbnailUrl: created?.thumbnailUrl ?? draft.thumbnailUrl,
            projectUrl: created?.projectUrl ?? draft.projectUrl,
          });
        }
      }

      serverPortfolioIdsRef.current = new Set(
        syncedPortfolio
          .filter((i) => !i.id.startsWith("pf-"))
          .map((i) => i.id),
      );

      saveLocalPortfolio(userId, syncedPortfolio);
      if (userId !== "me") {
        saveLocalPortfolio("me", syncedPortfolio);
      }

      saveAvatarOverride(userId, {
        avatarUrl: formData.avatarUrl ?? null,
        seed: avatarSeed,
      });

      const ensuredSkillIds =
        formData.primarySkillId &&
        !formData.skillIds.includes(formData.primarySkillId)
          ? [formData.primarySkillId, ...formData.skillIds].slice(
              0,
              MAX_SKILLS_ALLOWED,
            )
          : formData.skillIds;

      const updatedProfile = await api.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        bio: formData.bio,
        primarySkillId: formData.primarySkillId || undefined,
        skillIds: ensuredSkillIds,
        isAvailableForWork: formData.isAvailableForWork,
        profileVisibility: formData.profileVisibility,
        avatarUrl: formData.avatarUrl ?? null,
      });

      setPortfolioItems(syncedPortfolio);
      setFormData((prev) => ({
        ...prev,
        skillIds: ensuredSkillIds,
        profileCompleteness:
          updatedProfile?.profileCompleteness ?? liveCompleteness,
      }));
      setInitialSnapshot(
        JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          bio: formData.bio,
          primarySkillId: formData.primarySkillId,
          skillIds: ensuredSkillIds,
          isAvailableForWork: formData.isAvailableForWork,
          profileVisibility: formData.profileVisibility,
          avatarUrl: formData.avatarUrl,
          portfolio: syncedPortfolio,
        }),
      );

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`yekis_new_user_nudge_${userId}`);
        window.localStorage.removeItem("yekis_new_user_nudge_me");
      }
      onSaved?.();
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : copy.failedSave,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-edit-page">
        <div className="pe-board pe-loading-board">
          <div className="pe-rail">
            <div className="sh-skeleton" style={{ height: 92, width: 92, borderRadius: "50%" }} />
            <div className="sh-skeleton" style={{ height: 18, width: "65%" }} />
            <div className="sh-skeleton" style={{ height: 14, width: "85%" }} />
            <div className="sh-skeleton" style={{ height: 140, width: "100%" }} />
          </div>
          <div className="pe-canvas">
            <div className="sh-skeleton" style={{ height: 22, width: "35%" }} />
            <div className="sh-skeleton" style={{ height: 52, width: "100%" }} />
            <div className="sh-skeleton" style={{ height: 130, width: "100%" }} />
            <div className="sh-skeleton" style={{ height: 96, width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="profile-error" role="alert">
        {loadError}
      </div>
    );
  }

  const hasCustomPhoto = Boolean(formData.avatarUrl);
  const liveFullName =
    `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim() ||
    copy.yourMarketplaceName;
  const bioCharCount = formData.bio.length;
  const bioMeetsMin = formData.bio.trim().length >= BIO_RECOMMENDED_MIN;
  const showSkillsGuidance = accountRole !== "CLIENT";

  return (
    <div className="profile-edit-page">
      <form
        onSubmit={handleSubmit}
        className="pe-board"
        noValidate
        aria-label={pr.editHeading}
      >
        {/* ── LEFT COLUMN: Sticky Identity & Completeness Rail on Background Board ── */}
        <aside className="pe-rail" aria-label={copy.asideAria}>
          <div className="pe-rail-section" ref={photoSectionRef}>
            <div className="pe-identity-lockup">
              <div className="pe-avatar-wrap">
                <YekisAvatar
                  userId={userId}
                  seed={avatarSeed}
                  avatarUrl={formData.avatarUrl}
                  disableStoredOverride={true}
                  size={88}
                  animate="hover"
                  className="pe-avatar-media"
                />
                <button
                  type="button"
                  className="pe-avatar-cam-btn"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={copy.uploadCustomPhotoAria}
                >
                  <Camera size={14} aria-hidden="true" />
                </button>
              </div>

              <div className="pe-identity-meta">
                <strong className="pe-identity-name">{liveFullName}</strong>
                {primarySkillLabelText ? (
                  <span className="pe-identity-skill">
                    <Briefcase size={13} aria-hidden="true" />
                    {primarySkillLabelText}
                  </span>
                ) : (
                  <span className="pe-identity-skill pe-muted">
                    {showSkillsGuidance ? pr.selectPrimarySkill : copy.marketplaceMember}
                  </span>
                )}
                <span
                  className={`pe-availability-text ${formData.isAvailableForWork ? "is-open" : ""}`}
                >
                  {formData.isAvailableForWork
                    ? pr.availableForWorkTitle
                    : copy.notMarkedAvailable}
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              id={`${uid}-avatar-upload`}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              tabIndex={-1}
              aria-hidden="true"
              className="pe-hidden-file-input"
              onChange={handlePhotoFileChange}
            />

            <div className="pe-photo-actions">
              <button
                type="button"
                className="btn-primary pe-btn-compact"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} aria-hidden="true" />
                {uploadingPhoto
                  ? copy.processing
                  : hasCustomPhoto
                    ? copy.changePhoto
                    : copy.uploadPhoto}
              </button>

              {hasCustomPhoto ? (
                <button
                  type="button"
                  className="btn-secondary pe-btn-compact"
                  onClick={handleRemoveCustomPhoto}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  {copy.removeBtn}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary pe-btn-compact"
                  onClick={() => {
                    const base = avatarSeed.split("#")[0] || userId || "Yekis";
                    const nextSeed = `${base}#v${Math.floor(Math.random() * 10000)}`;
                    setAvatarSeed(nextSeed);
                    saveAvatarOverride(userId, {
                      avatarUrl: null,
                      seed: nextSeed,
                    });
                  }}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  {pr.shuffleAvatarBtn}
                </button>
              )}
            </div>

            <p className="pe-rail-hint">
              {hasCustomPhoto
                ? copy.customPhotoActiveHint
                : copy.photoUploadHint}
            </p>

            {photoError && (
              <p className="pe-inline-error" role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                {photoError}
              </p>
            )}
          </div>

          <hr className="pe-rail-rule" />

          <div className="pe-rail-section">
            <div className="pe-readiness-header">
              <h3 className="pe-rail-heading">{pr.completenessTitle}</h3>
              <span className="pe-readiness-pct sh-mono">
                {liveCompleteness}%
              </span>
            </div>

            <progress
              className="pe-progress"
              max={100}
              value={liveCompleteness}
              aria-label={pr.completenessTitle}
            />

            <p className="pe-rail-hint">
              {liveCompleteness >= 100
                ? pr.completenessDesc
                : copy.completeStepsHint}
            </p>

            <ul className="pe-checklist">
              {completenessBreakdown.steps.map((step) => (
                <li key={step.id}>
                  {step.target ? (
                    <button
                      type="button"
                      className={`pe-checklist-btn ${step.done ? "is-done" : ""}`}
                      onClick={() => jumpToSection(step.target!)}
                    >
                      <span className="pe-checklist-left">
                        {step.done ? (
                          <CheckCircle2 size={14} aria-hidden="true" />
                        ) : (
                          <Circle size={14} aria-hidden="true" />
                        )}
                        <span>{step.label}</span>
                      </span>
                      <span className="pe-checklist-pts sh-mono">
                        +{step.points}%
                      </span>
                    </button>
                  ) : (
                    <div
                      className={`pe-checklist-static ${step.done ? "is-done" : ""}`}
                    >
                      <span className="pe-checklist-left">
                        {step.done ? (
                          <ShieldCheck size={14} aria-hidden="true" />
                        ) : (
                          <Circle size={14} aria-hidden="true" />
                        )}
                        <span>{step.label}</span>
                      </span>
                      <span className="pe-checklist-pts sh-mono">
                        +{step.points}%
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <hr className="pe-rail-rule pe-desktop-only-rule" />

          <nav
            className="pe-rail-nav"
            aria-label={copy.sectionsAria}
          >
            <span className="pe-rail-nav-title">{copy.sectionsHeading}</span>
            <button type="button" onClick={() => jumpToSection("personal")}>
              {pr.personalDetailsTitle}
            </button>
            <button type="button" onClick={() => jumpToSection("skills")}>
              {pr.skillsTitle}
            </button>
            <button type="button" onClick={() => jumpToSection("portfolio")}>
              {pr.portfolioTitle}
            </button>
            <button type="button" onClick={() => jumpToSection("preferences")}>
              {pr.preferencesTitle}
            </button>
          </nav>
        </aside>

        {/* ── RIGHT COLUMN: Full-Width Board Sections (No Outer Card Boxes) ── */}
        <div className="pe-canvas">
          {/* Section 1: Personal Details */}
          <section
            ref={personalSectionRef}
            className="pe-section"
            aria-labelledby={`${uid}-sec-personal`}
          >
            <div className="pe-section-head">
              <div className="pe-section-copy">
                <h3 id={`${uid}-sec-personal`} className="pe-section-title">
                  {pr.personalDetailsTitle}
                </h3>
                <p className="pe-section-desc">
                  {copy.personalSectionDesc}
                </p>
              </div>
            </div>

            <div className="pe-grid-2">
              <div className="pe-field">
                <label htmlFor={`${uid}-firstName`}>
                  {pr.firstNameLabel} <span aria-hidden="true">*</span>
                </label>
                <input
                  ref={firstNameInputRef}
                  id={`${uid}-firstName`}
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  maxLength={50}
                  value={formData.firstName}
                  onChange={handleFieldChange}
                  onBlur={() => handleFieldBlur("firstName")}
                  required
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={
                    fieldErrors.firstName ? `${uid}-firstName-err` : undefined
                  }
                  placeholder={pr.firstNameLabel}
                />
                {touched.firstName && fieldErrors.firstName && (
                  <span
                    id={`${uid}-firstName-err`}
                    className="pe-field-error"
                    role="alert"
                  >
                    {fieldErrors.firstName}
                  </span>
                )}
              </div>

              <div className="pe-field">
                <label htmlFor={`${uid}-lastName`}>
                  {pr.lastNameLabel} <span aria-hidden="true">*</span>
                </label>
                <input
                  ref={lastNameInputRef}
                  id={`${uid}-lastName`}
                  type="text"
                  name="lastName"
                  autoComplete="family-name"
                  maxLength={50}
                  value={formData.lastName}
                  onChange={handleFieldChange}
                  onBlur={() => handleFieldBlur("lastName")}
                  required
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={
                    fieldErrors.lastName ? `${uid}-lastName-err` : undefined
                  }
                  placeholder={pr.lastNameLabel}
                />
                {touched.lastName && fieldErrors.lastName && (
                  <span
                    id={`${uid}-lastName-err`}
                    className="pe-field-error"
                    role="alert"
                  >
                    {fieldErrors.lastName}
                  </span>
                )}
              </div>
            </div>

            <div className="pe-field">
              <div className="pe-label-row">
                <label htmlFor={`${uid}-bio`}>{pr.bioLabel}</label>
                <span
                  className={`pe-char-count sh-mono ${bioMeetsMin ? "is-ready" : ""}`}
                >
                  {bioCharCount} / {BIO_MAX_LENGTH}
                </span>
              </div>
              <p id={`${uid}-bio-hint`} className="pe-field-hint">
                {copy.bioHint(BIO_RECOMMENDED_MIN)}
              </p>
              <textarea
                ref={bioInputRef}
                id={`${uid}-bio`}
                name="bio"
                value={formData.bio}
                onChange={handleFieldChange}
                onBlur={() => handleFieldBlur("bio")}
                rows={4}
                maxLength={BIO_MAX_LENGTH}
                aria-invalid={Boolean(fieldErrors.bio)}
                aria-describedby={`${uid}-bio-hint${fieldErrors.bio ? ` ${uid}-bio-err` : ""}`}
                placeholder={pr.bioPlaceholder}
              />
              {fieldErrors.bio && (
                <span id={`${uid}-bio-err`} className="pe-field-error" role="alert">
                  {fieldErrors.bio}
                </span>
              )}
            </div>
          </section>

          <hr className="pe-section-rule" />

          {/* Section 2: Skills & Expertise */}
          <section
            ref={skillsSectionRef}
            className="pe-section"
            aria-labelledby={`${uid}-sec-skills`}
          >
            <div className="pe-section-head">
              <div className="pe-section-copy">
                <h3 id={`${uid}-sec-skills`} className="pe-section-title">
                  {pr.skillsTitle}
                </h3>
                <p className="pe-section-desc">{pr.skillsDesc}</p>
              </div>
              <span className="pe-section-counter sh-mono">
                {formData.skillIds.length} / {MAX_SKILLS_ALLOWED}
              </span>
            </div>

            <div className="pe-skills-top-grid">
              <div className="pe-field">
                <label htmlFor={`${uid}-primarySkill`}>{pr.primarySkillLabel}</label>
                <select
                  id={`${uid}-primarySkill`}
                  name="primarySkillId"
                  value={formData.primarySkillId}
                  onChange={handleFieldChange}
                >
                  <option value="">{pr.selectPrimarySkill}</option>
                  {skillTaxonomy.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skillName(skill)}
                    </option>
                  ))}
                </select>
              </div>

              {skillTaxonomy.length > 6 && (
                <search className="pe-field">
                  <label htmlFor={`${uid}-skillSearch`}>{copy.filterSkillsLabel}</label>
                  <div className="pe-search-input-wrap">
                    <Search size={15} className="pe-search-icon" aria-hidden="true" />
                    <input
                      id={`${uid}-skillSearch`}
                      type="search"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={copy.filterSkillsPlaceholder}
                    />
                  </div>
                </search>
              )}
            </div>

            <fieldset className="pe-fieldset">
              <legend className="pe-fieldset-legend">
                {pr.additionalSkillsLabel}
              </legend>
              <p className="pe-field-hint">{pr.additionalSkillsDesc}</p>

              {skillTaxonomy.length === 0 ? (
                <p className="pe-empty-inline-note">
                  {copy.skillsUnavailableNote}
                </p>
              ) : filteredSkills.length === 0 ? (
                <p className="pe-empty-inline-note">
                  {copy.noMatchingSkills(skillSearch)}
                </p>
              ) : (
                <div className="skills-tags-container">
                  {filteredSkills.map((skill) => {
                    const selected = formData.skillIds.includes(skill.id);
                    const isPrimary = formData.primarySkillId === skill.id;
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        aria-pressed={selected}
                        className={`tag-toggle-btn ${selected ? "selected" : ""}`}
                        onClick={() => toggleSkill(skill.id)}
                      >
                        {selected && <Check size={13} aria-hidden="true" />}
                        <span>{skillName(skill)}</span>
                        {isPrimary && (
                          <span className="pe-primary-skill-tag">{copy.primaryTag}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {skillLimitNote && (
                <p className="pe-inline-error" role="status">
                  {skillLimitNote}
                </p>
              )}
            </fieldset>
          </section>

          <hr className="pe-section-rule" />

          {/* Section 3: Portfolio Projects */}
          <section
            ref={portfolioSectionRef}
            className="pe-section"
            aria-labelledby={`${uid}-sec-portfolio`}
          >
            <div className="pe-section-head">
              <div className="pe-section-copy">
                <h3 id={`${uid}-sec-portfolio`} className="pe-section-title">
                  {pr.portfolioTitle}
                </h3>
                <p className="pe-section-desc">{pr.portfolioDesc}</p>
              </div>
              {portfolioItems.length > 0 &&
                portfolioItems.length < MAX_PORTFOLIO_ITEMS && (
                  <button
                    type="button"
                    className="btn-secondary pe-btn-compact"
                    onClick={addPortfolioProject}
                  >
                    <Plus size={14} aria-hidden="true" /> {pr.addPortfolioBtn}
                  </button>
                )}
            </div>

            {portfolioItems.length === 0 ? (
              <div className="pe-empty-portfolio-row">
                <div className="pe-empty-portfolio-copy">
                  <strong>{pr.noPortfolioYet}</strong>
                  <p>{pr.noPortfolioHint}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary pe-btn-compact"
                  onClick={addPortfolioProject}
                >
                  <Plus size={14} aria-hidden="true" /> {pr.addPortfolioBtn}
                </button>
              </div>
            ) : (
              <div className="pe-portfolio-grid">
                {portfolioItems.map((item, idx) => {
                  const titleId = `${uid}-pf-${item.id}-title`;
                  const descId = `${uid}-pf-${item.id}-desc`;
                  const thumbId = `${uid}-pf-${item.id}-thumb`;
                  const linkId = `${uid}-pf-${item.id}-link`;
                  const errs = fieldErrors.portfolio?.[item.id];
                  return (
                    <div key={item.id} className="pe-portfolio-item">
                      <div className="pe-portfolio-item-head">
                        <h4 className="pe-portfolio-item-title">
                          {copy.projectNumber(idx + 1)}
                        </h4>
                        <button
                          type="button"
                          className="pe-text-remove-btn"
                          onClick={() => removePortfolioProject(item.id)}
                          aria-label={`${pr.removeProjectBtn}: ${item.title.trim() || copy.projectNumber(idx + 1)}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          <span>{pr.removeProjectBtn}</span>
                        </button>
                      </div>

                      <div className="pe-field">
                        <label htmlFor={titleId}>{pr.projectTitleLabel}</label>
                        <input
                          id={titleId}
                          type="text"
                          maxLength={200}
                          value={item.title}
                          onChange={(e) =>
                            updatePortfolioProject(
                              item.id,
                              "title",
                              e.target.value,
                            )
                          }
                          aria-invalid={Boolean(errs?.title)}
                          aria-describedby={errs?.title ? `${titleId}-err` : undefined}
                          placeholder={pr.projectTitlePlaceholder}
                        />
                        {errs?.title && (
                          <span
                            id={`${titleId}-err`}
                            className="pe-field-error"
                            role="alert"
                          >
                            {errs.title}
                          </span>
                        )}
                      </div>

                      <div className="pe-field">
                        <label htmlFor={descId}>{pr.projectDescLabel}</label>
                        <textarea
                          id={descId}
                          rows={2}
                          maxLength={2000}
                          value={item.description}
                          onChange={(e) =>
                            updatePortfolioProject(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder={pr.projectDescPlaceholder}
                        />
                      </div>

                      <div className="pe-grid-2">
                        <div className="pe-field">
                          <label htmlFor={thumbId}>{copy.thumbnailUrlLabel}</label>
                          <input
                            id={thumbId}
                            type="url"
                            maxLength={500}
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={item.thumbnailUrl}
                            onChange={(e) =>
                              updatePortfolioProject(
                                item.id,
                                "thumbnailUrl",
                                e.target.value,
                              )
                            }
                            aria-invalid={Boolean(errs?.thumbnailUrl)}
                            aria-describedby={
                              errs?.thumbnailUrl ? `${thumbId}-err` : undefined
                            }
                            placeholder={pr.projectThumbPlaceholder}
                          />
                          {errs?.thumbnailUrl && (
                            <span
                              id={`${thumbId}-err`}
                              className="pe-field-error"
                              role="alert"
                            >
                              {errs.thumbnailUrl}
                            </span>
                          )}
                        </div>

                        <div className="pe-field">
                          <label htmlFor={linkId}>
                            {copy.liveProjectLinkLabel}
                            {item.projectUrl && isValidHttpUrl(item.projectUrl) && (
                              <ExternalLink
                                size={12}
                                aria-hidden="true"
                                style={{ marginInlineStart: 5 }}
                              />
                            )}
                          </label>
                          <input
                            id={linkId}
                            type="url"
                            maxLength={500}
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={item.projectUrl ?? ""}
                            onChange={(e) =>
                              updatePortfolioProject(
                                item.id,
                                "projectUrl",
                                e.target.value,
                              )
                            }
                            aria-invalid={Boolean(errs?.projectUrl)}
                            aria-describedby={
                              errs?.projectUrl ? `${linkId}-err` : undefined
                            }
                            placeholder={pr.projectThumbPlaceholder}
                          />
                          {errs?.projectUrl && (
                            <span
                              id={`${linkId}-err`}
                              className="pe-field-error"
                              role="alert"
                            >
                              {errs.projectUrl}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <hr className="pe-section-rule" />

          {/* Section 4: Availability & Visibility */}
          <section
            ref={preferencesSectionRef}
            className="pe-section"
            aria-labelledby={`${uid}-sec-prefs`}
          >
            <div className="pe-section-head">
              <div className="pe-section-copy">
                <h3 id={`${uid}-sec-prefs`} className="pe-section-title">
                  {pr.preferencesTitle}
                </h3>
                <p className="pe-section-desc">{pr.preferencesDesc}</p>
              </div>
            </div>

            <div className="pe-availability-row">
              <div className="pe-availability-copy">
                <label htmlFor={`${uid}-available`} className="pe-switch-label-title">
                  {pr.availableForWorkTitle}
                </label>
                <span id={`${uid}-available-desc`} className="pe-field-hint">
                  {pr.availableForWorkDesc}
                </span>
              </div>

              {SUPPORTS_NATIVE_SWITCH ? (
                <input
                  id={`${uid}-available`}
                  type="checkbox"
                  name="isAvailableForWork"
                  checked={formData.isAvailableForWork}
                  onChange={handleFieldChange}
                  aria-describedby={`${uid}-available-desc`}
                  className="pe-native-switch"
                  {...({ switch: "" } as Record<string, string>)}
                />
              ) : (
                <label className="switch-control" htmlFor={`${uid}-available`}>
                  <input
                    id={`${uid}-available`}
                    type="checkbox"
                    role="switch"
                    aria-checked={formData.isAvailableForWork}
                    aria-describedby={`${uid}-available-desc`}
                    name="isAvailableForWork"
                    checked={formData.isAvailableForWork}
                    onChange={handleFieldChange}
                  />
                  <span className="switch-slider" aria-hidden="true" />
                </label>
              )}
            </div>

            <fieldset className="pe-fieldset">
              <legend className="pe-fieldset-legend">
                {pr.visibilityLabel}
              </legend>
              <div className="pe-visibility-grid">
                {(
                  [
                    {
                      id: "PUBLIC",
                      label: pr.visPublic,
                      desc: pr.visPublicDesc,
                    },
                    {
                      id: "PROPOSERS",
                      label: pr.visProposers,
                      desc: pr.visProposersDesc,
                    },
                    {
                      id: "PRIVATE",
                      label: pr.visPrivate,
                      desc: pr.visPrivateDesc,
                    },
                  ] as const
                ).map((vis) => {
                  const radioId = `${uid}-vis-${vis.id}`;
                  const checked = formData.profileVisibility === vis.id;
                  return (
                    <label
                      key={vis.id}
                      htmlFor={radioId}
                      className={`pe-visibility-option ${checked ? "is-selected" : ""}`}
                    >
                      <span className="pe-visibility-top">
                        <input
                          id={radioId}
                          type="radio"
                          name="profileVisibility"
                          value={vis.id}
                          checked={checked}
                          onChange={() => handleVisibilityChange(vis.id)}
                          className="pe-visibility-radio"
                        />
                        <strong>{vis.label}</strong>
                      </span>
                      <small>{vis.desc}</small>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>

          {/* Board Action Bar */}
          <div className="form-actions-bar">
            <div className="pe-actions-status" aria-live="polite">
              {saveSuccess && (
                <span className="save-status-msg" role="status">
                  <Check size={16} aria-hidden="true" /> {pr.savedMsg}
                </span>
              )}
              {saveError && (
                <span className="save-error-msg" role="alert">
                  <AlertCircle size={16} aria-hidden="true" /> {saveError}
                </span>
              )}
              {!saveSuccess && !saveError && isDirty && (
                <span className="pe-dirty-note">{copy.unsavedChanges}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary rounded-lg pe-save-btn"
            >
              <Save size={16} aria-hidden="true" />
              {saving ? pr.savingBtn : pr.saveChangesBtn}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
