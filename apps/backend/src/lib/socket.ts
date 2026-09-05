// === IMPORTS ===
import { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "node:url";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// === TYPES ===
interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isStaff?: boolean;
  isAlive?: boolean;
  subscriptions?: Set<string>;
}

export interface RealtimeEvent<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
}

// === SERVER INSTANCE & CLIENT TRACKING ===
let wss: WebSocketServer | null = null;
const clientsByUserId = new Map<string, Set<AuthenticatedSocket>>();
const channelSubscriptions = new Map<string, Set<AuthenticatedSocket>>();

/**
 * Initializes the WebSocket server attached to the existing HTTP server.
 */
export function initWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/api/v1/ws" });

  const textEncoder = new TextEncoder();
  const secretKey = textEncoder.encode(env.JWT_ACCESS_SECRET);

  wss.on("connection", async (ws: AuthenticatedSocket, req) => {
    ws.isAlive = true;
    ws.subscriptions = new Set<string>();

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Authenticate connection via query string token
    try {
      const parsedUrl = new URL(req.url ?? "", "http://localhost");
      const token = parsedUrl.searchParams.get("token");

      if (!token) {
        ws.close(4001, "Missing authentication token");
        return;
      }

      const { payload } = await jwtVerify(token, secretKey);
      const userId = payload.sub as string;
      const staffRole = payload.staffRole as string | undefined;

      if (!userId) {
        ws.close(4001, "Invalid token subject");
        return;
      }

      ws.userId = userId;
      ws.isStaff = !!staffRole;

      // Register user socket
      if (!clientsByUserId.has(userId)) {
        clientsByUserId.set(userId, new Set());
      }
      clientsByUserId.get(userId)!.add(ws);

      // Auto-subscribe to user's private channel
      subscribeToChannel(ws, `user:${userId}`);

      if (ws.isStaff) {
        subscribeToChannel(ws, "staff:alerts");
      }

      logger.info(
        { userId, isStaff: ws.isStaff },
        "Real-time WebSocket connection authenticated",
      );

      // Welcome confirmation
      sendEvent(ws, "connected", { userId, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.warn({ err }, "WebSocket authentication failed");
      ws.close(4003, "Authentication failed");
      return;
    }

    // Handle client messages (e.g. subscribing to chat threads)
    ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.action === "subscribe" && typeof message.channel === "string") {
          subscribeToChannel(ws, message.channel);
        } else if (message.action === "unsubscribe" && typeof message.channel === "string") {
          unsubscribeFromChannel(ws, message.channel);
        } else if (message.action === "typing" && typeof message.conversationId === "string" && ws.userId) {
          broadcastToChannel(`conversation:${message.conversationId}`, "chat:typing", {
            userId: ws.userId,
            conversationId: message.conversationId,
            isTyping: Boolean(message.isTyping),
          });
        } else if (message.action === "read" && typeof message.conversationId === "string" && ws.userId) {
          broadcastToChannel(`conversation:${message.conversationId}`, "chat:read", {
            userId: ws.userId,
            conversationId: message.conversationId,
            readAt: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore malformed JSON messages
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        const userSockets = clientsByUserId.get(ws.userId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            clientsByUserId.delete(ws.userId);
          }
        }
      }

      // Cleanup subscriptions
      if (ws.subscriptions) {
        for (const channel of ws.subscriptions) {
          unsubscribeFromChannel(ws, channel);
        }
      }
    });

    ws.on("error", (err) => {
      logger.error({ err, userId: ws.userId }, "WebSocket client error");
    });
  });

  // Heartbeat interval to drop dead connections every 30 seconds
  const heartbeatInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      const ws = client as AuthenticatedSocket;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  logger.info("WebSocket real-time server mounted at /api/v1/ws");
  return wss;
}

function subscribeToChannel(ws: AuthenticatedSocket, channel: string) {
  if (!channelSubscriptions.has(channel)) {
    channelSubscriptions.set(channel, new Set());
  }
  channelSubscriptions.get(channel)!.add(ws);
  ws.subscriptions?.add(channel);
}

function unsubscribeFromChannel(ws: AuthenticatedSocket, channel: string) {
  const subscribers = channelSubscriptions.get(channel);
  if (subscribers) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      channelSubscriptions.delete(channel);
    }
  }
  ws.subscriptions?.delete(channel);
}

function sendEvent(ws: WebSocket, event: string, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data, timestamp: new Date().toISOString() }));
  }
}

// === BROADCAST FUNCTIONS ===

/**
 * Sends a real-time event to a specific user across all their connected devices.
 */
export function sendToUser(userId: string, event: string, data: unknown) {
  const sockets = clientsByUserId.get(userId);
  if (!sockets || sockets.size === 0) return false;

  for (const socket of sockets) {
    sendEvent(socket, event, data);
  }
  return true;
}

/**
 * Broadcasts an event to all subscribers of a channel (e.g. `thread:${threadId}`).
 */
export function broadcastToChannel(channel: string, event: string, data: unknown) {
  const subscribers = channelSubscriptions.get(channel);
  if (!subscribers || subscribers.size === 0) return 0;

  let count = 0;
  for (const socket of subscribers) {
    sendEvent(socket, event, data);
    count++;
  }
  return count;
}

/**
 * Broadcasts an event to all connected staff members.
 */
export function broadcastToStaff(event: string, data: unknown) {
  return broadcastToChannel("staff:alerts", event, data);
}

/**
 * Broadcasts a real-time event to all subscribers of a conversation.
 */
export function broadcastToConversation(conversationId: string, event: string, data: unknown) {
  return broadcastToChannel(`conversation:${conversationId}`, event, data);
}
