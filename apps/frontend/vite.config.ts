import http from "node:http";
import { defineConfig, type Plugin } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

/**
 * Proxies `/api/*` to the local backend (`http://127.0.0.1:4000`) when it is
 * running, and responds cleanly without spamming `[vite] http proxy error:
 * ECONNREFUSED` when running the frontend in standalone/preview mode.
 */
function resilientApiProxyPlugin(): Plugin {
  return {
    name: "yekis-resilient-api-proxy",
    configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
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
          res.statusCode = 503;
          res.end(
            JSON.stringify({
              error: "BACKEND_OFFLINE",
              message: "HTTP 503: Local preview mode active",
            }),
          );
        });

        req.pipe(proxyReq, { end: true });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  cacheDir: "../../node_modules/.vite",
  plugins: [
    resilientApiProxyPlugin(),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    host: "0.0.0.0", // binds to 0.0.0.0 for external, AI Studio, and tunnel traffic
    port: 3000,
    allowedHosts: true, // Allow all tunnel hostnames (cloudflared, ngrok, ...)
    headers: {
      "Access-Control-Allow-Origin": "*",
      "X-Frame-Options": "ALLOWALL",
    },
  },
});
