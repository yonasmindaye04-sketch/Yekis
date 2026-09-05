import { describe, it, expect, vi } from "vitest";
import {
  sanitizeContactInfo,
  REDACTED_MESSAGE,
  normalizeMultiScriptText,
  antiCircumventionMiddleware,
} from "../src/middleware/circumvention.middleware.js";

describe("Enhanced Anti-Circumvention Multi-Script Engine", () => {
  it("leaves normal project communication untouched", () => {
    const cleanText = "I have uploaded the Figma design and the contract milestone is ready for review.";
    const result = sanitizeContactInfo(cleanText);
    expect(result.flagged).toBe(false);
    expect(result.sanitized).toBe(cleanText);
  });

  it("detects standard Ethiopian phone numbers", () => {
    const text = "You can call me on 0911223344 anytime.";
    const result = sanitizeContactInfo(text);
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toContain(REDACTED_MESSAGE);
  });

  it("detects spaced-out phone numbers used to evade regex", () => {
    const text = "reach out: 0 9 1 1 2 2 3 3 4 4";
    const result = sanitizeContactInfo(text);
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toBe(REDACTED_MESSAGE);
  });

  it("detects symbol-separated phone numbers", () => {
    const text = "my contact is 09-11-22-33-44";
    const result = sanitizeContactInfo(text);
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toBe(REDACTED_MESSAGE);
  });

  it("detects leetspeak phone numbers (letter O instead of zero)", () => {
    const text = "phone: O911223344";
    const result = sanitizeContactInfo(text);
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toBe(REDACTED_MESSAGE);
  });

  it("detects English spelled-out numbers", () => {
    const text = "number: zero nine one one two two three three four four";
    const result = sanitizeContactInfo(text);
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toBe(REDACTED_MESSAGE);
  });

  it("detects Amharic spelled-out number words", () => {
    const text = "ቁጥሬ ዜሮ ዘጠኝ አንድ አንድ ሁለት ሁለት ሶስት ሶስት አራት አራት ነው";
    const result = sanitizeContactInfo(text);
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toBe(REDACTED_MESSAGE);
  });

  it("detects Amharic call-me keywords", () => {
    const text = "እባክህ ደውልልኝ";
    const result = sanitizeContactInfo(text);
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toContain(REDACTED_MESSAGE);
  });

  it("detects obfuscated email addresses with [at] and (dot)", () => {
    const text = "send it to freelancer [at] gmail (dot) com";
    const normalized = normalizeMultiScriptText(text);
    expect(normalized).toContain("freelancer@gmail.com");
  });

  it("rejects request with HTTP 400 when contact info is detected in monitored field", () => {
    const req = {
      body: { message: "Call me directly at 0911223344 for a discount." },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    const middleware = antiCircumventionMiddleware(["message"]);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "CIRCUMVENTION_DETECTED",
        field: "message",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("allows clean messages to proceed through middleware calling next()", () => {
    const req = {
      body: { message: "I have uploaded the contract deliverables on the dashboard." },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    const middleware = antiCircumventionMiddleware(["message"]);
    middleware(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});

