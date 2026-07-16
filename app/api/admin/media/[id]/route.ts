import { prisma } from "@/lib/db";
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

  return Response.json({
    deleted: true,
    fileDeleted: fileResult.deleted,
    warning: fileResult.warning,
  });
}
