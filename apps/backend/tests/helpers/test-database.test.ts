import { describe, it, expect } from "vitest";
import {
  REFUSAL_MESSAGE,
  databaseNameFromUrl,
  resolveTestDatabaseUrl,
  applyTestDatabaseEnv,
} from "./test-database.js";

/**
 * The guard that keeps the suite off development data.
 * These tests are deliberately about the refusal path: the dangerous case is
 * the one that must NOT run.
 */
const TEST_URL =
  "postgresql://marketplace:pw@localhost:5433/marketplace_test?schema=public";
const DEV_URL =
  "postgresql://marketplace:pw@localhost:5433/marketplace?schema=public";

describe("the test suite refuses any database that is not a test database", () => {
  it("accepts a database whose name contains _test", () => {
    expect(resolveTestDatabaseUrl(TEST_URL)).toBe(TEST_URL);
  });

  it("refuses the development database", () => {
    expect(() => resolveTestDatabaseUrl(DEV_URL)).toThrow(REFUSAL_MESSAGE);
  });

  it("refuses when DATABASE_URL_TEST is missing entirely", () => {
    expect(() => resolveTestDatabaseUrl(undefined)).toThrow(REFUSAL_MESSAGE);
    expect(() => resolveTestDatabaseUrl("")).toThrow(REFUSAL_MESSAGE);
    expect(() => resolveTestDatabaseUrl("   ")).toThrow(REFUSAL_MESSAGE);
  });

  it("refuses a malformed URL", () => {
    expect(() => resolveTestDatabaseUrl("not a url")).toThrow(REFUSAL_MESSAGE);
  });

  it("refuses a URL with no database name", () => {
    expect(() =>
      resolveTestDatabaseUrl("postgresql://u:p@localhost:5433/"),
    ).toThrow(REFUSAL_MESSAGE);
  });

  it("refuses a name that merely mentions test without the _test suffix marker", () => {
    // "contest" contains "test" but is not a test database marker.
    expect(() =>
      resolveTestDatabaseUrl("postgresql://u:p@localhost:5433/contest"),
    ).toThrow(REFUSAL_MESSAGE);
  });

  it("extracts the database name", () => {
    expect(databaseNameFromUrl(TEST_URL)).toBe("marketplace_test");
    expect(databaseNameFromUrl("not a url")).toBeNull();
  });
});

describe("applyTestDatabaseEnv points the process at the test database", () => {
  it("overwrites DATABASE_URL even when it already points somewhere else", () => {
    const env = { DATABASE_URL: DEV_URL, DATABASE_URL_TEST: TEST_URL } as NodeJS.ProcessEnv;
    const result = applyTestDatabaseEnv(env);

    expect(env.DATABASE_URL).toBe(TEST_URL);
    expect(result.databaseName).toBe("marketplace_test");
    // The old development URL must not survive anywhere in the process env.
    expect(env.DATABASE_URL).not.toContain("/marketplace?");
  });

  it("switches Redis to the test database index when REDIS_URL_TEST is set", () => {
    const env = {
      DATABASE_URL_TEST: TEST_URL,
      REDIS_URL: "redis://localhost:6379",
      REDIS_URL_TEST: "redis://localhost:6379/1",
    } as NodeJS.ProcessEnv;

    applyTestDatabaseEnv(env);
    expect(env.REDIS_URL).toBe("redis://localhost:6379/1");
  });

  it("keeps the existing REDIS_URL when REDIS_URL_TEST is absent", () => {
    const env = {
      DATABASE_URL_TEST: TEST_URL,
      REDIS_URL: "redis://localhost:6379",
    } as NodeJS.ProcessEnv;

    applyTestDatabaseEnv(env);
    expect(env.REDIS_URL).toBe("redis://localhost:6379");
  });

  it("throws before mutating anything when the URL is the dev database", () => {
    const env = { DATABASE_URL: DEV_URL, DATABASE_URL_TEST: DEV_URL } as NodeJS.ProcessEnv;

    expect(() => applyTestDatabaseEnv(env)).toThrow(REFUSAL_MESSAGE);
    // Left untouched so a failed guard cannot half-configure the process.
    expect(env.DATABASE_URL).toBe(DEV_URL);
  });
});