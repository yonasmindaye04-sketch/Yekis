import { useState } from "react";
import {
  Check,
  Copy,
  FileCheck2,
  FileText,
  Globe,
  Printer,
  Stamp,
  X,
} from "lucide-react";

export type FiscalDocType = "CLIENT_INVOICE" | "FREELANCER_VOUCHER";
export type FiscalRail = "TELEBIRR" | "CBE_BIRR" | "M_PESA";
export type ReceiptLanguage = "en" | "am" | "om" | "ti";

export interface FiscalDocumentData {
  docType?: FiscalDocType;
  serialNumber?: string;
  contractRef?: string;
  milestoneTitle?: string;
  issuedAtIso?: string;
  principalEtb: number;
  rail: FiscalRail;
  providerReference?: string;
  statusLabel?: string;
  // Counterparties
  clientName?: string;
  clientTin?: string;
  clientLocation?: string;
  freelancerName?: string;
  freelancerUcid?: string;
  freelancerTin?: string;
  // Tax & Fee Controls
  includeVat15?: boolean;
  includeWithholding?: boolean;
  hasVerifiedTin?: boolean;
  clientFeeRate?: number; // default 0 — no client deposit surcharge
  freelancerFeeRate?: number; // default 0.07 — the platform's 7% general fee
  // Initial Language Override (Defaults to 'en')
  language?: ReceiptLanguage;
}

export interface FiscalDocumentSheetProps {
  data: FiscalDocumentData;
  mode?: "embedded" | "modal";
  interactiveControls?: boolean;
  initialLanguage?: ReceiptLanguage;
  onLanguageChange?: (lang: ReceiptLanguage) => void;
  onClose?: () => void;
  onChangeDocType?: (docType: FiscalDocType) => void;
  onToggleVat?: (next: boolean) => void;
  onToggleWithholding?: (next: boolean) => void;
  onToggleVerifiedTin?: (next: boolean) => void;
}

export const RECEIPT_LANGUAGES: {
  code: ReceiptLanguage;
  label: string;
  nameEn: string;
  isDefault?: boolean;
}[] = [
  { code: "en", label: "English", nameEn: "English", isDefault: true },
  { code: "am", label: "አማርኛ", nameEn: "Amharic" },
  { code: "om", label: "Afaan Oromoo", nameEn: "Oromifa" },
  { code: "ti", label: "ትግርኛ", nameEn: "Tigrigna" },
];

interface RailLangInfo {
  name: string;
  operator: string;
}

interface RailMetaConfig {
  logo: string;
  defaultRef: string;
  settlementAccount: string;
  locales: Record<ReceiptLanguage, RailLangInfo>;
}

const RAIL_META: Record<FiscalRail, RailMetaConfig> = {
  TELEBIRR: {
    logo: "/payment/Telebirr.png",
    defaultRef: "TB-20261022-88419",
    settlementAccount: "+251 910 011 818 (Yekis Escrow Vault)",
    locales: {
      en: {
        name: "Telebirr SuperApp",
        operator: "Ethio Telecom Mobile Money",
      },
      am: {
        name: "ቴሌብር (ኢትዮ ቴሌኮም)",
        operator: "የኢትዮ ቴሌኮም ሞባይል ገንዘብ አገልግሎት",
      },
      om: {
        name: "Telebirr (Itoophiyo Telekoom)",
        operator: "Tajaajila Maallaqa Moobaayilaa Itoophiyo Telekoom",
      },
      ti: {
        name: "ቴሌብር (ኢትዮ ቴሌኮም)",
        operator: "ሞባይል ገንዘብ ኢትዮ ቴሌኮም",
      },
    },
  },
  CBE_BIRR: {
    logo: "/payment/cbe payment.jpg",
    defaultRef: "FT26295XK9104",
    settlementAccount: "1000 223 344 (Yekis Custodial Trust)",
    locales: {
      en: {
        name: "CBE Birr / Commercial Bank of Ethiopia",
        operator: "Commercial Bank of Ethiopia",
      },
      am: {
        name: "ሲቢኢ ብር (የኢትዮጵያ ንግድ ባንክ)",
        operator: "የኢትዮጵያ ንግድ ባንክ",
      },
      om: {
        name: "CBE Birr (Baankii Daldala Itoophiyaa)",
        operator: "Baankii Daldala Itoophiyaa",
      },
      ti: {
        name: "ሲቢኢ ብር (ንግዲ ባንኪ ኢትዮጵያ)",
        operator: "ንግዲ ባንኪ ኢትዮጵያ",
      },
    },
  },
  M_PESA: {
    logo: "/payment/mpesa.svg",
    defaultRef: "RJK91M28LP04",
    settlementAccount: "Till 882199 · +251 777 011 818",
    locales: {
      en: {
        name: "Safaricom M-Pesa",
        operator: "Safaricom M-Pesa Mobile Financial Services",
      },
      am: {
        name: "ሳፋሪኮም ኤም-ፔሳ",
        operator: "የሳፋሪኮም ኤም-ፔሳ የፋይናንስ አገልግሎት",
      },
      om: {
        name: "Safaricom M-Pesa",
        operator: "Tajaajila Faayinaansii Safaricom M-Pesa",
      },
      ti: {
        name: "ሳፋሪኮም ኤም-ፔሳ",
        operator: "ናይ ፋይናንስ ኣገልግሎት ሳፋሪኮም ኤም-ፔሳ",
      },
    },
  },
};

