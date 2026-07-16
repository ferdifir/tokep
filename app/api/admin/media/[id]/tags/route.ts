import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { getMediaTags, setMediaTags } from "@/lib/media-personalization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tags = await getMediaTags(id);

  return Response.json({ tags });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { tags?: string[] };
  const tags = await setMediaTags({
    mediaId: id,
    names: Array.isArray(body.tags) ? body.tags : [],
  });

  await recordAdminAudit({
    action: "media.tags.update",
    adminTelegramId: admin.telegramId,
    metadata: {
      tags: tags.map((tag) => tag.name),
    },
    targetId: id,
    targetType: "media",
  });

  return Response.json({ tags });
}
