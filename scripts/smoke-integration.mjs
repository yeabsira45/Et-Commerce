#!/usr/bin/env node
/* eslint-disable no-console */

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function expectOk(path, init) {
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} failed: ${res.status} ${res.statusText} ${text}`.trim());
  }
  return res;
}

async function run() {
  console.log(`[smoke] base url: ${baseUrl}`);

  await expectOk("/api/categories/counts");
  console.log("[smoke] categories counts ok");

  await expectOk("/api/listings/search?");
  console.log("[smoke] listings search ok");

  await expectOk("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "smoke-test@example.com",
      mode: "otp",
    }),
  });
  console.log("[smoke] forgot-password endpoint ok");

  await expectOk("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName: "smoke.integration_check",
      data: { source: "script" },
    }),
  });
  console.log("[smoke] analytics endpoint ok");

  console.log("[smoke] all checks passed");
}

run().catch((error) => {
  console.error("[smoke] failed:", error.message || error);
  process.exit(1);
});
