import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { updateAdminServiceListing } from "@/lib/service-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStatuses = ["ACTIVE", "FLAGGED", "RESTRICTED", "HIDDEN"] as const;

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
    status?: (typeof allowedStatuses)[number];
    verified?: boolean;
  };
  const status =
    body.status && allowedStatuses.includes(body.status) ? body.status : undefined;
  const listing = await updateAdminServiceListing({
    listingId: id,
    status,
    verified: typeof body.verified === "boolean" ? body.verified : undefined,
  });
  await recordAdminAudit({
    action: "service.listing.update",
    adminTelegramId: admin.telegramId,
    metadata: {
      ...(status ? { status } : {}),
      ...(typeof body.verified === "boolean" ? { verified: body.verified } : {}),
    },
    targetId: listing.id,
    targetType: "serviceListing",
  });

  return Response.json({ listing });
}
