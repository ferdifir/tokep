import { recordMediaView } from "@/lib/media-personalization";
import {
  getOrCreateRequestUser,
  telegramAuthErrorResponse,
} from "@/lib/telegram-auth";
import { requireRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getOrCreateRequestUser(request);
    const limited = await requireRateLimit({
      key: `media-view:${user.id}`,
      limit: 240,
      windowMs: 60 * 1000,
    });

    if (limited) {
      return limited;
    }

    const body = (await request.json()) as {
      completed?: boolean;
      durationMs?: number;
      mediaId?: string;
    };

    if (!body.mediaId) {
      return Response.json({ error: "mediaId is required" }, { status: 400 });
    }

    await recordMediaView({
      completed: Boolean(body.completed),
      durationMs: typeof body.durationMs === "number" ? body.durationMs : null,
      mediaId: body.mediaId,
      userId: user.id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    const authResponse = telegramAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    throw error;
  }
}
