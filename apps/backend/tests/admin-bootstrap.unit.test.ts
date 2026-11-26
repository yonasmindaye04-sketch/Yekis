import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Postgres/Prisma, the logger and the password hasher in-memory so this
// suite exercises the provisioning *control flow* — what is created, what is
// refused, and what is never touched — without a database, and without paying
// for a real Argon2id hash on every case.
const mockUser = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

vi.mock("../src/lib/prisma.js", () => ({
  prisma: { user: mockUser },
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../src/lib/password.js", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));

let phoneCounter = 0;
vi.mock("../src/modules/auth/identity.js", () => ({
  buildPlaceholderPhone: vi.fn(() => `+2510${String(phoneCounter++).padStart(6, "0")}`),
  isUniqueConstraintViolation: (err: unknown) =>
    typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002",
}));

const { bootstrapAdminFromEnv, MIN_ADMIN_PASSWORD_LENGTH } = await import(
  "../src/bootstrap/admin.js"
);
const { logger } = await import("../src/lib/logger.js");
const { hashPassword } = await import("../src/lib/password.js");

const PASSWORD = "correct-horse-battery-staple";

function env(overrides: Record<string, string> = {}) {
  return { ...overrides } as NodeJS.ProcessEnv;
}

function validEnv(overrides: Record<string, string> = {}) {
  return env({
    ADMIN_BOOTSTRAP_EMAIL: "admin@yekis.et",
    ADMIN_BOOTSTRAP_PASSWORD: PASSWORD,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  phoneCounter = 0;
  mockUser.findUnique.mockResolvedValue(null);
  mockUser.findFirst.mockResolvedValue(null);
  mockUser.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "user_1",
    email: data.email,
    staffRole: data.staffRole,
  }));
  mockUser.update.mockResolvedValue({ id: "user_1" });
});

describe("bootstrapAdminFromEnv", () => {
  it("does nothing when no bootstrap variables are set", async () => {
    const result = await bootstrapAdminFromEnv(env());

    expect(result).toEqual({ outcome: "disabled" });
    expect(mockUser.findUnique).not.toHaveBeenCalled();
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("refuses a half-configured request instead of guessing", async () => {
    const emailOnly = await bootstrapAdminFromEnv(
      env({ ADMIN_BOOTSTRAP_EMAIL: "admin@yekis.et" }),
    );
    const passwordOnly = await bootstrapAdminFromEnv(
      env({ ADMIN_BOOTSTRAP_PASSWORD: PASSWORD }),
    );

    expect(emailOnly.outcome).toBe("rejected");
    expect(passwordOnly.outcome).toBe("rejected");
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("refuses a password shorter than the documented floor", async () => {
    const result = await bootstrapAdminFromEnv(
      validEnv({ ADMIN_BOOTSTRAP_PASSWORD: "short" }),
    );

    expect(result.outcome).toBe("rejected");
    expect(mockUser.create).not.toHaveBeenCalled();
    expect(MIN_ADMIN_PASSWORD_LENGTH).toBe(14);
  });

  it("refuses an address that is not an address", async () => {
    const result = await bootstrapAdminFromEnv(
      validEnv({ ADMIN_BOOTSTRAP_EMAIL: "not-an-email" }),
    );

    expect(result.outcome).toBe("rejected");
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("creates a full-access administrator with an empty wallet and a KYC row", async () => {
    const result = await bootstrapAdminFromEnv(validEnv());

    expect(result).toEqual({ outcome: "created", email: "admin@yekis.et" });
    expect(mockUser.create).toHaveBeenCalledTimes(1);

    const { data } = mockUser.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data.email).toBe("admin@yekis.et");
    expect(data.staffRole).toBe("SUPER_ADMIN");
    expect(data.role).toBe("CLIENT");
    expect(data.phone).toMatch(/^\+2510\d{6}$/);
    expect(data.emailVerified).toBe(true);
    expect(data.passwordSetAt).toBeInstanceOf(Date);
    expect(data.kyc).toEqual({ create: { tier: "TIER_1", status: "VERIFIED" } });
    expect(data.wallet).toEqual({ create: { balanceMinor: 0 } });
  });

  it("never fabricates a date of birth for the provisioned account", async () => {
    await bootstrapAdminFromEnv(validEnv());

    const { data } = mockUser.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data.dateOfBirth).toBeUndefined();
  });

  it("stores a hash, never the password itself", async () => {
    await bootstrapAdminFromEnv(validEnv());

    const { data } = mockUser.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data.passwordHash).toBe(`hashed:${PASSWORD}`);
    expect(data.passwordHash).not.toBe(PASSWORD);
  });

  it("normalises the address to lower case", async () => {
    const result = await bootstrapAdminFromEnv(
      validEnv({ ADMIN_BOOTSTRAP_EMAIL: "Admin@Yekis.et" }),
    );

    expect(result).toEqual({ outcome: "created", email: "admin@yekis.et" });
    const { data } = mockUser.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data.email).toBe("admin@yekis.et");
  });

  it("never touches an existing account, and says so", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "user_9", staffRole: "SUPER_ADMIN" });

    const result = await bootstrapAdminFromEnv(validEnv());

    expect(result).toEqual({ outcome: "account-exists", email: "admin@yekis.et" });
    expect(mockUser.update).not.toHaveBeenCalled();
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("resets an existing account's password only on an explicit request", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "user_9", staffRole: null });

    const result = await bootstrapAdminFromEnv(
      validEnv({ ADMIN_BOOTSTRAP_RESET: "true" }),
    );

    expect(result).toEqual({ outcome: "password-reset", email: "admin@yekis.et" });
    expect(mockUser.update).toHaveBeenCalledTimes(1);
    const update = mockUser.update.mock.calls[0][0] as {
      where: { id: string };
      data: { passwordHash: string; sessionVersion: { increment: number } };
    };
    expect(update.where.id).toBe("user_9");
    expect(update.data.passwordHash).toBe(`hashed:${PASSWORD}`);
    // Every session already issued for that account is retired.
    expect(update.data.sessionVersion).toEqual({ increment: 1 });
  });

  it("refuses to mint a second full-access administrator", async () => {
    mockUser.findFirst.mockResolvedValue({ id: "user_1", email: "first@yekis.et" });

    const result = await bootstrapAdminFromEnv(validEnv());

    expect(result).toEqual({ outcome: "admin-already-exists", email: "admin@yekis.et" });
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("creates a second administrator when the operator explicitly allows it", async () => {
    mockUser.findFirst.mockResolvedValue({ id: "user_1", email: "first@yekis.et" });

    const result = await bootstrapAdminFromEnv(
      validEnv({ ADMIN_BOOTSTRAP_ALLOW_ADDITIONAL: "true" }),
    );

    expect(result).toEqual({ outcome: "created", email: "admin@yekis.et" });
    expect(mockUser.create).toHaveBeenCalledTimes(1);
  });

  it("never writes the password into a log line", async () => {
    await bootstrapAdminFromEnv(validEnv());

    const logged = [
      ...(logger.info as unknown as { mock: { calls: unknown[][] } }).mock.calls,
      ...(logger.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls,
      ...(logger.error as unknown as { mock: { calls: unknown[][] } }).mock.calls,
    ]
      .map((call) => JSON.stringify(call))
      .join("\n");

    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain(`hashed:${PASSWORD}`);
  });

  it("never logs the password even when it refuses the request", async () => {
    await bootstrapAdminFromEnv(validEnv({ ADMIN_BOOTSTRAP_PASSWORD: "too-short" }));

    const logged = JSON.stringify(
      (logger.error as unknown as { mock: { calls: unknown[][] } }).mock.calls,
    );
    expect(logged).not.toContain("too-short");
  });

  it("retries with another placeholder phone when the phone is taken", async () => {
    mockUser.create
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["phone"] } })
      .mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "user_2",
        email: data.email,
        staffRole: data.staffRole,
      }));

    const result = await bootstrapAdminFromEnv(validEnv());

    expect(result).toEqual({ outcome: "created", email: "admin@yekis.et" });
    expect(mockUser.create).toHaveBeenCalledTimes(2);
  });

  it("stops when the address itself is taken", async () => {
    mockUser.create.mockRejectedValue({ code: "P2002", meta: { target: ["email"] } });

    const result = await bootstrapAdminFromEnv(validEnv());

    expect(result).toEqual({ outcome: "account-exists", email: "admin@yekis.et" });
    expect(mockUser.create).toHaveBeenCalledTimes(1);
  });

  it("does not create an account when the password hasher is not called for a refusal", async () => {
    await bootstrapAdminFromEnv(env({ ADMIN_BOOTSTRAP_EMAIL: "admin@yekis.et" }));

    expect(hashPassword).not.toHaveBeenCalled();
    expect(mockUser.create).not.toHaveBeenCalled();
  });
});
