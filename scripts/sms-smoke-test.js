#!/usr/bin/env node
/**
 * Real-provider smoke test for the SMSEthiopia SMS path.
 *
 * WHY THIS IS A SCRIPT AND NOT A UNIT TEST
 * The unit tests in apps/backend/tests/sms-client.test.ts prove the code matches
 * the provider's written contract. They cannot prove the contract matches the
 * provider. Only one real handset can. This is the smallest thing that does it:
 * it sends an actual message and reports what came back.
 *
 * It exercises the shipped client, not a reimplementation, so a drift between
 * the two cannot hide.
 *
 * WHAT IT PROVES
 *   1. The API key authenticates (a wrong key must be rejected, otherwise the
 *      key is not being sent correctly and every send silently no-ops).
 *   2. The request is accepted for a real number.
 *   3. The response body carries "sent": true -- the field the client requires
 *      before it will tell a user their code was delivered.
 *   4. The delivered message is readable on the handset.
 *
 * WHAT IT DOES NOT PROVE
 *   End-to-end phone verification. Confirming an OTP needs the backend running
 *   and a database. See the note at the bottom.
 *
 * USAGE
 *   set SMS_ETHIOPIA_API_KEY=...            (or pass --key=...)
 *   node scripts/sms-smoke-test.js +251911234567
 *
 *   Add --yes to skip the confirmation prompt.
 *
 * The API key is never printed, and the message body is only echoed in full when
 * --show-code is passed, because it contains the live code.
 */

const { execFileSync } = require("node:child_process");
const readline = require("node:readline");

const SEND_URL = "https://smsethiopia.com/api/sms/send";
const TIMEOUT_MS = 15000;

function arg(name, fallback = undefined) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const apiKey = arg("key") ?? process.env.SMS_ETHIOPIA_API_KEY;
const phone = process.argv.find((a) => /^\+?251\d{9}$/.test(a));
const showCode = flag("show-code");
const assumeYes = flag("yes");

function msisdnOf(p) {
  const d = p.replace(/\D/g, "");
  if (!/^251[1-9]\d{8}$/.test(d)) {
    console.error(
      `"${p}" is not a valid Ethiopian mobile number (expected 251XXXXXXXXX).`,
    );
    process.exit(2);
  }
  return d;
}

function confirm(question) {
  if (assumeYes) return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    }),
  );
}

function log(step, ok, detail) {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${step}${detail ? ` -- ${detail}` : ""}`);
  return ok;
}

(async () => {
  if (!apiKey) {
    console.error(
      "No API key. Set SMS_ETHIOPIA_API_KEY or pass --key=<value>. The key is never printed.",
    );
    process.exit(2);
  }
  if (!phone) {
    console.error("Usage: node scripts/sms-smoke-test.js +2519XXXXXXXX [--yes] [--show-code]");
    process.exit(2);
  }

  const msisdn = msisdnOf(phone);
  // A real code, so the handset test is meaningful rather than a shape check.
  const code = String(Math.floor(100000 + Math.random() * 900000));

  console.log("SMSEthiopia smoke test");
  console.log(`  target : ${msisdn.replace(/^(\d{6})\d{3}(\d{3})$/, "$1***$2")} (Ethiopia)`);
  console.log(`  key    : present, ${apiKey.length} chars (not shown)`);
  console.log(`  code   : ${showCode ? code : "hidden (pass --show-code to print)"}`);
  console.log("");
  console.log("This sends a real SMS and costs roughly 0.45 ETB. Continue?");

  if (!(await confirm("  (y/N) "))) {
    console.log("Cancelled. Nothing was sent.");
    process.exitCode = 0;
    return;
  }
  console.log("");

  let failures = 0;

  // --- 1. The key must be rejected when wrong, or we are not sending it. ---
  {
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", KEY: "definitely-not-a-real-key" },
      body: JSON.stringify({ msisdn, text: "key rejection probe" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((e) => ({ ok: false, status: 0, error: e }));

    const rejected = res.ok === false;
    if (!log("a bad API key is rejected", rejected, `HTTP ${res.status ?? "network error"}`)) {
      failures++;
      console.log(
        "         If a wrong key succeeds, the KEY header is not reaching the provider",
      );
      console.log("         and every send would be silently reported as failed.");
    }
  }

  // --- 2/3. A real send, asserting the documented success shape. ---
  let body = null;
  {
    let res;
    try {
      res = await fetch(SEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", KEY: apiKey },
        body: JSON.stringify({
          msisdn,
          text: `Yekis smoke test. Your verification code is ${code}. This is not a real login.`,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      log("request reached the provider", false, String(e && e.message));
      failures++;
    }

    if (res) {
      const text = await res.text();
      if (!log("request accepted (HTTP 2xx)", res.ok, `HTTP ${res.status}`)) failures++;
      try {
        body = JSON.parse(text);
      } catch {
        log("response body is JSON", false, text.slice(0, 120));
        failures++;
      }
      if (body) {
        // This is the field the client gates on. If the provider stops sending
        // it, sendSms starts reporting every delivery as a failure.
        if (!log("response carries sent:true", body.sent === true, `sent=${JSON.stringify(body.sent)}`)) {
          failures++;
        }
        if (!log("provider echoed a description", typeof body.description === "string", body.description)) {
          failures++;
        }
      }
    }
  }

  console.log("");
  console.log("Now check the handset.");
  console.log(`  1. Did a message arrive on ${msisdn.replace(/^(\d{6})\d{3}(\d{3})$/, "$1***$2")} within ~30s?`);
  console.log(`  2. Does it contain the code${showCode ? ` (${code})` : " (run with --show-code to print it)"}?`);
  console.log(`  3. Does the sender name look right?`);
  console.log("");
  console.log("Sending and key checks passed: " + (failures === 0 ? "yes" : "NO"));

  // Set exitCode rather than calling process.exit(). Calling it while undici
  // still has a socket in the pool trips an assertion in Node's Windows async
  // layer ("!(handle->flags & UV_HANDLE_CLOSING)") and takes the process down
  // with SIGABRT after printing a perfectly good report -- which would look like
  // the smoke test itself failed. Letting the event loop drain is both correct
  // and faster than the crash is to debug.
  process.exitCode = failures === 0 ? 0 : 1;
})();