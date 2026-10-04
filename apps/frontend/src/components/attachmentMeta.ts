// === CHAT ATTACHMENT HELPERS ===
//
// Shared by the participant chat workspace and the staff support desk so both
// derive the same label and preview decision from the same code.

export function isImageAttachment(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

/**
 * Human-readable filename for an attachment.
 *
 * Storage keys are `<uuid>-<safeName>`, so the leading uuid is stripped to leave
 * the name the uploader chose. Falls back to a generic label when the URL has no
 * usable filename.
 */
export function getAttachmentLabel(url: string | null | undefined): string {
  if (!url) return "Attachment";
  if (url.startsWith("data:image/")) return "Image attachment";
  const clean = url.split("?")[0];
  const parts = clean.split("/");
  const last = parts[parts.length - 1];
  try {
    const decoded = decodeURIComponent(last);
    return decoded.replace(/^[a-f0-9-]+_?/, "") || "Attachment";
  } catch {
    return "Attachment";
  }
}