import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  FileText,
  RefreshCw,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, type MeResponse } from "../api/client";
import {
  YekisAvatar,
  loadAvatarOverride,
  saveAvatarOverride,
} from "./YekisAvatar";
import { compressAvatarImage } from "../lib/avatarImage";
import { useLocation, useNavigate } from "../router/HashRouter";
import { useI18n, type Language } from "../i18n";
import { localizeSkillName } from "../lib/skillLabels";

type PcdCopy = {
  couldNotProcessImage: string;
  unableToSave: string;
  yourFullNameFallback: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  closeAria: string;
  closeTitle: string;
  progressComplete: (completed: number, total: number) => string;
  profilePhoto: string;
  added: string;
  required: string;
  nameAndBio: string;
  skills: string;
  countSelected: (count: number) => string;
  chooseTwoPlus: string;
  uploadCustomPhotoAria: string;
  processing: string;
  changePhoto: string;
  uploadPhoto: string;
  remove: string;
  shuffle: string;
  photoHint: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  bio: string;
  bioPlaceholderClient: string;
  bioPlaceholderWorker: string;
  primarySkill: string;
  selectPrimarySkill: string;
  additionalSkills: string;
  additionalSkillsHint: string;
  previewAria: string;
  profilePreview: string;
  hide: string;
  show: string;
  previewHeading: string;
  publicProfile: string;
  identityVerifiedTitle: string;
  verifiedBadge: string;
  clientEthiopia: string;
  freelancerEthiopia: string;
  about: string;
  bioPreviewPlaceholder: string;
  skillsPreviewPlaceholder: string;
  footClient: string;
  footWorker: string;
  savedSuccess: string;
  skipForNow: string;
  fullProfileEditor: string;
  saving: string;
  saveAndFinish: string;
  saveChanges: string;
};

