import { describe, it, expect, vi } from "vitest";
import { scopedDelete } from "./scopedDelete.js";

/**
 * Prisma treats an `undefined` filter value as "no filter". So
 *   deleteMany({ where: { contractId } })   // contractId === undefined
 * silently becomes deleteMany({}) — which is how a test once deleted every
 * Milestone row in the development database.
 *
 * scopedDelete refuses that class of mistake instead of executing it.
 */

function fakeDelegate() {
  return { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) };
}

describe("scopedDelete refuses a filter that is not actually scoped", () => {
  it("throws on an empty where clause", async () => {
    const delegate = fakeDelegate();
    await expect(scopedDelete(delegate as never, {})).rejects.toThrow(
      /empty/i,
    );
    expect(delegate.deleteMany).not.toHaveBeenCalled();
  });

  it("throws when a top-level value is undefined", async () => {
    const delegate = fakeDelegate();
    const contractId: string | undefined = undefined;
    await expect(
      scopedDelete(delegate as never, { contractId }),
    ).rejects.toThrow(/undefined/i);
    expect(delegate.deleteMany).not.toHaveBeenCalled();
  });

  it("throws when a nested value is undefined", async () => {
    const delegate = fakeDelegate();
    await expect(
      scopedDelete(delegate as never, {
        journal: { idempotencyKey: { contains: undefined } },
      }),
    ).rejects.toThrow(/undefined/i);
    expect(delegate.deleteMany).not.toHaveBeenCalled();
  });

  it("throws when an element of an array filter is undefined", async () => {
    const delegate = fakeDelegate();
    await expect(
      scopedDelete(delegate as never, { id: { in: [undefined] } }),
    ).rejects.toThrow(/undefined/i);
    expect(delegate.deleteMany).not.toHaveBeenCalled();
  });

  it("throws when where is missing entirely", async () => {
    const delegate = fakeDelegate();
    await expect(
      scopedDelete(delegate as never, undefined as never),
    ).rejects.toThrow(/required|empty|missing/i);
    expect(delegate.deleteMany).not.toHaveBeenCalled();
  });

  it("names the offending path so the bug is obvious from the message", async () => {
    const delegate = fakeDelegate();
    await expect(
      scopedDelete(delegate as never, {
        milestone: { contract: { id: undefined } },
      }),
    ).rejects.toThrow(/where\.milestone\.contract\.id/);
  });

  it("allows an explicit null, which is a real filter value", async () => {
    const delegate = fakeDelegate();
    await scopedDelete(delegate as never, { resolvedAt: null });
    expect(delegate.deleteMany).toHaveBeenCalledWith({
      where: { resolvedAt: null },
    });
  });

  it("allows falsy-but-defined values like 0 and the empty string", async () => {
    const delegate = fakeDelegate();
    await scopedDelete(delegate as never, { count: 0, note: "" });
    expect(delegate.deleteMany).toHaveBeenCalledWith({
      where: { count: 0, note: "" },
    });
  });

  it("allows an empty in: array, which matches nothing rather than everything", async () => {
    const delegate = fakeDelegate();
    await scopedDelete(delegate as never, { id: { in: [] } });
    expect(delegate.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("passes a real filter through and returns the deleted count", async () => {
    const delegate = fakeDelegate();
    const result = await scopedDelete(delegate as never, {
      contractId: "abc123",
    });
    expect(result).toEqual({ count: 3 });
    expect(delegate.deleteMany).toHaveBeenCalledWith({
      where: { contractId: "abc123" },
    });
  });

  it("includes the caller's label in the failure message", async () => {
    const delegate = fakeDelegate();
    await expect(
      scopedDelete(delegate as never, {}, "withdraw-exposure cleanup"),
    ).rejects.toThrow(/withdraw-exposure cleanup/);
  });
});