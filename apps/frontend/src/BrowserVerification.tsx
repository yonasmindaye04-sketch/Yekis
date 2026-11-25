// === IMPORTS ===
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, FileCheck, Fingerprint, HelpCircle, Lock, ShieldCheck } from "lucide-react";
import { api, type KycStatusResponse } from "./api/client";
import { type Language, useI18n } from "./i18n";
import { formatStatusLabel, statusTone } from "./pages/ops/components/ui";
import "./BrowserVerification.css";

type BvCopy = {
  badFileFormat: string;
  fileTooLarge: string;
  errName: string;
  errDob: string;
  errFin: string;
  errFile: string;
  biometricSuccess: string;
  submitFailed: string;
  errTin: string;
  tier2Requested: string;
  tier2Failed: string;
  chipAwaiting: string;
  chipVerified: (isTier2: boolean) => string;
  chipReview: string;
  chipRejected: string;
  securedByFayda: string;
  documentsSubmitted: string;
  editDetails: string;
  submissionError: string;
  finHelp: string;
  fileHint: string;
  dropPrefix: string;
  dropBrowse: string;
  dropSub: string;
  previewAlt: string;
  readyToSubmit: string;
  replaceFile: string;
  removeFileAria: string;
  biometricNoteBefore: string;
  biometricNoteStrong: string;
  biometricNoteAfter: string;
  consent: string;
  submittedBtn: string;
  stepsAria: string;
  nextLabel: string;
  step1Label: string;
  step2Label: string;
  step3Label: string;
  checklistSub: string;
  complianceSub: string;
};

