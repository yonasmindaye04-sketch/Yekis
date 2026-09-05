// === IMPORTS ===
import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

// === CONSTANTS & PATTERNS ===
export const REDACTED_MESSAGE = "[REDACTED - Contact Info Sharing Prohibited]";

// Amharic Fidel Numerals
const ETHIOPIC_NUMERAL_MAP: Record<string, string> = {
  "፩": "1",
  "፪": "2",
  "፫": "3",
  "፬": "4",
  "፭": "5",
  "፮": "6",
  "፯": "7",
  "፰": "8",
  "፱": "9",
  "፲": "10",
  "፳": "20",
  "፴": "30",
  "፵": "40",
  "፶": "50",
};

// Amharic Word Numbers
const AMHARIC_WORD_NUM_MAP: Record<string, string> = {
  "ዜሮ": "0",
  "አንድ": "1",
  "ሁለት": "2",
  "ሶስት": "3",
  "አራት": "4",
  "አምስት": "5",
  "ስድስት": "6",
  "ሰባት": "7",
  "ስምንት": "8",
  "ዘጠኝ": "9",
  "አስር": "10",
  "ሃያ": "20",
  "ሰላሳ": "30",
  "አርባ": "40",
  "ሃምሳ": "50",
};

// English Word Numbers
const ENGLISH_WORD_NUM_MAP: Record<string, string> = {
  "zero": "0",
  "one": "1",
  "two": "2",
  "three": "3",
  "four": "4",
  "five": "5",
  "six": "6",
  "seven": "7",
  "eight": "8",
  "nine": "9",
  "ten": "10",
  "oh": "0",
};

/**
 * Normalizes input text by mapping Amharic words, Ethiopic numerals,
 * English number words, and leetspeak into a canonical digit string.
 */
export function normalizeMultiScriptText(input: string): string {
  let text = input;

  // 1. Replace Ethiopic numerals
  for (const [eth, arab] of Object.entries(ETHIOPIC_NUMERAL_MAP)) {
    text = text.replaceAll(eth, arab);
  }

  // 2. Replace Amharic word numbers using Unicode character property boundaries (flag 'u')
  for (const [amharic, arab] of Object.entries(AMHARIC_WORD_NUM_MAP)) {
    text = text.replace(new RegExp(`(?<!\\p{L})${amharic}(?!\\p{L})`, "gu"), arab);
  }

  // 3. Replace English word numbers
  for (const [eng, arab] of Object.entries(ENGLISH_WORD_NUM_MAP)) {
    text = text.replace(new RegExp(`\\b${eng}\\b`, "gi"), arab);
  }

  // 4. Map obfuscated domain/email tokens: [at], (at), [dot], (dot) including surrounding whitespace
  text = text.replace(/\s*(?:\[|\()\s*at\s*(?:\]|\))\s*/gi, "@");
  text = text.replace(/\s*(?:\[|\()\s*dot\s*(?:\]|\))\s*/gi, ".");

  // 5. Common leetspeak: letter 'o' or 'O' directly followed by 9 or 7
  text = text.replace(/\b[oO]([97]\d{7,8})\b/g, "0$1");

  return text;
}

/**
 * Detects if a string contains spaced-out or symbol-separated Ethiopian phone numbers
 * e.g. "0 9 1 1 2 3 4 5 6 7" or "09-11-23-45-67" or "+ 2 5 1 9 1 1 ..."
 */
function containsObfuscatedPhone(text: string): boolean {
  // Strip spaces, dashes, dots, underscores, slashes between digits
  const digitSequence = text.replace(/[\s\-_./\\()]/g, "");
  const phonePattern = /(?:\+?251|0)[97]\d{8}/;
  return phonePattern.test(digitSequence);
}

// Regex patterns to match direct text representations
const DIRECT_CONTACT_PATTERNS = [
  /(?:\+?251|0)[97]\d{8}/g, // Ethiopian phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Email addresses
  /(?:t\.me\/|telegram\.me\/|@)[A-Za-z0-9_]{5,32}/gi, // Telegram links/handles
  /\b(?:whatsapp|viber|imo|signal|call me|email me|contact me at|reach me at)\b/gi, // Off-platform keywords
  /(?:ደውልልኝ|ደውይሊኝ|ስልክ\s*ቁጥር|ቴሌግራም|ዋትሳፕ|ኢሜይል)/gi, // Amharic contact keywords
];

// === MAIN FUNCTIONS ===
export function sanitizeContactInfo(text: string): {
  sanitized: string;
  flagged: boolean;
  reason?: string;
} {
  if (!text || typeof text !== "string") {
    return { sanitized: text, flagged: false };
  }

  let flagged = false;
  let reason: string | undefined;
  let sanitized = text;

  // 1. Check direct patterns in original text
  for (const pattern of DIRECT_CONTACT_PATTERNS) {
    if (pattern.test(sanitized)) {
      flagged = true;
      reason = "Direct contact info pattern detected";
      sanitized = sanitized.replace(pattern, REDACTED_MESSAGE);
    }
  }

  // 2. Check normalized & multi-script transliterated text
  const normalized = normalizeMultiScriptText(sanitized);
  if (containsObfuscatedPhone(normalized)) {
    flagged = true;
    reason = "Obfuscated or multi-script phone number detected";
    // Replace the entire matched phone phrase in sanitized text
    sanitized = REDACTED_MESSAGE;
  } else {
    for (const pattern of DIRECT_CONTACT_PATTERNS) {
      if (pattern.test(normalized)) {
        flagged = true;
        reason = "Transliterated contact info pattern detected";
        sanitized = REDACTED_MESSAGE;
        break;
      }
    }
  }

  return { sanitized, flagged, reason };
}

export function antiCircumventionMiddleware(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === "object") {
      for (const field of fields) {
        if (typeof req.body[field] === "string") {
          const { sanitized, flagged, reason } = sanitizeContactInfo(req.body[field]);
          if (flagged) {
            logger.warn(
              { field, reason, userId: (req as any).user?.id },
              "Anti-circumvention triggered: contact info detected — rejecting with HTTP 400",
            );
            return res.status(400).json({
              error: "CIRCUMVENTION_DETECTED",
              message:
                "Sharing contact information (phone numbers, email addresses, or external handles) is strictly prohibited on Yekis. Please keep all communication inside the platform.",
              field,
              reason,
            });
          }
        }
      }
    }
    next();
  };
}
