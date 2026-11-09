import { useState } from "react";
import {
  Check,
  Copy,
  FileCheck2,
  FileText,
  Printer,
  Stamp,
  X,
} from "lucide-react";

export type FiscalDocType = "CLIENT_INVOICE" | "FREELANCER_VOUCHER";
export type FiscalRail = "TELEBIRR" | "CBE_BIRR" | "M_PESA";

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
  clientFeeRate?: number; // default 0.025 (2.5%)
  freelancerFeeRate?: number; // default 0.025 (2.5%)
}

interface FiscalDocumentSheetProps {
  data: FiscalDocumentData;
  mode?: "embedded" | "modal";
  interactiveControls?: boolean;
  onClose?: () => void;
  onChangeDocType?: (docType: FiscalDocType) => void;
  onToggleVat?: (next: boolean) => void;
  onToggleWithholding?: (next: boolean) => void;
  onToggleVerifiedTin?: (next: boolean) => void;
}

const RAIL_META: Record<
  FiscalRail,
  {
    nameEn: string;
    nameAm: string;
    operatorEn: string;
    logo: string;
    defaultRef: string;
    settlementAccount: string;
  }
> = {
  TELEBIRR: {
    nameEn: "Telebirr SuperApp",
    nameAm: "ቴሌብር (ኢትዮ ቴሌኮም)",
    operatorEn: "Ethio Telecom Mobile Money",
    logo: "/payment/Telebirr.png",
    defaultRef: "TB-20261022-88419",
    settlementAccount: "+251 910 011 818 (Yekis Escrow Vault)",
  },
  CBE_BIRR: {
    nameEn: "CBE Birr / Commercial Bank",
    nameAm: "ሲቢኢ ብር (የኢትዮጵያ ንግድ ባንክ)",
    operatorEn: "Commercial Bank of Ethiopia",
    logo: "/payment/cbe payment.jpg",
    defaultRef: "FT26295XK9104",
    settlementAccount: "1000 223 344 (Yekis Custodial Trust)",
  },
  M_PESA: {
    nameEn: "Safaricom M-Pesa",
    nameAm: "ሳፋሪኮም ኤም-ፔሳ",
    operatorEn: "Safaricom M-Pesa Mobile Financial Services",
    logo: "/payment/mpesa.svg",
    defaultRef: "RJK91M28LP04",
    settlementAccount: "Till 882199 · +251 777 011 818",
  },
};

