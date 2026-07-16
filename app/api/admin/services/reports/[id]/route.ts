import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { reviewAdminServiceReport } from "@/lib/service-store";

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
    adminNote?: string;
    listingStatus?: (typeof allowedStatuses)[number];
  };
  const status =
    body.listingStatus && allowedStatuses.includes(body.listingStatus)
      ? body.listingStatus
      : undefined;
  const report = await reviewAdminServiceReport({
    adminNote: body.adminNote?.trim() || null,
    reportId: id,
    status,
  });
  await recordAdminAudit({
    action: "service.report.review",
    adminTelegramId: admin.telegramId,
    metadata: {
      adminNote: body.adminNote?.trim() || null,
      listingStatus: status,
    },
    targetId: report.id,
    targetType: "serviceReport",
  });

  return Response.json({ report });
}
