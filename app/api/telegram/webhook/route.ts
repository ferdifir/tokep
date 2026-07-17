import { handleBotUpdate, type TelegramUpdate } from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const result = await handleBotUpdate(update);

  return Response.json({ ok: true, ...result });
}
