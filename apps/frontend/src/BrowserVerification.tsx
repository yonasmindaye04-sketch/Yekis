// === IMPORTS ===
import { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, Fingerprint, ShieldCheck, Upload, X } from "lucide-react";
import { api, type KycStatusResponse } from "./api/client";
import { useI18n } from "./i18n";
import { formatStatusLabel, statusTone } from "./pages/ops/components/ui";

// === MAIN COMPONENT ===
export function BrowserVerification() {
  const { t } = useI18n();
  const k = t.workspace.kycFlow;
  const [status, setStatus] = useState<KycStatusResponse | null>(null);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  // Fayda selfie handled by eSignet
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tin, setTin] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");

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

  const submit = async () => {
    if (!fullName || !dob || !documentNumber || !idPhoto) {
      setMessage(
        "Add your name, date of birth, Fayda ID number, and photo of the ID card (front and back).",
      );
      return;
    }
    setSending(true);
    setMessage("");
    try {
      // Now we only upload the national ID, biometric verification is handled via Fayda OIDC
      for (const [documentType, file] of [["NATIONAL_ID", idPhoto]] as const) {
        const data = new FormData();
        data.append("file", file);
        data.append("documentType", documentType);
        data.append("fullName", fullName);
        data.append("dateOfBirth", dob);
        data.append("documentNumber", documentNumber);
        await api.submitKycDocument(data);
      }
      setMessage("Submitted for manual review.");
      await refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to submit verification",
      );
    } finally {
      setSending(false);
    }
  };

  const requestTier2 = async () => {
    if (!tin.trim() && !businessRegNumber.trim()) {
      setMessage("Enter a TIN or business registration number.");
      return;
    }
    setSending(true);
    setMessage("");
    try {
      await api.upgradeKycTier2({
        tin: tin.trim() || undefined,
        businessRegNumber: businessRegNumber.trim() || undefined,
      });
      setMessage(
        "Tier 2 review requested. A compliance officer will review the screening result.",
      );
      await refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to request Tier 2",
      );
    } finally {
      setSending(false);
    }
  };

  const currentTier = status?.tier ?? "TIER_1";
  const currentStatus = status?.status ?? "PENDING";
  const tier1Done =
    currentStatus === "VERIFIED" &&
    (currentTier === "TIER_1" || currentTier === "TIER_2");
  const tier2Done = currentStatus === "VERIFIED" && currentTier === "TIER_2";
  const canRequestTier2 =
    status?.status === "VERIFIED" && status.tier === "TIER_1";

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
            <span className={`status-pill ${statusTone(currentTier)}`}>
              {formatStatusLabel(currentTier, t.workspace.statuses)}
            </span>
            <span className={`status-pill ${statusTone(currentStatus)}`}>
              {formatStatusLabel(currentStatus, t.workspace.statuses)}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
        </div>
      </section>

      <section className="panel browser-verification-panel">
        <div className="verification-intro">
          <span className="step-number">
            <Fingerprint size={18} />
          </span>
          <div>
            <p className="eyebrow">{k.eyebrowFayda}</p>
            <h2>{k.verifyHeading}</h2>
            <p>{k.verifyDesc}</p>
          </div>
        </div>
        <div className="form-grid verification-form">
          <label>
            {k.fullNameLabel}
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={k.fullNamePlaceholder}
            />
          </label>
          <label>
            {k.dobLabel}
            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
            />
          </label>
          <label className="form-wide" style={{ gridColumn: "1 / -1" }}>
            {k.faydaIdLabel}
            <input
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              placeholder={k.faydaIdPlaceholder}
            />
          </label>
          <div className="verification-upload form-wide" style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>{k.faydaPhotoLabel}</span>
              <small style={{ minHeight: 48, cursor: "pointer" }}>
                <Upload size={16} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {idPhoto
                    ? `${idPhoto.name} (${(idPhoto.size / 1024).toFixed(1)} KB)`
                    : k.chooseIdPhoto}
                </span>
              </small>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setIdPhoto(event.target.files?.[0] ?? null)}
              />
            </label>
            {idPhoto && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ minHeight: 38, padding: "6px 12px", fontSize: "0.8rem" }}
                  onClick={() => setIdPhoto(null)}
                >
                  <X size={14} /> {k.clearFile}
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="wallet-help" style={{ marginTop: "4px" }}>
          {k.faydaHelp}
        </p>
        {message && (
          <p className="verification-message">
            <Check size={16} />
            {message}
          </p>
        )}
        <button
          className="btn-primary"
          onClick={() => void submit()}
          disabled={sending}
          style={{ width: "fit-content", marginTop: 8 }}
        >
          {sending ? k.submittingBtn : k.submitTier1Btn}
        </button>
      </section>

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
    </div>
  );
}

