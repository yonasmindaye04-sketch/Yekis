import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { WebSocket } from "ws";
import { prisma } from "../src/lib/prisma.js";
import { initWebSocketServer, broadcastToChannel } from "../src/lib/socket.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";
import { checkSessionIsUsable } from "../src/middleware/auth.js";

/**
 * A WebSocket is a second front door onto the same API, and it was unguarded.
 *
 * `lib/socket.ts` verified the JWT signature and then read `staffRole` off the
 * payload. No database read at all. requireAuth, on the same deployment,
 * re-reads `isSuspended` and `sessionVersion` on every single request — so the
 * HTTP half of the product enforced immediate suspension and revocation while
 * the socket half enforced nothing until the user happened to reload.
 *
 * Three concrete consequences, all tested below:
 *   - a suspended user's existing socket stayed connected and kept receiving
 *     live chat;
 *   - a revoked session's socket (logout, password reset, role change) stayed
 *     connected;
 *   - a demoted staff member kept `isStaff`, which auto-subscribes them to
 *     `staff:alerts` at connect and grants blanket read access to every
 *     assigned support conversation for the life of the socket.
 *
 * The staff one is the sharpest: `staffRole` is a claim from up to a refresh
 * ago, so demotion was invisible to a live socket by construction.
 *
 * These drive a real `ws` client against a real server so the handshake,
 * the close codes and the DB state are all genuine.
 */

const STAMP = Date.now();
let server: Server;
let port: number;
const userIds: string[] = [];

async function cleanup() {
  const ids = userIds.splice(0, userIds.length);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.conversation.deleteMany({ where: { participants: { some: { userId: { in: ids } } } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function makeUser(label: string, opts?: { staff?: string | null }) {
  const u = await prisma.user.create({
    data: {
      email: `ws-auth-${label}-${STAMP}@test.et`,
      phone: `+2519${String(50000000 + (STAMP % 9000000) + Math.abs(label.charCodeAt(0)))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole: opts?.staff ?? null,
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  userIds.push(u.id);
  return u.id;
}

async function sessionFor(userId: string, staffRole: string | null) {
  return createAuthTokens({ id: userId, role: "CLIENT", ucid: null, staffRole }, ["pwd"]);
}

/**
 * Opens a socket and waits for the first frame.
 *
 * Resolves to the connected socket, or to the close code if the server
 * rejected the handshake. Both outcomes are assertions in this file, so neither
 * can be mistaken for the other by a test that only checks "it didn't throw".
 */
function connect(token: string, timeoutMs = 4000): Promise<{
  closed: boolean;
  code?: number;
  reason?: string;
  frames: Array<{ event: string }>;
  socket?: WebSocket;
}> {
  return new Promise((resolve) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/api/v1/ws?token=${encodeURIComponent(token)}`);
    const frames: Array<{ event: string }> = [];
    let settled = false;

    const finish = (result: { closed: boolean; code?: number; reason?: string; socket?: WebSocket }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ frames, ...result });
    };

    const timer = setTimeout(() => {
      socket.terminate();
      finish({ closed: true, code: 0, reason: "timeout" });
    }, timeoutMs);

    socket.on("message", (raw) => {
      try {
        frames.push(JSON.parse(raw.toString()));
      } catch {
        /* non-JSON frames are not part of the contract */
      }
    });

    socket.on("close", (code, reason) => {
      finish({ closed: true, code, reason: reason.toString() });
    });

    socket.on("error", () => {
      finish({ closed: true, code: -1, reason: "socket error" });
    });

    socket.on("open", () => {
      // Give the handshake a moment to either deliver `connected` or close.
      setTimeout(() => finish({ closed: false, socket }), 350);
    });
  });
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  await prisma.$disconnect();
});

// The server is bound once; `beforeEach` only resets data.
const started = (async () => {
  server = createServer();
  initWebSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as { port: number }).port;
})();

describe("the WebSocket handshake enforces what HTTP enforces", () => {
  it("refuses a suspended user", async () => {
    await started;
    const id = await makeUser("suspended");
    const session = await sessionFor(id, null);

    // Connect while healthy, then suspend — the mid-session case.
    const ok = await connect(session.accessToken);
    expect(ok.closed, "a healthy user must connect").toBe(false);
    ok.socket?.close();
    await new Promise((r) => setTimeout(r, 150));

    await prisma.user.update({ where: { id }, data: { isSuspended: true } });

    const after = await connect(session.accessToken);
    expect(after.closed, "a suspended user must not open a socket").toBe(true);
    expect(after.code).toBe(4003);
    expect(after.reason).toBe("SUSPENDED");
  });

  it("refuses a session that was revoked after the token was minted", async () => {
    await started;
    const id = await makeUser("revoked");
    const session = await sessionFor(id, null);

    const before = await connect(session.accessToken);
    expect(before.closed).toBe(false);
    before.socket?.close();
    await new Promise((r) => setTimeout(r, 150));

    // Exactly what logout and password reset now do.
    await prisma.$executeRaw`UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE id = ${id}`;

    const after = await connect(session.accessToken);
    expect(after.closed, "a revoked session must not open a socket").toBe(true);
    expect(after.reason).toBe("SESSION_REVOKED");
  });

  it("refuses a token whose subject no longer exists", async () => {
    await started;
    // Minted for an id that was never in the database — the same state a
    // deleted account leaves behind, without fighting foreign keys to get it.
    const ghost = await createAuthTokens(
      { id: `ghost-user-${STAMP}-does-not-exist`, role: "CLIENT", ucid: null },
      ["pwd"],
    );

    const after = await connect(ghost.accessToken);
    expect(after.closed).toBe(true);
    expect(after.reason).toBe("UNKNOWN_USER");
  });
});