const PCD_COPY: Record<Language, PcdCopy> = {
  en: {
    couldNotProcessImage: "Could not process image.",
    unableToSave: "Unable to save profile updates.",
    yourFullNameFallback: "Your Full Name",
    eyebrow: "Profile setup",
    title: "Complete your profile",
    subtitle: "Add a photo and a few details so clients and collaborators know who they are working with.",
    closeAria: "Close profile setup",
    closeTitle: "Close",
    progressComplete: (done, total) => `${done} of ${total} complete`,
    profilePhoto: "Profile photo",
    added: "Added",
    required: "Required",
    nameAndBio: "Name & bio",
    skills: "Skills",
    countSelected: (n) => `${n} selected`,
    chooseTwoPlus: "Choose 2+",
    uploadCustomPhotoAria: "Upload custom profile picture",
    processing: "Processing...",
    changePhoto: "Change photo",
    uploadPhoto: "Upload photo",
    remove: "Remove",
    shuffle: "Shuffle",
    photoHint: "JPG, PNG or WEBP, up to 10 MB. Without a photo, we use a generated avatar.",
    firstName: "First name",
    firstNamePlaceholder: "Dawit",
    lastName: "Last name",
    lastNamePlaceholder: "Mekonnen",
    bio: "Bio",
    bioPlaceholderClient: "What does your company hire for?",
    bioPlaceholderWorker: "What do you do, and what are you known for?",
    primarySkill: "Primary skill",
    selectPrimarySkill: "Select your primary skill",
    additionalSkills: "Additional skills",
    additionalSkillsHint: "Select at least two. Click a skill to add or remove it.",
    previewAria: "Profile preview",
    profilePreview: "Profile preview",
    hide: "Hide",
    show: "Show",
    previewHeading: "Preview",
    publicProfile: "Public profile",
    identityVerifiedTitle: "Identity verified",
    verifiedBadge: "Verified",
    clientEthiopia: "Client · Ethiopia",
    freelancerEthiopia: "Freelancer · Ethiopia",
    about: "About",
    bioPreviewPlaceholder: "Your bio will appear here.",
    skillsPreviewPlaceholder: "Selected skills will appear here.",
    footClient: "Escrow-protected hiring",
    footWorker: "Available for milestone work",
    savedSuccess: "Profile saved. Updating your workspace...",
    skipForNow: "Skip for now",
    fullProfileEditor: "Full profile editor",
    saving: "Saving...",
    saveAndFinish: "Save and finish",
    saveChanges: "Save changes",
  },
  am: {
    couldNotProcessImage: "ምስሉን ማስኬድ አልተቻለም።",
    unableToSave: "የመገለጫ ማሻሻያዎችን ማስቀመጥ አልተቻለም።",
    yourFullNameFallback: "ሙሉ ስምዎ",
    eyebrow: "የመገለጫ ማዋቀር",
    title: "መገለጫዎን ያጠናቅቁ",
    subtitle: "ደንበኞች እና ተባባሪዎች ከማን ጋር እንደሚሠሩ እንዲያውቁ ፎቶ እና ጥቂት ዝርዝሮችን ያክሉ።",
    closeAria: "የመገለጫ ማዋቀርን ዝጋ",
    closeTitle: "ዝጋ",
    progressComplete: (done, total) => `ከ${total} ውስጥ ${done} ተጠናቋል`,
    profilePhoto: "የመገለጫ ፎቶ",
    added: "ታክሏል",
    required: "ያስፈልጋል",
    nameAndBio: "ስም እና መግለጫ",
    skills: "ክህሎቶች",
    countSelected: (n) => `${n} ተመርጠዋል`,
    chooseTwoPlus: "2+ ይምረጡ",
    uploadCustomPhotoAria: "የግል መገለጫ ፎቶ ይጫኑ",
    processing: "በማስኬድ ላይ...",
    changePhoto: "ፎቶ ቀይር",
    uploadPhoto: "ፎቶ ጫን",
    remove: "አስወግድ",
    shuffle: "ቀያይር",
    photoHint: "JPG፣ PNG ወይም WEBP፣ እስከ 10 MB። ፎቶ ከሌለ በራስ-ሰር የተፈጠረ አቫታር እንጠቀማለን።",
    firstName: "የመጀመሪያ ስም",
    firstNamePlaceholder: "ዳዊት",
    lastName: "የአባት ስም",
    lastNamePlaceholder: "መኮንን",
    bio: "መግለጫ",
    bioPlaceholderClient: "ድርጅትዎ ለምን ዓይነት ሥራ ይቀጥራል?",
    bioPlaceholderWorker: "ምን ይሠራሉ፣ በምንስ ይታወቃሉ?",
    primarySkill: "ዋና ክህሎት",
    selectPrimarySkill: "ዋና ክህሎትዎን ይምረጡ",
    additionalSkills: "ተጨማሪ ክህሎቶች",
    additionalSkillsHint: "ቢያንስ ሁለት ይምረጡ። ለመጨመር ወይም ለማስወገድ ክህሎቱን ይንኩ።",
    previewAria: "የመገለጫ ቅድመ-ዕይታ",
    profilePreview: "የመገለጫ ቅድመ-ዕይታ",
    hide: "ደብቅ",
    show: "አሳይ",
    previewHeading: "ቅድመ-ዕይታ",
    publicProfile: "የሕዝብ መገለጫ",
    identityVerifiedTitle: "ማንነት ተረጋግጧል",
    verifiedBadge: "የተረጋገጠ",
    clientEthiopia: "ደንበኛ · ኢትዮጵያ",
    freelancerEthiopia: "ባለሙያ · ኢትዮጵያ",
    about: "ስለ እኔ",
    bioPreviewPlaceholder: "መግለጫዎ እዚህ ይታያል።",
    skillsPreviewPlaceholder: "የተመረጡ ክህሎቶች እዚህ ይታያሉ።",
    footClient: "በኤስክሮ የተጠበቀ ቅጥር",
    footWorker: "ለምዕራፍ ሥራ ዝግጁ",
    savedSuccess: "መገለጫው ተቀምጧል። የሥራ ቦታዎ በመዘመን ላይ...",
    skipForNow: "ለጊዜው ዝለል",
    fullProfileEditor: "ሙሉ የመገለጫ አርታዒ",
    saving: "በማስቀመጥ ላይ...",
    saveAndFinish: "አስቀምጥ እና ጨርስ",
    saveChanges: "ለውጦችን አስቀምጥ",
  },
  om: {
    couldNotProcessImage: "Suuraa qindeessuun hin danda'amne.",
    unableToSave: "Fooyya'iinsa piroofaayilii olkaa'uun hin danda'amne.",
    yourFullNameFallback: "Maqaa Guutuu Keessan",
    eyebrow: "Qophii piroofaayilii",
    title: "Piroofaayilii keessan guutaa",
    subtitle: "Maamiltoonni fi tumsaan eenyu waliin akka hojjetan akka beekaniif suuraa fi bal'ina muraasa dabalaa.",
    closeAria: "Qophii piroofaayilii cufi",
    closeTitle: "Cufi",
    progressComplete: (done, total) => `${total} keessaa ${done} xumurameera`,
    profilePhoto: "Suuraa piroofaayilii",
    added: "Dabalameera",
    required: "Barbaachisaa",
    nameAndBio: "Maqaa & ibsa",
    skills: "Ogummaalee",
    countSelected: (n) => `${n} filataman`,
    chooseTwoPlus: "2+ filadhaa",
    uploadCustomPhotoAria: "Suuraa piroofaayilii dhuunfaa fe'i",
    processing: "Qindeessaa jira...",
    changePhoto: "Suuraa jijjiiri",
    uploadPhoto: "Suuraa fe'i",
    remove: "Balleessi",
    shuffle: "Walmaki",
    photoHint: "JPG, PNG ykn WEBP, hanga MB 10. Suuraa malee avataara uumame fayyadamna.",
    firstName: "Maqaa duraa",
    firstNamePlaceholder: "Daawit",
    lastName: "Maqaa akaakayyuu",
    lastNamePlaceholder: "Mokonnin",
    bio: "Ibsa dhuunfaa",
    bioPlaceholderClient: "Dhaabbanni keessan hojii akkamiif qaxara?",
    bioPlaceholderWorker: "Maal hojjettu, maaliinis beekamtu?",
    primarySkill: "Ogummaa ijoo",
    selectPrimarySkill: "Ogummaa ijoo keessan filadhaa",
    additionalSkills: "Ogummaalee dabalataa",
    additionalSkillsHint: "Yoo xiqqaate lama filadhaa. Dabaluu ykn haquuf ogummaa irratti cuqaasaa.",
    previewAria: "Dur-argii piroofaayilii",
    profilePreview: "Dur-argii piroofaayilii",
    hide: "Dhoksi",
    show: "Mul'isi",
    previewHeading: "Dur-argii",
    publicProfile: "Piroofaayilii ummataa",
    identityVerifiedTitle: "Eenyummaan mirkanaa'eera",
    verifiedBadge: "Mirkanaa'e",
    clientEthiopia: "Maamila · Itoophiyaa",
    freelancerEthiopia: "Ogeessa · Itoophiyaa",
    about: "Waa'ee koo",
    bioPreviewPlaceholder: "Ibsi keessan asitti mul'ata.",
    skillsPreviewPlaceholder: "Ogummaaleen filataman asitti mul'atu.",
    footClient: "Qaxara iskuuroon eegame",
    footWorker: "Hojii boqonnaaf qophii",
    savedSuccess: "Piroofaayiliin olkaa'ameera. Bakki hojii kee haaromfamaa jira...",
    skipForNow: "Ammaaf irra darbi",
    fullProfileEditor: "Gulaalaa piroofaayilii guutuu",
    saving: "Olkaa'aa jira...",
    saveAndFinish: "Olkaa'ii xumuri",
    saveChanges: "Jijjiirama olkaa'i",
  },
  ti: {
    couldNotProcessImage: "ነቲ ስእሊ ምስላጥ ኣይተኻእለን።",
    unableToSave: "ምምሕያሻት ፕሮፋይል ምዕቃብ ኣይተኻእለን።",
    yourFullNameFallback: "ሙሉእ ስምኩም",
    eyebrow: "ምድላው ፕሮፋይል",
    title: "ፕሮፋይልኩም ዛዝሙ",
    subtitle: "ዓማዊልን መሻርኽትን ምስ መን ከም ዝሰርሑ ምእንቲ ክፈልጡ ስእልን ሒደት ዝርዝራትን ወስኹ።",
    closeAria: "ምድላው ፕሮፋይል ዕጾ",
    closeTitle: "ዕጾ",
    progressComplete: (done, total) => `ካብ ${total} እቶም ${done} ተዛዚሞም`,
    profilePhoto: "ስእሊ ፕሮፋይል",
    added: "ተወሲኹ",
    required: "የድሊ",
    nameAndBio: "ስምን መግለጽን",
    skills: "ክእለታት",
    countSelected: (n) => `${n} ተመሪጾም`,
    chooseTwoPlus: "2+ ምረጹ",
    uploadCustomPhotoAria: "ውልቃዊ ስእሊ ፕሮፋይል ጽዓኑ",
    processing: "የሰላስል ኣሎ...",
    changePhoto: "ስእሊ ቀይር",
    uploadPhoto: "ስእሊ ጽዓን",
    remove: "ኣልግስ",
    shuffle: "ቀያይር",
    photoHint: "JPG፣ PNG ወይ WEBP፣ ክሳብ 10 MB። ብዘይ ስእሊ ዝተፈጥረ ኣቫታር ንጥቀም።",
    firstName: "ቀዳማይ ስም",
    firstNamePlaceholder: "ዳዊት",
    lastName: "ስም ኣቦ",
    lastNamePlaceholder: "መኮነን",
    bio: "መግለጺ",
    bioPlaceholderClient: "ትካልኩም ንምንታይ ዓይነት ስራሕ ይቖጽር?",
    bioPlaceholderWorker: "እንታይ ትሰርሑ፣ ብምንታይከ ትፍለጡ?",
    primarySkill: "ቀንዲ ክእለት",
    selectPrimarySkill: "ቀንዲ ክእለትኩም ምረጹ",
    additionalSkills: "ተወሰኽቲ ክእለታት",
    additionalSkillsHint: "ብውሑዱ ክልተ ምረጹ። ንምውሳኽ ወይ ንምልጋስ ኣብ ክእለት ጠውቑ።",
    previewAria: "ቅድመ-ርኢት ፕሮፋይል",
    profilePreview: "ቅድመ-ርኢት ፕሮፋይል",
    hide: "ሕባእ",
    show: "ኣርኢ",
    previewHeading: "ቅድመ-ርኢት",
    publicProfile: "ህዝባዊ ፕሮፋይል",
    identityVerifiedTitle: "መንነት ተረጋጊጹ",
    verifiedBadge: "ዝተረጋገጸ",
    clientEthiopia: "ዓሚል · ኢትዮጵያ",
    freelancerEthiopia: "ክኢላ · ኢትዮጵያ",
    about: "ብዛዕባይ",
    bioPreviewPlaceholder: "መግለጺኹም ኣብዚ ክርአ እዩ።",
    skillsPreviewPlaceholder: "ዝተመርጹ ክእለታት ኣብዚ ክርኣዩ እዮም።",
    footClient: "ብኤስክሮ ዝተሓለወ ቅጥዒ",
    footWorker: "ንስራሕ ምዕራፍ ድሉው",
    savedSuccess: "ፕሮፋይል ተዓቂቡ። ቦታ ስራሕኩም ይሕደስ ኣሎ...",
    skipForNow: "ንሕጂ ሕለፍ",
    fullProfileEditor: "ሙሉእ ኣርታዒ ፕሮፋይል",
    saving: "ይዕቅብ ኣሎ...",
    saveAndFinish: "ዓቅብ እሞ ዛዝም",
    saveChanges: "ለውጥታት ዓቅብ",
  },
};

