import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "./api/client";

export default function FaydaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing secure handshake...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const urlError = searchParams.get("error");

    const savedState = sessionStorage.getItem("oidc_state");

    if (urlError) {
      setError(`Verification Failed: ${urlError}`);
      return;
    }

    if (!state || state !== savedState) {
      setError(
        "Security Error: Invalid state parameter. The session might have been hijacked.",
      );
      return;
    }

    if (code) {
      api
        .completeFaydaCallback({ code, state })
        .then((result) => {
          setStatus("Identity verified successfully.");
          sessionStorage.removeItem("oidc_state");
          setTimeout(() => navigate("/dashboard"), 2000);
        })
        .catch((err) => {
          console.error(err);
          setError("Server Handshake failed. " + err.message);
        });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 max-w-sm w-full bg-white border rounded-xl shadow-lg text-center">
        {!error && (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        )}
        {error ? (
          <p className="text-red-600 font-medium">{error}</p>
        ) : (
          <p className="text-gray-700 font-medium">{status}</p>
        )}
      </div>
    </div>
  );
}
