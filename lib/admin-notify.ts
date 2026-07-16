function getAdminTelegramId() {
  return process.env.ADMIN_TELEGRAM_ID ?? "7764382006";
}

export async function notifyAdmin(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken) {
    return { sent: false };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      body: JSON.stringify({
        chat_id: getAdminTelegramId(),
        disable_web_page_preview: true,
        text: message,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    return { sent: response.ok };
  } catch {
    return { sent: false };
  }
}
