import http from "node:http";
import net from "node:net";
import { defineConfig, type HttpServer, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Proxies `/api/*` HTTP and WebSocket traffic to the local backend
 * (`http://127.0.0.1:4000`) when running, and responds cleanly without
 * spamming ECONNREFUSED when the backend is restarting.
 */
function resilientApiProxyPlugin(): Plugin {
  const attachMiddleware = (
    middlewares: {
      use: (
        route: string,
        fn: (req: http.IncomingMessage, res: http.ServerResponse) => void,
      ) => void;
    },
    httpServer?: HttpServer | null,
  ) => {
    middlewares.use("/api", (req, res) => {
      const targetPath = `/api${req.url || ""}`;
      const proxyReq = http.request(
        {
          hostname: "127.0.0.1",
          port: 4000,
          path: targetPath,
          method: req.method,
          headers: {
            ...req.headers,
            host: "127.0.0.1:4000",
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        },
      );

      proxyReq.on("error", () => {
        if (res.headersSent) {
          res.end();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        if (targetPath.startsWith("/api/v1/auth/oauth/providers")) {
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              google: false,
              apple: false,
              facebook: false,
              telegram: false,
              telegramBotUsername: null,
            }),
          );
          return;
        }
        res.statusCode = 200;
        res.setHeader("X-Yekis-Offline", "1");
        res.end(
          JSON.stringify({
            __backendOffline: true,
          }),
        );
      });

      req.pipe(proxyReq, { end: true });
    });

    httpServer?.on("upgrade", (req, socket, head) => {
      if (!req.url?.startsWith("/api/")) return;

      const upstream = net.connect(4000, "127.0.0.1", () => {
        const lines = [`${req.method || "GET"} ${req.url} HTTP/${req.httpVersion}`];
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          const key = req.rawHeaders[i];
          const val = req.rawHeaders[i + 1];
          if (key.toLowerCase() === "host") {
            lines.push("Host: 127.0.0.1:4000");
          } else {
            lines.push(`${key}: ${val}`);
          }
        }
        lines.push("", "");
        upstream.write(lines.join("\r\n"));
        if (head && head.length > 0) {
          upstream.write(head);
        }
        socket.pipe(upstream).pipe(socket);
      });

      upstream.on("error", () => {
        socket.destroy();
      });
      socket.on("error", () => {
        upstream.destroy();
      });
    });
  };

  return {
    name: "yekis-resilient-api-proxy",
    configureServer(server) {
      attachMiddleware(server.middlewares, server.httpServer);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares, server.httpServer);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    resilientApiProxyPlugin(),
    tailwindcss(),
    react(),
  ],
  server: {
    host: "0.0.0.0", // binds to 0.0.0.0 for external, AI Studio, and tunnel traffic
    port: 3000,
    hmr: false,
    allowedHosts: true, // Allow all tunnel hostnames (cloudflared, ngrok, ...)
    headers: {
      "Access-Control-Allow-Origin": "*",
      "X-Frame-Options": "ALLOWALL",
    },
  },
});
