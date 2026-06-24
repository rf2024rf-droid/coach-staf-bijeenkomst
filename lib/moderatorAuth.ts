import { createHmac, timingSafeEqual } from "crypto";
import { AppError } from "@/db/store";

const cookieName = "coach-staf-moderator";
const maxAgeSeconds = 60 * 60 * 24 * 7;

function getModeratorPassword() {
  return process.env.MODERATOR_PASSWORD ?? "";
}

function getModeratorSecret() {
  return (
    process.env.MODERATOR_SESSION_SECRET ??
    process.env.MODERATOR_PASSWORD ??
    process.env.SUPABASE_DATABASE_URL ??
    "coach-staf-bijeenkomst-dev-secret"
  );
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(expiresAt: number) {
  return createHmac("sha256", getModeratorSecret())
    .update(`moderator:${expiresAt}`)
    .digest("base64url");
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export function isModeratorConfigured() {
  return Boolean(getModeratorPassword());
}

export function verifyModeratorPassword(password: unknown) {
  if (!isModeratorConfigured()) {
    throw new AppError(500, "Moderator-login is nog niet ingesteld. Zet MODERATOR_PASSWORD in Vercel.");
  }

  return typeof password === "string" && safeCompare(password, getModeratorPassword());
}

export function createModeratorToken() {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function isModeratorRequest(request: Request) {
  if (!isModeratorConfigured()) {
    return false;
  }

  const token = getCookie(request, cookieName);
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAt || !signature || expiresAt < Date.now()) {
    return false;
  }

  return safeCompare(signature, sign(expiresAt));
}

export function assertModerator(request: Request) {
  if (!isModeratorConfigured()) {
    throw new AppError(500, "Moderator-login is nog niet ingesteld. Zet MODERATOR_PASSWORD in Vercel.");
  }

  if (!isModeratorRequest(request)) {
    throw new AppError(401, "Log eerst in als moderator.");
  }
}

export function moderatorCookieHeader(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearModeratorCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