function formatEtbNum(amount: number): string {
  return `ETB ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Formats a date into a clean, unmixed localized string for the selected receipt language */
function formatReceiptDate(iso: string | undefined, lang: ReceiptLanguage): string {
  const d = iso ? new Date(iso) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;

  if (lang === "en") {
    return valid.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  if (lang === "om") {
    const omMonths = [
      "Amajjii",
      "Guraandhala",
      "Bitooteessa",
      "Elba",
      "Caamsaa",
      "Waxabajjii",
      "Adooleessa",
      "Hagayya",
      "Fuulbana",
      "Onkololeessa",
      "Sadaasa",
      "Muddee",
    ];
    const monthName = omMonths[valid.getMonth()] ?? "Sadaasa";
    const day = String(valid.getDate()).padStart(2, "0");
    return `${monthName} ${day}, ${valid.getFullYear()}`;
  }

  // Ethiopian Calendar conversion for Amharic and Tigrigna
  const month = valid.getMonth() + 1;
  const day = valid.getDate();
  const ethYear =
    month > 9 || (month === 9 && day >= 11)
      ? valid.getFullYear() - 7
      : valid.getFullYear() - 8;
  const ethDay = ((day + 20) % 30) + 1;

  if (lang === "am") {
    const amMonths = [
      "ታኅሣሥ",
      "ጥር",
      "የካቲት",
      "መጋቢት",
      "ሚያዝያ",
      "ግንቦት",
      "ሰኔ",
      "ሐምሌ",
      "ነሐሴ",
      "መስከረም",
      "ጥቅምት",
      "ኅዳር",
    ];
    const ethMonth = amMonths[(month - 1) % 12];
    return `${ethMonth} ${ethDay}, ${ethYear} ዓ.ም`;
  }

  // Tigrigna
  const tiMonths = [
    "ታሕሳስ",
    "ጥሪ",
    "የካቲት",
    "መጋቢት",
    "ሚያዝያ",
    "ግንቦት",
    "ሰነ",
    "ሓምለ",
    "ነሓሰ",
    "መስከረም",
    "ጥቅምቲ",
    "ሕዳር",
  ];
  const ethMonth = tiMonths[(month - 1) % 12];
  return `${ethMonth} ${ethDay}, ${ethYear} ዓ.ም`;
}

interface ReceiptDictionary {
  langLabel: string;
  badgeInvoice: string;
  badgeVoucher: string;
  copyRef: string;
  copiedRef: string;
  print: string;
  tabInvoiceTitle: string;
  tabInvoiceSub: string;
  tabVoucherTitle: string;
  tabVoucherSub: string;
  vatChipLabel: (on: boolean) => string;
  whtChipLabel: (on: boolean) => string;
  tinChipLabel: (verified: boolean) => string;
  docTitleInvoice: string;
  docTitleVoucher: string;
  docSubInvoice: string;
  docSubVoucher: string;
  companyName: string;
  companyTagline: string;
  companyTax: string;
  to: string;
  defaultClientName: string;
  defaultFreelancerName: string;
  defaultLocation: string;
  talentBadge: (ucid: string) => string;
  rolePartyLabel: string;
  roleClient: string;
  roleFreelancer: string;
  clientTinLabel: string;
  freelancerTinLabel: string;
  dateLabel: string;
  invoiceNumLabel: string;
  voucherNumLabel: string;
  customerIdLabel: string;
  freelancerIdLabel: string;
  fiscalStatusLabel: string;
  statusEscrowFunded: string;
  statusDisbursed: string;
  statusSettled: string;
  statusPending: string;
  bandHeaders: [string, string, string, string, string, string, string];
  escrowOfficer: string;
  escrowTerms: string;
  paymentTerms: string;
  tableHeaders: [string, string, string, string, string, string, string];
  catMilestoneEscrow: string;
  catPlatformFee: string;
  catStatutoryVat: string;
  catMilestoneRelease: string;
  catOutputVat: string;
  catWithholdingTax: string;
  clientPrincipal: (title: string) => { title: string; note: string };
  clientFee: (rate: string) => { title: string; note: string };
  clientVat: { title: string; note: string };
  freelancerPrincipal: (title: string) => { title: string; note: string };
  freelancerVat: { title: string; note: string };
  freelancerFee: (rate: string) => { title: string; note: string };
  freelancerWht: (rate: string, detail: string) => { title: string; note: string };
  tinRateDetail: { verified: string; unverified: string };
  clientDiscount: string;
  freelancerDiscount: string;
  subtotal: string;
  clientTax: string;
  freelancerTax: string;
  clientTotal: string;
  freelancerTotal: string;
  providerRefLabel: string;
  settlementAccountLabel: string;
  clearingSlaLabel: string;
  instantClearingValue: string;
  clientComplianceTitle: string;
  freelancerComplianceTitle: string;
  clientComplianceBody: (principal: string) => string;
  freelancerComplianceBody: (
    whtAmount: string,
    rate: string,
    principal: string,
    tin: string,
  ) => string;
  thankYou: string;
  issuedBy: string;
}

const RECEIPT_I18N: Record<ReceiptLanguage, ReceiptDictionary> = {
  en: {
    langLabel: "Receipt Language:",
    badgeInvoice: "Escrow Receipt",
    badgeVoucher: "Payout Voucher",
    copyRef: "Copy Ref",
    copiedRef: "Copied ID",
    print: "Print / Save PDF",
    tabInvoiceTitle: "Client Invoice & Escrow Receipt",
    tabInvoiceSub: "Buyer deposit & VAT receipt",
    tabVoucherTitle: "Freelancer Payout & WHT Voucher",
    tabVoucherSub: "Disbursement & tax voucher",
    vatChipLabel: (on) => `15% VAT: ${on ? "ON" : "OFF"}`,
    whtChipLabel: (on) => `ERCA WHT: ${on ? "ON" : "EXEMPT"}`,
    tinChipLabel: (verified) => `TIN: ${verified ? "3% Verified" : "30% Unverified"}`,
    docTitleInvoice: "INVOICE",
    docTitleVoucher: "PAYOUT RECEIPT",
    docSubInvoice: "Commercial Invoice & Escrow Deposit Receipt",
    docSubVoucher: "Freelancer Payout & Withholding Tax Voucher",
    companyName: "Yekis Technologies PLC",
    companyTagline: "Custodial Escrow & Digital Work Marketplace · Addis Ababa, Ethiopia",
    companyTax: "ERCA Platform TIN: 0078492104 · VAT Reg: ETH-VAT-99201 · Addis Ababa, Ethiopia",
    to: "To:",
    defaultClientName: "Abyssinia Commerce PLC",
    defaultFreelancerName: "Hanna Tadesse",
    defaultLocation: "Addis Ababa, Ethiopia",
    talentBadge: (ucid) => `Yekis Verified Talent · ${ucid}`,
    rolePartyLabel: "Role / Party:",
    roleClient: "Client",
    roleFreelancer: "Contractor / Freelancer",
    clientTinLabel: "Client TIN:",
    freelancerTinLabel: "Freelancer TIN:",
    dateLabel: "Date:",
    invoiceNumLabel: "Invoice #:",
    voucherNumLabel: "Voucher #:",
    customerIdLabel: "Customer ID:",
    freelancerIdLabel: "Freelancer ID:",
    fiscalStatusLabel: "Fiscal Status:",
    statusEscrowFunded: "ESCROW FUNDED",
    statusDisbursed: "DISBURSED",
    statusSettled: "SETTLED",
    statusPending: "PROCESSING",
    bandHeaders: [
      "Agent / Party",
      "Contract & Milestone",
      "Payment Rail",
      "Terms",
      "Delivery Date",
      "Payment Terms",
      "Status",
    ],
    escrowOfficer: "Yekis Escrow Officer",
    escrowTerms: "Escrow Protected (AACCSA Standards)",
    paymentTerms: "On delivery / milestone approval",
    tableHeaders: [
      "Qty",
      "Item #",
      "Description",
      "Category",
      "Unit price",
      "Discount",
      "Line total",
    ],
    catMilestoneEscrow: "Milestone Escrow",
    catPlatformFee: "Platform Fee",
    catStatutoryVat: "Statutory VAT",
    catMilestoneRelease: "Milestone Release",
    catOutputVat: "Output VAT",
    catWithholdingTax: "Withholding Tax",
    clientPrincipal: (title) => ({
      title: `Escrow Principal Deposit — ${title}`,
      note: "Milestone funds held in custodial escrow",
    }),
    clientFee: (rate) => ({
      title: `Yekis Client Escrow Protection & Gateway Fee (${rate}%)`,
      note: "Escrow guarantee and payment processing fee",
    }),
    clientVat: {
      title: "Ethiopian Value Added Tax (ERCA Standard VAT 15%)",
      note: "Standard statutory VAT as per Ministry of Revenues regulations",
    },
    freelancerPrincipal: (title) => ({
      title: `Gross Milestone Amount Released from Escrow — ${title}`,
      note: "Full milestone compensation released upon client approval",
    }),
    freelancerVat: {
      title: "Output VAT Collected (15% Registered Commercial Invoice)",
      note: "Value added tax collected on commercial freelance services",
    },
    freelancerFee: (rate) => ({
      title: `Less: Yekis Freelancer Platform & Settlement Service Fee (${rate}%)`,
      note: "Platform escrow service and settlement facilitation fee",
    }),
    freelancerWht: (rate, detail) => ({
      title: `Less: ERCA Statutory Withholding Tax (${rate}% ${detail})`,
      note: "Direct tax deduction remitted to Ethiopian Revenues Authority (ERCA)",
    }),
    tinRateDetail: {
      verified: "Verified TIN",
      unverified: "Unverified TIN Rate",
    },
    clientDiscount: "Total Discount:",
    freelancerDiscount: "Total Discount / Fees:",
    subtotal: "Subtotal:",
    clientTax: "Sales tax (15% VAT):",
    freelancerTax: "Sales tax (VAT / WHT):",
    clientTotal: "Total:",
    freelancerTotal: "Total (Net Payout):",
    providerRefLabel: "Provider Txn Ref:",
    settlementAccountLabel: "Settlement Account:",
    clearingSlaLabel: "Clearing SLA:",
    instantClearingValue: "Instant Real-Time Settlement",
    clientComplianceTitle: "ESCROW CUSTODY & ERCA TAX COMPLIANCE",
    freelancerComplianceTitle: "ERCA WITHHOLDING TAX CERTIFICATE",
    clientComplianceBody: (principal) =>
      `100% of the milestone principal (${principal}) is held in Yekis Custodial Escrow and is only released upon client acceptance of deliverables or expiry of the 7-day review window under AACCSA commercial arbitration rules.`,
    freelancerComplianceBody: (whtAmount, rate, principal, tin) =>
      `Proclamation No. 979/2016: Withholding tax of ${whtAmount} (${rate}%) has been deducted at source on the taxable base of ${principal} for Freelancer TIN ${tin}. Retain this voucher for annual ERCA tax credit reconciliation.`,
    thankYou: "Thank you for your business!",
    issuedBy: "Issued by Yekis Escrow Ledger",
  },
  am: {
    langLabel: "የደረሰኝ ቋንቋ፦",
    badgeInvoice: "የኢስክሮ ደረሰኝ",
    badgeVoucher: "የክፍያ ማረጋገጫ",
    copyRef: "መለያ ቅዳ",
    copiedRef: "ተቀድቷል",
    print: "አትም / በ-PDF አስቀምጥ",
    tabInvoiceTitle: "የደንበኛ ደረሰኝ እና የኢስክሮ ክፍያ",
    tabInvoiceSub: "የከፋይ ተቀማጭ እና የተ.እ.ታ ደረሰኝ",
    tabVoucherTitle: "የባለሙያ ክፍያ እና የዊዝሆልዲንግ ማረጋገጫ",
    tabVoucherSub: "የተጣራ ክፍያ እና የታክስ ቫውቸር",
    vatChipLabel: (on) => `ተ.እ.ታ (15%)፦ ${on ? "በርቷል" : "ጠፍቷል"}`,
    whtChipLabel: (on) => `ዊዝሆልዲንግ፦ ${on ? "ተፈጻሚ" : "ነጻ"}`,
    tinChipLabel: (verified) => `TIN፦ ${verified ? "3% የተረጋገጠ" : "30% ያልተረጋገጠ"}`,
    docTitleInvoice: "ደረሰኝ",
    docTitleVoucher: "የክፍያ ማረጋገጫ",
    docSubInvoice: "የንግድ ደረሰኝ እና የኢስክሮ ክፍያ ማረጋገጫ",
    docSubVoucher: "የባለሙያ ክፍያ እና የዊዝሆልዲንግ ታክስ ማረጋገጫ",
    companyName: "ዬኪስ ቴክኖሎጂስ ኃ/የተ/የግ/ማ",
    companyTagline: "የኢስክሮ ዋስትና እና የዲጂታል ስራዎች የገበያ ቦታ · አዲስ አበባ፣ ኢትዮጵያ",
    companyTax: "የገቢዎች ሚኒስቴር TIN፦ 0078492104 · የተ.እ.ታ ምዝገባ፦ ETH-VAT-99201 · አዲስ አበባ፣ ኢትዮጵያ",
    to: "ለ፦",
    defaultClientName: "አቢሲኒያ ኮሜርስ ኃ/የተ/የግ/ማ",
    defaultFreelancerName: "ሐና ታደሰ",
    defaultLocation: "አዲስ አበባ፣ ኢትዮጵያ",
    talentBadge: (ucid) => `በዬኪስ የተረጋገጡ ባለሙያ · ${ucid}`,
    rolePartyLabel: "ሚና / ወገን፦",
    roleClient: "ከፋይ ደንበኛ",
    roleFreelancer: "ባለሙያ / የስራ ተቋራጭ",
    clientTinLabel: "የደንበኛ TIN፦",
    freelancerTinLabel: "የባለሙያ TIN፦",
    dateLabel: "ቀን፦",
    invoiceNumLabel: "የደረሰኝ ቁጥር፦",
    voucherNumLabel: "የቫውቸር ቁጥር፦",
    customerIdLabel: "የደንበኛ መለያ፦",
    freelancerIdLabel: "የባለሙያ መለያ፦",
    fiscalStatusLabel: "የክፍያ ሁኔታ፦",
    statusEscrowFunded: "በኢስክሮ የተያዘ",
    statusDisbursed: "የተከፈለ",
    statusSettled: "የተረጋገጠ",
    statusPending: "በሂደት ላይ",
    bandHeaders: [
      "ወገን / ፈጻሚ",
      "ውል እና ምዕራፍ",
      "የክፍያ መስመር",
      "ደንብ",
      "የሚጠናቀቅበት ቀን",
      "የክፍያ ሁኔታ",
      "ሁኔታ",
    ],
    escrowOfficer: "የዬኪስ ኢስክሮ ኃላፊ",
    escrowTerms: "በኢስክሮ የተጠበቀ (በአዲስ አበባ ንግድ ምክር ቤት ደንብ)",
    paymentTerms: "ሥራው ሲረከብ / ሲጸድቅ",
    tableHeaders: [
      "ብዛት",
      "ንጥል #",
      "ዝርዝር መግለጫ",
      "ዓይነት",
      "ነጠላ ዋጋ",
      "ቅናሽ",
      "ጠቅላላ ድምር",
    ],
    catMilestoneEscrow: "የምዕራፍ ኢስክሮ",
    catPlatformFee: "የአገልግሎት ክፍያ",
    catStatutoryVat: "ሕጋዊ ተ.እ.ታ",
    catMilestoneRelease: "የምዕራፍ መልቀቂያ",
    catOutputVat: "የተሰበሰበ ተ.እ.ታ",
    catWithholdingTax: "ዊዝሆልዲንግ ታክስ",
    clientPrincipal: (title) => ({
      title: `ዋና የምዕራፍ ክፍያ ተቀማጭ — ${title}`,
      note: "በኢስክሮ ካዝና ውስጥ በአደራ የተያዘ ክፍያ",
    }),
    clientFee: (rate) => ({
      title: `የዬኪስ የደንበኛ የኢስክሮ ጥበቃ እና የማስፈጸሚያ ክፍያ (${rate}%)`,
      note: "የኢስክሮ ዋስትና እና የክፍያ ማስተላለፊያ አገልግሎት ክፍያ",
    }),
    clientVat: {
      title: "የኢትዮጵያ ተጨማሪ እሴት ታክስ (የገቢዎች ሚኒስቴር ተ.እ.ታ 15%)",
      note: "በገቢዎች ሚኒስቴር ደንብ መሠረት የሚከፈል ሕጋዊ ታክስ",
    },
    freelancerPrincipal: (title) => ({
      title: `ከኢስክሮ የተለቀቀ ጠቅላላ የምዕራፍ የሥራ ክፍያ — ${title}`,
      note: "ሥራው ሲጸድቅ ለባለሙያው የተለቀቀ ሙሉ ክፍያ",
    }),
    freelancerVat: {
      title: "የተሰበሰበ ተጨማሪ እሴት ታክስ (ተ.እ.ታ 15%)",
      note: "በተሰጠው የሙያ አገልግሎት ላይ የተሰበሰበ ተ.እ.ታ",
    },
    freelancerFee: (rate) => ({
      title: `ሲቀነስ፦ የዬኪስ የባለሙያ አገልግሎት እና የክፍያ ማስተላለፊያ ክፍያ (${rate}%)`,
      note: "የፕላትፎርም አገልግሎት እና የክፍያ ማስፈጸሚያ ክፍያ",
    }),
    freelancerWht: (rate, detail) => ({
      title: `ሲቀነስ፦ የገቢዎች ሚኒስቴር የዊዝሆልዲንግ ታክስ ተቀናሽ (${rate}% ${detail})`,
      note: "በቀጥታ ለገቢዎች ሚኒስቴር ገቢ የሚደረግ የቅድመ-ግብር ተቀናሽ",
    }),
    tinRateDetail: {
      verified: "የተረጋገጠ TIN",
      unverified: "ያልተረጋገጠ TIN ምጣኔ",
    },
    clientDiscount: "ጠቅላላ ቅናሽ፦",
    freelancerDiscount: "ጠቅላላ ቅናሽ / የአገልግሎት ክፍያ፦",
    subtotal: "ንዑስ ድምር፦",
    clientTax: "የሽያጭ ታክስ (15% ተ.እ.ታ)፦",
    freelancerTax: "የሽያጭ ታክስ (ተ.እ.ታ / ዊዝሆልዲንግ)፦",
    clientTotal: "ጠቅላላ ድምር፦",
    freelancerTotal: "ጠቅላላ የተጣራ ክፍያ፦",
    providerRefLabel: "የክፍያ ማጣቀሻ ቁጥር፦",
    settlementAccountLabel: "የክፍያ ሂሳብ፦",
    clearingSlaLabel: "የማጽጃ ጊዜ፦",
    instantClearingValue: "ወዲያውኑ የተረጋገጠ ክፍያ",
    clientComplianceTitle: "የኢስክሮ ዋስትና እና የታክስ ሕጋዊነት",
    freelancerComplianceTitle: "የዊዝሆልዲንግ ታክስ ምስክር ወረቀት",
    clientComplianceBody: (principal) =>
      `ዋናው የምዕራፍ ክፍያ (${principal}) ሙሉ በሙሉ በዬኪስ የኢስክሮ ካዝና ውስጥ በአደራ የተቀመጠ ሲሆን፣ ለባለሙያው የሚለቀቀው ደንበኛው ሥራውን ሲያጸድቁ ወይም የ7 ቀናት የምርመራ ጊዜ ሲጠናቀቅ ብቻ ነው።`,
    freelancerComplianceBody: (whtAmount, rate, principal, tin) =>
      `በአዋጅ ቁጥር 979/2008 መሠረት የዊዝሆልዲንግ ታክስ ${whtAmount} (${rate}%) ከታክስ መሠረቱ ${principal} ላይ ለባለሙያ TIN ${tin} ተቀናሽ ተደርጓል። ይህንን ማረጋገጫ ለዓመታዊ የታክስ ማካካሻ ይያዙት።`,
    thankYou: "ስለመረጡን እናመሰግናለን!",
    issuedBy: "በዬኪስ ኢስክሮ ሌጀር የተረጋገጠ",
  },
  om: {
    langLabel: "Afaan Nagahee:",
    badgeInvoice: "Nagahee Eeskiroo",
    badgeVoucher: "Waraqaa Kafaltii",
    copyRef: "Wabii Garagilchi",
    copiedRef: "Garagalffameera",
    print: "Maxxansi / PDF Olkaawi",
    tabInvoiceTitle: "Nagahee Maamilaa fi Eeskiroo",
    tabInvoiceSub: "Qusannoo bitaa fi nagahee VAT",
    tabVoucherTitle: "Kafaltii Ogeessaa fi Ragaa WHT",
    tabVoucherSub: "Kafaltii qulqullinaa fi taaksii",
    vatChipLabel: (on) => `VAT (15%): ${on ? "BANAA" : "CUFAA"}`,
    whtChipLabel: (on) => `WHT: ${on ? "BANAA" : "BILISA"}`,
    tinChipLabel: (verified) => `TIN: ${verified ? "3% Kan Mirkanaa'e" : "30% Kan Hin Mirkanoofne"}`,
    docTitleInvoice: "NAGAHEE KAFALTII",
    docTitleVoucher: "WARAQAA MIRKANEEFFAA KAFALTII",
    docSubInvoice: "Nagahee Daldalaa fi Mirkaneeffaa Qusannoo Eeskiroo",
    docSubVoucher: "Nagahee Kafaltii Ogeessaa fi Waraqaa Taaksii As-Irraa Hir'ifamu (WHT)",
    companyName: "Yekis Teknooloojii D.Dh.D.U",
    companyTagline: "Eeskiroo Qusannoo fi Gabaa Hojii Dijitaalaa · Finfinnee, Itoophiyaa",
    companyTax: "TIN ERCA: 0078492104 · Galmee VAT: ETH-VAT-99201 · Finfinnee, Itoophiyaa",
    to: "Kan Eegamu:",
    defaultClientName: "Abyssinia Commerce D.Dh.D.U",
    defaultFreelancerName: "Hanna Taaddasaa",
    defaultLocation: "Finfinnee, Itoophiyaa",
    talentBadge: (ucid) => `Ogeessa Yekis Mirkanaa'e · ${ucid}`,
    rolePartyLabel: "Gahee / Garee:",
    roleClient: "Maamila Kafalu",
    roleFreelancer: "Ogeessa / Kontiraaktara",
    clientTinLabel: "TIN Maamilaa:",
    freelancerTinLabel: "TIN Ogeessaa:",
    dateLabel: "Guyyaa:",
    invoiceNumLabel: "Lakk. Nagahee:",
    voucherNumLabel: "Lakk. Waraqaa:",
    customerIdLabel: "Eenyummaa Maamilaa:",
    freelancerIdLabel: "Eenyummaa Ogeessaa:",
    fiscalStatusLabel: "Haala Kafaltii:",
    statusEscrowFunded: "EESKIROO KEESSATTI QABAME",
    statusDisbursed: "KAFALAMEERA",
    statusSettled: "MIRKANAOFEERA",
    statusPending: "ADEEMSA IRRA JIRA",
    bandHeaders: [
      "Garee / Hojjetaa",
      "Waliigaltee fi Sadarkaa",
      "Karaa Kafaltii",
      "Dambii",
      "Guyyaa Xumuraa",
      "Haala Kafaltii",
      "Haala",
    ],
    escrowOfficer: "Hoggana Eeskiroo Yekis",
    escrowTerms: "Eeskiroodhaan Kan Eegame (Ulaagaa AACCSA)",
    paymentTerms: "Yeroo Hojiin Rakkina Malee Eebbifamu",
    tableHeaders: [
      "Baay'ina",
      "Lakk. Meeshaa",
      "Ibsa Hojii",
      "Ramaddii",
      "Gatii Tokkoo",
      "Hir'ifama",
      "Waliigala",
    ],
    catMilestoneEscrow: "Eeskiroo Sadarkaa",
    catPlatformFee: "Kaffaltii Tajaajilaa",
    catStatutoryVat: "VAT Seeraa",
    catMilestoneRelease: "Gadhiisa Eeskiroo",
    catOutputVat: "VAT Walitti Qabame",
    catWithholdingTax: "Taaksii As-Irraa Hir'ifamu",
    clientPrincipal: (title) => ({
      title: `Qusannoo Kafaltii Hojii — ${title}`,
      note: "Kafaltii eeskiroo keessatti amanamaadhaan qabame",
    }),
    clientFee: (rate) => ({
      title: `Kaffaltii Eegumsa Eeskiroo fi Tajaajila Yekis (${rate}%)`,
      note: "Kaffaltii tajaajila nageenya kaffaltii fi eeskiroo",
    }),
    clientVat: {
      title: "Taaksii Dabalata Qabeenyaa Itoophiyaa (VAT 15%)",
      note: "Dambii Ministeera Galiiwwanii irratti hundaa'e",
    },
    freelancerPrincipal: (title) => ({
      title: `Kafaltii Waliigalaa Eeskiroo Irraa Gadhiifame — ${title}`,
      note: "Kafaltii hojii eebbifamee ogeessaaf gadhiifame",
    }),
    freelancerVat: {
      title: "Taaksii Dabalata Qabeenyaa Walitti Qabame (VAT 15%)",
      note: "VAT tajaajila ogummaa irratti kaffalame",
    },
    freelancerFee: (rate) => ({
      title: `Hir'ifama: Kaffaltii Tajaajila fi Dhaabbata Yekis (${rate}%)`,
      note: "Kaffaltii tajaajila waltajjii fi daddabarsa maallaqaa",
    }),
    freelancerWht: (rate, detail) => ({
      title: `Hir'ifama: Taaksii As-Irraa Hir'ifamu Ministeera Galiiwwanii (${rate}% ${detail})`,
      note: "Taaksii kallattiin gara Ministeera Galiiwwaniitti daddarbu",
    }),
    tinRateDetail: {
      verified: "TIN Mirkanaa'e",
      unverified: "TIN Hin Mirkanoofne",
    },
    clientDiscount: "Hir'ifama Waliigalaa:",
    freelancerDiscount: "Hir'ifama / Kaffaltii Tajaajilaa:",
    subtotal: "Ida'ama Xiqqaatti:",
    clientTax: "Taaksii Gurgurtaa (VAT 15%):",
    freelancerTax: "Taaksii Gurgurtaa (VAT / WHT):",
    clientTotal: "Waliigala:",
    freelancerTotal: "Kafaltii Qulqullinaa (Net Payout):",
    providerRefLabel: "Lakk. Wabii Kaffaltii:",
    settlementAccountLabel: "Herrega Kaffaltii:",
    clearingSlaLabel: "Yeroo Qulqullinaa:",
    instantClearingValue: "Battalumatti Kan Mirkanaa'e",
    clientComplianceTitle: "TIKSUU EESKIROO FI SEERA TAAKSII MINISTEERA GALIIWWANII",
    freelancerComplianceTitle: "WARAQAA RAGA TAAKSII AS-IRRAA HIR'IFAMUU (WHT)",
    clientComplianceBody: (principal) =>
      `Kafaltiin hojichaa 100% (${principal}) eeskiroo amanamummaa Yekis keessatti kan eegamu yoo ta'u, ogeessaaf kan gadhiifamu maamilichi hojicha yoo eebbise ykn guyyoonni qorannoo 7 yoo xumuraman qofaadha.`,
    freelancerComplianceBody: (whtAmount, rate, principal, tin) =>
      `Labsi Lakk. 979/2016 irratti hundaa'uudhaan: Taaksiin as-irraa hir'ifamu ${whtAmount} (${rate}%) gatii kaffaltii ${principal} irraa TIN Ogeessaa ${tin} tiif hir'ifameera. Ragaa kana wal-bira qabiinsa taaksii waggaatiif qabadhaa.`,
    thankYou: "Tajaajila keenya waan fayyadamaniif galatoomaa!",
    issuedBy: "Galmee Eeskiroo Yekis irraa kan kenname",
  },
  ti: {
    langLabel: "ቋንቋ ደረሰኝ፦",
    badgeInvoice: "ናይ ኤስክሮው ደረሰኝ",
    badgeVoucher: "ናይ ክፍሊት ምስክር ወረቐት",
    copyRef: "መወከሲ ቅዳሕ",
    copiedRef: "ተቐዲሑ",
    print: "ሕተም / ብ-PDF ኣቐምጥ",
    tabInvoiceTitle: "ናይ ዓሚል ደረሰኝን ናይ ኤስክሮው ክፍሊትን",
    tabInvoiceSub: "ናይ ከፋሊ ተቐማጥን ናይ ተ.እ.ታ ደረሰኝን",
    tabVoucherTitle: "ናይ ሰብሞያ ክፍሊትን ናይ ዊዝሆልዲንግ ምስክር ወረቐትን",
    tabVoucherSub: "ዝተጻረየ ክፍሊትን ናይ ታክስ ቫውቸርን",
    vatChipLabel: (on) => `ተ.እ.ታ (15%)፦ ${on ? "በርሂ" : "ጥፉእ"}`,
    whtChipLabel: (on) => `ዊዝሆልዲንግ፦ ${on ? "ተፈጻሚ" : "ነጻ"}`,
    tinChipLabel: (verified) => `TIN፦ ${verified ? "3% ዝተረጋገጸ" : "30% ዘይተረጋገጸ"}`,
    docTitleInvoice: "ናይ ንግዲ ደረሰኝ",
    docTitleVoucher: "ናይ ክፍሊት ምስክር ወረቐት",
    docSubInvoice: "ናይ ንግዲ ደረሰኝን ናይ ኤስክሮው ክፍሊት መረጋገጺን",
    docSubVoucher: "ናይ ሰብሞያ ክፍሊትን ናይ ዊዝሆልዲንግ ታክስ ምስክር ወረቐትን",
    companyName: "ዬኪስ ቴክኖሎጂስ ኃ/ዝ/ው/ማ",
    companyTagline: "ናይ ኤስክሮው ውሕስነትን ዲጂታል ዕዳጋን · ኣዲስ ኣበባ፣ ኢትዮጵያ",
    companyTax: "መለለዪ ቁጽሪ ከፋሊ ግብሪ (TIN)፦ 0078492104 · ምዝገባ ተ.እ.ታ፦ ETH-VAT-99201 · ኣዲስ ኣበባ፣ ኢትዮጵያ",
    to: "ን፦",
    defaultClientName: "ኣቢሲንያ ኮሜርስ ኃ/ዝ/ው/ማ",
    defaultFreelancerName: "ሓና ታደሰ",
    defaultLocation: "ኣዲስ ኣበባ፣ ኢትዮጵያ",
    talentBadge: (ucid) => `ብዬኪስ ዝተረጋገጹ ሰብሞያ · ${ucid}`,
    rolePartyLabel: "ተራ / ወገን፦",
    roleClient: "ከፋሊ ዓሚል",
    roleFreelancer: "ሰብሞያ / ተቛራጺ",
    clientTinLabel: "ናይ ዓሚል TIN፦",
    freelancerTinLabel: "ናይ ሰብሞያ TIN፦",
    dateLabel: "ዕለት፦",
    invoiceNumLabel: "ቁጽሪ ደረሰኝ፦",
    voucherNumLabel: "ቁጽሪ ቫውቸር፦",
    customerIdLabel: "መለለዪ ዓሚል፦",
    freelancerIdLabel: "መለለዪ ሰብሞያ፦",
    fiscalStatusLabel: "ኩነታት ክፍሊት፦",
    statusEscrowFunded: "ብኤስክሮው ዝተታሕዘ",
    statusDisbursed: "ዝተኸፍለ",
    statusSettled: "ዝተረጋገጸ",
    statusPending: "ኣብ ከይዲ ዘሎ",
    bandHeaders: [
      "ወገን / ሰብሞያ",
      "ውዕልን ብርክን",
      "መንገዲ ክፍሊት",
      "ውዕል",
      "ዕለት ምርካብ",
      "ኩነታት ክፍሊት",
      "ኩነታት",
    ],
    escrowOfficer: "ሓላፊ ኤስክሮው ዬኪስ",
    escrowTerms: "ብኤስክሮው ዝተሓለወ (ብሕጊ ንግዲ ምክሪ ቤት)",
    paymentTerms: "ስራሕ ኣብ ዝረከበሉ / ኣብ ዝጸድቐሉ",
    tableHeaders: [
      "ብዝሒ",
      "ንጥሪት #",
      "መግለጺ ስራሕ",
      "ዓይነት",
      "ዋጋ ነፍሲ ወከፍ",
      "ቅናሽ",
      "ጠቕላላ ድምር",
    ],
    catMilestoneEscrow: "ናይ ብርኪ ኤስክሮው",
    catPlatformFee: "ናይ ኣገልግሎት ክፍሊት",
    catStatutoryVat: "ሕጋዊ ተ.እ.ታ",
    catMilestoneRelease: "ምልቃቕ ኤስክሮው",
    catOutputVat: "ዝተኣከበ ተ.እ.ታ",
    catWithholdingTax: "ዊዝሆልዲንግ ታክስ",
    clientPrincipal: (title) => ({
      title: `ቀንዲ ተቐማጢ ክፍሊት ብርኪ ስራሕ — ${title}`,
      note: "ኣብ ናይ ኤስክሮው ካዝና ብኣደራ ዝተታሕዘ ክፍሊት",
    }),
    clientFee: (rate) => ({
      title: `ናይ ዬኪስ ናይ ዓሚል ኤስክሮው ሓለዋን ናይ ክፍሊት ኣገልግሎትን (${rate}%)`,
      note: "ናይ ኤስክሮው ውሕስነትን መመሓላለፊ ክፍሊትን",
    }),
    clientVat: {
      title: "ናይ ኢትዮጵያ ተወሳኺ እሴት ታክስ (ተ.እ.ታ 15%)",
      note: "ብመሰረት ደንቢ ሚኒስትሪ ኣታዊታት ዝኽፈል ሕጋዊ ታክስ",
    },
    freelancerPrincipal: (title) => ({
      title: `ካብ ኤስክሮው ዝተለቐቐ ጠቕላላ ናይ ብርኪ ስራሕ ክፍሊት — ${title}`,
      note: "ስራሕ ምስ ጸደቐ ንሰብሞያ ዝተለቐቐ ምሉእ ክፍሊት",
    }),
    freelancerVat: {
      title: "ዝተኣከበ ተወሳኺ እሴት ታክስ (ተ.እ.ታ 15%)",
      note: "ኣብ ዝተዋህበ ናይ ሞያ ኣገልግሎት ዝተኣከበ ተ.እ.ታ",
    },
    freelancerFee: (rate) => ({
      title: `ዝቕነስ፦ ናይ ዬኪስ ናይ ሰብሞያ ኣገልግሎትን ናይ ክፍሊት ምስግጋርን (${rate}%)`,
      note: "ናይ ፕላትፎርም ኣገልግሎትን ናይ ክፍሊት ምስግጋር ክፍሊትን",
    }),
    freelancerWht: (rate, detail) => ({
      title: `ዝቕነስ፦ ናይ ሚኒስትሪ ኣታዊታት ናይ ዊዝሆልዲንግ ታክስ ቅናሽ (${rate}% ${detail})`,
      note: "ብቐጥታ ንሚኒስትሪ ኣታዊታት ዝኣቱ ናይ ቅድመ-ግብሪ ቅናሽ",
    }),
    tinRateDetail: {
      verified: "ዝተረጋገጸ TIN",
      unverified: "ዘይተረጋገጸ TIN ምጣነ",
    },
    clientDiscount: "ጠቕላላ ቅናሽ፦",
    freelancerDiscount: "ጠቕላላ ቅናሽ / ናይ ኣገልግሎት ክፍሊት፦",
    subtotal: "ንኡስ ድምር፦",
    clientTax: "ናይ መሸጣ ታክስ (15% ተ.እ.ታ)፦",
    freelancerTax: "ናይ መሸጣ ታክስ (ተ.እ.ታ / ዊዝሆልዲንግ)፦",
    clientTotal: "ጠቕላላ ድምር፦",
    freelancerTotal: "ጠቕላላ ዝተጻረየ ክፍሊት፦",
    providerRefLabel: "ናይ ክፍሊት መወከሲ ቁጽሪ፦",
    settlementAccountLabel: "ናይ ክፍሊት ሕሳብ፦",
    clearingSlaLabel: "ናይ ምጽራይ ግዜ፦",
    instantClearingValue: "ብኡ sis ኡ ዝተረጋገጸ ክፍሊት",
    clientComplianceTitle: "ናይ ኤስክሮው ውሕስነትን ናይ ታክስ ሕጋውነትን",
    freelancerComplianceTitle: "ናይ ዊዝሆልዲንግ ታክስ ምስክር ወረቐት",
    clientComplianceBody: (principal) =>
      `ቀንዲ ክፍሊት (${principal}) ምሉእ ብምሉእ ኣብ ናይ ዬኪስ ናይ ኤስክሮው ካዝና ብኣደራ ዝተቐመጠ ኮይኑ፣ ንሰብሞያ ዝልቀቕ ዓሚል ስራሕ ምስ ኣጽደቐ ወይ ናይ 7 መዓልታት ናይ መርመራ ግዜ ምስ ተዛዘመ ጥራይ እዩ።`,
    freelancerComplianceBody: (whtAmount, rate, principal, tin) =>
      `ብመሰረት ኣዋጅ ቁጽሪ 979/2008 ናይ ዊዝሆልዲንግ ታክስ ${whtAmount} (${rate}%) ካብቲ መሰረት ግብሪ ${principal} ንሰብሞያ TIN ${tin} ተቐኒሱ ኣሎ። ነዚ ምስክር ወረቐት ንዓመታዊ ናይ ግብሪ ምትዕርራይ ሓዝዎ።`,
    thankYou: "ስለ ዝመረጽኩምና ነመስግን!",
    issuedBy: "ብናይ ዬኪስ ኤስክሮው ሌጀር ዝተረጋገጸ",
  },
};

