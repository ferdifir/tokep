import crypto from "node:crypto";
import { prisma } from "@/lib/db";

type TelegramInitUser = {
  first_name?: string;
  id: number;
  last_name?: string;
  photo_url?: string;
  username?: string;
};

const devTelegramUser: TelegramInitUser = {
  first_name: "Ferdifir",
  id: 8800000001,
  username: "ferdifir",
};

function parseInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  return {
    dataCheckString,
    hash,
    params,
  };
}

function verifyTelegramInitData(initData: string, botToken: string) {
  const { dataCheckString, hash } = parseInitData(initData);

  if (!hash || !dataCheckString) {
    return false;
  }

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  const expected = Buffer.from(signature, "hex");
  const actual = Buffer.from(hash, "hex");

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function userFromInitData(initData: string) {
  const userValue = new URLSearchParams(initData).get("user");

  if (!userValue) {
    return null;
  }

  try {
    return JSON.parse(userValue) as TelegramInitUser;
  } catch {
    return null;
  }
}

export async function getOrCreateRequestUser(request: Request) {
  const initData = request.headers.get("x-telegram-init-data") ?? "";
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const verified =
    initData && botToken ? verifyTelegramInitData(initData, botToken) : false;
  const telegramUser =
    verified && initData ? (userFromInitData(initData) ?? devTelegramUser) : devTelegramUser;

  return prisma.user.upsert({
    create: {
      bio: null,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      photoUrl: telegramUser.photo_url,
      telegramId: BigInt(telegramUser.id),
      username: telegramUser.username,
    },
    update: {
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      photoUrl: telegramUser.photo_url,
      username: telegramUser.username,
    },
    where: {
      telegramId: BigInt(telegramUser.id),
    },
  });
}

export async function syncTelegramUser(request: Request) {
  return getOrCreateRequestUser(request);
}
