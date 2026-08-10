# Ngrok Playbook

This playbook outlines how to use `ngrok` for local development and testing in the Yekis platform.

## Why Ngrok?

In this project, `ngrok` is primarily used for:
1. **Telegram Mini App Testing:** Telegram requires a secure, public HTTPS URL to launch a Mini App. `ngrok` provides a tunnel from a public URL to your local Vite development server.
2. **Webhook Testing:** Testing integrations that rely on external services sending webhooks to the platform (e.g., payment provider callbacks, Telegram bot updates).

## 1. Installation and Setup

1. **Install Ngrok:** Follow the instructions on the [official ngrok website](https://ngrok.com/download) to install the CLI tool for your operating system.
2. **Authenticate:** Sign up for an ngrok account and run the authtoken command provided in your dashboard:
   ```bash
   ngrok config add-authtoken <your-auth-token>
   ```

## 2. Telegram Mini App Local Testing

To test the Telegram Mini App locally, you need to expose your frontend (`apps/frontend` running on port `5173`) to the internet.

### Step 1: Start your local servers

Start the backend and frontend development servers:

```powershell
# In one terminal, start the backend
pnpm run dev:backend

# In a second terminal, start the frontend
pnpm --dir apps/frontend dev
```

### Step 2: Start the Ngrok Tunnel

Open a third terminal and run ngrok, targeting the Vite frontend port:

```powershell
ngrok http 5173
```

This will display a Forwarding URL, such as: `https://<your-ngrok-subdomain>.ngrok-free.dev`

### Step 3: Configure BotFather

1. Go to Telegram and message `@BotFather`.
2. Select your bot.
3. Update the **Menu Button** or **Main App** URL to match the exact ngrok forwarding URL (e.g., `https://<your-ngrok-subdomain>.ngrok-free.dev`).
4. Wait a few moments, and you can now open the Mini App from your local bot in Telegram.

### Important Notes:
- **No Backend Tunnel:** Do not run a second ngrok tunnel for the backend. The Vite frontend is already configured with a proxy (`vite.config.ts`) that forwards API requests to your local backend at `http://localhost:4000`.
- **Allowed Hosts:** The `vite.config.ts` includes `allowedHosts: ['.ngrok-free.dev', '.ngrok.io']` to ensure Vite does not block incoming requests due to invalid Host headers.

## 3. Webhook Testing

If you need to test incoming webhooks (e.g., using `test-webhook.js`), you may need to expose your backend server.

### Exposing the Backend

If testing direct backend integrations:

```powershell
# Start the backend
pnpm run dev:backend

# Start an ngrok tunnel on the backend port
ngrok http 4000
```

*Note: For the Telegram Mini App, the backend does not need its own ngrok tunnel because requests flow from Telegram -> Ngrok -> Vite Frontend -> Vite Proxy -> Local Backend.*

### Updating Webhook URLs

When registering a webhook URL (e.g., for Telegram Bot API or payment gateways), use the ngrok URL appended with the correct API path. For example, in `test-webhook.js`:

```javascript
// Example using your ngrok URL
await bot.api.setWebhook("https://<your-ngrok-subdomain>.ngrok-free.dev/api/v1/telegram/webhook", {
  // ... options
});
```

## 4. Troubleshooting

- **"Public domain is already in use" Error:** Stop any existing ngrok tunnels (Ctrl+C) and start a new one. Free ngrok accounts only allow one active tunnel at a time.
- **502 Bad Gateway:** Ensure your Vite dev server (`npm run dev`) is actually running and listening on port `5173`. We have set `host: true` in `vite.config.ts` to help prevent some ngrok 502 errors.
- **Vite "Invalid Host header":** This is already mitigated by the `allowedHosts` config in `vite.config.ts`. Ensure your ngrok URL ends with `.ngrok-free.dev` or `.ngrok.io`.
- **Frontend can't reach Backend:** Verify that the backend is running on `http://localhost:4000`. The Vite proxy relies on this default port.
