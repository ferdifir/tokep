import { requireAdmin } from "@/lib/admin-auth";
import { reviewAdminServiceClaim } from "@/lib/service-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStatuses = ["APPROVED", "REJECTED", "DISPUTED"] as const;

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
    status?: (typeof allowedStatuses)[number];
  };

  if (!body.status || !allowedStatuses.includes(body.status)) {
    return Response.json({ error: "Status klaim tidak valid" }, { status: 400 });
  }

  const claim = await reviewAdminServiceClaim({
    adminNote: body.adminNote?.trim() || null,
    claimId: id,
    status: body.status,
  });

  return Response.json({ claim });
}
