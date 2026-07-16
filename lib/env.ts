export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isDevTelegramFallbackEnabled() {
  return !isProduction() && process.env.ALLOW_DEV_TELEGRAM_FALLBACK !== "0";
}

export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function optionalIntEnv(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDatabaseUrl() {
  return requiredEnv("DATABASE_URL");
}

export function getTelegramBotToken() {
  if (isProduction()) {
    return requiredEnv("TELEGRAM_BOT_TOKEN");
  }

  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function getAdminSessionSecret() {
  if (isProduction()) {
    return requiredEnv("ADMIN_SESSION_SECRET");
  }

  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "tokep-development-secret"
  );
}

export function getServiceReportFlagThreshold() {
  return optionalIntEnv("SERVICE_REPORT_FLAG_THRESHOLD", 3);
}

export function getAdminOtpCooldownSeconds() {
  return optionalIntEnv("ADMIN_OTP_COOLDOWN_SECONDS", 60);
}