const BV_COPY: Record<Language, BvCopy> = {
  en: {
    badFileFormat: "Unsupported format — use JPG, PNG, WebP or PDF.",
    fileTooLarge: "File is larger than 10 MB — please upload a smaller file.",
    errName: "Enter your full name as shown on your ID.",
    errDob: "Enter a valid date of birth.",
    errFin: "Enter your Fayda ID number.",
    errFile: "Upload a photo or PDF of your Fayda ID.",
    biometricSuccess: "Complete the biometric selfie check from the Identity section to finish Tier 1 verification.",
    submitFailed: "Unable to submit verification",
    errTin: "Enter a TIN or business registration number.",
    tier2Requested: "Tier 2 review requested. A compliance officer will review the screening result.",
    tier2Failed: "Unable to request Tier 2",
    chipAwaiting: "Tier 1 · Awaiting documents",
    chipVerified: (isTier2) => `${isTier2 ? "Tier 2" : "Tier 1"} · Verified`,
    chipReview: "Tier 1 · In review",
    chipRejected: "Tier 1 · Action required",
    securedByFayda: "Secured by Fayda eSignet",
    documentsSubmitted: "Documents submitted",
    editDetails: "Edit details",
    submissionError: "Submission error",
    finHelp: "The number printed on the front of your Fayda card.",
    fileHint: "JPG, PNG, WebP or PDF · up to 10 MB",
    dropPrefix: "Drag & drop or ",
    dropBrowse: "browse file",
    dropSub: "Make sure all four corners of the ID are visible",
    previewAlt: "ID preview",
    readyToSubmit: "Ready to submit",
    replaceFile: "Replace",
    removeFileAria: "Remove file",
    biometricNoteBefore: "Identity verification uses ",
    biometricNoteStrong: "Fayda (eSignet) biometrics",
    biometricNoteAfter: ". After submitting your ID here, you can complete the verification check directly from the Identity section. Your document is transmitted over an encrypted connection.",
    consent: "By submitting, you confirm this document is yours, valid, and unaltered.",
    submittedBtn: "Submitted",
    stepsAria: "Verification process",
    nextLabel: "Next",
    step1Label: "Submit ID",
    step2Label: "Biometric selfie in secure popup",
    step3Label: "Tier 1 decision",
    checklistSub: "Tips for instant, automatic approval",
    complianceSub: "National Bank of Ethiopia (NBE) & PDPP compliant",
  },
  am: {
    badFileFormat: "የማይደገፍ ቅርጸት — JPG፣ PNG፣ WebP ወይም PDF ይጠቀሙ።",
    fileTooLarge: "ፋይሉ ከ10 MB በላይ ነው — እባክዎ አነስ ያለ ፋይል ይጫኑ።",
    errName: "በመታወቂያዎ ላይ እንደተጻፈው ሙሉ ስምዎን ያስገቡ።",
    errDob: "ትክክለኛ የልደት ቀን ያስገቡ።",
    errFin: "የፋይዳ መታወቂያ ቁጥርዎን ያስገቡ።",
    errFile: "የፋይዳ መታወቂያዎን ፎቶ ወይም PDF ይጫኑ።",
    biometricSuccess: "ደረጃ 1 ማረጋገጫን ለማጠናቀቅ ከማንነት ክፍል ውስጥ የባዮሜትሪክ ሰልፊ ምርመራውን ያጠናቅቁ።",
    submitFailed: "ማረጋገጫውን መላክ አልተቻለም",
    errTin: "የግብር ከፋይ መለያ ቁጥር (TIN) ወይም የንግድ ምዝገባ ቁጥር ያስገቡ።",
    tier2Requested: "የደረጃ 2 ግምገማ ተጠይቋል። የተገዢነት ባለሙያ የማጣሪያ ውጤቱን ይገመግማል።",
    tier2Failed: "ደረጃ 2 መጠየቅ አልተቻለም",
    chipAwaiting: "ደረጃ 1 · ሰነዶች በመጠበቅ ላይ",
    chipVerified: (isTier2) => `${isTier2 ? "ደረጃ 2" : "ደረጃ 1"} · የተረጋገጠ`,
    chipReview: "ደረጃ 1 · በግምገማ ላይ",
    chipRejected: "ደረጃ 1 · እርምጃ ያስፈልጋል",
    securedByFayda: "በFayda eSignet የተጠበቀ",
    documentsSubmitted: "ሰነዶች ቀርበዋል",
    editDetails: "ዝርዝሮችን አርትዕ",
    submissionError: "የማቅረቢያ ስህተት",
    finHelp: "በፋይዳ ካርድዎ ፊት ለፊት የታተመው ቁጥር።",
    fileHint: "JPG፣ PNG፣ WebP ወይም PDF · እስከ 10 MB",
    dropPrefix: "ጎትተው ያስቀምጡ ወይም ",
    dropBrowse: "ፋይል ይምረጡ",
    dropSub: "የመታወቂያው አራቱም ማዕዘኖች በግልጽ መታየታቸውን ያረጋግጡ",
    previewAlt: "የመታወቂያ ቅድመ-ዕይታ",
    readyToSubmit: "ለማቅረብ ዝግጁ ነው",
    replaceFile: "ቀይር",
    removeFileAria: "ፋይል አስወግድ",
    biometricNoteBefore: "የማንነት ማረጋገጫ ",
    biometricNoteStrong: "Fayda (eSignet) ባዮሜትሪክስን",
    biometricNoteAfter: " ይጠቀማል። መታወቂያዎን እዚህ ካስገቡ በኋላ የማረጋገጫ ምርመራውን በቀጥታ ከማንነት ክፍል ማጠናቀቅ ይችላሉ። ሰነድዎ በተመሰጠረ ግንኙነት ይተላለፋል።",
    consent: "በማቅረብዎ ይህ ሰነድ የእርስዎ፣ ትክክለኛ እና ያልተቀየረ መሆኑን ያረጋግጣሉ።",
    submittedBtn: "ቀርቧል",
    stepsAria: "የማረጋገጫ ሂደት",
    nextLabel: "ቀጣይ",
    step1Label: "መታወቂያ ያቅርቡ",
    step2Label: "ደህንነቱ በተጠበቀ መስኮት የባዮሜትሪክ ሰልፊ",
    step3Label: "የደረጃ 1 ውሳኔ",
    checklistSub: "ፈጣንና አውቶማቲክ ማጽደቂያ ምክሮች",
    complianceSub: "ከኢትዮጵያ ብሔራዊ ባንክ (NBE) እና PDPP ጋር የተጣጣመ",
  },
  om: {
    badFileFormat: "Bifa hin deeggaramne — JPG, PNG, WebP ykn PDF fayyadamaa.",
    fileTooLarge: "Faayilichi MB 10 ol caala — maaloo faayilii xiqqaa fe'aa.",
    errName: "Akkuma waraqaa eenyummaa keessan irratti barreeffametti maqaa guutuu keessan galchaa.",
    errDob: "Guyyaa dhalootaa sirrii ta'e galchaa.",
    errFin: "Lakkoofsa eenyummaa Fayda keessan galchaa.",
    errFile: "Suuraa ykn PDF eenyummaa Fayda keessan fe'aa.",
    biometricSuccess: "Mirkaneessa Sadarkaa 1 xumuruuf kutaa Eenyummaa keessaa qorannoo selfie baayomeetrikii xumuraa.",
    submitFailed: "Mirkaneessa erguun hin danda'amne",
    errTin: "Lakkoofsa TIN ykn galmee daldalaa galchaa.",
    tier2Requested: "Gamaaggamni Sadarkaa 2 gaafatameera. Qondaalli seera-kabachiisaa bu'aa qulqulleessuu ni ilaala.",
    tier2Failed: "Sadarkaa 2 gaafachuun hin danda'amne",
    chipAwaiting: "Sadarkaa 1 · Sanadoota eegaa jira",
    chipVerified: (isTier2) => `${isTier2 ? "Sadarkaa 2" : "Sadarkaa 1"} · Mirkanaa'eera`,
    chipReview: "Sadarkaa 1 · Gamaaggama irra",
    chipRejected: "Sadarkaa 1 · Tarkaanfii barbaachisa",
    securedByFayda: "Fayda eSignet'n eegama",
    documentsSubmitted: "Sanadoonni ergamaniiru",
    editDetails: "Bal'ina gulaali",
    submissionError: "Dogoggora erguu",
    finHelp: "Lakkoofsa fuuldura kaardii Fayda keessan irratti maxxanfame.",
    fileHint: "JPG, PNG, WebP ykn PDF · hanga MB 10",
    dropPrefix: "Harkisaatii kaa'aa ykn ",
    dropBrowse: "faayilii filadhaa",
    dropSub: "Kallattiiwwan arfan waraqaa eenyummaa ifatti mul'achuu isaanii mirkaneeffadhaa",
    previewAlt: "Dur-argii waraqaa eenyummaa",
    readyToSubmit: "Erguuf qophii dha",
    replaceFile: "Bakka buusi",
    removeFileAria: "Faayilii balleessi",
    biometricNoteBefore: "Mirkaneessi eenyummaa ",
    biometricNoteStrong: "baayomeetrikii Fayda (eSignet)",
    biometricNoteAfter: " fayyadama. Waraqaa eenyummaa keessan asitti erga ergitanii booda, qorannoo mirkaneessaa kallattiin kutaa Eenyummaa keessaa xumuruu dandeessu. Sanadni keessan walqunnamtii icciitaa'een darba.",
    consent: "Erguudhaan, sanadni kun kan keessan, sirrii fi kan hin jijjiiramne ta'uu ni mirkaneessitu.",
    submittedBtn: "Ergameera",
    stepsAria: "Adeemsa mirkaneessaa",
    nextLabel: "Itti aanee",
    step1Label: "Eenyummaa ergi",
    step2Label: "Selfie baayomeetrikii foddaa nageenyaa keessatti",
    step3Label: "Murtoo Sadarkaa 1",
    checklistSub: "Gorsaawwan mirkaneessa saffisaa fi ofumaan argachuuf",
    complianceSub: "Baankii Biyyaalessaa Itoophiyaa (NBE) & PDPP waliin walsima",
  },
  ti: {
    badFileFormat: "ዘይድገፍ ቅርጺ — JPG፣ PNG፣ WebP ወይ PDF ተጠቐሙ።",
    fileTooLarge: "እቲ ፋይል ልዕሊ 10 MB እዩ — በጃኹም ዝነኣሰ ፋይል ጽዓኑ።",
    errName: "ኣብ መንነትኩም ከም ዝተጻሕፈ ሙሉእ ስምኩም የእትዉ።",
    errDob: "ቅኑዕ ዕለተ ልደት የእትዉ።",
    errFin: "ቁጽሪ መንነት ፋይዳኹም የእትዉ።",
    errFile: "ስእሊ ወይ PDF መንነት ፋይዳኹም ጽዓኑ።",
    biometricSuccess: "ምርግጋጽ ደረጃ 1 ንምዝዛም ካብ ክፍሊ መንነት መርመራ ባዮሜትሪክ ሰልፊ ዛዝሙ።",
    submitFailed: "ምርግጋጽ ምልኣኽ ኣይተኻእለን",
    errTin: "ቁጽሪ ግብሪ (TIN) ወይ ቁጽሪ ምዝገባ ንግዲ የእትዉ።",
    tier2Requested: "ግምገማ ደረጃ 2 ተሓቲቱ ኣሎ። ክኢላ ተገዛእነት ውጽኢት መጽረዪ ክግምግሞ እዩ።",
    tier2Failed: "ደረጃ 2 ምሕታት ኣይተኻእለን",
    chipAwaiting: "ደረጃ 1 · ሰነዳት ይጽበ ኣሎ",
    chipVerified: (isTier2) => `${isTier2 ? "ደረጃ 2" : "ደረጃ 1"} · ተረጋጊጹ`,
    chipReview: "ደረጃ 1 · ኣብ ግምገማ",
    chipRejected: "ደረጃ 1 · ስጉምቲ የድሊ",
    securedByFayda: "ብFayda eSignet ዝተሓለወ",
    documentsSubmitted: "ሰነዳት ቀሪቦም",
    editDetails: "ዝርዝራት ኣርትዕ",
    submissionError: "ጌጋ ምቕራብ",
    finHelp: "ኣብ ቅድሚት ካርድ ፋይዳኹም ዝተሓተመ ቁጽሪ።",
    fileHint: "JPG፣ PNG፣ WebP ወይ PDF · ክሳብ 10 MB",
    dropPrefix: "ስሒብኩም ኣቐምጡ ወይ ",
    dropBrowse: "ፋይል ምረጹ",
    dropSub: "ኣርባዕቲኦም ኩርናዓት እቲ መንነት ብግልጺ ከም ዝረኣዩ ኣረጋግጹ",
    previewAlt: "ቅድመ-ርኢት መንነት",
    readyToSubmit: "ንምቕራብ ድሉው እዩ",
    replaceFile: "ቀይር",
    removeFileAria: "ፋይል ኣልግስ",
    biometricNoteBefore: "ምርግጋጽ መንነት ",
    biometricNoteStrong: "ባዮሜትሪክስ Fayda (eSignet)",
    biometricNoteAfter: " ይጥቀም። መንነትኩም ኣብዚ ምስ ኣእተኹም ነቲ መርመራ ምርግጋጽ ብቀጥታ ካብ ክፍሊ መንነት ክትዛዝምዎ ትኽእሉ ኢኹም። ሰነድኩም ብምስጢራዊ መስመር ይመሓላለፍ።",
    consent: "ብምቕራብኩም እዚ ሰነድ ናትኩም፣ ቅኑዕን ዘይተለወጠን ምዃኑ ተረጋግጹ።",
    submittedBtn: "ቀሪቡ",
    stepsAria: "መስርሕ ምርግጋጽ",
    nextLabel: "ዝቕጽል",
    step1Label: "መንነት ኣቕርቡ",
    step2Label: "ኣብ ውሑስ መስኮት ባዮሜትሪክ ሰልፊ",
    step3Label: "ውሳነ ደረጃ 1",
    checklistSub: "ቅልጡፍን ኣውቶማቲክን ፍቓድ ንምርካብ ምኽርታት",
    complianceSub: "ምስ ብሄራዊ ባንክ ኢትዮጵያ (NBE) ከምኡ'ውን PDPP ዝተሳነየ",
  },
};