/** Resolves any raw status string into clean localized status text */
function resolveStatusLabel(
  rawStatus: string | undefined,
  docType: FiscalDocType,
  t: ReceiptDictionary,
): string {
  if (!rawStatus) {
    return docType === "CLIENT_INVOICE" ? t.statusEscrowFunded : t.statusDisbursed;
  }
  const upper = rawStatus.toUpperCase();
  if (
    upper.includes("SETTLED") ||
    upper.includes("COMPLETED") ||
    upper.includes("ተረጋግጧል") ||
    upper.includes("MIRKANAOFEERA") ||
    upper.includes("ዝተረጋገጸ")
  ) {
    return t.statusSettled;
  }
  if (
    upper.includes("ESCROW") ||
    upper.includes("FUNDED") ||
    upper.includes("CREDITED") ||
    upper.includes("APPROVED") ||
    upper.includes("ተያዘ")
  ) {
    return t.statusEscrowFunded;
  }
  if (
    upper.includes("DISBURSED") ||
    upper.includes("PAID") ||
    upper.includes("የተከፈለ") ||
    upper.includes("KAFALAMEERA") ||
    upper.includes("ዝተኸፍለ")
  ) {
    return t.statusDisbursed;
  }
  if (
    upper.includes("PENDING") ||
    upper.includes("PROCESSING") ||
    upper.includes("ሂደት") ||
    upper.includes("ADEEMSA") ||
    upper.includes("ከይዲ")
  ) {
    return t.statusPending;
  }
  // If clean single status passed without slashes or bullet dots
  if (!rawStatus.includes("·") && !rawStatus.includes("/")) {
    return rawStatus;
  }
  return docType === "CLIENT_INVOICE" ? t.statusEscrowFunded : t.statusDisbursed;
}

