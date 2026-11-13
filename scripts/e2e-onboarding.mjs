/**
 * End-to-end check of the onboarding flow against a deployed Yekis instance.
 *
 * It walks the whole path a new person takes, in the order the browser takes
 * it, and against the real server rather than the offline mock:
 *
 *   1. ask the host which verification channels it can actually deliver
 *   2. request the 6-digit code for an address
 *   3. check the code
 *   4. create the account
 *   5. sign in
 *
 * The address is deliberately written with capitals. The form does not
 * lower-case what the person types, and every path that reads `User.email`
 * — the login lookup, the OAuth path, the OTP proof — uses the lower-cased
 * form. An account stored as it was typed therefore sits outside all of
 * them: it is created, stamped email-verified, and then refused its own
 * password at the sign-in that immediately follows. So the mixed-case
 * address is not decoration here; it is the case that breaks if the
 * canonical form is not applied.
 *
 *   node scripts/e2e-onboarding.mjs https://yekis.app.aletcloud.com
 */

const base = (process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("usage: node scripts/e2e-onboarding.mjs <base-url>");
  process.exit(2);
}

const stamp = Date.now();
// Mixed case on purpose — see the note above.
const email = `Onboarding.Check.${stamp}@Example.COM`;
// The address as the proof was issued and verified it.
const canonical = email.toLowerCase();
// +251 followed by exactly nine digits — the shape the registration schema
// accepts (`/^\+251\d{9}$/`).
const phone = `+251${String(900000000 + (stamp % 99999999)).slice(0, 9)}`;
const password = `AletOnboard!${stamp}`;
const dob = "1992-04-17";

function step(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (detail) console.log(`      ${detail}`);
  if (!ok) process.exitCode = 1;
  return ok;
}

async function json(response) {
  return response.json().catch(() => ({}));
}

// ── 1. Capability discovery ─────────────────────────────────────────────────
// The client asks before it offers, because a host with no SMTP key cannot
// send an email and a host with no SMS key cannot send a text. Offering
// either anyway is how a signup dead-ends with no explanation.
const channels = await fetch(`${base}/api/v1/auth/verification/channels`);
const channelsBody = await json(channels);
step(
  "the host reports which channels it can deliver",
  channels.status === 200 && typeof channelsBody?.email?.available === "boolean",
  `status ${channels.status} email=${JSON.stringify(channelsBody?.email)} phone=${JSON.stringify(channelsBody?.phone)}`,
);
if (channelsBody?.email?.available === false) {
  console.log(
    "\nThis host cannot deliver an email code, so the onboarding cannot be\n" +
      "walked. Configure SMTP_* (see docs/ALETCLOUD_DEPLOYMENT.md §5).",
  );
  process.exit(1);
}

// ── 2. Request the code ─────────────────────────────────────────────────────
const requested = await fetch(`${base}/api/v1/auth/email/code`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
});
const requestedBody = await json(requested);
const code = requestedBody?.devCode;
if (
  !step(
    "a code is issued for the address",
    requested.status === 200 && requestedBody?.sent === true,
    `status ${requested.status} ${JSON.stringify(requestedBody).slice(0, 200)}`,
  )
) {
  process.exit(1);
}
if (!code) {
  // Outside production the code comes back as devCode. A host in production
  // has no devCode, and then the code can only be read from the mailbox.
  console.log(
    "\nNo devCode in the response — this host is in production mode, so the\n" +
      "code was delivered by mail and cannot be read from here.\n" +
      "Everything up to the code has been verified.",
  );
  process.exit(0);
}
step(
  "the code is returned to the caller outside production",
  /^\d{6}$/.test(code),
  `code ${code.slice(0, 2)}******`,
);

// ── 3. Check the code ───────────────────────────────────────────────────────
const verified = await fetch(`${base}/api/v1/auth/email/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, code }),
});
const verifiedBody = await json(verified);
step(
  "the code is accepted",
  verified.status === 200 && verifiedBody?.verified === true,
  `status ${verified.status} ${JSON.stringify(verifiedBody).slice(0, 160)}`,
);

// ── 3b. A wrong code must not work ──────────────────────────────────────────
// "No such code" and "wrong code" answer identically, so this cannot be used
// to find out which addresses have an outstanding challenge.
const wrong = await fetch(`${base}/api/v1/auth/email/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: canonical, code: "000000" }),
});
const wrongBody = await json(wrong);
step(
  "a wrong code is refused",
  wrong.status === 400 && wrongBody?.error === "INVALID_CODE",
  `status ${wrong.status} ${JSON.stringify(wrongBody).slice(0, 120)}`,
);

// ── 4. Create the account ───────────────────────────────────────────────────
const registered = await fetch(`${base}/api/v1/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email,
    phone,
    password,
    languagePreference: "en",
    role: "CLIENT",
    dateOfBirth: dob,
    consents: {
      kycDataProcessing: true,
      financialDataProcessing: true,
      platformNotifications: false,
      marketingCommunications: false,
      analytics: false,
    },
  }),
});
const registeredBody = await json(registered);
step(
  "the account is created",
  registered.status === 202,
  `status ${registered.status} ${JSON.stringify(registeredBody).slice(0, 160)}`,
);

// ── 5. Sign in ──────────────────────────────────────────────────────────────
// Signed in with the address exactly as it was typed. This is the step that
// fails when the account was stored with a different capitalisation.
const login = await fetch(`${base}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const loginBody = await json(login);
const token = loginBody?.accessToken;
step(
  "the new account can sign in with the address as typed",
  login.status === 200 && Boolean(token),
  `status ${login.status} keys ${Object.keys(loginBody).join(",")}`,
);
if (!token) {
  console.log(`      ${JSON.stringify(loginBody).slice(0, 300)}`);
}

// ── 6. The account is usable ────────────────────────────────────────────────
const me = await fetch(`${base}/api/v1/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
const meBody = await json(me);
step(
  "the session works and the address is the canonical form",
  me.status === 200 && meBody?.email === canonical,
  `status ${me.status} email=${JSON.stringify(meBody?.email)}`,
);

console.log(
  `\naddress as typed : ${email}\n` +
    `address on file  : ${meBody?.email}\n` +
    (process.exitCode
      ? "\nSOME CHECKS FAILED."
      : "\nThe onboarding flow works end to end on this instance."),
);
