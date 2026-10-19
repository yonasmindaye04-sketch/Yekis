// === IMPORTS ===
import { useCallback, useEffect, useState } from "react";
import { Check, Fingerprint, Upload } from "lucide-react";
import { api, type KycStatusResponse } from "./api/client";

// === MAIN COMPONENT ===
export function BrowserVerification() {
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

  const canRequestTier2 =
    status?.status === "VERIFIED" && status.tier === "TIER_1";
  return (
    <div className="verification-stack">
      <section className="panel browser-verification-panel">
        <div className="verification-intro">
          <span className="step-number">
            <Fingerprint size={18} />
          </span>
          <div>
            <p className="eyebrow">Fayda identity review</p>
            <h2>Verify your identity</h2>
            <p>
              Upload your Fayda ID. Fayda verification completes a biometric
              selfie check in a secure popup and may clear Tier 1 automatically.
            </p>
          </div>
        </div>
        <div className="form-grid verification-form" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <label>
            Full name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="As shown on your ID"
            />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
            />
          </label>
          <label className="form-wide" style={{ gridColumn: "1 / -1" }}>
            Fayda ID number
            <input
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              placeholder="Enter your Fayda ID number"
            />
          </label>
          <label className="verification-upload form-wide" style={{ gridColumn: "1 / -1" }}>
            Fayda ID photo
            <small style={{ minHeight: 48, cursor: "pointer" }}>
              <Upload size={16} />
              {idPhoto?.name ?? "Choose ID photo (front and back)"}
            </small>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setIdPhoto(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <p className="wallet-help" style={{ marginTop: "4px" }}>
          Identity verification now uses Fayda (eSignet) biometrics. After
          submitting your ID here you will complete a verification check in
          the Fayda popup directly from the Identity section.
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
          {sending ? "Submitting..." : "Submit Tier 1 documents"}
        </button>
      </section>
      <section className="panel verification-status-panel">
        <div>
          <p className="eyebrow">Current status</p>
          <h2>{status?.status?.replace("_", " ") ?? "Loading..."}</h2>
          <p>Tier: {status?.tier ?? "TIER_1"}</p>
        </div>
        <span className="status-pill">{status?.status ?? "PENDING"}</span>
      </section>
      {canRequestTier2 && (
        <section className="panel tier2-panel">
          <div>
            <p className="eyebrow">Withdrawal access</p>
            <h2>Request Tier 2 verification</h2>
            <p>
              Tier 2 requires a PEP screening and staff approval before
              withdrawals are enabled.
            </p>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <label>
              TIN
              <input
                value={tin}
                onChange={(event) => setTin(event.target.value)}
                placeholder="Tax identification number"
              />
            </label>
            <label>
              Business registration
              <input
                value={businessRegNumber}
                onChange={(event) => setBusinessRegNumber(event.target.value)}
                placeholder="Optional if TIN supplied"
              />
            </label>
          </div>
          <button
            className="btn-primary"
            onClick={() => void requestTier2()}
            disabled={sending}
            style={{ width: "fit-content", marginTop: 16 }}
          >
            Request Tier 2
          </button>
        </section>
      )}
    </div>
  );
}
