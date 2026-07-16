import { prisma } from "@/lib/db";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteMediaFile, mediaKindFromType } from "@/lib/server-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    visible?: boolean;
  };
  const media = await prisma.media.update({
    data: {
      ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
      ...(typeof body.visible === "boolean" ? { visible: body.visible } : {}),
    },
    where: { id },
  });
  await recordAdminAudit({
    action: "media.update",
    adminTelegramId: admin.telegramId,
    metadata: body,
    targetId: media.id,
    targetType: "media",
  });

  return Response.json({ media });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });

  if (!media) {
    return Response.json({ error: "Media tidak ditemukan" }, { status: 404 });
  }

  const fileResult = await deleteMediaFile(
    mediaKindFromType(media.type),
    media.filename,
  );

  await prisma.media.delete({ where: { id } });
  await recordAdminAudit({
    action: "media.delete",
    adminTelegramId: admin.telegramId,
    metadata: {
      fileDeleted: fileResult.deleted,
      filename: media.filename,
      title: media.title,
      warning: fileResult.warning,
    },
    targetId: media.id,
    targetType: "media",
  });

  return Response.json({
    deleted: true,
    fileDeleted: fileResult.deleted,
    warning: fileResult.warning,
  });
}