interface SkillTaxonomyItem {
  id: string;
  name?: string;
  nameEn?: string;
  nameAm?: string;
}

export interface ProfileCompletionSummary {
  hasCustomPhoto: boolean;
  hasBioAndName: boolean;
  hasRequiredSkills: boolean;
  requiresSkills: boolean;
  missingItems: Array<"photo" | "bio" | "skills">;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
}

export function evaluateProfileCompletion(params: {
  role: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  primarySkillId?: string | null;
  skillIds?: string[];
}): ProfileCompletionSummary {
  const requiresSkills =
    params.role === "FREELANCER" || params.role === "BOTH";
  const hasCustomPhoto = Boolean(params.avatarUrl && params.avatarUrl.trim().length > 0);
  const hasBioAndName = Boolean(
    params.firstName?.trim() &&
      params.lastName?.trim() &&
      (params.bio?.trim().length ?? 0) >= 20,
  );
  const hasRequiredSkills = requiresSkills
    ? Boolean(params.primarySkillId && (params.skillIds?.length ?? 0) >= 2)
    : true;

  const missingItems: Array<"photo" | "bio" | "skills"> = [];
  if (!hasCustomPhoto) missingItems.push("photo");
  if (!hasBioAndName) missingItems.push("bio");
  if (requiresSkills && !hasRequiredSkills) missingItems.push("skills");

  const totalCount = requiresSkills ? 3 : 2;
  const completedCount = totalCount - missingItems.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    hasCustomPhoto,
    hasBioAndName,
    hasRequiredSkills,
    requiresSkills,
    missingItems,
    completedCount,
    totalCount,
    percentage,
    isComplete: missingItems.length === 0,
  };
}