describe("staff is read from the database, not from the token", () => {
  /**
   * Does this socket actually receive staff-alert broadcasts?
   *
   * This is the real question, and it is deliberately measured rather than
   * inferred. Asserting "subscribe to staff:alerts was refused" proves
   * nothing: `isChannelSubscribable` only ever grants `conversation:*`, so
   * that request is refused for genuine staff too. The auto-subscribe at
   * connect is the only thing that puts a socket on this channel, which is
   * exactly the path the demotion bug lived in.
   */
  async function receivesStaffAlerts(token: string): Promise<boolean> {
    const result = await connect(token);
    if (result.closed || !result.socket) {
      throw new Error(`expected a connected socket, got close ${result.code}`);
    }
    const socket = result.socket;

    // Let the handshake's auto-subscribes settle before broadcasting.
    await new Promise((r) => setTimeout(r, 200));
    broadcastToChannel("staff:alerts", "staff:alert", { probe: "membership" });

    const received = await new Promise<boolean>((resolve) => {
      const onMessage = (raw: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed?.data?.probe === "membership") {
            socket.off("message", onMessage);
            resolve(true);
          }
        } catch {
          /* not our frame */
        }
      };
      socket.on("message", onMessage);
      setTimeout(() => {
        socket.off("message", onMessage);
        resolve(false);
      }, 600);
    });

    socket.close();
    await new Promise((r) => setTimeout(r, 150));
    return received;
  }

  it("gives a genuine staff member the staff alert channel", async () => {
    await started;
    // The control, and it has to pass: otherwise "no socket ever receives
    // staff alerts" would satisfy the test below for the wrong reason.
    const id = await makeUser("genuine-staff", { staff: "ADMIN" });
    const session = await sessionFor(id, "ADMIN");

    const socket = await connect(session.accessToken);
    expect(socket.closed).toBe(false);
    expect(socket.frames.some((f) => f.event === "connected")).toBe(true);
    socket.socket?.close();
    await new Promise((r) => setTimeout(r, 150));

    expect(await receivesStaffAlerts(session.accessToken)).toBe(true);
  });

  it("does not give staff alerts to a demoted member holding a staff token", async () => {
    await started;
    const id = await makeUser("demoted", { staff: "ADMIN" });
    // Token minted while they were staff — the claim still says ADMIN.
    const session = await sessionFor(id, "ADMIN");

    // Demote. The token is untouched and still says ADMIN.
    await prisma.user.update({ where: { id }, data: { staffRole: null } });

    // They must still be able to chat.
    const socket = await connect(session.accessToken);
    expect(socket.closed, "a demoted member must still connect").toBe(false);
    socket.socket?.close();
    await new Promise((r) => setTimeout(r, 150));

    expect(
      await receivesStaffAlerts(session.accessToken),
      "a demoted member must not be on the staff alert channel",
    ).toBe(false);
  });

  it("does not give staff alerts to an ordinary member", async () => {
    await started;
    const id = await makeUser("ordinary");
    const session = await sessionFor(id, null);

    expect(await receivesStaffAlerts(session.accessToken)).toBe(false);
  });
});

describe("the handshake agrees with requireAuth", () => {
  it("refuses exactly what the shared check refuses", async () => {
    await started;
    const id = await makeUser("parity");
    const session = await sessionFor(id, null);
    await prisma.user.update({ where: { id }, data: { isSuspended: true } });

    // The same account, the same token, both front doors. These two must never
    // disagree: requireAuth is the one people assume covers the whole API.
    const check = await checkSessionIsUsable(id, 0);
    expect(check).toEqual({ ok: false, reason: "SUSPENDED" });

    const ws = await connect(session.accessToken);
    expect(ws.closed).toBe(true);
    expect(ws.reason).toBe("SUSPENDED");
  });

  it("passes a healthy account through the shared check", async () => {
    await started;
    const id = await makeUser("parity-ok");
    const session = await sessionFor(id, null);

    const check = await checkSessionIsUsable(id, 0);
    expect(check).toEqual({ ok: true, staffRole: null });

    const ws = await connect(session.accessToken);
    expect(ws.closed).toBe(false);
    ws.socket?.close();
    await new Promise((r) => setTimeout(r, 100));
  });
});
