import { prisma } from "@/lib/db";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { getLimit } from "@/lib/media-store";
import { parseHashtags, setMediaTags } from "@/lib/media-personalization";
import { storeUploadedMedia } from "@/lib/server-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = getLimit(url.searchParams, 20);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search")?.trim();
  const rows = await prisma.media.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      tags: {
        include: {
          tag: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: cursor ? 1 : 0,
    take: limit + 1,
    where: {
      ...(type === "PHOTO" || type === "VIDEO" ? { type } : {}),
      ...(search
        ? {
            OR: [
              { filename: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
              { caption: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return Response.json({
    items: items.map((item) => ({
      ...item,
      tags: item.tags.map((mediaTag) => mediaTag.tag),
    })),
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = form.get("title");
    const caption = form.get("caption");
    const hashtags = form.get("hashtags");

    if (!(file instanceof File)) {
      return Response.json({ error: "File wajib diisi" }, { status: 400 });
    }

    const media = await storeUploadedMedia({
      caption: typeof caption === "string" ? caption : undefined,
      file,
      title: typeof title === "string" ? title : undefined,
    });
    const tags = await setMediaTags({
      mediaId: media.id,
      names: parseHashtags(
        [
          typeof caption === "string" ? caption : "",
          typeof hashtags === "string" ? hashtags : "",
        ].join(" "),
      ),
    });
    await recordAdminAudit({
      action: "media.upload",
      adminTelegramId: admin.telegramId,
      metadata: {
        caption: media.caption,
        filename: media.filename,
        tags: tags.map((tag) => tag.name),
        title: media.title,
        type: media.type,
      },
      targetId: media.id,
      targetType: "media",
    });

    return Response.json({ media });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
