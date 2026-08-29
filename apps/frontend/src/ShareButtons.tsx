import { Share2, MessageCircle, Link2 } from "lucide-react";
import { useState } from "react";

function Twitter(props: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

interface ShareButtonsProps {
  title: string;
  url?: string;
  compact?: boolean;
}

export function ShareButtons({ title, url, compact }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    url ||
    (typeof window !== "undefined"
      ? window.location.href
      : "https://yekis.com");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        /* user cancelled */
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className={`share-buttons ${compact ? "share-compact" : ""}`}>
      {"share" in navigator && (
        <button
          onClick={handleNativeShare}
          className="share-btn share-native"
          aria-label="Share"
        >
          <Share2 size={16} />
          {!compact && <span>Share</span>}
        </button>
      )}
      <a
        href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-telegram"
        aria-label="Share on Telegram"
      >
        <MessageCircle size={16} />
        {!compact && <span>Telegram</span>}
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-twitter"
        aria-label="Share on X"
      >
        <Twitter size={16} />
        {!compact && <span>X</span>}
      </a>
      <button
        onClick={handleCopy}
        className="share-btn share-copy"
        aria-label="Copy link"
      >
        <Link2 size={16} />
        {!compact && <span>{copied ? "Copied!" : "Copy link"}</span>}
      </button>
    </div>
  );
}
