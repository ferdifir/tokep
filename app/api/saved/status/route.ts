import { prisma } from "@/lib/db";
import { getOrCreateRequestUser } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getOrCreateRequestUser(request);
  const url = new URL(request.url);
  const mediaId = url.searchParams.get("mediaId");

  if (!mediaId) {
    return Response.json({ error: "mediaId is required" }, { status: 400 });
  }

  const saved = await prisma.savedMedia.findUnique({
    select: { id: true },
    where: {
      userId_mediaId: {
        mediaId,
        userId: user.id,
      },
    },
  });

  return Response.json({ saved: Boolean(saved) });
}