function formatEtbNum(amount: number): string {
  return `ETB ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Converts a Gregorian date to a human-readable Ethiopian calendar string (approximate display for fiscal headers) */
function toEthiopianDateLabel(iso?: string): { greg: string; eth: string } {
  const d = iso ? new Date(iso) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  const greg = valid.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  // Approximate Ethiopian year (Gregorian - 7 or 8 years depending on Sept 11)
  const month = valid.getMonth() + 1;
  const day = valid.getDate();
  const ethYear = month > 9 || (month === 9 && day >= 11) ? valid.getFullYear() - 7 : valid.getFullYear() - 8;
  const ethMonths = [
    "ታኅሣሥ / Tahsas",
    "ጥር / Tir",
    "የካቲት / Yekatit",
    "መጋቢት / Megabit",
    "ሚያዝያ / Miazia",
    "ግንቦት / Ginbot",
    "ሰኔ / Sene",
    "ሐምሌ / Hamle",
    "ነሐሴ / Nehase",
    "መስከረም / Meskerem",
    "ጥቅምት / Tikimt",
    "ኅዳር / Hidar",
  ];
  const ethMonthLabel = ethMonths[(month - 1) % 12];
  const ethDay = ((day + 20) % 30) + 1;
  return {
    greg,
    eth: `${ethMonthLabel} ${ethDay}, ${ethYear} ዓ.ም`,
  };
}

export function FiscalDocumentSheet({
  data,
  mode = "embedded",
  interactiveControls = true,
  onClose,
  onChangeDocType,
  onToggleVat,
  onToggleWithholding,
  onToggleVerifiedTin,
}: FiscalDocumentSheetProps) {
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

  const railInfo = RAIL_META[data.rail] ?? RAIL_META.TELEBIRR;
  const principal = Math.max(0, Number(data.principalEtb) || 0);
  const clientFeeRate = data.clientFeeRate ?? 0.025;
  const freelancerFeeRate = data.freelancerFeeRate ?? 0.025;

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
  const providerRef = data.providerReference || railInfo.defaultRef;
  const dates = toEthiopianDateLabel(data.issuedAtIso);

  const clientName = data.clientName ?? "Abyssinia Commerce PLC (አቢሲኒያ ኮሜርስ ኃ/የተ/የግ/ማ)";
  const freelancerName = data.freelancerName ?? "Hanna Tadesse (ሐና ታደሰ)";
  const freelancerUcid = data.freelancerUcid ?? "YEK-FL-2089";

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
      {/* Interactive Toolbar (Hidden in @media print) */}
      {interactiveControls && (
        <div className="excel-toolbar no-print">
          <div className="excel-toolbar-left" role="tablist" aria-label="Document recipient perspective">
            <button
              type="button"
              role="tab"
              aria-selected={activeDocType === "CLIENT_INVOICE"}
              className={`excel-tab-btn ${
                activeDocType === "CLIENT_INVOICE" ? "is-active" : ""
              }`}
              onClick={() => setDocType("CLIENT_INVOICE")}
            >
              <FileText size={15} />
              <span>Client Invoice &amp; Escrow Receipt</span>
              <small>የደንበኛ ደረሰኝ</small>
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
              <FileCheck2 size={15} />
              <span>Freelancer Payout &amp; WHT Voucher</span>
              <small>የባለሙያ ክፍያ ማረጋገጫ</small>
            </button>
          </div>

          <div className="excel-toolbar-right">
            <button
              type="button"
              className={`excel-chip-toggle ${isVatEnabled ? "is-on" : ""}`}
              onClick={toggleVat}
              title="Toggle 15% Ethiopian Value Added Tax (ተ.እ.ታ)"
            >
              <span>15% VAT (ተ.እ.ታ): {isVatEnabled ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              className={`excel-chip-toggle ${isWhtEnabled ? "is-on" : ""}`}
              onClick={toggleWht}
              title="Toggle ERCA Withholding Tax (ዊዝሆልዲንግ ታክስ)"
            >
              <span>ERCA WHT: {isWhtEnabled ? "ON" : "EXEMPT"}</span>
            </button>

            {isWhtEnabled && (
              <button
                type="button"
                className={`excel-chip-toggle ${isTinVerified ? "is-on" : ""}`}
                onClick={toggleTinStatus}
                title="Switch between 3% Verified TIN and 30% Unverified TIN rate"
              >
                <span>
                  TIN Rate: {isTinVerified ? "3% Verified" : "30% Unverified"}
                </span>
              </button>
            )}

            <button
              type="button"
              className="excel-btn-action"
              onClick={copyReference}
            >
              {copiedSerial ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedSerial ? "Copied ID" : "Copy Ref"}</span>
            </button>

            <button
              type="button"
              className="excel-btn-action is-primary"
              onClick={handlePrint}
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
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
      )}

      {/* Printable Bilingual Excel-Styled Fiscal Sheet */}
      <article
        className="excel-sheet-card yk-fiscal-sheet"
        aria-label={
          activeDocType === "CLIENT_INVOICE"
            ? "Excel-Styled Bilingual Client Commercial Invoice and Escrow Deposit Receipt"
            : "Excel-Styled Bilingual Freelancer Payout Remittance and ERCA Withholding Tax Voucher"
        }
      >
        {/* Header */}
        <header className="excel-header">
          <div className="excel-header-left">
            <h1 className="excel-doc-title">
              {activeDocType === "CLIENT_INVOICE" ? "INVOICE" : "PAYOUT RECEIPT"}
            </h1>
            <div className="excel-doc-subtitle">
              {activeDocType === "CLIENT_INVOICE"
                ? "Commercial Invoice & Escrow Deposit Receipt · የንግድ ደረሰኝ እና የኢስክሮ ክፍያ ማረጋገጫ"
                : "Freelancer Payout & Withholding Tax Voucher · የባለሙያ ክፍያ እና የዊዝሆልዲንግ ታክስ ደረሰኝ"}
            </div>
          </div>

          <div className="excel-header-right">
            <div className="excel-company-name">
              Yekis Technologies PLC · ዬኪስ ቴክኖሎጂስ ኃ/የተ/የግ/ማ
            </div>
            <div className="excel-company-tagline">
              Custodial Escrow &amp; Digital Work Marketplace · አዲስ አበባ፣ ኢትዮጵያ
            </div>
            <div className="excel-company-details">
              ERCA Platform TIN: <strong>0078492104</strong> · VAT Reg: <strong>ETH-VAT-99201</strong> · Addis Ababa, Ethiopia
            </div>
          </div>
        </header>

        {/* Metadata Block (To / Date / Invoice # / Customer ID / Fiscal Status) */}
        <section className="excel-meta-grid">
          <div className="excel-meta-box">
            <span className="excel-meta-box-label">To:</span>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--color-text)" }}>
              {activeDocType === "CLIENT_INVOICE" ? clientName : freelancerName}
            </div>
            <div style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>
              {activeDocType === "CLIENT_INVOICE"
                ? (data.clientLocation || "Addis Ababa, Ethiopia")
                : `Yekis Verified Talent · ${freelancerUcid}`}
            </div>
            <div className="excel-meta-line" style={{ marginTop: 4 }}>
              <span>Role / Party:</span>
              <strong>{activeDocType === "CLIENT_INVOICE" ? "Client (ከፋይ ደንበኛ)" : "Contractor / Freelancer (ባለሙያ)"}</strong>
            </div>
            <div className="excel-meta-line">
              <label htmlFor="client-tin-field">
                {activeDocType === "CLIENT_INVOICE" ? "Client TIN:" : "Freelancer TIN:"}
              </label>
              <input
                id="client-tin-field"
                type="text"
                className="excel-tin-input"
                value={activeDocType === "CLIENT_INVOICE" ? clientTinInput : freelancerTinInput}
                onChange={(e) =>
                  activeDocType === "CLIENT_INVOICE"
                    ? setClientTinInput(e.target.value)
                    : setFreelancerTinInput(e.target.value)
                }
                aria-label="TIN number"
              />
            </div>
          </div>

          <div className="excel-meta-box">
            <div className="excel-meta-line">
              <span>Date:</span>
              <strong>{dates.greg} ({dates.eth})</strong>
            </div>
            <div className="excel-meta-line">
              <span>Invoice #:</span>
              <strong style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>{serial}</strong>
            </div>
            <div className="excel-meta-line">
              <span>Customer ID:</span>
              <strong style={{ fontFamily: "var(--font-mono)" }}>
                {activeDocType === "CLIENT_INVOICE" ? (clientTinInput ? `#CL-${clientTinInput.slice(-4)}` : "ETH-CL-2089") : freelancerUcid}
              </strong>
            </div>
            <div className="excel-meta-line">
              <span>Fiscal Status:</span>
              <strong className="excel-status-bold completed">
                {data.statusLabel ??
                  (activeDocType === "CLIENT_INVOICE"
                    ? "ESCROW FUNDED · በኢስክሮ የተያዘ"
                    : "DISBURSED · የተከፈለ")}
              </strong>
            </div>
          </div>
        </section>

        {/* 7-Column Metadata Band */}
        <section className="excel-band-wrap">
          <table className="excel-band-table">
            <thead>
              <tr>
                <th>Agent / Party</th>
                <th>Contract &amp; Milestone</th>
                <th>Payment Rail</th>
                <th>Terms</th>
                <th>Delivery Date</th>
                <th>Payment Terms</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{activeDocType === "CLIENT_INVOICE" ? "Yekis Escrow Officer" : freelancerName}</td>
                <td>{contractCode ? `${contractCode} · ${milestoneTitle}` : milestoneTitle}</td>
                <td>{railInfo.nameEn}</td>
                <td>Escrow Protected (AACCSA Standards)</td>
                <td>{dates.greg}</td>
                <td>On delivery</td>
                <td>
                  <strong className="excel-status-bold completed">
                    {data.statusLabel ?? (activeDocType === "CLIENT_INVOICE" ? "ESCROW FUNDED" : "SETTLED")}
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
                <th style={{ width: "6%" }}>Qty</th>
                <th style={{ width: "12%" }}>Item #</th>
                <th style={{ width: "42%" }}>Description</th>
                <th style={{ width: "14%" }}>Custom column</th>
                <th style={{ width: "12%" }} className="num-col">Unit price</th>
                <th style={{ width: "10%" }} className="num-col">Discount</th>
                <th style={{ width: "14%" }} className="num-col">Line total</th>
              </tr>
            </thead>
            <tbody>
              {activeDocType === "CLIENT_INVOICE" ? (
                <>
                  <tr>
                    <td>1</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>MS-01</td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                        Escrow Principal Deposit — {milestoneTitle}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                        ዋና የምዕራፍ ክፍያ ተቀማጭ (በኢስክሮ የሚጠበቅ ክፍያ)
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>Milestone Escrow</td>
                    <td className="num-col">{formatEtbNum(principal)}</td>
                    <td className="num-col">0</td>
                    <td className="num-col" style={{ fontWeight: 700 }}>{formatEtbNum(principal)}</td>
                  </tr>
                  <tr>
                    <td>1</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>FEE-CL</td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                        Yekis Client Escrow Protection &amp; Gateway Fee ({(clientFeeRate * 100).toFixed(1)}%)
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                        የደንበኛ የኢስክሮ ጥበቃ እና የክፍያ ማስፈጸሚያ አገልግሎት ክፍያ
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>Platform Fee</td>
                    <td className="num-col">{formatEtbNum(clientEscrowFee)}</td>
                    <td className="num-col">0</td>
                    <td className="num-col" style={{ fontWeight: 700 }}>+{formatEtbNum(clientEscrowFee)}</td>
                  </tr>
                  {isVatEnabled && (
                    <tr>
                      <td>1</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>TAX-VAT</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                          Ethiopian Value Added Tax (ERCA Standard VAT 15%)
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                          ተጨማሪ እሴት ታክስ (ተ.እ.ታ 15% — በገቢዎች ሚኒስቴር ደንብ መሠረት)
                        </div>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>Statutory VAT</td>
                      <td className="num-col">{formatEtbNum(clientVatAmount)}</td>
                      <td className="num-col">0</td>
                      <td className="num-col" style={{ fontWeight: 700 }}>+{formatEtbNum(clientVatAmount)}</td>
                    </tr>
                  )}
                </>
              ) : (
                <>
                  <tr>
                    <td>1</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>MS-REL</td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                        Gross Milestone Amount Released from Escrow — {milestoneTitle}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                        ከኢስክሮ የተለቀቀ ጠቅላላ የምዕራፍ የሥራ ክፍያ
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>Milestone Release</td>
                    <td className="num-col">{formatEtbNum(principal)}</td>
                    <td className="num-col">0</td>
                    <td className="num-col" style={{ fontWeight: 700 }}>{formatEtbNum(principal)}</td>
                  </tr>
                  {isVatEnabled && (
                    <tr>
                      <td>1</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>TAX-VAT</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                          Output VAT Collected (15% Registered Commercial Invoice)
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                          የተሰበሰበ ተጨማሪ እሴት ታክስ (ተ.እ.ታ 15%)
                        </div>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>Output VAT</td>
                      <td className="num-col">{formatEtbNum(freelancerVatCredit)}</td>
                      <td className="num-col">0</td>
                      <td className="num-col" style={{ fontWeight: 700 }}>+{formatEtbNum(freelancerVatCredit)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>1</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>FEE-FL</td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                        Less: Yekis Freelancer Platform &amp; Settlement Service Fee ({(freelancerFeeRate * 100).toFixed(1)}%)
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                        ሲቀነስ፦ የዬኪስ የባለሙያ አገልግሎት እና የክፍያ ማስተላለፊያ ክፍያ
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>Platform Fee</td>
                    <td className="num-col">{formatEtbNum(freelancerServiceFee)}</td>
                    <td className="num-col" style={{ color: "#dc2626", fontWeight: 700 }}>{formatEtbNum(freelancerServiceFee)}</td>
                    <td className="num-col" style={{ color: "#dc2626", fontWeight: 700 }}>-{formatEtbNum(freelancerServiceFee)}</td>
                  </tr>
                  {isWhtEnabled && (
                    <tr>
                      <td>1</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>TAX-WHT</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                          Less: ERCA Statutory Withholding Tax ({(whtRate * 100).toFixed(0)}% {isTinVerified ? "3% Verified TIN" : "30% Unverified TIN Rate"})
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                          ሲቀነስ፦ የገቢዎች ሚኒስቴር የዊዝሆልዲንግ ታክስ ተቀናሽ
                        </div>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>Withholding Tax</td>
                      <td className="num-col">{formatEtbNum(whtAmount)}</td>
                      <td className="num-col" style={{ color: "#dc2626", fontWeight: 700 }}>{formatEtbNum(whtAmount)}</td>
                      <td className="num-col" style={{ color: "#dc2626", fontWeight: 700 }}>-{formatEtbNum(whtAmount)}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Box (Matching Excel CSV Rows 25-30, Right Aligned Stacked Calculation) */}
        <section className="excel-totals-wrap">
          <table className="excel-totals-table">
            <tbody>
              {activeDocType === "CLIENT_INVOICE" ? (
                <>
                  <tr>
                    <td>Total Discount:</td>
                    <td>ETB 0.00</td>
                  </tr>
                  <tr>
                    <td>Subtotal:</td>
                    <td>{formatEtbNum(principal + clientEscrowFee)}</td>
                  </tr>
                  <tr>
                    <td>Sales tax (15% VAT):</td>
                    <td>{formatEtbNum(clientVatAmount)}</td>
                  </tr>
                  <tr className="excel-totals-grand">
                    <td>Total:</td>
                    <td>{formatEtbNum(clientTotalPayable)}</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td>Total Discount / Fees:</td>
                    <td>{formatEtbNum(freelancerServiceFee + whtAmount)}</td>
                  </tr>
                  <tr>
                    <td>Subtotal:</td>
                    <td>{formatEtbNum(principal)}</td>
                  </tr>
                  <tr>
                    <td>Sales tax (VAT / WHT):</td>
                    <td>
                      {isVatEnabled ? `+${formatEtbNum(freelancerVatCredit)}` : "ETB 0.00"}
                      {isWhtEnabled ? ` / -${formatEtbNum(whtAmount)}` : ""}
                    </td>
                  </tr>
                  <tr className="excel-totals-grand">
                    <td>Total (Net Payout):</td>
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
                src={railInfo.logo}
                alt={railInfo.nameEn}
                className="yk-fiscal-rail-logo"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="yk-fiscal-rail-title">
                  {railInfo.nameEn} · {railInfo.nameAm}
                </div>
                <div className="yk-fiscal-rail-sub">{railInfo.operatorEn}</div>
              </div>
            </div>
            <div className="yk-fiscal-rail-kv">
              <div>
                <span>Provider Txn Ref / የክፍያ ማጣቀሻ ቁጥር:</span>
                <strong className="yk-mono">{providerRef}</strong>
              </div>
              <div>
                <span>Settlement Account / የክፍያ ሂሳብ:</span>
                <strong className="yk-mono">{railInfo.settlementAccount}</strong>
              </div>
              <div>
                <span>Clearing SLA / የማጽጃ ጊዜ:</span>
                <strong>Instant Real-Time Settlement · ወዲያውኑ የተረጋገጠ</strong>
              </div>
            </div>
          </div>

          <div className="yk-fiscal-compliance-card">
            <div className="yk-fiscal-compliance-head">
              <Stamp size={15} />
              <span>
                {activeDocType === "CLIENT_INVOICE"
                  ? "ESCROW CUSTODY & ERCA TAX COMPLIANCE · የኢስክሮ ዋስትና እና የታክስ ሕጋዊነት"
                  : "ERCA WITHHOLDING TAX CERTIFICATE · የዊዝሆልዲንግ ታክስ ምስክር ወረቀት"}
              </span>
            </div>

            {activeDocType === "CLIENT_INVOICE" ? (
              <p className="yk-fiscal-compliance-copy">
                <strong>English:</strong> 100% of the milestone principal ({formatEtbNum(principal)}) is held in Yekis Custodial Escrow and is only released upon client acceptance of deliverables or expiry of the 7-day review window under AACCSA commercial arbitration rules.
                <br />
                <strong>አማርኛ፦</strong> ዋናው የምዕራፍ ክፍያ ({formatEtbNum(principal)}) ሙሉ በሙሉ በዬኪስ የኢስክሮ ካዝና ውስጥ በአደራ የተቀመጠ ሲሆን፣ ለባለሙያው የሚለቀቀው ደንበኛው ሥራውን ሲያጸድቁ ወይም የ7 ቀናት የምርመራ ጊዜ ሲጠናቀቅ ብቻ ነው።
              </p>
            ) : (
              <div className="yk-fiscal-wht-summary">
                <p className="yk-fiscal-compliance-copy">
                  <strong>Proclamation No. 979/2016 (አዋጅ ቁጥር 979/2008):</strong> Withholding tax of{" "}
                  <strong className="yk-mono">{formatEtbNum(whtAmount)}</strong> (
                  {(whtRate * 100).toFixed(0)}%) has been deducted at source on the taxable base of{" "}
                  <strong className="yk-mono">{formatEtbNum(principal)}</strong> for Freelancer TIN{" "}
                  <strong className="yk-mono">{freelancerTinInput}</strong>. Retain this voucher for annual ERCA tax credit reconciliation.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Sign-off Footer (Matching Excel CSV Row 34: Thank you for your business!) */}
        <footer className="excel-signoff">
          <div className="excel-thank-you">
            Thank you for your business! · ስለመረጡን እናመሰግናለን!
          </div>
          <div className="excel-signoff-meta">
            <span>SHA256:{serial.replace(/[^A-Z0-9]/g, "")}8F92A4C1</span>
            <span>·</span>
            <span>Issued by Yekis Escrow Ledger</span>
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
