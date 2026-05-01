import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashToken, setSessionCookie } from "@/lib/auth";

const STATE_COOKIE = "etcom_google_state";
const PENDING_COOKIE = "etcom_google_pending";

function buildRedirectUri(req: Request) {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  const url = new URL(req.url);
  return `${url.origin}/api/auth/google/callback`;
}

function appRedirect(req: Request, path = "/") {
  const url = new URL(req.url);
  return new URL(path, url.origin);
}

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
};

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(appRedirect(req, "/?auth=google_not_configured"));
  }
  const oauthClientId: string = clientId;
  const oauthClientSecret: string = clientSecret;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = cookies().get(STATE_COOKIE)?.value;
  cookies().set(STATE_COOKIE, "", { path: "/", expires: new Date(0) });

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(appRedirect(req, "/?auth=google_state_error"));
  }
  const authCode = code;

  const redirectUri = buildRedirectUri(req);
  async function exchangeCode() {
    return fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: authCode,
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    }).catch(() => null);
  }

  let tokenRes = await exchangeCode();
  if (!tokenRes?.ok) {
    // Retry once for transient network/provider failures.
    tokenRes = await exchangeCode();
  }

  if (!tokenRes?.ok) {
    return NextResponse.redirect(appRedirect(req, "/?auth=google_token_error"));
  }

  const tokenPayload = (await tokenRes.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!tokenPayload.access_token) {
    return NextResponse.redirect(appRedirect(req, "/?auth=google_token_error"));
  }

  const userInfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!userInfoRes?.ok) {
    return NextResponse.redirect(appRedirect(req, "/?auth=google_userinfo_error"));
  }

  const googleUser = (await userInfoRes.json().catch(() => ({}))) as GoogleUserInfo;
  const email = (googleUser.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.redirect(appRedirect(req, "/?auth=google_email_missing"));
  }

  let user = await prisma.user.findUnique({
    where: { email },
    include: { vendor: true },
  });

  if (!user) {
    const pendingPayload = {
      email,
      fullName: (googleUser.name || "").trim() || "",
      sub: (googleUser.sub || "").trim() || "",
      issuedAt: Date.now(),
    };
    cookies().set(PENDING_COOKIE, JSON.stringify(pendingPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 20 * 60,
    });
    return NextResponse.redirect(appRedirect(req, "/auth/complete-google"));
  }

  if (user.bannedAt) {
    return NextResponse.redirect(appRedirect(req, "/?auth=account_banned"));
  }

  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } });
  setSessionCookie(token);
  cookies().set(PENDING_COOKIE, "", { path: "/", expires: new Date(0) });

  return NextResponse.redirect(appRedirect(req, "/"));
}
