import { prisma } from "@/lib/db";
import { getLimit, getSavedPage } from "@/lib/media-store";
import { getOrCreateRequestUser } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getOrCreateRequestUser(request);
  const url = new URL(request.url);
  const limit = getLimit(url.searchParams, 18);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const page = await getSavedPage({ cursor, limit, userId: user.id });

  return Response.json(page);
}

export async function POST(request: Request) {
  const user = await getOrCreateRequestUser(request);
  const body = (await request.json()) as { mediaId?: string };

  if (!body.mediaId) {
    return Response.json({ error: "mediaId is required" }, { status: 400 });
  }

  const saved = await prisma.savedMedia.upsert({
    create: {
      mediaId: body.mediaId,
      userId: user.id,
    },
    update: {},
    where: {
      userId_mediaId: {
        mediaId: body.mediaId,
        userId: user.id,
      },
    },
  });

  return Response.json({ saved: true, savedId: saved.id });
}

export async function DELETE(request: Request) {
  const user = await getOrCreateRequestUser(request);
  const url = new URL(request.url);
  const mediaId = url.searchParams.get("mediaId");

  if (!mediaId) {
    return Response.json({ error: "mediaId is required" }, { status: 400 });
  }

  await prisma.savedMedia.deleteMany({
    where: {
      mediaId,
      userId: user.id,
    },
  });

  return Response.json({ saved: false });
}