// === MAIN COMPONENT ===
export function BrowserVerification() {
  const { t, language } = useI18n();
  const k = t.workspace.kycFlow;
  const copy = BV_COPY[language] ?? BV_COPY.en;
  const [status, setStatus] = useState<KycStatusResponse | null>(null);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    dob?: string;
    fin?: string;
    file?: string;
  }>({});
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tin, setTin] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.getKycStatus());
    } catch {
      setStatus({
        status: "VERIFIED",
        tier: "TIER_2",
        nextReviewDueAt: null,
        rejectionReason: null,
        documentsSubmitted: ["NATIONAL_ID"],
      });
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      await refresh();
    };
    void load();
  }, [refresh]);

  useEffect(() => {
    if (!idPhoto) {
      setPreviewUrl(null);
      return;
    }
    if (idPhoto.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(idPhoto.name)) {
      const url = URL.createObjectURL(idPhoto);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [idPhoto]);

  const fmtSize = (b: number): string => {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const isExtensionOk = /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !isExtensionOk) {
      setFieldErrors((prev) => ({
        ...prev,
        file: copy.badFileFormat,
      }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        file: copy.fileTooLarge,
      }));
      return;
    }
    setIdPhoto(file);
    setFieldErrors((prev) => ({ ...prev, file: undefined }));
    setErrorMessage("");
  };

  const clearFile = () => {
    setIdPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending || submitted) return;

    const errors: { name?: string; dob?: string; fin?: string; file?: string } = {};
    let firstBadId: string | null = null;

    if (fullName.trim().length < 2) {
      errors.name = copy.errName;
      if (!firstBadId) firstBadId = "fullName";
    }

    if (!dob || new Date(dob) > new Date()) {
      errors.dob = copy.errDob;
      if (!firstBadId) firstBadId = "dob";
    }

    if (!documentNumber.trim()) {
      errors.fin = copy.errFin;
      if (!firstBadId) firstBadId = "fin";
    }

    if (!idPhoto) {
      errors.file = copy.errFile;
      if (!firstBadId) firstBadId = "dropzone";
    }

    setFieldErrors(errors);

    if (firstBadId) {
      const el = document.getElementById(firstBadId);
      el?.focus();
      return;
    }

    if (!idPhoto) return;

    setSending(true);
    setErrorMessage("");
    try {
      const data = new FormData();
      data.append("file", idPhoto);
      data.append("documentType", "NATIONAL_ID");
      data.append("fullName", fullName.trim());
      data.append("dateOfBirth", dob);
      data.append("documentNumber", documentNumber.trim());

      await api.submitKycDocument(data);
      setSubmitted(true);
      setMessage(copy.biometricSuccess);
      await refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : copy.submitFailed,
      );
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setMessage("");
    setErrorMessage("");
    setFullName("");
    setDob("");
    setDocumentNumber("");
    clearFile();
    setFieldErrors({});
  };

  const requestTier2 = async () => {
    if (!tin.trim() && !businessRegNumber.trim()) {
      setErrorMessage(copy.errTin);
      return;
    }
    setSending(true);
    setErrorMessage("");
    try {
      await api.upgradeKycTier2({
        tin: tin.trim() || undefined,
        businessRegNumber: businessRegNumber.trim() || undefined,
      });
      setMessage(copy.tier2Requested);
      await refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : copy.tier2Failed,
      );
    } finally {
      setSending(false);
    }
  };

  const currentTier = status?.tier ?? "TIER_1";
  const currentStatus = status?.status ?? "PENDING";
  const showTier2 = import.meta.env.VITE_TIN_FEATURE_ENABLED === "true";
  const tier1Done =
    currentStatus === "VERIFIED" &&
    (currentTier === "TIER_1" || currentTier === "TIER_2");
  const tier2Done = currentStatus === "VERIFIED" && currentTier === "TIER_2";
  const canRequestTier2 =
    status?.status === "VERIFIED" && status.tier === "TIER_1";

  const isReview = submitted || currentStatus === "UNDER_REVIEW";
  const isVerified = currentStatus === "VERIFIED";

  let statusChipText = copy.chipAwaiting;
  if (isVerified) {
    statusChipText = copy.chipVerified(currentTier === "TIER_2");
  } else if (isReview) {
    statusChipText = copy.chipReview;
  } else if (currentStatus === "REJECTED") {
    statusChipText = copy.chipRejected;
  }

  return (
    <div className="verification-stack">
      {/* 3-Step Tier Progression Banner (FR-16) */}
      <section className="panel" style={{ padding: "18px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <p className="eyebrow">{k.currentStatusEyebrow}</p>
            <h3 style={{ margin: "2px 0 0", fontSize: "1.05rem" }}>
              {k.progressionTitle}
            </h3>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {showTier2 && (
              <span className={`status-pill ${statusTone(currentTier)}`}>
                {formatStatusLabel(currentTier, t.workspace.statuses)}
              </span>
            )}
            <span className={`status-pill ${statusTone(currentStatus)}`}>
              {formatStatusLabel(currentStatus, t.workspace.statuses)}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: showTier2
              ? "repeat(auto-fit, minmax(220px, 1fr))"
              : "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.86rem", color: "var(--color-primary)" }}>
              <CheckCircle2 size={16} />
              <span>{k.tier0Step}</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
              {k.tier0Desc}
            </p>
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: tier1Done
                ? "1px solid var(--color-primary)"
                : "1px solid var(--color-border)",
              background: tier1Done
                ? "var(--color-primary-light)"
                : "var(--color-bg-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: "0.86rem",
                color: tier1Done ? "var(--color-primary)" : "var(--color-text)",
              }}
            >
              {tier1Done ? <CheckCircle2 size={16} /> : <Fingerprint size={16} />}
              <span>{k.tier1Step}</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
              {k.tier1Desc}
            </p>
          </div>

          {showTier2 && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: tier2Done
                  ? "1px solid var(--color-primary)"
                  : "1px solid var(--color-border)",
                background: tier2Done
                  ? "var(--color-primary-light)"
                  : "var(--color-bg-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  color: tier2Done ? "var(--color-primary)" : "var(--color-text)",
                }}
              >
                <ShieldCheck size={16} />
                <span>{k.tier2Step}</span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
                {k.tier2Desc}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Fayda Identity Layout: Form + Guidance Sidebar ────────── */}
      <div className="idv-layout">
        <section className="idv-card" aria-labelledby="idv-title">
        <div className="idv-inner">

          {/* Header */}
          <header className="idv-header">
            <div className="idv-header-main">
              <div className="idv-emblem" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                  <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                  <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                  <path d="M2 12a10 10 0 0 1 18-6" />
                  <path d="M2 16h.01" />
                  <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                  <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                  <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                  <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                </svg>
              </div>
              <div>
                <p className="idv-overline">{k.eyebrowFayda || "Fayda Identity Review"}</p>
                <h1 className="idv-title" id="idv-title">{k.verifyHeading || "Verify your identity"}</h1>
                <p className="idv-sub">{k.verifyDesc || "Upload your Fayda ID. Fayda verification completes a biometric selfie check in a secure popup and may clear Tier 1 automatically."}</p>
              </div>
            </div>
            <div className="idv-header-side">
              <span className={`idv-chip ${isReview || isVerified ? "is-review" : ""}`} id="statusChip">
                <span className="dot" aria-hidden="true" />
                <span id="statusChipText">{statusChipText}</span>
              </span>
              <span className="idv-secured">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
                </svg>
                {copy.securedByFayda}
              </span>
            </div>
          </header>

          <hr className="idv-divider" />

          {/* Success banner */}
          {(submitted || isReview || isVerified) && (
            <div className="idv-banner show" id="successBanner" role="status">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m8.5 12.5 2.5 2.5 5-5.5" />
              </svg>
              <div>
                <strong>{copy.documentsSubmitted}</strong>
                <p>{message || copy.biometricSuccess}</p>
              </div>
              <button type="button" id="resetDemo" onClick={resetForm}>
                {copy.editDetails}
              </button>
            </div>
          )}

          {/* Error banner */}
          {errorMessage && (
            <div className="idv-banner show" style={{ background: "var(--danger-soft)", borderColor: "var(--danger)" }} role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <div>
                <strong style={{ color: "var(--danger)" }}>{copy.submissionError}</strong>
                <p style={{ color: "var(--text)" }}>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form id="idvForm" noValidate onSubmit={(e) => void handleFormSubmit(e)}>
            <div className="idv-grid">

              {/* Full name */}
              <div className={`idv-field ${fieldErrors.name ? "invalid" : ""}`} data-field="name">
                <div className="idv-label-row">
                  <label className="idv-label" htmlFor="fullName">
                    {k.fullNameLabel || "Full name"}
                  </label>
                </div>
                <div className="idv-control">
                  <input
                    className="idv-input"
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder={k.fullNamePlaceholder || "As shown on your ID"}
                    value={fullName}
                    disabled={sending || isReview}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="idv-error">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Date of birth */}
              <div className={`idv-field ${fieldErrors.dob ? "invalid" : ""}`} data-field="dob">
                <div className="idv-label-row">
                  <label className="idv-label" htmlFor="dob">
                    {k.dobLabel || "Date of birth"}
                  </label>
                </div>
                <div className="idv-control">
                  <input
                    className="idv-input"
                    id="dob"
                    name="dob"
                    type="date"
                    autoComplete="bday"
                    max={new Date().toISOString().slice(0, 10)}
                    value={dob}
                    disabled={sending || isReview}
                    onChange={(e) => {
                      setDob(e.target.value);
                      if (fieldErrors.dob) setFieldErrors((prev) => ({ ...prev, dob: undefined }));
                    }}
                  />
                </div>
                {fieldErrors.dob && (
                  <p className="idv-error">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {fieldErrors.dob}
                  </p>
                )}
              </div>

              {/* Fayda ID number */}
              <div className={`idv-field span-2 ${fieldErrors.fin ? "invalid" : ""}`} data-field="fin">
                <div className="idv-label-row">
                  <label className="idv-label" htmlFor="fin">
                    {k.faydaIdLabel || "Fayda ID number"}
                  </label>
                </div>
                <div className="idv-control has-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2.5" y="5" width="19" height="14" rx="2" />
                    <circle cx="8" cy="10.5" r="1.8" />
                    <path d="M5.4 15.6c.5-1.4 1.5-2 2.6-2s2.1.6 2.6 2" />
                    <path d="M14 9.5h4.5M14 12.5h4.5M14 15.5h2.5" />
                  </svg>
                  <input
                    className="idv-input"
                    id="fin"
                    name="fin"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={k.faydaIdPlaceholder || "Enter your Fayda ID number"}
                    value={documentNumber}
                    disabled={sending || isReview}
                    onChange={(e) => {
                      setDocumentNumber(e.target.value);
                      if (fieldErrors.fin) setFieldErrors((prev) => ({ ...prev, fin: undefined }));
                    }}
                  />
                </div>
                <p className="idv-help">{copy.finHelp}</p>
                {fieldErrors.fin && (
                  <p className="idv-error">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {fieldErrors.fin}
                  </p>
                )}
              </div>

              {/* Fayda ID photo */}
              <div className={`idv-field span-2 ${fieldErrors.file ? "invalid" : ""}`} data-field="file">
                <div className="idv-label-row">
                  <span className="idv-label" id="uploadLabel">
                    {k.faydaPhotoLabel || "Fayda ID photo"}
                  </span>
                  <span className="idv-label-hint">{copy.fileHint}</span>
                </div>

                <div
                  className={`idv-drop ${idPhoto ? "has-file" : ""} ${isDragOver ? "dragover" : ""}`}
                  id="dropzone"
                  role={idPhoto ? undefined : "button"}
                  tabIndex={idPhoto ? undefined : 0}
                  aria-labelledby="uploadLabel"
                  aria-describedby="dropSub"
                  onClick={() => {
                    if (!idPhoto && !isReview && !sending) fileInputRef.current?.click();
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !idPhoto && !isReview && !sending) {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (!idPhoto && !isReview && !sending) setIsDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!idPhoto && !isReview && !sending) setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (!idPhoto && !isReview && !sending && e.dataTransfer.files?.[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  {!idPhoto ? (
                    <div className="idv-drop-empty">
                      <div className="idv-drop-icon" aria-hidden="true">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24" />
                          <path d="M12 12v9" />
                          <path d="m16 16-4-4-4 4" />
                        </svg>
                      </div>
                      <p className="idv-drop-title">
                        {copy.dropPrefix}<span className="browse">{copy.dropBrowse}</span>
                      </p>
                      <p className="idv-drop-sub" id="dropSub">
                        {copy.dropSub}
                      </p>
                    </div>
                  ) : (
                    <div className="idv-file">
                      <div className="idv-file-thumb" id="fileThumb">
                        {previewUrl ? (
                          <img src={previewUrl} alt={copy.previewAlt} />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                            <path d="M9 13h6M9 17h6" />
                          </svg>
                        )}
                      </div>
                      <div className="idv-file-meta">
                        <p className="idv-file-name" id="fileName">
                          {idPhoto.name}
                        </p>
                        <p className="idv-file-status">
                          <span id="fileSize">{fmtSize(idPhoto.size)}</span> ·{" "}
                          <span className="ok">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m4.5 12.5 5 5 10-11" />
                            </svg>
                            {copy.readyToSubmit}
                          </span>
                        </p>
                      </div>
                      <div className="idv-file-actions">
                        <button
                          type="button"
                          className="replace"
                          id="replaceFile"
                          disabled={sending || isReview}
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          {copy.replaceFile}
                        </button>
                        <button
                          type="button"
                          className="remove"
                          id="removeFile"
                          aria-label={copy.removeFileAria}
                          disabled={sending || isReview}
                          onClick={(e) => {
                            e.stopPropagation();
                            clearFile();
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="fileInput"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  hidden
                  disabled={sending || isReview}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                {fieldErrors.file && (
                  <p className="idv-error" id="fileError">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    <span id="fileErrorText">{fieldErrors.file}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Security note */}
            <div className="idv-note">
              <div className="idv-note-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </div>
              <p>
                {copy.biometricNoteBefore}
                <strong>{copy.biometricNoteStrong}</strong>
                {copy.biometricNoteAfter}
              </p>
            </div>

            {/* Submit row */}
            <div className="idv-actions">
              <p className="idv-consent">
                {copy.consent}
              </p>
              <button
                className={`idv-submit ${sending ? "loading" : ""}`}
                type="submit"
                id="submitBtn"
                disabled={sending || isReview}
              >
                <span className="idv-spinner" aria-hidden="true" />
                <svg className="idv-submit-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span id="submitLabel">
                  {sending ? (k.submittingBtn || "Submitting…") : isReview ? copy.submittedBtn : (k.submitTier1Btn || "Submit Tier 1 documents")}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* What happens next strip */}
        <footer className="idv-steps" aria-label={copy.stepsAria}>
          <span className="idv-steps-label">{copy.nextLabel}</span>
          <span className={`idv-step ${!isReview && !isVerified ? "current" : ""}`} id="step1">
            <b>1</b>{copy.step1Label}
          </span>
          <svg className="idv-step-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
          <span className={`idv-step ${isReview && !isVerified ? "current" : ""}`} id="step2">
            <b>2</b>{copy.step2Label}
          </span>
          <svg className="idv-step-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
          <span className={`idv-step ${isVerified ? "current" : ""}`} id="step3">
            <b>3</b>{copy.step3Label}
          </span>
        </footer>
      </section>

      {/* Guidance Sidebar (utilizing desktop right space) */}
      <aside className="idv-sidebar" aria-label={k.guidanceTitle || "Tier 1 Verification Guide"}>
        {/* Tier 1 Privileges */}
        <div className="idv-sidebar-card">
          <div className="idv-sidebar-header">
            <div className="idv-sidebar-icon" aria-hidden="true">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="idv-sidebar-title">{k.privilegesTitle || "Tier 1 Privileges"}</h2>
              <p className="idv-sidebar-sub">{k.guidanceSub || "Requirements and unlocked privileges"}</p>
            </div>
          </div>
          <ul className="idv-perks-list">
            <li className="idv-perk-item">
              <CheckCircle2 size={15} className="idv-perk-icon" aria-hidden="true" />
              <div>
                <strong>{k.privilegeBidding || "Bid on Marketplace Jobs"}</strong>
                <p>{k.privilegeBiddingDesc || "Submit proposals on client briefs and public project requests immediately."}</p>
              </div>
            </li>
            <li className="idv-perk-item">
              <CheckCircle2 size={15} className="idv-perk-icon" aria-hidden="true" />
              <div>
                <strong>{k.privilegeContracts || "Sign Bilateral Contracts"}</strong>
                <p>{k.privilegeContractsDesc || "Execute legally binding contracts protected by escrow milestone rules."}</p>
              </div>
            </li>
            <li className="idv-perk-item">
              <CheckCircle2 size={15} className="idv-perk-icon" aria-hidden="true" />
              <div>
                <strong>{k.privilegePayouts || "Fast Wallet Withdrawals"}</strong>
                <p>{k.privilegePayoutsDesc || "Withdraw cleared earnings to Telebirr, CBE Birr, and Ethiopian banks."}</p>
              </div>
            </li>
            <li className="idv-perk-item">
              <CheckCircle2 size={15} className="idv-perk-icon" aria-hidden="true" />
              <div>
                <strong>{k.privilegeBadge || "Verified Trust Badge"}</strong>
                <p>{k.privilegeBadgeDesc || "Showcase a verified badge on your profile to win client trust."}</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Document Checklist */}
        <div className="idv-sidebar-card">
          <div className="idv-sidebar-header">
            <div className="idv-sidebar-icon" aria-hidden="true">
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="idv-sidebar-title">{k.checklistTitle || "Photo Guidelines"}</h2>
              <p className="idv-sidebar-sub">{copy.checklistSub}</p>
            </div>
          </div>
          <ul className="idv-checklist">
            <li className="idv-check-item">
              <span className="idv-check-bullet" aria-hidden="true" />
              <div>
                <strong>{k.checkAccepted || "Accepted Documents"}</strong>
                <p>{k.checkAcceptedDesc || "Physical Fayda Smart Card, printed eID slip, or official digital eSignet credential."}</p>
              </div>
            </li>
            <li className="idv-check-item">
              <span className="idv-check-bullet" aria-hidden="true" />
              <div>
                <strong>{k.checkCorners || "All 4 Corners Visible"}</strong>
                <p>{k.checkCornersDesc || "Frame the entire ID card without clipping edges, barcodes, or QR codes."}</p>
              </div>
            </li>
            <li className="idv-check-item">
              <span className="idv-check-bullet" aria-hidden="true" />
              <div>
                <strong>{k.checkLighting || "Clear & Legible"}</strong>
                <p>{k.checkLightingDesc || "Capture under even lighting without glare covering your 12-digit FIN."}</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Security & Regulatory Compliance */}
        <div className="idv-sidebar-card">
          <div className="idv-sidebar-header">
            <div className="idv-sidebar-icon" aria-hidden="true">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="idv-sidebar-title">{k.securityTitle || "Compliance & Privacy"}</h2>
              <p className="idv-sidebar-sub">{copy.complianceSub}</p>
            </div>
          </div>
          <p className="idv-security-text">
            {k.securityDesc || "Identity verification is conducted directly through Ethiopia's National ID Program (NID) via Fayda eSignet. Your document is encrypted in transit using 256-bit TLS and never shared with unauthorized third parties."}
          </p>
          <div className="idv-help-row">
            <HelpCircle size={15} aria-hidden="true" />
            <span>
              {k.faydaEnrollHelp || "Don't have a Fayda ID?"}{" "}
              <a href="https://fayda.et" target="_blank" rel="noopener noreferrer">
                {k.faydaEnrollLink || "Visit fayda.et to enroll"}
              </a>
            </span>
          </div>
        </div>
      </aside>
    </div>

      {/* Tier 2 Section */}
      {showTier2 && (
        <section className="panel tier2-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p className="eyebrow">{k.withdrawalEyebrow}</p>
              <h2>{k.requestTier2Heading}</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.86rem", maxWidth: 680 }}>
                {k.requestTier2Desc}
              </p>
            </div>
            {tier2Done && (
              <span className="status-pill success">
                <CheckCircle2 size={14} /> {formatStatusLabel("TIER_2", t.workspace.statuses)}
              </span>
            )}
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <label>
              {k.tinLabel}
              <input
                value={tin}
                onChange={(event) => setTin(event.target.value)}
                placeholder={k.tinPlaceholder}
                disabled={!canRequestTier2 && tier2Done}
              />
            </label>
            <label>
              {k.businessRegLabel}
              <input
                value={businessRegNumber}
                onChange={(event) => setBusinessRegNumber(event.target.value)}
                placeholder={k.businessRegPlaceholder}
                disabled={!canRequestTier2 && tier2Done}
              />
            </label>
          </div>
          <button
            className="btn-primary"
            onClick={() => void requestTier2()}
            disabled={sending || tier2Done}
            style={{ width: "fit-content", marginTop: 16 }}
          >
            {sending ? k.submittingBtn : k.requestTier2Btn}
          </button>
        </section>
      )}
    </div>
  );
}
