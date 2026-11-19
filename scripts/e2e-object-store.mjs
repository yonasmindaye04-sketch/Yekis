/**
 * End-to-end check against a deployed Yekis instance.
 *
 * It registers a throwaway client, signs in, uploads a file through the API
 * (which puts it in the object store) and reads it back — so the object
 * store is exercised with the application's own client, credentials and
 * addressing style, not with a separate tool.
 *
 *   node scripts/e2e-object-store.mjs https://yekis.app.aletcloud.com
 */

const base = (process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("usage: node scripts/e2e-object-store.mjs <base-url>");
  process.exit(2);
}

const stamp = Date.now();
const email = `aletcheck.${stamp}@example.com`;
const phone = `+251${String(900000000 + (stamp % 99999999)).slice(0, 9)}`;
const password = `AletCheck!${stamp}`;

function step(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (detail) console.log(`      ${detail}`);
  if (!ok) process.exitCode = 1;
  return ok;
}

// ── 1. Register ────────────────────────────────────────────────────────────
const reg = await fetch(`${base}/api/v1/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email,
    phone,
    password,
    languagePreference: "en",
    role: "CLIENT",
    dateOfBirth: "1990-01-01",
    consents: {
      kycDataProcessing: true,
      financialDataProcessing: true,
      platformNotifications: false,
      marketingCommunications: false,
      analytics: false,
    },
  }),
});
step("register a throwaway client", reg.status === 202, `status ${reg.status}`);

// ── 2. Sign in ─────────────────────────────────────────────────────────────
const login = await fetch(`${base}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const loginBody = await login.json().catch(() => ({}));
const token = loginBody?.accessToken ?? loginBody?.data?.accessToken;
if (!step("sign in and receive an access token", Boolean(token), `status ${login.status} keys ${Object.keys(loginBody).join(",")}`)) {
  console.log(`      ${JSON.stringify(loginBody).slice(0, 300)}`);
  process.exit(1);
}

// ── 3. Upload through the API (this writes to the object store) ────────────
const payload = Buffer.from(
  `Yekis object-store check ${stamp} — ${"x".repeat(512)}`,
  "utf8",
);
const form = new FormData();
form.append(
  "file",
  new Blob([payload], { type: "text/plain" }),
  "alet-check.txt",
);
const up = await fetch(`${base}/api/v1/chat/upload`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const upBody = await up.json().catch(() => ({}));
const key = upBody?.key;
if (!step("upload a file through the API into the object store", up.status === 200 && Boolean(key), `status ${up.status} ${JSON.stringify(upBody).slice(0, 200)}`)) {
  process.exit(1);
}

// ── 4. Read it back out of the object store ─────────────────────────────────
// The attachment route resolves the key back to the conversation that owns it
// and refuses access to anyone else — so the read needs a conversation the
// caller belongs to, and a message that links the attachment to it.
const conv = await fetch(`${base}/api/v1/chat/conversations`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ subject: `AletCloud object-store check ${stamp}` }),
});
const convBody = await conv.json().catch(() => ({}));
const conversationId = convBody?.id ?? convBody?.conversation?.id;
step(
  "create a conversation to own the attachment",
  conv.status === 201 && Boolean(conversationId),
  `status ${conv.status} ${JSON.stringify(convBody).slice(0, 160)}`,
);

const msg = await fetch(
  `${base}/api/v1/chat/conversations/${encodeURIComponent(conversationId ?? "")}/messages`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ body: "object-store check", attachmentUrl: upBody.url }),
  },
);
step(
  "attach the uploaded file to a message",
  msg.status === 201,
  `status ${msg.status}`,
);

const back = await fetch(`${base}${upBody.url}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const got = Buffer.from(await back.arrayBuffer());
step(
  "read the file back out of the object store",
  back.status === 200 && got.equals(payload),
  `status ${back.status} bytes ${got.length}/${payload.length}`,
);

console.log(
  `\nkey: ${key}\n` +
    (process.exitCode ? "\nSOME CHECKS FAILED." : "\nThe object store round trip works."),
);