export interface ProfileCompletionDialogProps {
  user: MeResponse;
  role: "CLIENT" | "FREELANCER" | "BOTH" | "ADMIN" | "MEDIATOR";
  onSaved?: () => void;
  onOpenFullEditor?: () => void;
}

export function ProfileCompletionDialog({
  user,
  role,
  onSaved,
  onOpenFullEditor,
}: ProfileCompletionDialogProps) {
  const { language: lang } = useI18n();
  const copy = PCD_COPY[lang] ?? PCD_COPY.en;
  const location = useLocation();
  const navigate = useNavigate();

  const isOpen = Boolean(location.state?.showProfileCompletion);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    // A data URL cannot be persisted in User.avatarUrl (VARCHAR(500)); treat
    // any legacy value as "no custom photo" rather than failing the save.
    user.avatarUrl && !user.avatarUrl.startsWith("data:")
      ? user.avatarUrl
      : null,
  );
  const [avatarSeed, setAvatarSeed] = useState<string>(user.id || "me");
  const [primarySkillId, setPrimarySkillId] = useState<string>("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<SkillTaxonomyItem[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  /** Controls the mobile bottom-sheet expansion state (collapsed docked bar by default on mobile) */
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoSectionRef = useRef<HTMLDivElement | null>(null);
  const bioSectionRef = useRef<HTMLDivElement | null>(null);
  const skillsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingProfile(true);
    setSaveError(null);
    setSaveSuccess(false);
    setMobileSheetOpen(false);

    const storedOverride = loadAvatarOverride(user.id);
    if (storedOverride?.seed) {
      setAvatarSeed(storedOverride.seed);
    } else {
      setAvatarSeed(user.id || "me");
    }

    Promise.all([
      api.getPublicProfile(user.id).catch(() => null),
      api.getSkills().catch(() => []),
    ])
      .then(([profileRes, skillsRes]) => {
        if (cancelled) return;
        const p = (profileRes ?? {}) as {
          firstName?: string | null;
          lastName?: string | null;
          bio?: string | null;
          avatarUrl?: string | null;
          primarySkillId?: string | null;
          skills?: Array<{ id: string }>;
        };

        const resolvedAvatar =
          storedOverride && "avatarUrl" in storedOverride
            ? (storedOverride.avatarUrl ?? null)
            : (p.avatarUrl ?? user.avatarUrl ?? null);

        setFirstName(p.firstName ?? user.firstName ?? "");
        setLastName(p.lastName ?? user.lastName ?? "");
        setBio(p.bio ?? "");
        setAvatarUrl(resolvedAvatar);
        setPrimarySkillId(p.primarySkillId ?? "");
        setSkillIds((p.skills ?? []).map((s) => s.id));

        const s = skillsRes as
          | { items?: SkillTaxonomyItem[] }
          | SkillTaxonomyItem[]
          | null;
        setSkillsCatalog(Array.isArray(s) ? s : (s?.items ?? []));
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user.id, user.firstName, user.lastName, user.avatarUrl]);

  const closeDialog = () => {
    navigate(location.pathname || "/overview", {
      replace: true,
      state: {
        ...location.state,
        showProfileCompletion: false,
      },
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileSheetOpen) {
          setMobileSheetOpen(false);
        } else {
          closeDialog();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const summary = useMemo(
    () =>
      evaluateProfileCompletion({
        role,
        avatarUrl,
        firstName,
        lastName,
        bio,
        primarySkillId,
        skillIds,
      }),
    [role, avatarUrl, firstName, lastName, bio, primarySkillId, skillIds],
  );

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      // Upload immediately and keep the URL, not the image: `avatarUrl` is
      // VARCHAR(500) and the PATCH below stores a reference to the uploaded
      // photo. Sending the JPEG itself is what overflowed the column.
      const compressed = await compressAvatarImage(file);
      const { avatarUrl: uploadedUrl } = await api.uploadAvatar(compressed);
      setAvatarUrl(uploadedUrl);
      saveAvatarOverride(user.id, {
        avatarUrl: uploadedUrl,
        seed: avatarSeed,
      });
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : copy.couldNotProcessImage,
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRevertToBlobatar = () => {
    setPhotoError(null);
    setAvatarUrl(null);
    saveAvatarOverride(user.id, { avatarUrl: null, seed: avatarSeed });
  };

  const toggleSkill = (id: string) => {
    setSkillIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      if (!primarySkillId && next.length > 0) {
        setPrimarySkillId(next[0]);
      } else if (primarySkillId === id && !next.includes(id)) {
        setPrimarySkillId(next[0] ?? "");
      }
      return next;
    });
  };

  const handlePrimarySkillSelect = (id: string) => {
    setPrimarySkillId(id);
    if (id && !skillIds.includes(id)) {
      setSkillIds((prev) => [...prev, id]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const ensuredSkillIds =
        primarySkillId && !skillIds.includes(primarySkillId)
          ? [primarySkillId, ...skillIds]
          : skillIds;

      saveAvatarOverride(user.id, {
        avatarUrl: avatarUrl ?? null,
        seed: avatarSeed,
      });

      await api.updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        bio: bio.trim(),
        primarySkillId: primarySkillId || undefined,
        skillIds: ensuredSkillIds,
        avatarUrl: avatarUrl ?? null,
      });

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`yekis_new_user_nudge_${user.id}`);
        window.localStorage.removeItem("yekis_new_user_nudge_me");
      }
      setSaveSuccess(true);
      onSaved?.();
      setTimeout(() => {
        closeDialog();
      }, 450);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : copy.unableToSave,
      );
    } finally {
      setSaving(false);
    }
  };

  const skillLabel = (s: SkillTaxonomyItem) => localizeSkillName(s, lang);

  const liveDisplayName =
    `${firstName.trim()} ${lastName.trim()}`.trim() ||
    user.displayName ||
    user.email?.split("@")[0] ||
    copy.yourFullNameFallback;

  const primarySkillObj = skillsCatalog.find((s) => s.id === primarySkillId);
  const selectedSkillObjects = skillsCatalog.filter((s) =>
    skillIds.includes(s.id),
  );

  return (
    <div
      className="sh-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-completion-dialog-title"
      onClick={closeDialog}
    >
      <div
        className="sh-profile-completion-dialog sh-pcd-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sh-pcd-header">
          <div className="sh-pcd-header-left">
            <span className="sh-pcd-eyebrow">{copy.eyebrow}</span>
            <h2 id="profile-completion-dialog-title" className="sh-pcd-title">
              {copy.title}
            </h2>
            <p className="sh-pcd-subtitle">
              {copy.subtitle}
            </p>
          </div>
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={closeDialog}
            aria-label={copy.closeAria}
            title={copy.closeTitle}
          >
            <X size={17} />
          </button>
        </div>

        <div className="sh-pcd-checklist-bar">
          <div className="sh-pcd-progress-row">
            <span className="sh-pcd-progress-label">
              {copy.progressComplete(summary.completedCount, summary.totalCount)}
            </span>
            <span className="sh-pcd-progress-pct sh-mono">
              {summary.percentage}%
            </span>
          </div>
          <div className="sh-pcd-meter-track">
            <div
              className="sh-pcd-meter-fill"
              style={{ width: `${summary.percentage}%` }}
            />
          </div>

          <div className="sh-pcd-checklist-items">
            <button
              type="button"
              className={`sh-pcd-check-pill ${summary.hasCustomPhoto ? "done" : "missing"}`}
              onClick={() => {
                setMobileSheetOpen(false);
                photoSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
              }}
            >
              <span className="sh-pcd-check-icon">
                {summary.hasCustomPhoto ? (
                  <Check size={12} />
                ) : (
                  <Circle size={12} />
                )}
              </span>
              <span className="sh-pcd-check-name">{copy.profilePhoto}</span>
              <small>{summary.hasCustomPhoto ? copy.added : copy.required}</small>
            </button>

            <button
              type="button"
              className={`sh-pcd-check-pill ${summary.hasBioAndName ? "done" : "missing"}`}
              onClick={() => {
                setMobileSheetOpen(false);
                bioSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
              }}
            >
              <span className="sh-pcd-check-icon">
                {summary.hasBioAndName ? (
                  <Check size={12} />
                ) : (
                  <Circle size={12} />
                )}
              </span>
              <span className="sh-pcd-check-name">{copy.nameAndBio}</span>
              <small>{summary.hasBioAndName ? copy.added : copy.required}</small>
            </button>

            {summary.requiresSkills && (
              <button
                type="button"
                className={`sh-pcd-check-pill ${summary.hasRequiredSkills ? "done" : "missing"}`}
                onClick={() => {
                  setMobileSheetOpen(false);
                  skillsSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }}
              >
                <span className="sh-pcd-check-icon">
                  {summary.hasRequiredSkills ? (
                    <Check size={12} />
                  ) : (
                    <Circle size={12} />
                  )}
                </span>
                <span className="sh-pcd-check-name">{copy.skills}</span>
                <small>
                  {summary.hasRequiredSkills
                    ? copy.countSelected(skillIds.length)
                    : copy.chooseTwoPlus}
                </small>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="sh-pcd-form">
          <div className="sh-pcd-scroll-area">
            {loadingProfile ? (
              <div className="sh-pcd-loading">
                <div className="sh-skeleton" style={{ height: 76, width: "100%" }} />
                <div className="sh-skeleton" style={{ height: 140, width: "100%" }} />
              </div>
            ) : (
              <div className="sh-pcd-split-grid">
                <div className="sh-pcd-editor-col">
                  <section ref={photoSectionRef} className="sh-pcd-section">
                    <div className="sh-pcd-section-head">
                      <div className="sh-pcd-section-title">
                        <Camera size={16} />
                        <h3>{copy.profilePhoto}</h3>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={handlePhotoUpload}
                    />

                    <div className="sh-pcd-avatar-row">
                      <div className="sh-pcd-avatar-preview">
                        <YekisAvatar
                          userId={user.id}
                          seed={avatarSeed}
                          avatarUrl={avatarUrl}
                          disableStoredOverride={true}
                          size={72}
                          animate="hover"
                        />
                        <button
                          type="button"
                          className="sh-pcd-avatar-cam-btn"
                          onClick={() => fileInputRef.current?.click()}
                          title={copy.uploadCustomPhotoAria}
                          aria-label={copy.uploadCustomPhotoAria}
                        >
                          <Camera size={13} />
                        </button>
                      </div>

                      <div className="sh-pcd-avatar-controls">
                        <div className="sh-pcd-btn-group">
                          <button
                            type="button"
                            className="sh-btn sh-btn-primary"
                            disabled={uploadingPhoto}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload size={14} />
                            {uploadingPhoto
                              ? copy.processing
                              : summary.hasCustomPhoto
                                ? copy.changePhoto
                                : copy.uploadPhoto}
                          </button>

                          {summary.hasCustomPhoto ? (
                            <button
                              type="button"
                              className="sh-btn sh-btn-secondary"
                              onClick={handleRevertToBlobatar}
                            >
                              <Trash2 size={14} /> {copy.remove}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="sh-btn sh-btn-secondary"
                              onClick={() => {
                                const base =
                                  avatarSeed.split("#")[0] || user.id || "Yekis";
                                const nextSeed = `${base}#v${Math.floor(Math.random() * 10000)}`;
                                setAvatarSeed(nextSeed);
                                saveAvatarOverride(user.id, {
                                  avatarUrl: null,
                                  seed: nextSeed,
                                });
                              }}
                            >
                              <RefreshCw size={14} /> {copy.shuffle}
                            </button>
                          )}
                        </div>
                        <p className="sh-pcd-hint">
                          {copy.photoHint}
                        </p>
                        {photoError && (
                          <p className="sh-pcd-error-inline">{photoError}</p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section ref={bioSectionRef} className="sh-pcd-section">
                    <div className="sh-pcd-section-head">
                      <div className="sh-pcd-section-title">
                        <FileText size={16} />
                        <h3>{copy.nameAndBio}</h3>
                      </div>
                    </div>

                    <div className="sh-pcd-grid-2">
                      <label className="sh-pcd-field">
                        <span>{copy.firstName}</span>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder={copy.firstNamePlaceholder}
                          required
                        />
                      </label>
                      <label className="sh-pcd-field">
                        <span>{copy.lastName}</span>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder={copy.lastNamePlaceholder}
                          required
                        />
                      </label>
                    </div>

                    <label className="sh-pcd-field sh-pcd-field-bio">
                      <span className="sh-pcd-field-row">
                        <span>{copy.bio}</span>
                        <small className={bio.trim().length >= 20 ? "ok" : ""}>
                          {Math.min(20, bio.trim().length)}/20
                        </small>
                      </span>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={
                          role === "CLIENT"
                            ? copy.bioPlaceholderClient
                            : copy.bioPlaceholderWorker
                        }
                      />
                    </label>
                  </section>

                  {summary.requiresSkills && (
                    <section ref={skillsSectionRef} className="sh-pcd-section">
                      <div className="sh-pcd-section-head">
                        <div className="sh-pcd-section-title">
                          <Briefcase size={16} />
                          <h3>{copy.skills}</h3>
                        </div>
                      </div>

                      <label className="sh-pcd-field">
                        <span>{copy.primarySkill}</span>
                        <select
                          value={primarySkillId}
                          onChange={(e) =>
                            handlePrimarySkillSelect(e.target.value)
                          }
                        >
                          <option value="">{copy.selectPrimarySkill}</option>
                          {skillsCatalog.map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skillLabel(skill)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="sh-pcd-field">
                        <span>{copy.additionalSkills}</span>
                        <p className="sh-pcd-hint">
                          {copy.additionalSkillsHint}
                        </p>
                        <div className="sh-pcd-skill-tags">
                          {skillsCatalog.map((skill) => {
                            const active = skillIds.includes(skill.id);
                            return (
                              <button
                                key={skill.id}
                                type="button"
                                className={`sh-pcd-skill-tag ${active ? "active" : ""}`}
                                onClick={() => toggleSkill(skill.id)}
                              >
                                {active && <Check size={11} />}
                                {skillLabel(skill)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                {mobileSheetOpen && (
                  <div
                    className="sh-pcd-sheet-scrim"
                    onClick={() => setMobileSheetOpen(false)}
                    aria-hidden="true"
                  />
                )}

                <aside
                  className={`sh-pcd-preview-col ${mobileSheetOpen ? "sheet-open" : "sheet-collapsed"}`}
                  aria-label={copy.previewAria}
                >
                  <div
                    className="sh-pcd-sheet-bar"
                    onClick={() => setMobileSheetOpen((v) => !v)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={mobileSheetOpen}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setMobileSheetOpen((v) => !v);
                      }
                    }}
                  >
                    <div className="sh-pcd-sheet-pill" aria-hidden="true" />
                    <div className="sh-pcd-sheet-bar-row">
                      <span className="sh-pcd-sheet-bar-title">
                        {copy.profilePreview}
                      </span>
                      <span className="sh-pcd-sheet-toggle-chip">
                        {mobileSheetOpen ? (
                          <>
                            {copy.hide} <ChevronDown size={13} />
                          </>
                        ) : (
                          <>
                            {copy.show} <ChevronUp size={13} />
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="sh-pcd-preview-head">
                    <span>{copy.previewHeading}</span>
                    <small>{copy.publicProfile}</small>
                  </div>

                  <div className="sh-pcd-preview-card">
                    <div className="sh-pcd-preview-banner" />

                    <div className="sh-pcd-preview-body">
                      <div className="sh-pcd-preview-identity">
                        <div className="sh-pcd-preview-avatar-ring">
                          <YekisAvatar
                            userId={user.id}
                            seed={avatarSeed}
                            avatarUrl={avatarUrl}
                            disableStoredOverride={true}
                            size={64}
                            animate="hover"
                          />
                        </div>
                        <div className="sh-pcd-preview-name-wrap">
                          <div className="sh-pcd-preview-name-row">
                            <strong className="sh-pcd-preview-name">
                              {liveDisplayName}
                            </strong>
                            {user.kyc?.tier && (
                              <span
                                className="sh-pcd-preview-kyc"
                                title={copy.identityVerifiedTitle}
                              >
                                <ShieldCheck size={12} />
                                {copy.verifiedBadge}
                              </span>
                            )}
                          </div>
                          <span className="sh-pcd-preview-headline">
                            {primarySkillObj
                              ? skillLabel(primarySkillObj)
                              : role === "CLIENT"
                                ? copy.clientEthiopia
                                : copy.freelancerEthiopia}
                          </span>
                        </div>
                      </div>

                      <div className="sh-pcd-preview-block">
                        <div className="sh-pcd-preview-block-head">
                          <span>{copy.about}</span>
                        </div>
                        {bio.trim() ? (
                          <p className="sh-pcd-preview-bio-text">{bio.trim()}</p>
                        ) : (
                          <p className="sh-pcd-preview-bio-placeholder">
                            {copy.bioPreviewPlaceholder}
                          </p>
                        )}
                      </div>

                      {(summary.requiresSkills ||
                        selectedSkillObjects.length > 0) && (
                        <div className="sh-pcd-preview-block">
                          <div className="sh-pcd-preview-block-head">
                            <span>{copy.skills}</span>
                            <small>
                              {copy.countSelected(selectedSkillObjects.length)}
                            </small>
                          </div>
                          {selectedSkillObjects.length > 0 ? (
                            <div className="sh-pcd-preview-skills">
                              {selectedSkillObjects.map((sk) => {
                                const isPrimary = sk.id === primarySkillId;
                                return (
                                  <span
                                    key={sk.id}
                                    className={`sh-pcd-preview-skill-chip ${isPrimary ? "primary" : ""}`}
                                  >
                                    {isPrimary && <Star size={10} />}
                                    {skillLabel(sk)}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="sh-pcd-preview-bio-placeholder">
                              {copy.skillsPreviewPlaceholder}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="sh-pcd-preview-foot">
                        {role === "CLIENT"
                          ? copy.footClient
                          : copy.footWorker}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {saveError && <div className="sh-pcd-alert-error">{saveError}</div>}
            {saveSuccess && (
              <div className="sh-pcd-alert-success">
                <CheckCircle2 size={15} /> {copy.savedSuccess}
              </div>
            )}
          </div>

          <div className="sh-pcd-footer">
            <div className="sh-pcd-footer-left">
              <button
                type="button"
                className="sh-pcd-text-btn"
                onClick={closeDialog}
              >
                {copy.skipForNow}
              </button>
              {onOpenFullEditor && (
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => {
                    closeDialog();
                    onOpenFullEditor();
                  }}
                >
                  <ExternalLink size={13} /> {copy.fullProfileEditor}
                </button>
              )}
            </div>

            <button
              type="submit"
              className="sh-btn sh-btn-primary"
              disabled={saving || loadingProfile}
            >
              <Save size={14} />
              {saving
                ? copy.saving
                : summary.isComplete
                  ? copy.saveAndFinish
                  : copy.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
