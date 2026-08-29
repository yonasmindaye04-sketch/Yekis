import React, { useState } from "react";
import { api } from "./api/client";

export default function FaydaVerify() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateFaydaVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const { authorizeUrl, requestUri, state } = await api.initiateFaydaKyc();
      sessionStorage.setItem("oidc_state", state);

      const targetUrl = new URL(authorizeUrl);
      targetUrl.searchParams.set("request_uri", requestUri);

      window.location.href = targetUrl.toString();
    } catch (err: any) {
      console.error("OIDC Initiation Failed:", err);
      setError(
        err.message || "Verification server is unreachable. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto border rounded-xl bg-white shadow-sm text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">
        Verify Identity with Fayda
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        To maintain trust and comply with local regulations, Yekis Jobs requires
        you to link your account to your digital National ID.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      <button
        onClick={initiateFaydaVerification}
        disabled={loading}
        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:bg-gray-400 transition duration-150"
      >
        {loading ? "Routing to Fayda..." : "Launch Fayda e-KYC Verification"}
      </button>
    </div>
  );
}
