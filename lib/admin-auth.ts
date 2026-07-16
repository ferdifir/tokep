import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import {
  getAdminOtpCooldownSeconds,
  getAdminSessionSecret,
  isProduction,
} from "@/lib/env";

export const adminSessionCookie = "tokep_admin_session";
const otpTtlMs = 5 * 60 * 1000;
const sessionTtlMs = 24 * 60 * 60 * 1000;

function getAdminTelegramId() {
  return BigInt(process.env.ADMIN_TELEGRAM_ID ?? "7764382006");
}

function getSecret() {
  return getAdminSessionSecret();
}

function hashValue(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function hashOtp(telegramId: bigint, code: string) {
  return hashValue(`otp:${telegramId}:${code}`);
}

export function hashSessionToken(token: string) {
  return hashValue(`session:${token}`);
}

export function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function sendAdminOtp(code: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramId = getAdminTelegramId();

  if (!botToken) {
    if (isProduction()) {
      throw new Error("TELEGRAM_BOT_TOKEN is required to send admin OTP");
    }

    return { debugCode: code, sent: false };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: String(telegramId),
      text: `Kode OTP admin Tokep: ${code}\nBerlaku 5 menit.`,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Telegram sendMessage failed: ${detail}`);
  }

  return { debugCode: null, sent: true };
}

export async function createAdminOtp() {
  const telegramId = getAdminTelegramId();
  const cooldownAfter = new Date(Date.now() - getAdminOtpCooldownSeconds() * 1000);
  const recentOtp = await prisma.adminOtp.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      createdAt: {
        gt: cooldownAfter,
      },
      telegramId,
    },
  });

  if (recentOtp) {
    throw new Error("OTP sudah dikirim. Tunggu sebentar sebelum meminta ulang.");
  }

  const code = generateOtp();

  await prisma.adminOtp.create({
    data: {
      codeHash: hashOtp(telegramId, code),
      expiresAt: new Date(Date.now() + otpTtlMs),
      telegramId,
    },
  });

  const sendResult = await sendAdminOtp(code);

  return sendResult;
}

export async function verifyAdminOtp(code: string) {
  const telegramId = getAdminTelegramId();
  const codeHash = hashOtp(telegramId, code);
  const otp = await prisma.adminOtp.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      codeHash,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
      telegramId,
    },
  });

  if (!otp) {
    return null;
  }

  await prisma.adminOtp.update({
    data: {
      consumedAt: new Date(),
    },
    where: {
      id: otp.id,
    },
  });

  const token = generateSessionToken();
  const session = await prisma.adminSession.create({
    data: {
      expiresAt: new Date(Date.now() + sessionTtlMs),
      telegramId,
      tokenHash: hashSessionToken(token),
    },
  });

  return { session, token };
}

function parseCookie(header: string | null, key: string) {
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=");

    if (name === key) {
      return decodeURIComponent(value.join("="));
    }
  }

  return null;
}

export async function getAdminSession(request: Request) {
  const token = parseCookie(request.headers.get("cookie"), adminSessionCookie);

  if (!token) {
    return null;
  }

  return prisma.adminSession.findFirst({
    where: {
      expiresAt: {
        gt: new Date(),
      },
      tokenHash: hashSessionToken(token),
    },
  });
}

export async function requireAdmin(request: Request) {
  const session = await getAdminSession(request);

  if (!session) {
    return null;
  }

  return session;
}

export function adminCookieHeader(token: string, expiresAt: Date) {
  const secure = isProduction() ? "; Secure" : "";

  return `${adminSessionCookie}=${encodeURIComponent(
    token,
  )}; HttpOnly; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function clearAdminCookieHeader() {
  return `${adminSessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
