// === IMPORTS ===
import { Request, Response, NextFunction } from "express";

/**
 * Regex patterns to detect off-platform contact attempts:
 * - Phone numbers (Ethiopian formats e.g. +251, 09..., 07...)
 * - Email addresses
 * - Telegram handles / links
 */
const CONTACT_PATTERNS = [
  /(\+?251|0)[97]\d{8}/g, // Ethiopian phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Email addresses
  /(?:t\.me\/|telegram\.me\/|@)[A-Za-z0-9_]{5,32}/gi, // Telegram links/handles
  /\b(?:whatsapp|viber|imo|signal|phone|call me|email me|contact me at)\b/gi, // Common contact keywords
];

// === MAIN FUNCTIONS ===
export function sanitizeContactInfo(text: string): {
  sanitized: string;
  flagged: boolean;
} {
  let flagged = false;
  let sanitized = text;

  for (const pattern of CONTACT_PATTERNS) {
    if (pattern.test(sanitized)) {
      flagged = true;
      sanitized = sanitized.replace(
        pattern,
        "[REDACTED - Contact Info Sharing Prohibited]",
      );
    }
  }

  return { sanitized, flagged };
}

export function antiCircumventionMiddleware(fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === "object") {
      for (const field of fields) {
        if (typeof req.body[field] === "string") {
          const { sanitized, flagged } = sanitizeContactInfo(req.body[field]);
          if (flagged) {
            req.body[field] = sanitized;
            (req.body as Record<string, unknown>)._circumventionFlagged = true;
          }
        }
      }
    }
    next();
  };
}
