import { useState } from "react";
import {
  Building2,
  Check,
  Copy,
  FileCheck2,
  FileText,
  Printer,
  ShieldCheck,
  Stamp,
  UserCheck,
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
    <div className="yk-fiscal-wrap">
      {/* Interactive Toolbar (Hidden in @media print) */}
      {interactiveControls && (
        <div className="yk-fiscal-toolbar no-print">
          <div className="yk-fiscal-tabs" role="tablist" aria-label="Document recipient perspective">
            <button
              type="button"
              role="tab"
              aria-selected={activeDocType === "CLIENT_INVOICE"}
              className={`yk-fiscal-tab ${
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
              className={`yk-fiscal-tab ${
                activeDocType === "FREELANCER_VOUCHER" ? "is-active" : ""
              }`}
              onClick={() => setDocType("FREELANCER_VOUCHER")}
            >
              <FileCheck2 size={15} />
              <span>Freelancer Payout &amp; WHT Voucher</span>
              <small>የባለሙያ ክፍያ ማረጋገጫ</small>
            </button>
          </div>

          <div className="yk-fiscal-controls-right">
            <button
              type="button"
              className={`yk-fiscal-chip ${isVatEnabled ? "is-on" : ""}`}
              onClick={toggleVat}
              title="Toggle 15% Ethiopian Value Added Tax (ተ.እ.ታ)"
            >
              <span>15% VAT (ተ.እ.ታ): {isVatEnabled ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              className={`yk-fiscal-chip ${isWhtEnabled ? "is-on" : ""}`}
              onClick={toggleWht}
              title="Toggle ERCA Withholding Tax (ዊዝሆልዲንግ ታክስ)"
            >
              <span>ERCA WHT: {isWhtEnabled ? "ON" : "EXEMPT"}</span>
            </button>

            {isWhtEnabled && (
              <button
                type="button"
                className={`yk-fiscal-chip ${isTinVerified ? "is-on" : "is-warn"}`}
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
              className="yk-fiscal-action-btn"
              onClick={copyReference}
            >
              {copiedSerial ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedSerial ? "Copied ID" : "Copy Ref"}</span>
            </button>

            <button
              type="button"
              className="yk-fiscal-action-btn is-primary"
              onClick={handlePrint}
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>

            {mode === "modal" && onClose && (
              <button
                type="button"
                className="yk-fiscal-close-btn"
                onClick={onClose}
                aria-label="Close document preview"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Bilingual A4 Fiscal Sheet */}
      <article
        className="yk-fiscal-sheet"
        aria-label={
          activeDocType === "CLIENT_INVOICE"
            ? "Bilingual Client Commercial Invoice and Escrow Deposit Receipt"
            : "Bilingual Freelancer Payout Remittance and ERCA Withholding Tax Voucher"
        }
      >
        {/* Top Authority Banner */}
        <header className="yk-fiscal-head">
          <div className="yk-fiscal-brand-col">
            <div className="yk-fiscal-brand-lockup">
              <img
                src="/logo.png"
                alt="Yekis"
                className="yk-fiscal-logo"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="yk-fiscal-company-name">
                  YEKIS TECHNOLOGIES PLC · ዬኪስ ቴክኖሎጂስ ኃ/የተ/የግ/ማ
                </div>
                <div className="yk-fiscal-company-sub">
                  Custodial Escrow &amp; Digital Work Marketplace · አዲስ አበባ፣ ኢትዮጵያ (Bole Sub-City, Woreda 03)
                </div>
                <div className="yk-fiscal-company-tin">
                  ERCA Platform TIN / የድርጅት ቲን: <strong>0078492104</strong> · VAT Reg: <strong>ETH-VAT-99201</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="yk-fiscal-doc-meta">
            <div className="yk-fiscal-doc-badge">
              {activeDocType === "CLIENT_INVOICE" ? (
                <>
                  <span>COMMERCIAL INVOICE &amp; ESCROW RECEIPT</span>
                  <small>የንግድ ደረሰኝ እና የኢስክሮ ክፍያ ማረጋገጫ</small>
                </>
              ) : (
                <>
                  <span>PAYOUT REMITTANCE &amp; WHT VOUCHER</span>
                  <small>የባለሙያ ክፍያ እና የዊዝሆልዲንግ ታክስ ምስክር ወረቀት</small>
                </>
              )}
            </div>
            <div className="yk-fiscal-serial-grid">
              <div>
                <span>Document No / የሰነድ ቁጥር</span>
                <strong className="yk-mono">{serial}</strong>
              </div>
              <div>
                <span>Gregorian Date / ቀን (እ.ኤ.አ)</span>
                <strong className="yk-mono">{dates.greg}</strong>
              </div>
              <div>
                <span>Ethiopian Date / ቀን (ዓ.ም)</span>
                <strong>{dates.eth}</strong>
              </div>
              <div>
                <span>Fiscal Status / ሁኔታ</span>
                <strong className="yk-fiscal-status-text">
                  {data.statusLabel ??
                    (activeDocType === "CLIENT_INVOICE"
                      ? "ESCROW FUNDED · በኢስክሮ የተያዘ"
                      : "DISBURSED · የተከፈለ")}
                </strong>
              </div>
            </div>
          </div>
        </header>

        {/* Counterparty & TIN Identification Strip */}
        <section className="yk-fiscal-parties">
          {activeDocType === "CLIENT_INVOICE" ? (
            <>
              <div className="yk-fiscal-party-box">
                <div className="yk-fiscal-party-title">
                  <Building2 size={14} />
                  <span>BILLED TO (CLIENT) · ለደንበኛ (ከፋይ)</span>
                </div>
                <div className="yk-fiscal-party-name">{clientName}</div>
                <div className="yk-fiscal-party-detail">
                  <span>Location / አድራሻ:</span>{" "}
                  <b>{data.clientLocation ?? "Addis Ababa, Ethiopia · አዲስ አበባ"}</b>
                </div>
                <div className="yk-fiscal-party-detail">
                  <label htmlFor="client-tin-field">
                    Client TIN / የግብር ከፋይ መለያ ቁጥር:
                  </label>
                  <input
                    id="client-tin-field"
                    type="text"
                    className="yk-fiscal-tin-input yk-mono"
                    value={clientTinInput}
                    onChange={(e) => setClientTinInput(e.target.value)}
                    aria-label="Client TIN number"
                  />
                </div>
              </div>

              <div className="yk-fiscal-party-box">
                <div className="yk-fiscal-party-title">
                  <ShieldCheck size={14} />
                  <span>ESCROW CUSTODIAN &amp; CONTRACTOR · የኢስክሮ ጠባቂ እና ባለሙያ</span>
                </div>
                <div className="yk-fiscal-party-name">
                  Yekis Escrow Trust Vault · FBO {freelancerName}
                </div>
                <div className="yk-fiscal-party-detail">
                  <span>Contractor ID / መለያ:</span>{" "}
                  <b className="yk-mono">{freelancerUcid}</b> ·{" "}
                  <b>{isTinVerified ? "Fayda & Tier 2 TIN Verified" : "Tier 1 Basic"}</b>
                </div>
                <div className="yk-fiscal-party-detail">
                  <span>Contract Reference / የውል ቁጥር:</span>{" "}
                  <b className="yk-mono">{contractCode}</b> (AACCSA Bilingual Standard)
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="yk-fiscal-party-box">
                <div className="yk-fiscal-party-title">
                  <UserCheck size={14} />
                  <span>PAYEE (FREELANCER) · ተከፋይ ባለሙያ</span>
                </div>
                <div className="yk-fiscal-party-name">{freelancerName}</div>
                <div className="yk-fiscal-party-detail">
                  <span>Yekis UCID &amp; KYC / የማረጋገጫ ደረጃ:</span>{" "}
                  <b className="yk-mono">{freelancerUcid}</b> ·{" "}
                  <b>
                    {isTinVerified
                      ? "Tier 2 Fayda ID & TIN Verified (የተረጋገጠ)"
                      : "Unverified TIN (ያልተረጋገጠ ቲን)"}
                  </b>
                </div>
                <div className="yk-fiscal-party-detail">
                  <label htmlFor="freelancer-tin-field">
                    Freelancer TIN / የባለሙያ ቲን ቁጥር:
                  </label>
                  <input
                    id="freelancer-tin-field"
                    type="text"
                    className="yk-fiscal-tin-input yk-mono"
                    value={freelancerTinInput}
                    onChange={(e) => setFreelancerTinInput(e.target.value)}
                    aria-label="Freelancer TIN number"
                  />
                </div>
              </div>

              <div className="yk-fiscal-party-box">
                <div className="yk-fiscal-party-title">
                  <Building2 size={14} />
                  <span>WITHHOLDING AGENT &amp; CLIENT · ግብር ቀናሽ ወኪል እና ደንበኛ</span>
                </div>
                <div className="yk-fiscal-party-name">
                  Yekis Escrow Settlement Engine · OBO {clientName}
                </div>
                <div className="yk-fiscal-party-detail">
                  <span>Client TIN / የደንበኛ ቲን:</span>{" "}
                  <b className="yk-mono">{clientTinInput}</b>
                </div>
                <div className="yk-fiscal-party-detail">
                  <span>Contract &amp; Milestone / የውል ምዕራፍ:</span>{" "}
                  <b className="yk-mono">{contractCode}</b>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Bilingual Line-Item Fiscal Table */}
        <section className="yk-fiscal-table-wrap">
          <table className="yk-fiscal-table">
            <thead>
              <tr>
                <th style={{ width: "12%" }}>
                  <div>Code</div>
                  <small>መለያ</small>
                </th>
                <th style={{ width: "48%" }}>
                  <div>Description (English / አማርኛ)</div>
                  <small>የክፍያ ዝርዝር መግለጫ</small>
                </th>
                <th style={{ width: "16%", textAlign: "right" }}>
                  <div>Rate / Basis</div>
                  <small>መጣኔ</small>
                </th>
                <th style={{ width: "24%", textAlign: "right" }}>
                  <div>Amount (ETB)</div>
                  <small>የገንዘብ መጠን (ብር)</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {activeDocType === "CLIENT_INVOICE" ? (
                <>
                  <tr>
                    <td className="yk-mono">MS-01</td>
                    <td>
                      <div className="yk-fiscal-line-en">
                        Escrow Principal Deposit — {milestoneTitle}
                      </div>
                      <div className="yk-fiscal-line-am">
                        ዋና የምዕራፍ ክፍያ ተቀማጭ (በኢስክሮ የሚጠበቅ ክፍያ)
                      </div>
                    </td>
                    <td className="yk-mono" style={{ textAlign: "right" }}>
                      100.0%
                    </td>
                    <td className="yk-mono" style={{ textAlign: "right" }}>
                      {formatEtbNum(principal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="yk-mono">FEE-CL</td>
                    <td>
                      <div className="yk-fiscal-line-en">
                        Yekis Client Escrow Protection &amp; Gateway Processing Fee
                      </div>
                      <div className="yk-fiscal-line-am">
                        የደንበኛ የኢስክሮ ጥበቃ እና የክፍያ ማስፈጸሚያ አገልግሎት ክፍያ
                      </div>
                    </td>
                    <td className="yk-mono" style={{ textAlign: "right" }}>
                      +{(clientFeeRate * 100).toFixed(1)}%
                    </td>
                    <td className="yk-mono" style={{ textAlign: "right" }}>
                      +{formatEtbNum(clientEscrowFee)}
                    </td>
                  </tr>
                  {isVatEnabled && (
                    <tr>
                      <td className="yk-mono">TAX-VAT</td>
                      <td>
                        <div className="yk-fiscal-line-en">
                          Ethiopian Value Added Tax (ERCA Standard VAT)
                        </div>
                        <div className="yk-fiscal-line-am">
                          ተጨማሪ እሴት ታክስ (ተ.እ.ታ 15% — በገቢዎች ሚኒስቴር ደንብ መሠረት)
                        </div>
                      </td>
                      <td className="yk-mono" style={{ textAlign: "right" }}>
                        +15.0%
                      </td>
                      <td className="yk-mono" style={{ textAlign: "right" }}>
                        +{formatEtbNum(clientVatAmount)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <>
                  <tr>
                    <td className="yk-mono">MS-REL</td>
                    <td>
                      <div className="yk-fiscal-line-en">
                        Gross Milestone Amount Released from Escrow — {milestoneTitle}
                      </div>
                      <div className="yk-fiscal-line-am">
                        ከኢስክሮ የተለቀቀ ጠቅላላ የምዕራፍ የሥራ ክፍያ
                      </div>
                    </td>
                    <td className="yk-mono" style={{ textAlign: "right" }}>
                      100.0%
                    </td>
                    <td className="yk-mono" style={{ textAlign: "right" }}>
                      {formatEtbNum(principal)}
                    </td>
                  </tr>
                  {isVatEnabled && (
                    <tr>
                      <td className="yk-mono">TAX-VAT</td>
                      <td>
                        <div className="yk-fiscal-line-en">
                          Output VAT Collected (15% Registered Commercial Invoice)
                        </div>
                        <div className="yk-fiscal-line-am">
                          የተሰበሰበ ተጨማሪ እሴት ታክስ (ተ.እ.ታ 15%)
                        </div>
                      </td>
                      <td className="yk-mono" style={{ textAlign: "right" }}>
                        +15.0%
                      </td>
                      <td className="yk-mono" style={{ textAlign: "right" }}>
                        +{formatEtbNum(freelancerVatCredit)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="yk-mono">FEE-FL</td>
                    <td>
                      <div className="yk-fiscal-line-en">
                        Less: Yekis Freelancer Platform &amp; Settlement Service Fee
                      </div>
                      <div className="yk-fiscal-line-am">
                        ሲቀነስ፦ የዬኪስ የባለሙያ አገልግሎት እና የክፍያ ማስተላለፊያ ክፍያ
                      </div>
                    </td>
                    <td className="yk-mono" style={{ textAlign: "right" }}>
                      -{(freelancerFeeRate * 100).toFixed(1)}%
                    </td>
                    <td className="yk-mono yk-neg" style={{ textAlign: "right" }}>
                      -{formatEtbNum(freelancerServiceFee)}
                    </td>
                  </tr>
                  <tr>
                    <td className="yk-mono">TAX-WHT</td>
                    <td>
                      <div className="yk-fiscal-line-en">
                        Less: ERCA Statutory Withholding Tax (
                        {isWhtEnabled
                          ? isTinVerified
                            ? "3% Verified TIN & License"
                            : "30% Unverified TIN Rate"
                          : "0% Exempt"}
                        )
                      </div>
                      <div className="yk-fiscal-line-am">
                        ሲቀነስ፦ የገቢዎች ሚኒስቴር የዊዝሆልዲንግ ታክስ ተቀናሽ (
                        {isWhtEnabled
                          ? isTinVerified
                            ? "3% የተረጋገጠ ቲን"
                            : "30% ያልተረጋገጠ ቲን"
                          : "0% ነጻ"}
                        )
                      </div>
                    </td>
                    <td className="yk-mono" style={{ textAlign: "right" }}>
                      -{(whtRate * 100).toFixed(1)}%
                    </td>
                    <td className="yk-mono yk-neg" style={{ textAlign: "right" }}>
                      -{formatEtbNum(whtAmount)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
            <tfoot>
              <tr className="yk-fiscal-total-row">
                <td colSpan={2}>
                  {activeDocType === "CLIENT_INVOICE" ? (
                    <>
                      <div className="yk-fiscal-total-en">
                        TOTAL AMOUNT FUNDED INTO ESCROW
                      </div>
                      <div className="yk-fiscal-total-am">
                        ወደ ኢስክሮ ካዝና የተከፈለ ጠቅላላ የገንዘብ መጠን
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="yk-fiscal-total-en">
                        NET PAYOUT DISBURSED TO FREELANCER ACCOUNT
                      </div>
                      <div className="yk-fiscal-total-am">
                        ወደ ባለሙያው ሂሳብ የተላለፈ የተጣራ ተከፋይ ብር
                      </div>
                    </>
                  )}
                </td>
                <td className="yk-mono" style={{ textAlign: "right" }}>
                  {activeDocType === "CLIENT_INVOICE"
                    ? "PAID IN FULL"
                    : "NET SETTLED"}
                </td>
                <td className="yk-mono yk-fiscal-grand-num" style={{ textAlign: "right" }}>
                  {activeDocType === "CLIENT_INVOICE"
                    ? formatEtbNum(clientTotalPayable)
                    : formatEtbNum(freelancerNetDisbursed)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Payment Rail Proof + ERCA Tax Certificate Box */}
        <section className="yk-fiscal-bottom-grid">
          {/* Left: Payment Rail Settlement Proof */}
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

          {/* Right: ERCA Tax & AACCSA Legal Covenant Box */}
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

        {/* Official Verification Footer */}
        <footer className="yk-fiscal-footer">
          <div>
            <span>Digital Verification Hash: </span>
            <code className="yk-mono">
              SHA256:{serial.replace(/[^A-Z0-9]/g, "")}8F92A4C1E7B3
            </code>
          </div>
          <div>
            <span>Issued by Yekis Escrow Ledger · </span>
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
