type TelegramChat = {
  id: number | string;
};

type TelegramMessage = {
  chat: TelegramChat;
  text?: string;
};

export type TelegramUpdate = {
  message?: TelegramMessage;
};

type TelegramReplyMarkup = {
  inline_keyboard: Array<
    Array<
      | {
          text: string;
          url: string;
        }
      | {
          text: string;
          web_app: {
            url: string;
          };
        }
    >
  >;
};

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function getBotUsername() {
  return (process.env.TELEGRAM_BOT_USERNAME?.trim() || "tokepaibot").replace(/^@/, "");
}

export function getMiniAppUrl() {
  return (
    process.env.TELEGRAM_MINI_APP_URL?.trim() ||
    `https://${process.env.DOMAIN?.trim() || "mandirijayas.my.id"}`
  );
}

export function getMiniAppDirectUrl() {
  const shortName = process.env.TELEGRAM_MINI_APP_SHORT_NAME?.trim();
  const startParam = process.env.TELEGRAM_MINI_APP_START_PARAM?.trim();
  const botUsername = getBotUsername();
  const query = startParam ? `?startapp=${encodeURIComponent(startParam)}` : "?startapp";

  if (shortName) {
    return `https://t.me/${botUsername}/${shortName}${query}`;
  }

  return `https://t.me/${botUsername}${query}`;
}

function startMessage() {
  return [
    "Tokep adalah Mini App Telegram untuk melihat feed video/foto cepat, menyimpan konten, dan menemukan katalog servis rekomendasi komunitas.",
    "",
    "Fitur utama:",
    "- Feed video gaya TikTok",
    "- Grid foto",
    "- Profil dan konten tersimpan",
    "- Katalog servis, rekomendasi, klaim, dan laporan",
    "",
    "Tekan tombol di bawah untuk membuka Mini App.",
  ].join("\n");
}

function helpMessage() {
  return [
    "Command yang tersedia:",
    "/start - penjelasan singkat dan tombol buka Mini App",
    "/help - daftar command",
    "",
    "Untuk memakai fitur utama, buka Mini App dari tombol di bawah.",
  ].join("\n");
}

function miniAppKeyboard(): TelegramReplyMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "Buka Mini App",
          web_app: {
            url: getMiniAppUrl(),
          },
        },
      ],
      [
        {
          text: "Buka via link",
          url: getMiniAppDirectUrl(),
        },
      ],
    ],
  };
}

export async function sendBotMessage({
  chatId,
  replyMarkup,
  text,
}: {
  chatId: number | string;
  replyMarkup?: TelegramReplyMarkup;
  text: string;
}) {
  const botToken = getBotToken();

  if (!botToken) {
    return { sent: false };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: true,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
      text,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return { sent: response.ok };
}

export async function handleBotUpdate(update: TelegramUpdate) {
  const message = update.message;
  const text = message?.text?.trim();

  if (!message || !text) {
    return { handled: false };
  }

  const command = text.split(/\s+/, 1)[0]?.split("@", 1)[0]?.toLowerCase();

  if (command === "/start") {
    await sendBotMessage({
      chatId: message.chat.id,
      replyMarkup: miniAppKeyboard(),
      text: startMessage(),
    });

    return { handled: true };
  }

  if (command === "/help") {
    await sendBotMessage({
      chatId: message.chat.id,
      replyMarkup: miniAppKeyboard(),
      text: helpMessage(),
    });

    return { handled: true };
  }

  if (command?.startsWith("/")) {
    await sendBotMessage({
      chatId: message.chat.id,
      replyMarkup: miniAppKeyboard(),
      text: "Command belum dikenal. Gunakan /start untuk membuka Mini App.",
    });

    return { handled: true };
  }

  return { handled: false };
}
