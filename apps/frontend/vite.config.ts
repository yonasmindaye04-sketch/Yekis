import http from "node:http";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type HttpServer, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Paths the dev server must never hand out over /@fs/.
 *
 * Vite's own deny list covers .env files, private keys and .git, but not the
 * repo-local paths that hold bulk data. An OWASP ZAP scan of the dev server
 * confirmed the gap: GET /@fs/<repo>/backups/marketplace-<date>.dump returned
 * HTTP 200 with the full 270 KB PostgreSQL dump, and /@fs/<repo>/README.md
 * was served the same way. The dev server also listened on 0.0.0.0, so
 * "anyone who can reach the server" meant anything on the network.
 *
 * Deny wins over allow in Vite's file-serving check, so these patterns are
 * effective even though the repo root itself stays in fs.allow.
 *
 * Setting `server.fs.deny` REPLACES Vite's default list rather than adding
 * to it, so the defaults are repeated here. Dropping them re-opens .env and
 * the private key formats: GET /@fs/<repo>/apps/backend/.env answered HTTP 200
 * with 25 KB of live secrets when this list first omitted them.
 */
const DENIED_FS_PATHS = [
  // Vite defaults.
  ".env",
  ".env.*",
  "*.{crt,pem,key,p12,pfx,cer,der}",
  ".npmrc",
  ".yarnrc.yml",
  "**/.git/**",
  // Repo-local secret and bulk-data paths.
  "**/backups/**",
  "**/*.dump",
  "**/*.sql",
  "**/resource_to_read/**",
  "**/docs/security/**",
  "**/uploads/**",
  "**/.pnpm-store/**",
  "**/fix_env.js",
  "**/test-webhook.js",
];

/**
 * Interface the dev server listens on.
 *
 * Loopback by default. It used to be 0.0.0.0 "for external, AI Studio and
 * tunnel traffic", but the tunnel runs on this machine and connects to
 * 127.0.0.1, so binding to every interface only widened the blast radius.
 * Set VITE_DEV_HOST=0.0.0.0 when a setup genuinely needs a LAN-reachable
 * dev server.
 */
const DEV_HOST = process.env.VITE_DEV_HOST ?? "127.0.0.1";

/**
 * Hostnames the dev server answers to.
 *
 * `allowedHosts: true` accepted ANY Host header, which makes the dev server a
 * DNS-rebinding target: a page on a site the developer visits could point a
 * rebind domain at 127.0.0.1:3000 and then read the app's origin. Vite
 * always allows localhost and raw IP addresses; this list adds the tunnel
 * domains this project actually uses. Extra hosts can be appended with
 * VITE_ALLOWED_HOSTS (comma separated).
 */
const ALLOWED_HOSTS = [
  "localhost",
  ".localhost",
  "127.0.0.1",
  ".trycloudflare.com",
  ".ngrok-free.dev",
  ".ngrok.app",
  ".ngrok.io",
  ".loca.lt",
  ...(process.env.VITE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
];

/**
 * Response headers the dev server sets on every response.
 *
 * - `Access-Control-Allow-Origin: *` and `X-Frame-Options: ALLOWALL` were
 *   both wrong: the wildcard let any site read the app's responses, and
 *   "ALLOWALL" is not a value browsers understand, so framing protection was
 *   effectively absent. The frontend calls the API through the same-origin
 *   /api proxy, so the wildcard was never needed.
 * - `Referrer-Policy: no-referrer` keeps the password-reset token out of the
 *   Referer header sent to telegram.org, which the page loads a script from.
 */
const SECURITY_HEADERS = {
  // Framing is NOT denied. The Telegram Mini App is rendered inside a frame
  // by Telegram Web and Telegram Desktop, and "DENY" made the Mini App open
  // to a blank refusal there — the page loads but Telegram refuses to show
  // it, which looks exactly like "the mini app is not starting".
  //
  // `X-Frame-Options` cannot express "allow web.telegram.org" (ALLOW-FROM is
  // unsupported), and Chrome honours XFO over CSP frame-ancestors, so the
  // header has to go. The CSP directive below does the same job with an
  // explicit allowlist instead of "anybody".
  //
  // This CSP carries ONLY frame-ancestors: it restricts who may frame the
  // app and nothing else, so it does not interfere with the dev server's
  // inline scripts and eval, which the HMR client needs.
  "Content-Security-Policy":
    "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
} as const;

/**
 * Content Security Policy for the built SPA.
 *
 * Injected as a meta tag into the production HTML only. The dev server is
 * exempt on purpose: Vite's HMR client injects inline scripts and uses eval,
 * so a strict script-src would break hot reload.
 *
 * `style-src` keeps 'unsafe-inline' because react-remove-scroll (pulled in by
 * cmdk -> @radix-ui/react-dialog) injects a <style> element at runtime and
 * there is no nonce to attach to it. script-src stays strict: no unsafe-inline
 * and no unsafe-eval, which is the directive that actually stops injected
 * script from running.
 */
const PRODUCTION_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Telegram renders the Mini App in a frame, so the app must be framable by
  // the Telegram clients. Everything else stays denied.
  "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
  "form-action 'self'",
  "script-src 'self' https://telegram.org https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://images.pexels.com https://storage.yekis.et https://api.telegram.org",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://api.telegram.org",
  "frame-src https://appleid.cdn-apple.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
].join("; ");

/**
 * Adds the production CSP to the built HTML.
 *
 * Build-only: the dev server must not receive it (HMR needs inline script and
 * eval), and `vite preview` serves the same HTML with the same policy.
 */
function productionCspPlugin(): Plugin {
  return {
    name: "yekis-production-csp",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: PRODUCTION_CSP },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

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
  // `@/...` -> `src/...`, matching the `paths` entry in tsconfig.app.json.
  // TypeScript resolves this from tsconfig, but Vite needs its own mapping:
  // without it every `@/components/...` import fails at transform time with
  // "Failed to resolve import", the module graph breaks, and the app never
  // mounts.
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  plugins: [
    resilientApiProxyPlugin(),
    tailwindcss(),
    react(),
    productionCspPlugin(),
  ],
  server: {
    // Loopback by default; see DEV_HOST above.
    host: DEV_HOST,
    port: 3000,
    // Explicit allowlist instead of `true`, so a rebinding Host header is
    // rejected. See ALLOWED_HOSTS above.
    allowedHosts: ALLOWED_HOSTS,
    fs: {
      strict: true,
      deny: DENIED_FS_PATHS,
    },
    headers: SECURITY_HEADERS,
  },
  // Pre-bundle the heavy dependencies up front.
  //
  // Vite discovers dependencies by crawling the source, and anything it
  // finds LATER triggers a re-bundle: the optimizer rebuilds, every
  // optimized chunk changes hash, and the browser reloads. Through a
  // Cloudflare tunnel that re-bundle is worse than a reload — requests for
  // the new chunks queue behind the optimizer and the tunnel answers 504,
  // so the page never finishes loading.
  //
  // Naming the big ones here means they are bundled during startup
  // instead, while nothing is waiting on them.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "recharts",
      "cmdk",
      "react-day-picker",
      "react-resizable-panels",
      "@base-ui/react/select",
      "@base-ui/react/menu",
      "@base-ui/react/dialog",
      "@base-ui/react/tooltip",
      "@base-ui/react/popover",
      "@base-ui/react/tabs",
    ],
  },
  preview: {
    // `vite preview` serves the production build, so it gets the same
    // headers as the dev server plus the real CSP.
    host: DEV_HOST,
    port: 4173,
    allowedHosts: ALLOWED_HOSTS,
    headers: SECURITY_HEADERS,
  },
});
