import { createHmac, timingSafeEqual } from "crypto";
import { AppError, type ModeratorActor } from "@/db/store";
import { isModeratorRequest } from "@/lib/moderatorAuth";

const accountCookieName = "coach-staf-account";
const maxAgeSeconds = 60 * 60 * 24 * 7;

type SupabaseAuthUser = {
  id?: string;
  email?: string;
  confirmed_at?: string | null;
  email_confirmed_at?: string | null;
};

type SupabaseAuthResponse = {
  access_token?: string;
  expires_in?: number;
  user?: SupabaseAuthUser;
  error?: string;
  error_description?: string;
  message?: string;
  msg?: string;
};

type AccountCookiePayload = {
  role: "tester";
  userId: string;
  email: string;
  expiresAt: number;
};

function getAuthSecret() {
  return (
    process.env.ACCOUNT_SESSION_SECRET ??
    process.env.MODERATOR_SESSION_SECRET ??
    process.env.SUPABASE_DATABASE_URL ??
    "coach-staf-account-dev-secret"
  );
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

function normalizePassword(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sign(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function encodePayload(payload: AccountCookiePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): AccountCookiePayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as AccountCookiePayload;
    if (parsed.role !== "tester" || !parsed.userId || !parsed.email || !parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function supabaseAuthRequest(path: string, body: Record<string, unknown>, redirectTo?: string) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !anonKey) {
    throw new AppError(
      500,
      "Supabase Auth is nog niet ingesteld. Zet SUPABASE_URL en SUPABASE_ANON_KEY in Vercel."
    );
  }

  if (/^https?:\/\/db\./i.test(supabaseUrl)) {
    throw new AppError(
      500,
      "SUPABASE_URL moet de Project URL zijn, niet de database host. Gebruik iets als https://jouw-project.supabase.co."
    );
  }

  let authUrl: URL;
  try {
    authUrl = new URL(`${supabaseUrl}/auth/v1/${path}`);
  } catch {
    throw new AppError(500, "SUPABASE_URL is ongeldig. Gebruik de Project URL uit Supabase, bijvoorbeeld https://jouw-project.supabase.co.");
  }

  if (redirectTo) {
    authUrl.searchParams.set("redirect_to", redirectTo);
  }

  const headers: Record<string, string> = {
    apikey: anonKey,
    "content-type": "application/json",
  };

  if (anonKey.split(".").length === 3) {
    headers.authorization = `Bearer ${anonKey}`;
  }

  const response = await fetch(authUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  let data: SupabaseAuthResponse = {};

  try {
    data = responseText ? (JSON.parse(responseText) as SupabaseAuthResponse) : {};
  } catch {
    data = {};
  }

  if (!response.ok || data.error) {
    const message =
      data.error_description ||
      data.msg ||
      data.message ||
      data.error ||
      responseText.slice(0, 180) ||
      `Supabase Auth gaf status ${response.status}.`;
    throw new AppError(response.status || 400, message);
  }

  return data;
}

export function isAccountAuthConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isSignupCodeRequired() {
  return Boolean(process.env.BETA_SIGNUP_CODE);
}

export function verifySignupCode(value: unknown) {
  const configured = process.env.BETA_SIGNUP_CODE ?? "";
  if (!configured) {
    return true;
  }

  return typeof value === "string" && safeCompare(value.trim(), configured);
}

export function validateAccountCredentials(emailInput: unknown, passwordInput: unknown) {
  const email = normalizeEmail(emailInput);
  const password = normalizePassword(passwordInput);

  if (!email || !email.includes("@")) {
    throw new AppError(400, "Vul een geldig e-mailadres in.");
  }

  if (password.length < 8) {
    throw new AppError(400, "Gebruik een wachtwoord van minimaal 8 tekens.");
  }

  return { email, password };
}

export async function signUpWithSupabase(email: string, password: string, redirectTo: string) {
  return supabaseAuthRequest("signup", { email, password }, redirectTo);
}

export async function loginWithSupabase(email: string, password: string) {
  const data = await supabaseAuthRequest("token?grant_type=password", { email, password });
  const user = data.user;

  if (!data.access_token || !user?.id || !user.email) {
    throw new AppError(401, "Inloggen is mislukt.");
  }

  if (!user.confirmed_at && !user.email_confirmed_at) {
    throw new AppError(403, "Activeer eerst je account via de link in je e-mail.");
  }

  return {
    userId: user.id,
    email: normalizeEmail(user.email),
  };
}

export function createAccountToken(userId: string, email: string) {
  const payload = encodePayload({
    role: "tester",
    userId,
    email,
    expiresAt: Date.now() + maxAgeSeconds * 1000,
  });
  return `${payload}.${sign(payload)}`;
}

export function getAccountActor(request: Request): ModeratorActor | null {
  const token = getCookie(request, accountCookieName);
  const [payloadRaw, signature] = token.split(".");

  if (!payloadRaw || !signature || !safeCompare(signature, sign(payloadRaw))) {
    return null;
  }

  const payload = decodePayload(payloadRaw);
  if (!payload || payload.expiresAt < Date.now()) {
    return null;
  }

  return {
    role: payload.role,
    userId: payload.userId,
    email: payload.email,
  };
}

export function getModeratorActor(request: Request): ModeratorActor | null {
  if (isModeratorRequest(request)) {
    return { role: "admin", userId: null, email: null };
  }

  return getAccountActor(request);
}

export function assertModeratorActor(request: Request) {
  const actor = getModeratorActor(request);
  if (!actor) {
    throw new AppError(401, "Log eerst in.");
  }

  return actor;
}

export function assertAdminActor(request: Request) {
  const actor = getModeratorActor(request);
  if (actor?.role !== "admin") {
    throw new AppError(403, "Alleen de beheerder kan dit bekijken.");
  }

  return actor;
}

export function accountCookieHeader(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${accountCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearAccountCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${accountCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
