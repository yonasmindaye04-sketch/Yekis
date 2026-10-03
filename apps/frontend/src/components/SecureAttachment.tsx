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
// Object URLs are revoked on unmount and whenever the source changes, so a blob
// cannot outlive the component that created it.
import { useEffect, useState } from "react";
import { FileText, ExternalLink, Paperclip } from "lucide-react";
import { api } from "../api/client";

export interface SecureAttachmentProps {
  /** Path or absolute URL as stored on the message. */
  url: string;
  /** Bearer token to authorize the read (session token or guest support token). */
  token: string | null;
  /** Human-readable filename shown in the non-image case. */
  label: string;
  /** True for image/* content, which gets an inline preview. */
  isImage: boolean;
  className?: string;
}

export function SecureAttachment({
  url,
  token,
  label,
  isImage,
  className,
}: SecureAttachmentProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !url) {
      setError("Attachment unavailable.");
      return;
    }

    let cancelled = false;
    let created: string | null = null;
    setLoading(true);
    setError(null);

    api
      .fetchAttachmentBlob(url, token)
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      })
      .catch(() => {
        if (!cancelled) setError("Attachment unavailable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      // Revoke only the URL this effect created; a newer effect owns its own.
      if (created) URL.revokeObjectURL(created);
    };
  }, [url, token]);

  if (error) {
    return (
      <div className="bubble-attachment" title={error}>
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
            aria-busy="true"
            aria-label={loading ? `Loading ${label}` : label}
          />
        )}
      </div>
    );
  }

  // Non-image files: the download link must also be an authorized fetch, so the
  // object URL is used for both the href and the filename.
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