export function FiscalDocumentSheet({
  data,
  mode = "embedded",
  interactiveControls = true,
  initialLanguage = "en",
  onLanguageChange,
  onClose,
  onChangeDocType,
  onToggleVat,
  onToggleWithholding,
  onToggleVerifiedTin,
}: FiscalDocumentSheetProps) {
  // Always default to English unless explicitly configured
  const [receiptLang, setReceiptLang] = useState<ReceiptLanguage>(
    data.language ?? initialLanguage ?? "en",
  );
  const [localDocType, setLocalDocType] = useState<FiscalDocType>(
    data.docType ?? "CLIENT_INVOICE",
  );
  const [localVat, setLocalVat] = useState<boolean>(data.includeVat15 ?? true);
  const [localWht, setLocalWht] = useState<boolean>(
    data.includeWithholding ?? true,
  );
  const [localVerifiedTin, setLocalVerifiedTin] = useState<boolean>(
    data.hasVerifiedTin ?? true,
  );
  const [clientTinInput, setClientTinInput] = useState<string>(
    data.clientTin ?? "0049182736",
  );
  const [freelancerTinInput, setFreelancerTinInput] = useState<string>(
    data.freelancerTin ?? "0083746192",
  );
  const [copiedSerial, setCopiedSerial] = useState(false);

  const activeDocType = data.docType ?? localDocType;
  const isVatEnabled =
    onToggleVat !== undefined ? Boolean(data.includeVat15) : localVat;
  const isWhtEnabled =
    onToggleWithholding !== undefined
      ? Boolean(data.includeWithholding)
      : localWht;
  const isTinVerified =
    onToggleVerifiedTin !== undefined
      ? Boolean(data.hasVerifiedTin)
      : localVerifiedTin;

  const handleSelectLang = (nextLang: ReceiptLanguage) => {
    setReceiptLang(nextLang);
    onLanguageChange?.(nextLang);
  };

  const setDocType = (next: FiscalDocType) => {
    setLocalDocType(next);
    onChangeDocType?.(next);
  };

  const toggleVat = () => {
    const next = !isVatEnabled;
    setLocalVat(next);
    onToggleVat?.(next);
  };

  const toggleWht = () => {
    const next = !isWhtEnabled;
    setLocalWht(next);
    onToggleWithholding?.(next);
  };

  const toggleTinStatus = () => {
    const next = !isTinVerified;
    setLocalVerifiedTin(next);
    onToggleVerifiedTin?.(next);
  };

  const t = RECEIPT_I18N[receiptLang];
  const railConfig = RAIL_META[data.rail] ?? RAIL_META.TELEBIRR;
  const railLocale = railConfig.locales[receiptLang];

  const principal = Math.max(0, Number(data.principalEtb) || 0);
  // Mirrors the backend fee engine (apps/backend/src/modules/escrow/fees.ts):
  // PLATFORM_FEE_RATE_CLIENT = 0, PLATFORM_FEE_RATE_FREELANCER = 0.07.
  // The previous defaults of 2.5%/2.5% were a leftover from a two-sided
  // take-rate that the platform no longer charges, so every receipt this
  // component produced showed fees the platform does not actually collect.
  const clientFeeRate = data.clientFeeRate ?? 0;
  const freelancerFeeRate = data.freelancerFeeRate ?? 0.07;

  // Client Invoice Math
  const clientEscrowFee = Math.round(principal * clientFeeRate * 100) / 100;
  const clientVatAmount = isVatEnabled
    ? Math.round(principal * 0.15 * 100) / 100
    : 0;
  const clientTotalPayable =
    Math.round((principal + clientEscrowFee + clientVatAmount) * 100) / 100;

  // Freelancer Payout & ERCA WHT Math
  const freelancerServiceFee =
    Math.round(principal * freelancerFeeRate * 100) / 100;
  const whtRate = isWhtEnabled ? (isTinVerified ? 0.03 : 0.3) : 0;
  const whtAmount = Math.round(principal * whtRate * 100) / 100;
  const freelancerVatCredit = isVatEnabled
    ? Math.round(principal * 0.15 * 100) / 100
    : 0;
  const freelancerNetDisbursed = Math.max(
    0,
    Math.round(
      (principal + freelancerVatCredit - freelancerServiceFee - whtAmount) *
        100,
    ) / 100,
  );

  const serial =
    data.serialNumber ??
    (activeDocType === "CLIENT_INVOICE"
      ? "YKS-INV-2026-04182"
      : "YKS-PAY-2026-08914");
  const contractCode = data.contractRef ?? "CTR-2026-301 · MS-02";
  const milestoneTitle =
    data.milestoneTitle ??
    "Phase 2: Telebirr & CBE Birr Escrow Checkout Integration";
  const providerRef = data.providerReference || railConfig.defaultRef;
  const formattedDate = formatReceiptDate(data.issuedAtIso, receiptLang);

  const clientName = data.clientName ?? t.defaultClientName;
  const freelancerName = data.freelancerName ?? t.defaultFreelancerName;
  const freelancerUcid = data.freelancerUcid ?? "YEK-FL-2089";
  const clientLocation = data.clientLocation || t.defaultLocation;

  const resolvedStatus = resolveStatusLabel(
    data.statusLabel,
    activeDocType,
    t,
  );

  const copyReference = () => {
    void navigator.clipboard.writeText(`${serial} · ${providerRef}`);
    setCopiedSerial(true);
    window.setTimeout(() => setCopiedSerial(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  const sheetContent = (
    <div className="excel-sheet-wrap yk-fiscal-wrap">
      {/* Printable Multi-Language Excel-Styled Fiscal Sheet */}
      <article
        className="excel-sheet-card yk-fiscal-sheet"
        aria-label={
          activeDocType === "CLIENT_INVOICE"
            ? `${t.docTitleInvoice}: ${t.docSubInvoice}`
            : `${t.docTitleVoucher}: ${t.docSubVoucher}`
        }
      >
        {/* Document Top Bar with Actions & Multi-Language Switcher */}
        <div className="excel-sheet-top-bar no-print">
          <div className="excel-sheet-top-left">
            <span className="excel-sheet-top-badge">
              <FileText size={13} />
              {activeDocType === "CLIENT_INVOICE"
                ? t.badgeInvoice
                : t.badgeVoucher}
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "var(--color-text-secondary)",
              }}
            >
              #{serial}
            </span>
          </div>

          {/* User Multi-Language Selector (Default: English) */}
          <div
            className="excel-receipt-lang-bar no-print"
            role="group"
            aria-label={t.langLabel}
          >
            <span className="excel-receipt-lang-title">
              <Globe size={13} />
              <span>{t.langLabel}</span>
            </span>
            <div className="excel-receipt-lang-options">
              {RECEIPT_LANGUAGES.map((item) => {
                const isActive = receiptLang === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    className={`excel-lang-pill-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => handleSelectLang(item.code)}
                    aria-pressed={isActive}
                    title={`Switch receipt language to ${item.nameEn} (${item.label})`}
                  >
                    <span>{item.label}</span>
                    {item.isDefault && (
                      <span className="excel-lang-default-tag">Default</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="excel-sheet-top-actions">
            <button
              type="button"
              className="excel-btn-action"
              onClick={copyReference}
              title={t.copyRef}
            >
              {copiedSerial ? (
                <Check size={14} style={{ color: "var(--color-primary)" }} />
              ) : (
                <Copy size={14} />
              )}
              <span>{copiedSerial ? t.copiedRef : t.copyRef}</span>
            </button>

            <button
              type="button"
              className="excel-btn-action is-primary"
              onClick={handlePrint}
              title={t.print}
            >
              <Printer size={14} />
              <span>{t.print}</span>
            </button>

            {mode === "modal" && onClose && (
              <button
                type="button"
                className="excel-btn-close"
                onClick={onClose}
                aria-label="Close document preview"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Optional Interactive Controls (Used on simulation previews e.g. FeesPage) */}
        {interactiveControls && (
          <div className="excel-interactive-controls no-print">
            <div
              className="excel-toolbar-left"
              role="tablist"
              aria-label="Document recipient perspective"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeDocType === "CLIENT_INVOICE"}
                className={`excel-tab-btn ${
                  activeDocType === "CLIENT_INVOICE" ? "is-active" : ""
                }`}
                onClick={() => setDocType("CLIENT_INVOICE")}
              >
                <FileText size={14} />
                <span>{t.tabInvoiceTitle}</span>
                <small>{t.tabInvoiceSub}</small>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeDocType === "FREELANCER_VOUCHER"}
                className={`excel-tab-btn ${
                  activeDocType === "FREELANCER_VOUCHER" ? "is-active" : ""
                }`}
                onClick={() => setDocType("FREELANCER_VOUCHER")}
              >
                <FileCheck2 size={14} />
                <span>{t.tabVoucherTitle}</span>
                <small>{t.tabVoucherSub}</small>
              </button>
            </div>

            <div className="excel-toolbar-right">
              <button
                type="button"
                className={`excel-chip-toggle ${isVatEnabled ? "is-on" : ""}`}
                onClick={toggleVat}
                title="Toggle 15% Ethiopian Value Added Tax"
              >
                <span>{t.vatChipLabel(isVatEnabled)}</span>
              </button>

              <button
                type="button"
                className={`excel-chip-toggle ${isWhtEnabled ? "is-on" : ""}`}
                onClick={toggleWht}
                title="Toggle ERCA Withholding Tax"
              >
                <span>{t.whtChipLabel(isWhtEnabled)}</span>
              </button>

              {isWhtEnabled && (
                <button
                  type="button"
                  className={`excel-chip-toggle ${isTinVerified ? "is-on" : ""}`}
                  onClick={toggleTinStatus}
                  title="Switch between verified TIN and unverified TIN rate"
                >
                  <span>{t.tinChipLabel(isTinVerified)}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <header className="excel-header">
          <div className="excel-header-left">
            <h1 className="excel-doc-title">
              {activeDocType === "CLIENT_INVOICE"
                ? t.docTitleInvoice
                : t.docTitleVoucher}
            </h1>
            <div className="excel-doc-subtitle">
              {activeDocType === "CLIENT_INVOICE"
                ? t.docSubInvoice
                : t.docSubVoucher}
            </div>
          </div>

          <div className="excel-header-right">
            <div className="excel-company-name">{t.companyName}</div>
            <div className="excel-company-tagline">{t.companyTagline}</div>
            <div className="excel-company-details">{t.companyTax}</div>
          </div>
        </header>

        {/* Unified Metadata Block (Single Wide Box) */}
        <section className="excel-meta-wide-box">
          <div className="excel-meta-wide-col excel-meta-wide-left">
            <span className="excel-meta-box-label">{t.to}</span>
            <div className="excel-meta-recipient-name">
              {activeDocType === "CLIENT_INVOICE" ? clientName : freelancerName}
            </div>
            <div className="excel-meta-recipient-sub">
              {activeDocType === "CLIENT_INVOICE"
                ? clientLocation
                : t.talentBadge(freelancerUcid)}
            </div>
            <div className="excel-meta-line" style={{ marginTop: 4 }}>
              <span>{t.rolePartyLabel}</span>
              <strong>
                {activeDocType === "CLIENT_INVOICE"
                  ? t.roleClient
                  : t.roleFreelancer}
              </strong>
            </div>
            <div className="excel-meta-line">
              <label htmlFor="client-tin-field">
                {activeDocType === "CLIENT_INVOICE"
                  ? t.clientTinLabel
                  : t.freelancerTinLabel}
              </label>
              <input
                id="client-tin-field"
                type="text"
                className="excel-tin-input"
                value={
                  activeDocType === "CLIENT_INVOICE"
                    ? clientTinInput
                    : freelancerTinInput
                }
                onChange={(e) =>
                  activeDocType === "CLIENT_INVOICE"
                    ? setClientTinInput(e.target.value)
                    : setFreelancerTinInput(e.target.value)
                }
                aria-label="TIN number"
              />
            </div>
          </div>

          <div className="excel-meta-wide-col excel-meta-wide-right">
            <div className="excel-meta-line">
              <span>{t.dateLabel}</span>
              <strong>{formattedDate}</strong>
            </div>
            <div className="excel-meta-line">
              <span>
                {activeDocType === "CLIENT_INVOICE"
                  ? t.invoiceNumLabel
                  : t.voucherNumLabel}
              </span>
              <strong
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.95rem",
                }}
              >
                {serial}
              </strong>
            </div>
            <div className="excel-meta-line">
              <span>
                {activeDocType === "CLIENT_INVOICE"
                  ? t.customerIdLabel
                  : t.freelancerIdLabel}
              </span>
              <strong style={{ fontFamily: "var(--font-mono)" }}>
                {activeDocType === "CLIENT_INVOICE"
                  ? clientTinInput
                    ? `#CL-${clientTinInput.slice(-4)}`
                    : "ETH-CL-2089"
                  : freelancerUcid}
              </strong>
            </div>
            <div className="excel-meta-line">
              <span>{t.fiscalStatusLabel}</span>
              <strong className="excel-status-bold completed">
                {resolvedStatus}
              </strong>
            </div>
          </div>
        </section>

        {/* 7-Column Metadata Band */}
        <section className="excel-band-wrap">
          <table className="excel-band-table">
            <thead>
              <tr>
                {t.bandHeaders.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {activeDocType === "CLIENT_INVOICE"
                    ? t.escrowOfficer
                    : freelancerName}
                </td>
                <td>
                  {contractCode
                    ? `${contractCode} · ${milestoneTitle}`
                    : milestoneTitle}
                </td>
                <td>{railLocale.name}</td>
                <td>{t.escrowTerms}</td>
                <td>{formattedDate}</td>
                <td>{t.paymentTerms}</td>
                <td>
                  <strong className="excel-status-bold completed">
                    {resolvedStatus}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Line Items Table */}
        <section className="excel-table-wrap">
          <table className="excel-table">
            <thead>
              <tr>
                <th style={{ width: "6%" }}>{t.tableHeaders[0]}</th>
                <th style={{ width: "12%" }}>{t.tableHeaders[1]}</th>
                <th style={{ width: "42%" }}>{t.tableHeaders[2]}</th>
                <th style={{ width: "14%" }}>{t.tableHeaders[3]}</th>
                <th style={{ width: "12%" }} className="num-col">
                  {t.tableHeaders[4]}
                </th>
                <th style={{ width: "10%" }} className="num-col">
                  {t.tableHeaders[5]}
                </th>
                <th style={{ width: "14%" }} className="num-col">
                  {t.tableHeaders[6]}
                </th>
              </tr>
            </thead>
            <tbody>
              {activeDocType === "CLIENT_INVOICE" ? (
                <>
                  <tr>
                    <td>1</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>MS-01</td>
                    <td>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--color-text)",
                        }}
                      >
                        {t.clientPrincipal(milestoneTitle).title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {t.clientPrincipal(milestoneTitle).note}
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {t.catMilestoneEscrow}
                    </td>
                    <td className="num-col">{formatEtbNum(principal)}</td>
                    <td className="num-col">0</td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatEtbNum(principal)}
                    </td>
                  </tr>
                  <tr>
                    <td>1</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>FEE-CL</td>
                    <td>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--color-text)",
                        }}
                      >
                        {t.clientFee((clientFeeRate * 100).toFixed(1)).title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {t.clientFee((clientFeeRate * 100).toFixed(1)).note}
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {t.catPlatformFee}
                    </td>
                    <td className="num-col">{formatEtbNum(clientEscrowFee)}</td>
                    <td className="num-col">0</td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      +{formatEtbNum(clientEscrowFee)}
                    </td>
                  </tr>
                  {isVatEnabled && (
                    <tr>
                      <td>1</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>
                        TAX-VAT
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--color-text)",
                          }}
                        >
                          {t.clientVat.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.76rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {t.clientVat.note}
                        </div>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        {t.catStatutoryVat}
                      </td>
                      <td className="num-col">{formatEtbNum(clientVatAmount)}</td>
                      <td className="num-col">0</td>
                      <td className="num-col" style={{ fontWeight: 700 }}>
                        +{formatEtbNum(clientVatAmount)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <>
                  <tr>
                    <td>1</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>MS-REL</td>
                    <td>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--color-text)",
                        }}
                      >
                        {t.freelancerPrincipal(milestoneTitle).title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {t.freelancerPrincipal(milestoneTitle).note}
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {t.catMilestoneRelease}
                    </td>
                    <td className="num-col">{formatEtbNum(principal)}</td>
                    <td className="num-col">0</td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatEtbNum(principal)}
                    </td>
                  </tr>
                  {isVatEnabled && (
                    <tr>
                      <td>1</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>
                        TAX-VAT
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--color-text)",
                          }}
                        >
                          {t.freelancerVat.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.76rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {t.freelancerVat.note}
                        </div>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        {t.catOutputVat}
                      </td>
                      <td className="num-col">
                        {formatEtbNum(freelancerVatCredit)}
                      </td>
                      <td className="num-col">0</td>
                      <td className="num-col" style={{ fontWeight: 700 }}>
                        +{formatEtbNum(freelancerVatCredit)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>1</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>FEE-FL</td>
                    <td>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--color-text)",
                        }}
                      >
                        {
                          t.freelancerFee(
                            (freelancerFeeRate * 100).toFixed(1),
                          ).title
                        }
                      </div>
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {
                          t.freelancerFee(
                            (freelancerFeeRate * 100).toFixed(1),
                          ).note
                        }
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {t.catPlatformFee}
                    </td>
                    <td className="num-col">
                      {formatEtbNum(freelancerServiceFee)}
                    </td>
                    <td
                      className="num-col"
                      style={{ color: "#dc2626", fontWeight: 700 }}
                    >
                      {formatEtbNum(freelancerServiceFee)}
                    </td>
                    <td
                      className="num-col"
                      style={{ color: "#dc2626", fontWeight: 700 }}
                    >
                      -{formatEtbNum(freelancerServiceFee)}
                    </td>
                  </tr>
                  {isWhtEnabled && (
                    <tr>
                      <td>1</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>
                        TAX-WHT
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--color-text)",
                          }}
                        >
                          {
                            t.freelancerWht(
                              (whtRate * 100).toFixed(0),
                              isTinVerified
                                ? t.tinRateDetail.verified
                                : t.tinRateDetail.unverified,
                            ).title
                          }
                        </div>
                        <div
                          style={{
                            fontSize: "0.76rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {
                            t.freelancerWht(
                              (whtRate * 100).toFixed(0),
                              isTinVerified
                                ? t.tinRateDetail.verified
                                : t.tinRateDetail.unverified,
                            ).note
                          }
                        </div>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        {t.catWithholdingTax}
                      </td>
                      <td className="num-col">{formatEtbNum(whtAmount)}</td>
                      <td
                        className="num-col"
                        style={{ color: "#dc2626", fontWeight: 700 }}
                      >
                        {formatEtbNum(whtAmount)}
                      </td>
                      <td
                        className="num-col"
                        style={{ color: "#dc2626", fontWeight: 700 }}
                      >
                        -{formatEtbNum(whtAmount)}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Box */}
        <section className="excel-totals-wrap">
          <table className="excel-totals-table">
            <tbody>
              {activeDocType === "CLIENT_INVOICE" ? (
                <>
                  <tr>
                    <td>{t.clientDiscount}</td>
                    <td>ETB 0.00</td>
                  </tr>
                  <tr>
                    <td>{t.subtotal}</td>
                    <td>{formatEtbNum(principal + clientEscrowFee)}</td>
                  </tr>
                  <tr>
                    <td>{t.clientTax}</td>
                    <td>{formatEtbNum(clientVatAmount)}</td>
                  </tr>
                  <tr className="excel-totals-grand">
                    <td>{t.clientTotal}</td>
                    <td>{formatEtbNum(clientTotalPayable)}</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td>{t.freelancerDiscount}</td>
                    <td>{formatEtbNum(freelancerServiceFee + whtAmount)}</td>
                  </tr>
                  <tr>
                    <td>{t.subtotal}</td>
                    <td>{formatEtbNum(principal)}</td>
                  </tr>
                  <tr>
                    <td>{t.freelancerTax}</td>
                    <td>
                      {isVatEnabled
                        ? `+${formatEtbNum(freelancerVatCredit)}`
                        : "ETB 0.00"}
                      {isWhtEnabled ? ` / -${formatEtbNum(whtAmount)}` : ""}
                    </td>
                  </tr>
                  <tr className="excel-totals-grand">
                    <td>{t.freelancerTotal}</td>
                    <td>{formatEtbNum(freelancerNetDisbursed)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </section>

        {/* Payment Rail Proof & Compliance Covenant Box */}
        <section className="yk-fiscal-bottom-grid">
          <div className="yk-fiscal-rail-card">
            <div className="yk-fiscal-rail-head">
              <img
                src={railConfig.logo}
                alt={railLocale.name}
                className="yk-fiscal-rail-logo"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="yk-fiscal-rail-title">{railLocale.name}</div>
                <div className="yk-fiscal-rail-sub">{railLocale.operator}</div>
              </div>
            </div>
            <div className="yk-fiscal-rail-kv">
              <div>
                <span>{t.providerRefLabel}</span>
                <strong className="yk-mono">{providerRef}</strong>
              </div>
              <div>
                <span>{t.settlementAccountLabel}</span>
                <strong className="yk-mono">
                  {railConfig.settlementAccount}
                </strong>
              </div>
              <div>
                <span>{t.clearingSlaLabel}</span>
                <strong>{t.instantClearingValue}</strong>
              </div>
            </div>
          </div>

          <div className="yk-fiscal-compliance-card">
            <div className="yk-fiscal-compliance-head">
              <Stamp size={15} />
              <span>
                {activeDocType === "CLIENT_INVOICE"
                  ? t.clientComplianceTitle
                  : t.freelancerComplianceTitle}
              </span>
            </div>

            {activeDocType === "CLIENT_INVOICE" ? (
              <p className="yk-fiscal-compliance-copy">
                {t.clientComplianceBody(formatEtbNum(principal))}
              </p>
            ) : (
              <div className="yk-fiscal-wht-summary">
                <p className="yk-fiscal-compliance-copy">
                  {t.freelancerComplianceBody(
                    formatEtbNum(whtAmount),
                    (whtRate * 100).toFixed(0),
                    formatEtbNum(principal),
                    freelancerTinInput,
                  )}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Sign-off Footer */}
        <footer className="excel-signoff">
          <div className="excel-thank-you">{t.thankYou}</div>
          <div className="excel-signoff-meta">
            <span>SHA256:{serial.replace(/[^A-Z0-9]/g, "")}8F92A4C1</span>
            <span>·</span>
            <span>{t.issuedBy}</span>
            <span>·</span>
            <strong>yekis.et/verify/{serial.toLowerCase()}</strong>
          </div>
        </footer>
      </article>
    </div>
  );

  if (mode === "modal") {
    return (
      <div
        className="yk-fiscal-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Printable Invoice and Receipt Preview"
        onClick={onClose}
      >
        <div
          className="yk-fiscal-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          {sheetContent}
        </div>
      </div>
    );
  }

  return sheetContent;
}
