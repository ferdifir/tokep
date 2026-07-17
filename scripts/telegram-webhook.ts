const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const domain = process.env.DOMAIN?.trim() || "mandirijayas.my.id";
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const webhookUrl =
  process.env.TELEGRAM_WEBHOOK_URL?.trim() || `https://${domain}/api/telegram/webhook`;

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

async function callTelegram(method: string, body: unknown) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as { description?: string; ok: boolean };

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `${method} failed`);
  }

  return data;
}

async function main() {
  await callTelegram("setWebhook", {
    allowed_updates: ["message"],
    drop_pending_updates: false,
    secret_token: webhookSecret || undefined,
    url: webhookUrl,
  });

  await callTelegram("setMyCommands", {
    commands: [
      {
        command: "start",
        description: "Buka Mini App dan lihat fitur utama",
      },
      {
        command: "help",
        description: "Lihat daftar command",
      },
    ],
  });

  console.log(`Telegram webhook configured: ${webhookUrl}`);
}

void main();
