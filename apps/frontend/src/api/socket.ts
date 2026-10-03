// === REALTIME WEBSOCKET MANAGER ===
import { api } from "./client";

export type SocketEventHandler<T = any> = (data: T) => void;

export class RealtimeSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private isExplicitlyClosed = false;
  private subscriptions = new Set<string>();
  private eventHandlers = new Map<string, Set<SocketEventHandler>>();
  private statusListeners = new Set<(connected: boolean) => void>();
  private pingInterval: number | null = null;

  /**
   * Optional token source that overrides `api.getToken()`.
   *
   * The landing support widget authenticates as a guest with a
   * conversation-scoped token rather than a session, so it needs its own socket
   * instead of fighting the app-wide singleton over one connection.
   */
  private readonly tokenOverride?: () => string | null;

  public isConnected = false;

  constructor(options: { getToken?: () => string | null } = {}) {
    this.tokenOverride = options.getToken;
  }

  private getWebSocketUrl(): string | null {
    const token = this.tokenOverride ? this.tokenOverride() : api.getToken();
    if (!token) return null;

    const apiBase = import.meta.env.VITE_API_BASE_URL;
    let wsHost = window.location.host;
    let wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";

    if (apiBase) {
      try {
        const parsed = new URL(apiBase);
        wsHost = parsed.host;
        wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
      } catch {
        // Use default window location
      }
    }

    return `${wsProto}//${wsHost}/api/v1/ws?token=${encodeURIComponent(token)}`;
  }

  connect(): void {
    if (typeof window === "undefined") return;
    this.isExplicitlyClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = this.getWebSocketUrl();
    if (!url) {
      // Not logged in or no token available yet
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus(true);

        // Re-subscribe to all active channels upon reconnect
        for (const channel of this.subscriptions) {
          this.send({ action: "subscribe", channel });
        }

        // Keepalive client ping every 25s
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ action: "ping" });
          }
        }, 25_000);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event) {
            this.dispatch(payload.event, payload.data);
          }
        } catch {
          // Ignore non-JSON or malformed messages
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
        if (this.pingInterval) clearInterval(this.pingInterval);

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyStatus(false);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private send(data: Record<string, unknown>): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    if (this.isConnected) {
      this.send({ action: "subscribe", channel });
    } else {
      this.connect();
    }
  }

  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    if (this.isConnected) {
      this.send({ action: "unsubscribe", channel });
    }
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    this.send({ action: "typing", conversationId, isTyping });
  }

  sendRead(conversationId: string): void {
    this.send({ action: "read", conversationId });
  }

  on<T = any>(event: string, handler: SocketEventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as SocketEventHandler);

    return () => this.off(event, handler);
  }

  off<T = any>(event: string, handler: SocketEventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler as SocketEventHandler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus(connected: boolean): void {
    for (const listener of this.statusListeners) {
      try {
        listener(connected);
      } catch {
        // ignore errors
      }
    }
  }

  private dispatch(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error("Socket handler error:", err);
        }
      }
    }
  }
}

export const realtimeSocket = new RealtimeSocketManager();
