export function telegramHeaders() {
  const initData = window.Telegram?.WebApp?.initData ?? "";

  return initData
    ? { "x-telegram-init-data": initData }
    : ({} as Record<string, string>);
}

export function recordMediaViewEvent({
  completed = false,
  durationMs,
  mediaId,
}: {
  completed?: boolean;
  durationMs?: number;
  mediaId: string;
}) {
  const headers = {
    "Content-Type": "application/json",
    ...telegramHeaders(),
  };

  void fetch("/api/media/view", {
    body: JSON.stringify({ completed, durationMs, mediaId }),
    headers,
    method: "POST",
  });
}
