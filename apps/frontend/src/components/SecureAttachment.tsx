// === SECURE ATTACHMENT ===
//
// Renders a chat attachment by fetching it with an explicit bearer token and
// displaying the result as an object URL.
//
// Why this exists: the attachment route is authorized (an opaque storage key
// alone is not enough to read a file). Browsers do not attach an Authorization
// header to `<img src>` or to a plain link navigation, so the naive markup would
// 401 on every attachment. Fetching explicitly and wrapping the result in an
// object URL is the standard way to render authorized binary content.
//
// Two invariants this component maintains:
//   * Loading/error state is DERIVED from the request key, never written
//     synchronously inside the effect. Setting it there causes a cascading
//     render, and deriving it also prevents flashing the previous attachment's
//     blob while a new one loads.
//   * Object URLs are revoked on unmount and whenever the source changes, so a
//     blob cannot outlive the component that created it.
import { useEffect, useState } from "react";
import { FileText, ExternalLink, Paperclip } from "lucide-react";
import { api } from "../api/client";

/**
 * Compact, click-to-load variant for dense lists (the staff support desk shows
 * many messages at once, so eagerly fetching every attachment would be wasteful).
 *
 * Nothing is requested until the user activates it.
 */
export function SecureAttachmentLink({
  url,
  token,
  label,
}: {
  url: string;
  token: string | null;
  label: string;
}) {
  const [href, setHref] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const open = async () => {
    if (href || failed || !token) return;
    try {
      const blob = await api.fetchAttachmentBlob(url, token);
      setHref(URL.createObjectURL(blob));
    } catch {
      setFailed(true);
    }
  };

  if (failed || !token) {
    return (
      <span>
        <Paperclip size={12} /> {label}
      </span>
    );
  }

  if (!href) {
    return (
      <button
        type="button"
        onClick={() => void open()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          padding: 0,
          color: "inherit",
          textDecoration: "underline",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        <Paperclip size={12} /> {label}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" download={label}>
      <Paperclip size={12} /> {label}
    </a>
  );
}

export interface SecureAttachmentProps {
  /** Path or absolute URL as stored on the message. */
  url: string;
  /** Bearer token to authorize the read (session token or guest support token). */
  token: string | null;
  /** Human-readable filename shown in the non-image case. */
  label: string;
  /** True for image/* content, which gets an inline preview. */
  isImage: boolean;
}

interface LoadedState {
  /** The `${token}|${url}` this result belongs to. */
  key: string;
  objectUrl: string | null;
  failed: boolean;
}

export function SecureAttachment({
  url,
  token,
  label,
  isImage,
}: SecureAttachmentProps) {
  const [loaded, setLoaded] = useState<LoadedState>({
    key: "",
    objectUrl: null,
    failed: false,
  });

  const requestKey = `${token ?? ""}|${url ?? ""}`;
  const missingCredentials = !token || !url;

  // Derived: a result only counts when it was produced for the current request.
  const isCurrent = loaded.key === requestKey;
  const objectUrl = isCurrent ? loaded.objectUrl : null;
  const failed = isCurrent && loaded.failed;
  const loading = !missingCredentials && !isCurrent;

  useEffect(() => {
    if (missingCredentials) return;

    let cancelled = false;
    let created: string | null = null;

    api
      .fetchAttachmentBlob(url, token as string)
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setLoaded({ key: requestKey, objectUrl: created, failed: false });
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ key: requestKey, objectUrl: null, failed: true });
        }
      });

    return () => {
      cancelled = true;
      // Revoke only the URL this effect created; a newer effect owns its own.
      if (created) URL.revokeObjectURL(created);
    };
  }, [url, token, requestKey, missingCredentials]);

  if (missingCredentials || failed) {
    return (
      <div className="bubble-attachment" title="Attachment unavailable.">
        <Paperclip size={14} />
        <span>{label}</span>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="bubble-attachment-container">
        {objectUrl ? (
          <a
            href={objectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bubble-attachment-img-link"
          >
            <img
              src={objectUrl}
              alt={label}
              className="bubble-attachment-preview"
              loading="lazy"
            />
          </a>
        ) : (
          <div
            className="bubble-attachment-preview"
            aria-busy={loading}
            aria-label={loading ? `Loading ${label}` : label}
          />
        )}
      </div>
    );
  }

  // Non-image files: the download link must also be an authorized fetch, so the
  // object URL backs both the href and the download filename.
  return (
    <div className="bubble-attachment">
      {objectUrl ? (
        <a
          href={objectUrl}
          download={label}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText size={14} />
          <span>{label}</span>
          <ExternalLink size={12} />
        </a>
      ) : (
        <>
          <FileText size={14} />
          <span>{label}</span>
        </>
      )}
    </div>
  );
}